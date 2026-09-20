# Research: Operação Completa sem Configuração Manual

**Feature**: `005-operational-experience`  
**Date**: 2026-09-19

## Baseline confirmado

O runtime efetivo é um monólito modular CommonJS em Node.js 22, servidor HTTP nativo, HTML renderizado no servidor, PostgreSQL por `pg` e testes com `node:test`. `docs/architecture/ARCHITECTURE.md` descreve uma arquitetura React/Next/Nest/Redis que não corresponde ao código executável e não será usada como autoridade. Não há dependência de frontend, WebSocket ou broker no `package.json`.

A pesquisa delegada sofreu indisponibilidade HTTP 503. As decisões abaixo foram consolidadas a partir do código observado, da constituição e dos contratos da especificação; não dependem de hipóteses dos agentes que falharam.

## R01 — Transporte de atualização do Inbox

**Decision**: adotar Server-Sent Events como transporte inicial, mantendo HTTP normal para comandos e gravações. A conexão será autenticada por sessão, vinculada a um tenant e a escopos recalculáveis. Eventos terão `id`, `type`, `tenant_id`, `aggregate_type`, `aggregate_id`, `aggregate_version`, `occurred_at` e payload mínimo.

**Rationale**: o fluxo é predominantemente servidor→navegador, SSE funciona no servidor HTTP nativo e no navegador sem nova dependência, possui reconexão e `Last-Event-ID`, e reduz a superfície operacional. O `modules/realtime/sse-hub.js` global e volátil não atende isolamento, replay nem escala e deverá ser substituído, não ampliado.

**Alternatives considered**:
- WebSocket: útil para comunicação bidirecional intensa, mas adiciona protocolo, heartbeat, biblioteca e operação sem necessidade atual.
- Polling: simples, porém não atende latência nem experiência exigidas.
- Broker/Redis: não permitido como dependência obrigatória e desnecessário no primeiro desenho.

## R02 — Durabilidade, replay e fan-out

**Decision**: persistir eventos em `realtime_events` na mesma transação da mudança de domínio; cada instância usa `LISTEN/NOTIFY` apenas como sinal de baixa latência e consulta a tabela como fonte de verdade. Reconexão usa cursor monotônico por tenant; quando o acúmulo excede 6.000 eventos, o replay expande páginas dinamicamente até recuperar todos os eventos autorizados, preservando filtros de tenant/autorização e deduplicação. Expiração é controlada por retenção. Cada cliente possui fila limitada e é desconectado ao exceder o limite, forçando replay seguro.

**Rationale**: `NOTIFY` isoladamente perde eventos; a tabela transacional preserva consistência e permite replay. PostgreSQL já é a infraestrutura mandatória.

**Alternatives considered**:
- Hub em memória: perde eventos e não funciona com múltiplos processos.
- Outbox existente para todo evento: possível, mas mistura entrega externa com projeção de interface; será reaproveitado o padrão, não necessariamente a mesma fila.

## R03 — Autorização em tempo real

**Decision**: registrar somente conexões autenticadas; derivar tenant e usuário da sessão, nunca de parâmetro do cliente; filtrar no SQL por tenant e verificar capacidade/escopo do recurso. Revalidar sessão/permissões em reconexão e periodicamente; revogação encerra a assinatura. Eventos não incluem segredo nem conteúdo fora do mínimo necessário.

**Rationale**: cumpre isolamento deny-by-default e evita que o transporte se torne um canal paralelo sem RBAC.

## R04 — Setup inicial atômico

**Decision**: modelar `installation_setup` como máquina de estados (`pending`, `validating`, `active`, `failed`) com versão otimista. O progresso não secreto pode ser salvo como rascunho. A ativação final ocorre em uma única transação com bloqueio de linha/advisory lock: verifica pré-condições, cria/associa primeiro administrador, persiste organização/configuração, ativa recursos validados, grava auditoria e muda para `active`. Apenas uma instalação pode ser ativada.

**Rationale**: evita ativação parcial e corrida entre duas sessões. `ensureBootstrapAdmin` pode ser refatorado como serviço transacional, mas seu retorno idempotente por e-mail não basta como gate de instalação.

**Alternatives considered**:
- Flag em variável de ambiente: não é transacional nem auditável.
- Criar recursos a cada passo: deixa estado parcial e rollback complexo.

## R05 — Segredos de IA e canais

**Decision**: generalizar o envelope AES-256-GCM existente em `channel-secrets.js` para um serviço de segredos versionados. O banco guarda ciphertext, versão da chave, propósito e metadados mascarados; a UI nunca recebe plaintext após envio. A chave raiz continua fora do banco. A rotação cria nova versão e promove `active_version_id` somente após validação. Configurações são tenant-scoped e o propósito deve ser único por tenant/provedor/uso.

**Rationale**: preserva compatibilidade com `secrets`/`secret_versions`, autenticação de ciphertext e rotação. “Não reexibir” significa não haver endpoint de leitura do plaintext; decriptação fica restrita ao adaptador que executa a chamada.

**Alternatives considered**:
- Hash: inviável porque o provedor exige o segredo original.
- Vault externo obrigatório: conflita com instalação autocontida; pode ser adaptador opcional futuro.
- Guardar chave junto ao ciphertext: invalida a proteção.

## R06 — Validação e migração de configurações

**Decision**: validações de provedor serão allowlisted, com timeout, limite de resposta, redaction e proteção contra destinos arbitrários. O teste grava apenas estado, instante e erro sanitizado. Migração importa configurações existentes uma vez, dentro de transação idempotente, sem sobrescrever versões já gerenciadas; valores de ambiente permanecem somente como bootstrap/compatibilidade até a promoção explícita.

**Rationale**: evita SSRF, vazamento em logs e alterações silenciosas. Permite upgrade sem indisponibilidade ou perda.

## R07 — Arquitetura do `crm-cli`

**Decision**: manter um executável Node sem framework adicional, com parser explícito e subcomandos: `admin create`, `admin reset-password`, `health check`, `workers list`, `queues drain`, `privacy request`. Serviços de domínio serão compartilhados com HTTP; a CLI não duplicará SQL. Formatos `text` e `json`; stdout contém resultado, stderr contém diagnóstico; segredos entram por stdin/arquivo restrito ou prompt, nunca argv.

**Rationale**: integra ao pacote atual e mantém uma única implementação das regras.

**Alternatives considered**:
- Biblioteca de CLI: pode ser adicionada apenas se o parser manual ficar complexo; hoje não há dependência que justifique isso.
- Chamadas HTTP para tudo: exigiriam token operacional e disponibilidade do web process; acesso local ao mesmo serviço/banco é mais apropriado para recuperação.

## R08 — Códigos, idempotência e operações destrutivas

**Decision**: códigos estáveis: `0` sucesso, `2` uso inválido, `3` autenticação/autorização, `4` não encontrado/conflito, `5` dependência indisponível, `6` falha parcial bloqueada e `1` falha interna. Operações mutáveis exigem `--tenant`; destrutivas exigem confirmação interativa ou `--yes --idempotency-key` em automação. `admin create`, drain e privacidade registram execução em `admin_operations` com chave única por tenant/tipo.

**Rationale**: torna automação determinística e evita repetição destrutiva. Drain significa impedir novos claims para o escopo, aguardar leases até prazo e reportar pendentes; não apagar jobs.

## R09 — Modelo canônico dos editores visuais

**Decision**: armazenar rascunhos de automação como documento versionado contendo nós tipados (`trigger`, `condition`, `branch`, `action`) e arestas identificadas. Posição visual é metadado; execução deriva de representação canônica validada, não do DOM. Campanhas usam documento estruturado por blocos allowlisted e variáveis tipadas; o artefato final por canal é derivado e sanitizado.

**Rationale**: preserva auditabilidade, simulação e evolução de schema. JSON arbitrário deixa de ser interface humana, mas continua uma representação interna rigorosa.

**Alternatives considered**:
- Persistir HTML livre: risco de XSS e baixa portabilidade.
- Persistir coordenadas como lógica: mistura apresentação e semântica.
- Introduzir framework SPA: não justificado no baseline; componentes JS progressivos e controles HTML acessíveis são suficientes inicialmente.

## R10 — Validação, simulação e publicação

**Decision**: pipeline único e puro: normalizar → validar schema → validar grafo/referências → compilar → simular/publicar. Simulação usa adaptadores sem efeitos e retorna trace por nó. Publicação cria versão imutável em transação e atualiza ponteiro ativo com optimistic concurrency (`draft_version`/ETag). Alterar rascunho não muda execuções em curso; restauração cria nova versão.

**Rationale**: evita divergência entre o editor, o dry-run e o engine. O `modules/automation/engine.js` já possui dry-run e isolamento por tenant, mas requer modelo de trace e validação mais completos.

## R11 — Conteúdo seguro, prévia e acessibilidade

**Decision**: editor de campanhas oferece blocos estruturados, allowlist de tags/atributos/URLs, escaping contextual e CSP. Prévia é gerada pelo mesmo compilador usado no envio e renderizada em contexto isolado, com sandbox restritivo e sem capacidade same-origin, usando perfis de capacidade por canal. Toda operação gráfica tem equivalente por teclado e formulário/lista; foco, nomes acessíveis, erros associados e ordem lógica são obrigatórios. Publicação exige que a impressão digital da última validação bem-sucedida corresponda exatamente ao hash da versão corrente.

**Rationale**: rich text é fronteira de segurança; prévia divergente do envio cria falsa confiança. O isolamento da prévia reduz impacto caso conteúdo hostil atravesse uma camada de validação. A impressão digital impede publicar conteúdo alterado após validação. Alternativa acessível é necessária para conformidade e usabilidade.

## R12 — Estratégia de testes e evidência

**Decision**: executar TDD por fatias verticais. Cada domínio terá testes unitários de validação, contratos HTTP/CLI, integração PostgreSQL real, autorização/tenant negativo, concorrência/idempotência e browser end-to-end. Tempo real terá reconnect/replay/ordem/backpressure; setup terá corrida e rollback; segredos terão ausência em todas as saídas; CLI terá matriz de códigos; editores terão simulação/publicação/XSS/teclado. Fresh install e upgrade executam a mesma suíte de aceite. Evidência remota posterior seguirá tmux nomeado, logs privados e arquivo `.exit` separado.

**Rationale**: é exigência constitucional; testes mockados ou telas estáticas não fecham o gate.

## R13 — Confiança bootstrap antes do primeiro administrador

**Decision**: gerar uma credencial bootstrap de alta entropia e uso único, vinculada de forma imutável à instalação e ao tenant inicial. Persistir somente hash password-grade, expiração, tentativas/bloqueio e consumo. Exigir essa credencial, CSRF e mesma origem em toda mutação pré-admin; rotação invalida o hash anterior e ativação consome a credencial na mesma transação que cria o primeiro administrador.

**Rationale**: o tenant inicial ainda precisa ser explícito e toda mutação deve permanecer deny-by-default mesmo antes de existir uma sessão administrativa regular. O bootstrap não concede leitura de recursos normais nem sobrevive à ativação.

## R14 — Presença e metas verificáveis

**Decision**: presença usa heartbeat tenant/team-scoped com TTL limitado e evento de expiração autorizado. O aceite de realtime usa um perfil fixo de 100 conexões, 20 eventos/s por 10 minutos, payload de até 8 KiB e replay de até 6.000 eventos por tenant no host de referência documentado. SC-004, SC-006 e SC-009 são estudos moderados, não automação Chromium, e permanecem pendentes até atingirem amostra e limiar.

**Rationale**: torna presença implementável sem estado eterno, transforma metas de latência/replay em testes reproduzíveis e evita alegar usabilidade humana com evidência exclusivamente automatizada.

## R15 — Rollout remoto reversível

**Decision**: o alvo aprovado é `vpstsiapp`, executado como `root` em `/opt/tsi-stack/apps/crm/crmtsiapp/local-crm/`, preservando `/etc/crmtsiapp/crmtsiapp.env`. O rollout usa release/backup timestamped, sessão tmux `tsi-crmtsiapp-operational-deploy`, log 0600, `.exit`, rollback provado e validação independente em `tsi-crmtsiapp-operational-validate`, com consolidação em `VPS/README.md`.

**Rationale**: elimina ambiguidade operacional e satisfaz a constituição sem transportar segredos em argv, nomes de sessão ou evidência.
