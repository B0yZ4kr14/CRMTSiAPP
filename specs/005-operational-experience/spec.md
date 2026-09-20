# Feature Specification: Operação Completa sem Configuração Manual

**Feature Branch**: não criada (nenhum hook de branch configurado)

**Created**: 2026-09-19

**Status**: Complete

**Input**: User description: "Tornar o Inbox instantâneo; eliminar edição manual de arquivos e banco por meio de Setup Wizard e painel de tokens de IA/canais; unificar a administração diária no crm-cli; permitir criação visual de automações e campanhas."

## Clarifications

### Session 2026-09-20

- Q: Durante a reconciliação após queda do Inbox, qual deve ser a política oficial quando o replay acumulado exceder 6.000 eventos por tenant? → A: Aumentar dinamicamente o limite de replay até recuperar todos os eventos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atender conversas em tempo real (Priority: P1)

Como atendente, quero receber novas mensagens, alterações de responsável, mudanças de estado e alertas de prazo na conversa ativa sem recarregar a página, para responder imediatamente e não perder eventos relevantes.

**Why this priority**: A atualização tardia do Inbox afeta diretamente a qualidade e o prazo do atendimento.

**Independent Test**: Dois atendentes autorizados observam uma conversa; uma nova mensagem e uma mudança de atribuição aparecem para ambos sem recarga, enquanto usuários sem acesso e usuários de outro tenant não recebem o evento.

**Acceptance Scenarios**:

1. **Given** um atendente autenticado com o Inbox aberto, **When** uma nova mensagem é confirmada, **Then** a conversa, a lista e os contadores são atualizados sem recarga manual.
2. **Given** uma alteração de responsável, estado ou prazo, **When** ela é confirmada, **Then** todos os usuários autorizados visualizam o novo estado em ordem consistente.
3. **Given** uma interrupção temporária da conexão, **When** a conectividade retorna, **Then** o Inbox recupera as alterações perdidas sem duplicar mensagens.
4. **Given** um evento de outro tenant ou fora do escopo do usuário, **When** ele é publicado, **Then** nenhum dado ou metadado desse evento é entregue ao usuário atual.

---

### User Story 2 - Configurar a instalação e seus provedores pela interface (Priority: P1)

Como administrador, quero concluir uma configuração inicial guiada e gerenciar credenciais de IA e canais em uma área administrativa, para colocar a instância em operação sem editar arquivos, variáveis ou registros diretamente.

**Why this priority**: A dependência de configuração manual aumenta erros, expõe segredos e exige conhecimento da estrutura interna do produto.

**Independent Test**: Em uma instalação limpa, o administrador cria o primeiro acesso, define a organização, configura e testa um canal e um provedor de IA, revisa o resumo e ativa a instância sem usar terminal ou banco.

**Acceptance Scenarios**:

1. **Given** uma instalação ainda não configurada, **When** o primeiro administrador acessa o produto, **Then** somente a jornada inicial e os recursos indispensáveis à sua conclusão ficam disponíveis.
2. **Given** uma etapa com dados inválidos ou dependência indisponível, **When** o administrador tenta avançar, **Then** a conclusão é bloqueada, o problema é explicado e as etapas válidas são preservadas.
3. **Given** uma credencial válida, **When** o administrador a salva e testa, **Then** o sistema informa o resultado e passa a exibir somente uma identificação mascarada.
4. **Given** todas as etapas válidas, **When** o administrador confirma o resumo, **Then** a ativação ocorre uma única vez, sem estado parcial, e fica registrada para auditoria.
5. **Given** uma instalação já ativada, **When** alguém tenta repetir a configuração inicial, **Then** a tentativa é negada e o usuário é direcionado às configurações regulares.

---

### User Story 3 - Administrar a instância pelo terminal (Priority: P2)

Como operador de infraestrutura, quero uma única ferramenta de terminal para executar tarefas administrativas frequentes e automatizáveis, com ajuda consistente, confirmações seguras e resultados verificáveis.

**Why this priority**: Scripts isolados e procedimentos implícitos dificultam automação, suporte e auditoria operacional.

**Independent Test**: Em ambiente controlado, o operador consulta a ajuda, verifica a saúde da instância, cria um administrador, inspeciona trabalhadores, drena uma fila e executa uma solicitação de privacidade, conferindo códigos de saída e auditoria.

**Acceptance Scenarios**:

1. **Given** uma instalação válida, **When** o operador solicita ajuda ou diagnóstico, **Then** recebe comandos, parâmetros, estado e código de saída inequívocos.
2. **Given** uma operação destrutiva, **When** falta confirmação explícita, tenant ou autorização, **Then** nenhuma alteração é aplicada.
3. **Given** uma execução automatizada, **When** a saída estruturada é solicitada, **Then** o resultado pode ser interpretado sem depender de texto voltado a humanos.
4. **Given** uma operação repetida com a mesma identidade de execução, **When** ela já foi concluída, **Then** o sistema não duplica efeitos e informa o resultado existente.
5. **Given** uma falha durante uma operação, **When** o comando termina, **Then** o estado final, o motivo seguro da falha e eventuais ações de recuperação são apresentados sem declarar sucesso parcial.

---

### User Story 4 - Criar automações e campanhas visualmente (Priority: P2)

Como gestor não técnico, quero montar automações e conteúdos de campanha por interação visual, validar e simular o resultado e publicar versões controladas, sem editar estruturas textuais.

**Why this priority**: A edição textual de estruturas de automação e campanha reduz autonomia e eleva o risco de erros de negócio.

**Independent Test**: O gestor cria um fluxo com gatilho, condição e ação, simula casos, publica uma versão e cria um conteúdo de campanha com variáveis e pré-visualização por canal, sem editar representação textual.

**Acceptance Scenarios**:

1. **Given** um fluxo em rascunho, **When** faltam conexões, parâmetros ou referências válidas, **Then** a publicação é bloqueada e cada problema é localizado no editor.
2. **Given** um fluxo válido, **When** o gestor o simula, **Then** visualiza o caminho e os efeitos previstos sem alterar dados reais.
3. **Given** uma versão publicada em uso, **When** o rascunho é alterado, **Then** execuções existentes permanecem vinculadas à versão publicada até nova publicação explícita.
4. **Given** um conteúdo de campanha com variáveis, **When** o gestor seleciona um canal e solicita a prévia, **Then** vê o conteúdo resultante e incompatibilidades antes do envio.
5. **Given** uma versão anterior válida, **When** o gestor solicita restauração, **Then** uma nova versão controlada é criada sem apagar o histórico.

## Edge Cases

- Duas pessoas tentam concluir a configuração inicial ao mesmo tempo.
- Uma credencial é validada, mas expira ou é revogada antes da ativação.
- A conexão em tempo real cai durante o recebimento de uma mensagem ou após sua confirmação.
- Eventos chegam repetidos, atrasados ou fora de ordem.
- Uma permissão é removida ou uma presença expira enquanto a sessão está conectada; a presença MUST usar heartbeat com TTL e desaparecer sem emitir dados fora do escopo.
- Uma fila é drenada enquanto novas tarefas continuam chegando.
- Uma solicitação de privacidade encontra dados sujeitos a retenção legal.
- Um fluxo visual contém ciclo não permitido, ramo inalcançável ou ação removida após publicação.
- Uma campanha usa variável ausente ou conteúdo incompatível com o canal escolhido.
- O navegador é fechado durante uma edição ainda não publicada.

## Functional Requirements

### Inbox em tempo real

- **FR-001**: O sistema MUST atualizar mensagens, conversas, responsáveis, estados, presença autorizada e alertas de prazo sem exigir recarga manual.
- **FR-002**: Cada atualização MUST possuir identidade estável e posição ou versão verificável para permitir ordenação e deduplicação.
- **FR-003**: Após interrupção temporária, o sistema MUST recuperar atualizações perdidas ou reconciliar o estado atual sem duplicar efeitos; se o volume acumulado exceder 6.000 eventos por tenant, o sistema MUST aumentar dinamicamente o replay até recuperar todos os eventos autorizados, mantendo ordenação, deduplicação e limites de segurança contra vazamento entre tenants.
- **FR-004**: A entrega de atualizações MUST aplicar o requisito transversal FR-029 e, adicionalmente, revalidar sessão e escopo durante conexões persistentes e no replay.
- **FR-005**: O Inbox MUST informar quando seus dados deixarem de estar atuais e MUST oferecer recuperação automática ou manual segura.

### Setup Wizard e painel de provedores

- **FR-006**: O sistema MUST identificar inequivocamente quando a configuração inicial está pendente.
- **FR-007**: Antes da ativação, o sistema MUST restringir o acesso à jornada inicial e aos recursos indispensáveis para concluí-la.
- **FR-008**: A jornada inicial MUST coletar, validar e permitir revisar primeiro administrador, identidade da organização, endereço público, opções regionais e conexões obrigatórias.
- **FR-009**: A ativação MUST ser atômica, auditável e protegida contra repetição e concorrência; antes do primeiro administrador existir, toda mutação de setup MUST exigir uma credencial bootstrap de uso único vinculada à instalação e ao tenant inicial, armazenada somente como hash, expirada e limitada por tentativas, e invalidada na mesma transação da ativação.
- **FR-010**: Administradores autorizados MUST poder cadastrar, testar, substituir, desativar e identificar credenciais de IA e canais por tenant.
- **FR-011**: Valores secretos persistidos MUST nunca ser reexibidos; telas, mensagens, históricos e registros MUST usar identificação mascarada.
- **FR-012**: O painel MUST permitir selecionar apenas provedores, modelos, canais, prompts e políticas autorizados para o tenant.
- **FR-013**: Testes de conectividade MUST produzir resultado seguro e acionável sem expor o segredo.
- **FR-014**: Falha de provedor MUST seguir comportamento visível e configurado, sem troca silenciosa para fornecedor não autorizado.

### Administração unificada pelo terminal

- **FR-015**: A ferramenta administrativa MUST oferecer ajuda consistente, saída para humanos e saída estruturada para automação.
- **FR-016**: A ferramenta MUST permitir criar administradores, redefinir acesso, verificar integridade, inspecionar trabalhadores, drenar filas e executar solicitações de privacidade.
- **FR-017**: Cada comando MUST exigir e aplicar tenant e autorização compatíveis com a operação.
- **FR-018**: Operações destrutivas MUST exigir confirmação explícita e MUST falhar sem efeitos quando a confirmação ou o escopo forem insuficientes.
- **FR-019**: Cada comando MUST retornar código de saída determinístico e resultado que diferencie sucesso, recusa, falha recuperável e falha definitiva.
- **FR-020**: Operações repetíveis MUST aceitar uma identidade de execução e impedir efeitos duplicados.
- **FR-021**: Ações administrativas MUST gerar auditoria sem incluir segredos ou dados pessoais desnecessários.

### Editores visuais

- **FR-022**: O editor de automações MUST permitir compor visualmente gatilhos, condições, ramificações e ações sem exigir edição de representação textual.
- **FR-023**: O editor MUST validar conexões, parâmetros, ciclos não permitidos, referências e ações indisponíveis antes da publicação.
- **FR-024**: Usuários MUST poder simular rascunhos sem efeitos reais e visualizar o caminho avaliado.
- **FR-025**: Automações e conteúdos MUST aplicar um lifecycle comum de rascunhos e versões publicadas imutáveis, com histórico e restauração controlada.
- **FR-026**: O editor de campanhas MUST permitir conteúdo rico, variáveis aprovadas e pré-visualização por canal.
- **FR-027**: Conteúdos de campanha MUST aplicar FR-025 e preservar também o perfil de capacidade do canal utilizado na compilação/publicação.
- **FR-028**: Publicação e restauração MUST respeitar permissões, tenant e dependências ativas.

### Requisitos transversais

- **FR-029**: Toda leitura, escrita, atualização, comando e publicação MUST negar acesso por padrão e aplicar explicitamente tenant e autorização.
- **FR-030**: Falhas MUST preservar consistência, apresentar orientação acionável e não declarar sucesso quando a operação estiver incompleta.
- **FR-031**: Nenhuma capacidade MUST ser considerada concluída com dados simulados, tela estática, controle sem efeito ou documentação sem jornada executável.
- **FR-032**: Toda capacidade concluída MUST possuir evidência repetível de comportamento, persistência, autorização e isolamento em instalação limpa e atualização de instalação existente.

## Key Entities

- **Estado de configuração inicial**: progresso, validações, responsável, versão e instante de ativação.
- **Perfil da organização**: identidade, endereço público, opções regionais e preferências operacionais do tenant.
- **Configuração de provedor ou canal**: tipo, identificação mascarada, opções permitidas, estado de validação e histórico; não disponibiliza o segredo para consulta.
- **Assinatura de atualização**: usuário, tenant, escopos autorizados, posição de recuperação e estado de conexão.
- **Evento operacional**: identidade, tipo, versão, tenant, recurso, instante e dados mínimos autorizados.
- **Execução administrativa**: comando, identidade de execução, operador, tenant, parâmetros não secretos, estado, resultado e auditoria.
- **Fluxo visual**: tenant, nós, conexões, validações, rascunho e versões publicadas.
- **Conteúdo de campanha**: tenant, canal, conteúdo, variáveis aprovadas, prévias, rascunho e versões publicadas.
- **Registro de auditoria**: ator, tenant, ação, recurso, instante, resultado e diferenças não secretas.

## Scope Boundaries

### Included

- Atualização instantânea do Inbox para eventos operacionais autorizados e recuperação após desconexão.
- Configuração inicial guiada e gestão administrativa de credenciais, provedores de IA e canais já suportados pelo produto.
- Uma interface de terminal unificada para as seis famílias de operação explicitadas em FR-016.
- Editores visuais de automações e conteúdo de campanhas, incluindo validação, simulação, versionamento e prévia.
- Migração segura das configurações existentes e validação em instalação nova e atualizada.

### Excluded

- Criação de novos protocolos, provedores ou canais além dos contratos já suportados.
- Aplicativos móveis nativos.
- Um construtor genérico de aplicações ou personalização visual irrestrita.
- Substituição das regras de negócio atuais de atendimento, automação, campanha ou retenção legal, salvo ajustes necessários para expô-las com segurança nas novas jornadas.
- Novos módulos de relatórios ou dashboard fora dos estados e contadores necessários ao Inbox.

## Assumptions

- Autenticação, papéis, tenant e contratos de provedores/canais já existem e permanecem como autoridades das novas jornadas.
- A persistência principal continuará sob controle local da instalação, sem dependência obrigatória de armazenamento externo.
- A configuração inicial será realizada por pessoa autorizada com acesso ao ambiente da instalação.
- Credenciais podem expirar ou ser revogadas; indisponibilidade não autoriza exposição nem troca silenciosa de fornecedor.
- Solicitações de privacidade respeitarão retenções legais configuradas e informarão o que foi excluído, anonimizado ou retido.
- Datas, prazos e auditorias usarão referência temporal inequívoca e serão apresentados no fuso configurado do tenant.

## Dependencies

- Inventário confirmado dos eventos do Inbox, provedores, canais, modelos e ações administrativas atualmente suportados.
- Matriz vigente de papéis, permissões e escopos por tenant e equipe.
- Política aprovada de segredos, privacidade, retenção e auditoria.
- Definições de gatilhos, condições, ações, variáveis e restrições de canal disponíveis aos editores.
- Ambientes representativos de instalação limpa e atualização para testes de aceite.
- Participantes representativos disponíveis para os testes moderados de SC-004, SC-006 e SC-009, com consentimento e evidência anonimizada.
- Host de referência de performance documentado com CPU, memória, versões de Node.js/PostgreSQL, latência de rede e configuração de proxy.

## Success Criteria *(mandatory)*

- **SC-001**: No perfil de carga de aceite — 100 conexões simultâneas, 20 eventos por segundo durante 10 minutos e payload de até 8 KiB no host de referência documentado — 95% das mensagens e mudanças operacionais confirmadas aparecem para usuários autorizados em até 2 segundos, sem recarga manual.
- **SC-002**: No mesmo perfil de carga, após interrupções de até 5 minutos com pelo menos 6.000 eventos acumulados por tenant — e com replay ampliado dinamicamente quando houver mais eventos — 100% das sessões de teste reconciliam todos os eventos autorizados sem mensagens duplicadas ou alterações perdidas; para os primeiros 6.000 eventos, a reconciliação MUST ocorrer em até 10 segundos.
- **SC-003**: Nenhum evento do conjunto de isolamento é entregue a usuário de outro tenant ou fora de seu escopo autorizado.
- **SC-004**: Em teste moderado com no mínimo 10 administradores representativos que não conhecem a estrutura interna, pelo menos 90% concluem um roteiro padronizado de ativação em até 15 minutos sem editar arquivos, variáveis ou banco; tempo, conclusão e pedido de ajuda são registrados anonimamente.
- **SC-005**: 100% dos valores secretos testados permanecem ausentes de telas de consulta, respostas de erro, saídas administrativas, exportações, auditorias e registros.
- **SC-006**: Em validação com no mínimo 3 operadores treinados e um ambiente descartável por participante, cada operador conclui cada procedimento administrativo previsto em até 5 minutos usando somente a ajuda da ferramenta; tempo, código de saída e resultado são registrados anonimamente.
- **SC-007**: 100% das operações destrutivas testadas sem confirmação, autorização ou tenant explícito são recusadas sem efeito parcial.
- **SC-008**: 100% das repetições com a mesma identidade de execução não produzem efeitos duplicados.
- **SC-009**: Em teste moderado com no mínimo 10 gestores representativos, pelo menos 85% criam, simulam e publicam uma automação válida e uma campanha de exemplo em até 20 minutos sem editar estruturas textuais; conclusão, tempo, erros e pedido de ajuda são registrados anonimamente.
- **SC-010**: 100% dos fluxos inválidos, referências indisponíveis e conteúdos incompatíveis do conjunto de aceite são bloqueados antes da publicação com indicação do problema.
- **SC-011**: Os quatro fluxos prioritários passam pelos mesmos cenários de aceite em uma instalação limpa e em uma instalação atualizada, sem perda de configuração válida.
- **SC-012**: Nenhuma capacidade é aceita com dados simulados, tela estática, controle sem efeito ou teste ignorado; cada conclusão possui evidência repetível da jornada real.
