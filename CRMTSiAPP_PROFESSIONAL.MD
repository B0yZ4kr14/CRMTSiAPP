# CRMTSiAPP Professional — playbook autônomo de excelência

## 1. Missão

Evoluir o CRMTSiAPP em `vpstsiapp` para um CRM WhatsApp profissional, seguro, acessível e intuitivo para usuários leigos. O produto final deve priorizar a operação diária: atender, priorizar, encaminhar, configurar canais e acompanhar a saúde da operação sem expor detalhes de infraestrutura.

Escopo de produção a revalidar no início de cada sessão:

- Aplicação: `https://crm.tsiapp.io`
- Host: `vpstsiapp`
- Diretório remoto: `/opt/tsi-stack/apps/crm/crmtsiapp/local-crm`
- Persistência canônica: PostgreSQL local
- Marca: CRMTSiAPP / TSi Telecom
- Acesso administrativo visível: `admin` (identidade interna: `admin@tsiapp.io`)

O frontend destinado ao usuário final não deve mencionar Supabase, dependências legadas, workers, filas internas, tokens, chaves, DSN, variáveis de ambiente, tabelas, endpoints internos ou detalhes de implantação.

## 2. Resultado esperado

O CRMTSiAPP será aceito para o escopo entregue quando, com evidência verificável:

1. Atendentes encontrarem, priorizarem, assumirem, transferirem e encerrarem conversas sem conhecimento técnico.
2. Supervisores visualizarem fila, responsável, prioridade, SLA, volume e exceções operacionais.
3. Administradores leigos configurarem a operação por jornadas guiadas: canal, equipe, fila, horários, templates e notificações.
4. Cada status, botão e configuração visível tiver efeito real, autorização, validação, persistência, feedback e teste correspondente.
5. A experiência for consistente em desktop, tablet, celular, teclado, zoom de 200%, tema claro/escuro e densidade confortável/compacta.
6. Integrações externas só forem declaradas ativas após canário ponta a ponta autorizado.
7. O deploy, backup, rollback e restauração forem reproduzíveis e documentados.

Não declarar “completo”, “premium”, “seguro” ou “pronto para produção” sem listar o escopo, os cenários testados, as limitações e as evidências que poderiam contradizer a conclusão.

## 3. Princípios inegociáveis

1. Verdade operacional: não exibir “conectado”, “enviado”, “configurado”, “entregue” ou “ativo” sem prova persistida e verificável.
2. Simplicidade progressiva: mostrar primeiro a ação de negócio; revelar detalhes técnicos somente no contexto administrativo apropriado.
3. Configuração por resultado: substituir parâmetros técnicos por jornadas como “Conectar WhatsApp”, “Organizar equipe” e “Definir horário de atendimento”.
4. Segurança silenciosa: segredos nunca são renderizados, registrados em logs, incluídos em URLs, argv, sessões tmux ou documentação.
5. Nenhuma mutação sem efeito real: controles sem consumidor de runtime não podem parecer configuráveis.
6. Acessibilidade como requisito de aceite: navegação por teclado, foco visível, contraste suficiente, rótulos explícitos, erros compreensíveis e alvo mínimo de 44 px.
7. Dados e integrações externas: sem credenciais, concluir toda funcionalidade local possível e marcar apenas a ativação externa como pendente; nunca simular conectividade.
8. Reversibilidade: migrações idempotentes, backup antes de deploy, rollback documentado e testes de restauração proporcionais ao risco.
9. Mudanças pequenas e verificadas: TDD antes da implementação, regressão após cada fatia vertical e deploy somente após gate verde.
10. Sem entropia: remover, consolidar ou ocultar elementos que não ajudam o usuário a decidir ou agir.

## 4. Limites e regras operacionais

- Não introduzir Supabase Cloud, Supabase self-hosted, SDK, biblioteca, endpoint, texto de UI ou contrato de runtime dependente de Supabase.
- Não ler `.env`, imprimir variáveis sensíveis ou pedir/aceitar senha no chat. Usar os mecanismos de cofre existentes quando necessário.
- Não alegar paridade completa com Meta ou WAHA sem teste real, assinado quando aplicável e idempotente.
- Todas as ações SSH, inclusive leitura, auditoria, testes e validações, devem rodar em `tmux` remoto idempotente.
- Convenção de sessão: `tsi-crmtsiapp-<acao>`; nunca incluir segredo, token, telefone ou dado pessoal no nome, argv ou log.
- Cada sessão remota deve usar `umask 077`, escrever log restrito e arquivo `.exit` separado. Confirmar em segunda sessão tmux independente.
- Não fazer commit, push, alteração de DNS, rotação de segredo ou destruição de dados sem solicitação explícita.
- Atualizar documentação local em `~/Projects/TSiHomeLab/VPS/` depois de toda mudança, deploy ou descoberta relevante.

## 5. Protocolo de execução autônoma no Hermes

### 5.1 Inicialização de nova janela

1. Ler este playbook, `task_plan.md`, `findings.md`, `progress.md` e os documentos CRMTSiAPP recentes em `VPS/`.
2. Revalidar, não assumir: `git status`, versão implantada, serviços systemd, saúde HTTP, banco, workers, artefatos de backup e rota pública.
3. Criar ou atualizar plano isolado via `planning-with-files`; manter fases, descobertas, erros, decisões e evidências.
4. Manter Kanban no plano:
   - Descoberta
   - Pronto para implementar
   - Em implementação
   - Em validação
   - Bloqueado externamente
   - Concluído
   - Rejeitado/rollback
5. Executar uma fatia vertical por vez: UX, domínio, persistência, autorização, testes, deploy e evidência pertencem ao mesmo cartão.
6. Após duas operações de leitura/pesquisa, registrar as descobertas essenciais em `findings.md`.

### 5.2 Skills e ferramentas

Carregar antes de agir, quando aplicável:

- `planning-with-files`: persistência de plano, achados e progresso.
- `test-driven-development`: RED/GREEN/REFACTOR, testes de regressão e cobertura de falha.
- `popular-web-designs`: referências de layout e padrões de produto sem copiar identidade de terceiros.
- `herme-ui-premium-color-correction`: contraste, paleta, profundidade, foco e consistência visual.
- `tsihomelab-operations`: operação, tmux, evidência, serviços e documentação de VM.
- `audit-closure-gates`: gates de segurança, qualidade, produção e aceite.
- `systematic-debugging`: diagnóstico de falhas repetidas.

Ferramentas preferenciais:

- `read_file` e `search_files` antes de alterar código;
- Chromium via `browser` para validação visual autenticada; se o perfil estiver bloqueado, usar sessão isolada permitida, sem encerrar a sessão do usuário;
- `browser_vision` para layout, contraste percebido, overflow e responsividade;
- `delegate_task` para auditorias independentes que não editem os mesmos arquivos;
- `patch`/`write_file` para mudanças reais;
- `terminal` para testes, git, empacotamento e controle tmux.

### 5.3 Agentes e bloqueios

Usar agentes paralelos somente em trabalho independente:

- agente A: UX, UI, acessibilidade e consistência visual;
- agente B: rotas, domínio, esquema, persistência e consumidores de configuração;
- agente C: segurança, regressões, autorização, webhooks, outbox e continuidade;
- agente D: documentação oficial e benchmark de práticas de produto, quando necessário.

O agente principal integra e verifica toda conclusão. Auto-relato de subagente não comprova alteração, teste ou deploy.

Quando houver indisponibilidade, timeout ou falha de modelo/agente:

1. Registrar causa e artefato observável.
2. Mudar abordagem na segunda tentativa: ferramenta determinística, escopo menor, outro agente configurado ou teste equivalente.
3. Após a terceira tentativa, registrar bloqueio concreto e executar cartões independentes.
4. Não trocar modelo/agente para burlar política, credencial, autenticação, CAPTCHA, controle de acesso ou validação de segurança.
5. Nunca inventar resultados, screenshots, integrações ou respostas de API.

## 6. Auditoria-base obrigatória

Antes de redesign amplo, produzir relatório versionado em `VPS/` contendo:

1. Inventário de rotas, componentes, handlers, tabelas, serviços e workers efetivamente ativos.
2. Mapa de cada controle de UI para validação, autorização, persistência e consumidor de runtime.
3. Controles visíveis sem efeito operacional e controles com efeito técnico demais para usuários leigos.
4. Fluxos por papel: atendente, supervisor, administrador e responsável por integrações.
5. Auditoria de textos: termos técnicos, siglas, inglês desnecessário, mensagens vagas, sucesso falso e referências à arquitetura interna.
6. Auditoria visual em desktop, tablet e celular: hierarquia, densidade, navegação, foco, contraste, overflow, loading, vazio, erro e sucesso.
7. Auditoria de acessibilidade: teclado, foco, landmarks, labels, semântica, contraste, `aria-live` e zoom de 200%.
8. Auditoria de segurança: RBAC, CSRF, XSS, SSRF, segredos, logs, rate limit, HMAC, idempotência, outbox, auditoria, LGPD, backup e restauração.
9. Auditoria de performance: queries da Central, paginação, índices, payload e comportamento com volume de conversas.

Classificar achados como P0, P1, P2 ou P3, contendo impacto, evidência, causa provável, correção mínima, teste de aceite, risco e rollback.

## 7. Arquitetura de informação alvo

### 7.1 Navegação principal

- Central
- Contatos
- Leads
- Canais
- Relatórios — somente quando houver métricas executáveis
- Configurações

Não exibir itens sem função disponível. Recursos futuros devem ser omitidos ou marcados “Em preparação”, sem controles falsos.

### 7.2 Configurações para usuários leigos

Começar aqui
- Checklist de implantação
- Saúde da operação

Atendimento
- Equipes e permissões
- Filas e distribuição
- Horários e SLA
- Templates e respostas rápidas

Integrações
- WhatsApp via QR / conector compatível
- WhatsApp Oficial Meta
- API e webhooks

Organização
- Perfil da empresa
- Marca e aparência
- Notificações

Administração
- Segurança
- Privacidade e LGPD
- Auditoria
- Administração técnica

“Administração técnica” deve ser exclusiva de administradores, conter somente controles efetivos e exibir segredos apenas como estado sanitizado: não configurado, configurado, exige rotação ou teste falhou.

## 8. Padrão de UX e visual alvo

### 8.1 Linguagem

- Português do Brasil claro, direto e orientado a ação.
- Preferir “Conectar WhatsApp”, “Testar conexão”, “Definir responsável” e “Organizar fila”.
- Toda mensagem de erro deve explicar problema, impacto e próxima ação segura.
- Não usar “Erro” ou “Nenhum objeto ativo” sem contexto e ação possível.
- Não expor Supabase, DSN, worker, fila interna, segredo, HMAC, UUID, runtime, Graph API ou tabelas nos fluxos básicos.

### 8.2 Sistema visual

Tokens iniciais a validar por contraste e uso real:

- Fundo: `#F7F8FA`
- Superfície: `#FFFFFF`
- Texto principal: `#17212B`
- Texto secundário: `#667085`
- Borda: `#E4E7EC`
- Primária TSi/WhatsApp: `#146C43`
- Hover primário: `#0F5132`
- Fundo de sucesso: `#EAF7EF`
- Foco: azul com contraste adequado e visível em qualquer superfície
- Estados semânticos: ícone, texto e cor; nunca somente cor

Diretrizes:

- Inter/system-ui, escala tipográfica e espaçamento consistentes;
- sidebar de 250–280 px no desktop, conteúdo fluido e painel contextual recolhível;
- raio de 8–12 px e sombras apenas para separar camadas funcionais;
- iconografia consistente, com texto ou tooltip acessível;
- tema claro/escuro/sistema e densidade confortável/compacta persistidos por usuário e efetivamente aplicados;
- loading, vazio, sucesso e erro com próxima ação clara.

## 9. Backlog orquestrado

### Fase 0 — Baseline e gates

- [ ] Reproduzir estado local e de produção sem alterar dados.
- [ ] Executar suíte completa, análise estática e `hermes verify`.
- [ ] Inventariar telas, rotas, serviços e dados de teste permitidos.
- [ ] Criar capturas autenticadas de todas as rotas relevantes em desktop, tablet e celular.
- [ ] Rodar auditorias independentes de UX, acessibilidade, segurança e configuração.
- [ ] Consolidar achados priorizados e remover duplicidades.

Aceite: baseline reproduzível, evidências sanitizadas, escopo não testado explicitado e nenhum P0 conhecido omitido.

### Fase 1 — Limpeza de conteúdo e contratos verdadeiros

- [ ] Remover do frontend referências a Supabase, arquitetura legada e infraestrutura interna.
- [ ] Mapear e remover/ocultar configurações sem consumidor real.
- [ ] Garantir que cada ação visível tenha autorização, validação, persistência e feedback real.
- [ ] Revisar textos de sucesso, erro, vazio e indisponibilidade para pt-BR amigável.
- [ ] Criar testes que falham quando termos proibidos reaparecem em fluxos básicos.

Aceite: auditoria de DOM/texto não encontra termos internos proibidos; nenhum controle gravável é inócuo.

### Fase 2 — Design system premium acessível

- [ ] Extrair tokens de cor, tipografia, espaçamento, raio, elevação e estados.
- [ ] Padronizar botões, campos, selects, tabs, cards, badges, alertas, confirmações, skeletons e empty states.
- [ ] Aplicar contraste AA, foco visível e estados semânticos em todas as páginas.
- [ ] Implementar tema claro/escuro/sistema e densidade real, persistidos por usuário.
- [ ] Inserir iconografia acessível, avatares e identificadores consistentes.
- [ ] Validar desktop, tablet, celular, teclado e zoom de 200%.

Aceite: preferências alteram o render; contrastes/foco passam auditoria; formulários e responsividade não regressam.

### Fase 3 — Central de conversas profissional

- [ ] Implementar indicadores persistidos de não lida/lida e cursores de leitura.
- [ ] Implementar paginação cursor/keyset para conversas e mensagens.
- [ ] Exibir prioridade, fila, responsável, canal, SLA e regra Meta de forma escaneável e baseada em estado real.
- [ ] Adicionar filtros: minhas, fila, abertas, fechadas, não lidas, SLA em risco e canal.
- [ ] Adicionar ações rápidas seguras: atribuir, transferir, fechar/reabrir, prioridade, adiar e abrir perfil.
- [ ] Implementar notas internas, timeline/auditoria e etiquetas somente se houver modelo, autorização e persistência completos.
- [ ] Evoluir composer com templates aprovados, respostas rápidas, anexos/mídia e mensagem interna somente com fluxo completo e seguro.
- [ ] Proteger janela Meta de 24 h e recuperação por template aprovado.

Aceite: atendente identifica a próxima conversa prioritária, assume/transfere/responde e entende restrições do canal sem documentação externa.

### Fase 4 — Onboarding e configuração guiada

- [ ] Criar dashboard “Começar aqui” com checklist baseado em estado persistido.
- [ ] Criar wizard por provedor de WhatsApp:
  1. escolher QR/conector ou Meta Oficial;
  2. informar somente dados pertinentes;
  3. testar conexão;
  4. escolher equipe/fila inicial;
  5. concluir e mostrar próximo passo.
- [ ] Ocultar campos avançados até solicitação explícita, com explicação de impacto.
- [ ] Criar fluxos guiados para equipe, fila, horário, SLA, templates, notificações e permissões.
- [ ] Mostrar recomendações, impacto e reversão de configuração.
- [ ] Exibir saúde da operação: canal, processamento, fila, último evento, backup e alertas em linguagem humana e sem segredos.

Aceite: administrador leigo prepara uma operação local sem precisar interpretar API, banco, Graph API ou segredo de webhook.

### Fase 5 — Distribuição, SLA e automações executáveis

- [ ] Implementar roteamento automático apenas com regras persistidas, auditáveis e fallback manual.
- [ ] Implementar manual, round-robin e menor carga, com testes de concorrência.
- [ ] Implementar capacidade por atendente, horários, preferência pelo último responsável e fila de exceção.
- [ ] Implementar SLA configurável, alertas de risco/vencimento e escalonamento auditável.
- [ ] Implementar automações somente com gatilho, condição, ação, auditoria, preview/simulação e desligamento seguro.
- [ ] Não exibir automações planejadas antes de o fluxo inteiro existir.

Aceite: distribuição é determinística, reversível, auditada e nunca deixa conversa sem estado compreensível.

### Fase 6 — Templates, mídia, integrações e recuperação

- [ ] Sincronizar templates Meta por contrato idempotente somente quando houver credenciais autorizadas; sem elas, manter CRUD local com limite explícito.
- [ ] Implementar mídia com validação de tipo/tamanho, autorização por recurso e armazenamento seguro antes de habilitar anexos em produção.
- [ ] Criar console de recuperação para webhook/outbox: estado sanitizado, reprocessamento idempotente, justificativa e auditoria.
- [ ] Criar teste de conexão e diagnóstico por canal sem vazar segredo.
- [ ] Implementar API/webhooks somente com escopos, expiração, rotação, rate limit e auditoria.

Aceite: falhas de integração são detectáveis, auditáveis e recuperáveis sem acesso direto ao banco.

### Fase 7 — Segurança, LGPD, observabilidade e continuidade

- [ ] Revalidar RBAC fail-closed, CSRF, sessões, rate limiting, headers, XSS e SSRF.
- [ ] Garantir HMAC, deduplicação e processamento durável para todo webhook aplicável.
- [ ] Revalidar outbox com lease fenced, estado ambíguo, backoff limitado, dead-letter e métricas.
- [ ] Implementar solicitações LGPD: exportação, anonimização, expiração e auditoria.
- [ ] Consolidar métricas com fórmula, fonte de dados e atraso de atualização declarados.
- [ ] Validar backups automáticos e prova de restauração limpa.

Aceite: auditoria independente não encontra bloqueador crítico; restauração é demonstrada em ambiente limpo.

### Fase 8 — Aceitação, deploy e documentação

- [ ] Rodar migração limpa e teste de replicação sem copiar segredos/dados de produção.
- [ ] Executar testes unitários, integração, regressão, segurança, acessibilidade e browser E2E autenticado.
- [ ] Fazer revisão visual final em desktop/tablet/mobile, tema e densidade.
- [ ] Fazer deploy em tmux com backup, health checks, canário de dados e segunda validação tmux.
- [ ] Atualizar `VPS/README.md`, documentação CRMTSiAPP, rollback e evidências.
- [ ] Produzir relatório final: funcionalidades comprovadas, limitações reais, credenciais externas pendentes e próximos passos opcionais.

Aceite: produção saudável, canários aprovados, serviços estáveis, documentação consolidada e nenhum P0/P1 aberto sem mitigação e decisão explícita.

## 10. Validação socrática e popperiana aplicada ao plano

Esta seção não substitui o backlog. Ela impede que o Hermes conclua uma tarefa com base em aparência, teste insuficiente ou autoconfirmação.

### 10.1 Perguntas obrigatórias por cartão

Antes de implementar:

1. Qual problema operacional observável este cartão resolve?
2. Quem é afetado e em qual jornada?
3. Qual é a menor mudança que pode resolver o problema?
4. Que evidência provaria que a mudança não funcionou, é confusa ou é insegura?
5. Como comparar com o comportamento anterior?
6. Como desfazer a mudança se a hipótese falhar?

### 10.2 Registro mínimo no Kanban

Para cada cartão, registrar no `task_plan.md`:

| Campo | Exigência |
|---|---|
| Hipótese | “Se a mudança X for aplicada, o resultado Y ocorrerá na condição Z.” |
| Previsão | Resultado observável em UI, rota, banco, log sanitizado ou métrica. |
| Falsificador | Evento que rejeita a hipótese. |
| Experimento | Teste unitário/E2E/canário mínimo e reproduzível. |
| Controle | Estado anterior, cenário negativo ou caminho alternativo. |
| Decisão | Aceitar provisoriamente, corrigir ou rollback. |
| Evidência | Arquivo, comando, saída sanitizada e data. |

Exemplo de configuração de canal:

- Hipótese: o wizard por provedor evita que administrador informe campos WAHA ao selecionar Meta.
- Falsificador: payload Meta aceita `session_name` WAHA; UI mostra campo incompatível; teste de conexão não identifica o provedor selecionado.
- Experimento: teste de renderização, validação de rota, browser E2E e canário de conexão autorizado.
- Decisão: não publicar enquanto qualquer falsificador persistir.

### 10.3 Falsificadores mínimos por fase

- Fase 1: termo interno aparece no DOM básico; botão salva valor sem consumidor real; sucesso aparece sem persistência.
- Fase 2: foco não visível, contraste insuficiente, componente inconsistente, tema/densidade salva sem alterar render ou conteúdo essencial quebra em zoom/mobile.
- Fase 3: filtro não altera consulta; ação não persiste/audita; status de entrega é exibido sem evento; texto livre Meta é permitido fora da janela.
- Fase 4: checklist conclui sem estado real; wizard aceita dados de provedor errado; etapa não fornece próximo passo; diagnóstico vaza segredo.
- Fase 5: concorrência cria dupla atribuição; conversa fica sem destino compreensível; automação não tem auditoria/preview/desligamento.
- Fase 6: reprocessamento duplica efeito; mídia é acessível sem autorização; template é declarado sincronizado sem fonte externa; diagnóstico expõe credencial.
- Fase 7: papel insuficiente ou CSRF/origem inválida muta dados; webhook duplicado gera dois efeitos; backup não restaura; health verde ignora dependência crítica.
- Fase 8: canário falha, serviço reinicia, deploy não possui rollback comprovado ou ambiente real diverge do validado.

## 11. Testes obrigatórios por fatia vertical

Todo cartão funcional deve incluir, quando aplicável:

- teste unitário do domínio/validação;
- teste de autorização e CSRF;
- teste de persistência/migração idempotente;
- teste de rota HTTP e códigos de erro corretos;
- teste de renderização com escaping seguro;
- teste de estados vazio, loading, erro e sucesso;
- teste de acessibilidade básica e teclado;
- teste de regressão DOM/visual quando a tela mudar;
- jornada E2E autenticada;
- teste remoto em `vpstsiapp` por tmux após deploy;
- teste negativo que tente refutar a hipótese do cartão;
- teste de concorrência/idempotência para webhook, routing, outbox e recuperação quando afetados.

Não considerar concluído porque a página renderiza, um teste local passa ou um subagente relata sucesso.

## 12. Evidência, documentação e encerramento

Ao fim de cada fase, atualizar:

- `task_plan.md`: status do cartão, hipótese, decisão e próximo cartão;
- `findings.md`: fatos verificados, fontes e hipóteses rejeitadas;
- `progress.md`: comandos, resultados, erros e mudança de abordagem;
- `VPS/CRMTSIAPP-*.md`: mudança, backup, deploy, validação, rollback e limitações;
- `VPS/README.md`: link para a documentação consolidada.

Toda evidência deve ser sanitizada. Nunca registrar token, senha, hash de sessão, conteúdo de `.env`, dados pessoais de clientes ou URL privada sensível.

## 13. Estado inicial conhecido — revalidar

- Uma revisão anterior registrou hardening e configuração profissional parcial, com `121/121` testes locais/remotos em uma revisão específica; isto não prova o estado atual.
- Aplicação, worker de outbox e worker de webhook constavam ativos no último relatório; confirmar no runtime antes de qualquer conclusão.
- A base funcional inclui Central, canais, equipes, filas, templates, segurança e catálogo. Ganhos prioritários: UX guiada, legibilidade operacional, não lida/lida, paginação, roteamento, SLA, sincronização de templates, recuperação, mídia e configurações executáveis.
- No último registro não havia canal Meta/WAHA produtivo configurado. Isso não bloqueia evolução local; bloqueia somente a prova externa até existir canal e credenciais de teste autorizados.
