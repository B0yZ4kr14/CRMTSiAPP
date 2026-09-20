# Feature Specification: Fechamento das Lacunas de Produção

**Feature Branch**: não criada (nenhum hook de branch configurado)

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Inventariar o estado atual do CRMTSiAPP e fechar as lacunas necessárias para torná-lo apto, amigável e funcional em produção: onboarding guiado, dashboard dinâmico, gestão de provedores de IA, administração por terminal, comunicação em tempo real, editores visuais e cobertura integral dos módulos configuráveis."

## Contexto e objetivo

O CRMTSiAPP já possui regras de negócio, serviços, contratos e algumas interfaces, mas ainda exige conhecimento técnico e intervenções manuais para tarefas essenciais. Esta iniciativa deve transformar essas capacidades dispersas em jornadas operacionais completas, seguras e comprováveis para administradores, operadores, atendentes e gestores.

O resultado esperado é eliminar dependências rotineiras de edição direta no banco, arquivos de configuração e estruturas textuais, sem considerar como concluídas páginas estáticas, dados simulados ou controles sem efeito persistente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Colocar uma nova instância em operação (Priority: P1)

Como administrador responsável por uma nova instalação, quero concluir uma jornada guiada de configuração inicial para criar o primeiro administrador, definir a organização, validar os recursos obrigatórios e ativar canais, sem editar arquivos ou executar comandos no banco.

**Why this priority**: Sem uma configuração inicial segura e compreensível, a adoção depende de intervenção especializada e a instância pode entrar em operação incompleta.

**Independent Test**: Em uma instalação limpa, um administrador conclui todas as etapas apresentadas, revisa as escolhas, ativa a instância e acessa o sistema com as configurações persistidas.

**Acceptance Scenarios**:

1. **Given** uma instalação sem configuração concluída, **When** o primeiro usuário acessa o produto, **Then** somente a jornada de configuração inicial e os recursos indispensáveis a ela ficam disponíveis.
2. **Given** dados obrigatórios inválidos ou uma dependência indisponível, **When** o administrador tenta avançar, **Then** o sistema impede a conclusão, identifica o problema e preserva as etapas válidas já preenchidas.
3. **Given** todas as etapas válidas, **When** o administrador confirma o resumo, **Then** a configuração é ativada uma única vez, registrada para auditoria e o acesso administrativo passa a funcionar.
4. **Given** uma instalação já ativada, **When** qualquer usuário tenta reabrir a configuração inicial, **Then** o sistema nega a repetição e orienta o administrador para as telas regulares de configuração.

---

### User Story 2 - Atender conversas em tempo real (Priority: P1)

Como atendente, quero receber novas mensagens, mudanças de atribuição, presença e alertas de prazo na conversa aberta sem recarregar a página, para responder no momento correto e evitar violações de atendimento.

**Why this priority**: A atualização tardia do Inbox compromete diretamente o atendimento de alto volume e a observância de prazos.

**Independent Test**: Dois usuários autenticados no mesmo tenant observam a mesma conversa; uma nova mensagem e uma mudança de atribuição aparecem para ambos sem atualização manual, enquanto um usuário de outro tenant não recebe qualquer evento.

**Acceptance Scenarios**:

1. **Given** um atendente autenticado com o Inbox aberto, **When** chega uma mensagem para seu tenant, **Then** a conversa, o contador e a notificação são atualizados sem recarregar a página.
2. **Given** uma alteração de responsável, status ou prazo, **When** ela é confirmada, **Then** todos os usuários autorizados recebem o novo estado em ordem consistente.
3. **Given** uma interrupção temporária da conexão, **When** a conectividade retorna, **Then** a interface recupera as mudanças perdidas sem duplicar mensagens.
4. **Given** um evento pertencente a outro tenant, **When** ele é publicado, **Then** nenhum dado ou metadado desse evento é entregue ao atendente atual.

---

### User Story 3 - Configurar provedores e canais com segurança (Priority: P1)

Como administrador de tenant, quero cadastrar, testar, substituir e desativar credenciais de provedores de IA e canais por uma interface centralizada, além de escolher modelos e políticas permitidas, sem visualizar segredos já armazenados.

**Why this priority**: A configuração manual de credenciais aumenta o risco operacional e impede autonomia por tenant.

**Independent Test**: Um administrador cadastra uma credencial, valida a conectividade, seleciona um modelo permitido, utiliza o provedor em uma operação controlada, substitui a credencial e confirma que o valor secreto nunca é reexibido.

**Acceptance Scenarios**:

1. **Given** um administrador autorizado, **When** ele salva uma credencial válida, **Then** o sistema mostra apenas identificação mascarada, estado de validação e data da última alteração.
2. **Given** uma credencial inválida ou provedor indisponível, **When** o administrador executa o teste, **Then** o sistema apresenta resultado seguro e acionável sem expor o segredo.
3. **Given** um usuário sem permissão administrativa, **When** tenta consultar ou alterar provedores, **Then** o acesso é negado e registrado.
4. **Given** uma troca de credencial, **When** a nova versão é validada, **Then** ela passa a ser usada sem revelar nem restaurar o valor anterior.

---

### User Story 4 - Administrar a instância pelo terminal (Priority: P2)

Como operador de infraestrutura, quero uma ferramenta de administração coerente e documentada para criar administradores, redefinir acessos, verificar integridade, inspecionar trabalhadores, drenar filas e executar solicitações de privacidade com confirmação e rastreabilidade.

**Why this priority**: Operações críticas hoje dependem de scripts isolados, conhecimento implícito e procedimentos difíceis de auditar.

**Independent Test**: Em ambiente controlado, o operador consulta ajuda, verifica o estado da instância, executa uma operação segura e uma destrutiva com confirmação explícita, e valida códigos de saída e registros de auditoria.

**Acceptance Scenarios**:

1. **Given** uma instalação válida, **When** o operador solicita ajuda ou diagnóstico, **Then** recebe comandos, parâmetros e resultado legíveis, além de um código de saída confiável.
2. **Given** uma operação destrutiva, **When** não há confirmação explícita ou a autorização é insuficiente, **Then** nenhuma alteração é aplicada.
3. **Given** uma operação repetida com a mesma chave de execução, **When** ela já foi concluída, **Then** o resultado anterior é informado sem duplicar efeitos.
4. **Given** uma solicitação de privacidade, **When** ela é executada, **Then** o escopo, as exceções legais, o resultado e a identidade do operador ficam registrados.

---

### User Story 5 - Acompanhar a operação por indicadores confiáveis (Priority: P2)

Como gestor, quero visualizar volume de mensagens, filas, prazos, produtividade e conversões com filtros de período, equipe, canal e fila, para identificar gargalos e tomar decisões com dados atuais.

**Why this priority**: Listas estáticas e métricas sem filtros não permitem interpretar o estado operacional nem investigar desvios.

**Independent Test**: Um gestor seleciona um intervalo e filtros, confere os totais contra os registros de origem, acompanha uma atualização recente e exporta a visão respeitando seu escopo de acesso.

**Acceptance Scenarios**:

1. **Given** dados operacionais existentes, **When** o gestor altera período ou filtros, **Then** todos os indicadores e gráficos usam exatamente o mesmo recorte.
2. **Given** uma nova atividade relevante, **When** ela é confirmada, **Then** os indicadores afetados são atualizados sem exigir recarga completa.
3. **Given** um conjunto sem dados, **When** ele é selecionado, **Then** a interface diferencia ausência de dados, erro e carregamento.
4. **Given** um gestor limitado a determinadas equipes, **When** consulta ou exporta indicadores, **Then** recebe somente dados dentro de seu escopo.

---

### User Story 6 - Criar automações e campanhas visualmente (Priority: P2)

Como gestor não técnico, quero montar automações e conteúdos de campanha em editores visuais, validar o resultado e publicar versões controladas, sem editar estruturas textuais.

**Why this priority**: A dependência de estruturas técnicas reduz autonomia e aumenta erros em processos de negócio frequentes.

**Independent Test**: O gestor cria um fluxo com gatilho, condição e ação, simula casos válidos e inválidos, publica uma versão e confirma que execuções novas usam apenas a versão publicada; também cria e pré-visualiza um conteúdo de campanha.

**Acceptance Scenarios**:

1. **Given** um fluxo em rascunho, **When** faltam conexões ou parâmetros obrigatórios, **Then** a publicação é bloqueada e cada erro é localizado no editor.
2. **Given** um fluxo válido, **When** o gestor o simula com dados de teste, **Then** vê o caminho percorrido e os efeitos previstos sem afetar dados reais.
3. **Given** uma versão publicada em uso, **When** o gestor altera o rascunho, **Then** execuções existentes permanecem vinculadas à versão publicada até nova publicação explícita.
4. **Given** um conteúdo de campanha, **When** o gestor alterna canais e tamanhos de visualização, **Then** a prévia evidencia incompatibilidades antes do envio.

---

### User Story 7 - Configurar integralmente os módulos de negócio (Priority: P3)

Como administrador funcional, quero gerenciar pelo painel todas as tabelas de domínio, filas, horários, regras de prazo, integrações e canais autorizados, com validações e auditoria equivalentes às regras do produto.

**Why this priority**: Recursos existentes no domínio não são operacionalmente completos enquanto dependerem de acesso direto ao armazenamento ou de telas parciais.

**Independent Test**: Para cada classe configurável inventariada, o administrador lista, cria, edita, ativa/desativa e consulta o histórico conforme permitido, e a configuração alterada passa a governar uma jornada real do produto.

**Acceptance Scenarios**:

1. **Given** uma entidade configurável autorizada, **When** o administrador cria ou altera um registro válido, **Then** a mudança persiste e afeta a operação correspondente.
2. **Given** uma referência em uso ou regra inválida, **When** o administrador tenta remover ou alterar o registro, **Then** o sistema protege a integridade e explica as dependências.
3. **Given** dois tenants, **When** seus administradores configuram entidades equivalentes, **Then** cada tenant visualiza e utiliza exclusivamente seus próprios dados.
4. **Given** uma alteração administrativa, **When** ela é concluída, **Then** autor, instante, valores relevantes e contexto ficam disponíveis no histórico de auditoria.

## Edge Cases

- Duas pessoas tentam concluir a configuração inicial simultaneamente.
- Uma etapa externa é validada e depois fica indisponível antes da ativação final.
- O navegador perde conectividade durante edição, recebimento de eventos ou publicação.
- Eventos são entregues fora de ordem, repetidos ou após a remoção da permissão do usuário.
- Uma credencial válida expira, é revogada ou perde acesso a um modelo previamente selecionado.
- Uma fila é drenada enquanto novas tarefas continuam chegando.
- Uma solicitação de privacidade abrange dados sujeitos a retenção legal ou compartilhados por registros imutáveis.
- Filtros atravessam mudança de fuso horário ou horário de verão.
- Um fluxo visual contém ciclo, ramo inalcançável ou ação removida depois de sua publicação.
- Uma configuração é desativada enquanto está referenciada por conversa, campanha ou automação ativa.
- Dados de dashboard chegam atrasados ou parcialmente indisponíveis; o sistema não pode apresentá-los como atuais.

## Functional Requirements

### Configuração inicial

- **FR-001**: O sistema MUST detectar de forma inequívoca se a configuração inicial ainda está pendente.
- **FR-002**: O sistema MUST restringir uma instalação não configurada à jornada inicial e aos recursos estritamente necessários para concluí-la.
- **FR-003**: A jornada inicial MUST coletar, validar e permitir revisar identidade da organização, primeiro administrador, endereço público, opções regionais e conexões obrigatórias.
- **FR-004**: O sistema MUST preservar etapas válidas após falhas recuperáveis e MUST impedir ativação parcial.
- **FR-005**: A conclusão da configuração MUST ser atômica, auditável e protegida contra repetição ou concorrência.

### Atualização em tempo real

- **FR-006**: Usuários autenticados MUST receber, sem recarga manual, novas mensagens, alterações de conversa, presença autorizada e alertas de prazo relevantes ao seu escopo.
- **FR-007**: Cada atualização MUST carregar identidade estável, ordem ou versão verificável e contexto de tenant suficiente para deduplicação e isolamento.
- **FR-008**: Após interrupção temporária, o cliente MUST recuperar atualizações perdidas ou reconciliar o estado atual sem duplicar efeitos.
- **FR-009**: A entrega de atualizações MUST aplicar as mesmas regras de autenticação, autorização e isolamento usadas na consulta do recurso original.
- **FR-010**: O sistema MUST indicar ao usuário quando os dados deixarem de estar atuais e MUST oferecer recuperação automática ou manual segura.

### Provedores de IA e canais

- **FR-011**: Administradores autorizados MUST poder cadastrar, validar, substituir, desativar e identificar credenciais por tenant sem que valores persistidos sejam reexibidos.
- **FR-012**: O sistema MUST permitir selecionar provedores, modelos, canais, prompts e políticas apenas entre opções permitidas para o tenant.
- **FR-013**: Testes de conectividade MUST retornar estado acionável sem registrar, transmitir ao navegador ou expor segredos em mensagens.
- **FR-014**: Alterações de credenciais e políticas MUST ser auditadas sem incluir o material secreto.
- **FR-015**: Falhas ou indisponibilidade de provedor MUST resultar em comportamento explicitamente configurado, visível e seguro, sem troca silenciosa para fornecedor não autorizado.

### Administração por terminal

- **FR-016**: A ferramenta administrativa MUST oferecer ajuda consistente, saída legível por humanos e opção de saída estruturada para automação.
- **FR-017**: A ferramenta MUST suportar criação de administrador, redefinição segura de acesso, diagnóstico de integridade, inspeção de trabalhadores, drenagem de filas e execução de solicitações de privacidade.
- **FR-018**: Operações destrutivas MUST exigir confirmação explícita, escopo de tenant e autorização apropriada; em execução não interativa, a confirmação MUST ser inequívoca.
- **FR-019**: Todo comando MUST retornar código de saída determinístico e MUST evitar efeitos parciais silenciosos.
- **FR-020**: Operações repetíveis MUST aceitar identidade de execução e MUST impedir efeitos duplicados.

### Dashboard operacional

- **FR-021**: O dashboard MUST apresentar indicadores de filas, prazos, conversões, produtividade e volume de mensagens com definições acessíveis ao usuário.
- **FR-022**: Período, equipe, canal e fila MUST filtrar de forma consistente todos os indicadores, gráficos, detalhes e exportações relacionados.
- **FR-023**: O dashboard MUST distinguir claramente dado atual, dado atrasado, ausência de dados, carregamento e erro.
- **FR-024**: Indicadores e exportações MUST respeitar tenant, função e escopo de equipe do usuário.

### Editores visuais

- **FR-025**: O editor de automações MUST permitir compor gatilhos, condições, ramificações e ações por interação visual, sem exigir edição de representação textual.
- **FR-026**: O editor MUST validar conexões, parâmetros, ciclos não permitidos, referências e ações indisponíveis antes da publicação.
- **FR-027**: Usuários MUST poder simular rascunhos sem produzir efeitos reais e visualizar o caminho avaliado.
- **FR-028**: Automações e conteúdos MUST possuir rascunhos e versões publicadas imutáveis, com histórico e restauração controlada.
- **FR-029**: O editor de campanhas MUST permitir conteúdo rico, variáveis aprovadas e pré-visualização por canal, destacando incompatibilidades antes do envio.

### Cobertura dos módulos configuráveis

- **FR-030**: O produto MUST manter um inventário verificável de todas as entidades e ações administrativas que exigem configuração pelo painel.
- **FR-031**: Para cada item do inventário aplicável, a interface MUST oferecer listar, consultar, criar, alterar, ativar/desativar e tratar remoção conforme as regras de negócio.
- **FR-032**: A disponibilidade de cada ação MUST refletir permissões, escopo do tenant, dependências e estado do registro; esconder um controle não substitui autorização.
- **FR-033**: Alterações administrativas MUST produzir histórico pesquisável com autor, instante, tenant, ação e diferenças relevantes.
- **FR-034**: Um item do inventário só pode ser marcado como concluído quando a jornada de interface, persistência, autorização, efeito operacional e evidência automatizada estiverem comprovadas.

### Requisitos transversais

- **FR-035**: Todas as leituras, escritas, atualizações em tempo real, comandos administrativos e métricas MUST negar acesso por padrão e aplicar explicitamente tenant e autorização.
- **FR-036**: Segredos e dados pessoais MUST ser mascarados em telas, saídas, exportações, erros e registros, de acordo com a finalidade e permissão do usuário.
- **FR-037**: Falhas MUST preservar consistência, apresentar orientação acionável e evitar declarar sucesso quando a operação estiver incompleta.
- **FR-038**: Nenhuma capacidade MUST ser considerada concluída com dados simulados, controles sem efeito, páginas estáticas ou documentação sem jornada executável.
- **FR-039**: Toda capacidade concluída MUST possuir evidência repetível de comportamento, autorização, isolamento e persistência em uma instalação nova e em uma instalação atualizada.

## Key Entities

- **Estado de configuração inicial**: progresso, responsável, validações, instante de ativação e versão da configuração.
- **Perfil da organização**: identidade, endereço público, opções regionais e preferências operacionais do tenant.
- **Configuração de provedor**: provedor, identificação mascarada da credencial, modelos permitidos, políticas, estado de validação e histórico; nunca contém segredo recuperável para exibição.
- **Assinatura de atualização**: usuário, tenant, escopos autorizados, posição de recuperação e estado de conectividade.
- **Evento operacional**: identidade, tipo, versão, tenant, recurso afetado, instante e dados mínimos autorizados.
- **Execução administrativa**: comando, identidade de execução, operador, tenant, parâmetros não secretos, estado, resultado e auditoria.
- **Definição de indicador**: nome, significado, origem lógica, filtros aceitos, atualidade e escopo de acesso.
- **Fluxo visual**: identidade, tenant, nós, conexões, validações, rascunho e versões publicadas.
- **Conteúdo de campanha**: identidade, canal, conteúdo, variáveis aprovadas, prévias, rascunho e versões publicadas.
- **Item configurável**: entidade, ações suportadas, permissões, dependências, jornada operacional e estado de cobertura.
- **Registro de auditoria**: ator, tenant, ação, recurso, instante, resultado e diferenças não secretas.

## Scope Boundaries

### Included

- As sete capacidades descritas nesta especificação, incluindo jornadas web e administrativas necessárias para uso real.
- Migração segura das configurações já existentes para as novas jornadas, sem perda ou reexposição de segredos.
- Inventário de cobertura e critérios de conclusão que liguem cada interface ao comportamento operacional correspondente.
- Validação em instalação limpa e atualização de uma instalação existente.

### Excluded

- Criação de novos provedores de IA ou canais além dos contratos já suportados pelo produto; a iniciativa cobre sua administração e experiência de uso.
- Aplicativos móveis nativos.
- Substituição das regras de negócio existentes de atendimento, campanhas ou automações, salvo quando necessário para tornar a jornada configurável e verificável.
- Personalização visual irrestrita do produto ou criação de um construtor genérico de aplicações.
- Análises preditivas ou decisões autônomas não solicitadas; o dashboard cobre indicadores operacionais definidos.

## Assumptions

- Autenticação, papéis e conceito de tenant já existem e serão a autoridade para todas as novas jornadas.
- O produto continuará usando armazenamento local sob controle da instalação e não dependerá de um serviço externo obrigatório para persistência principal.
- Provedores e canais podem ficar indisponíveis; sua indisponibilidade não autoriza exposição de segredos nem troca silenciosa de fornecedor.
- A configuração inicial será executada por uma pessoa autorizada com acesso ao ambiente da instalação.
- Datas e períodos serão apresentados no fuso do tenant, mantendo referência temporal inequívoca para cálculos e auditoria.
- Operações de privacidade respeitarão retenções legais configuradas e informarão claramente dados excluídos, anonimizados ou retidos.

## Dependencies

- Inventário confirmado das configurações, entidades, provedores, canais e comandos atualmente disponíveis.
- Definições oficiais dos indicadores, prazos e conversões utilizadas pela operação.
- Matriz de papéis e permissões por tenant e equipe.
- Política de retenção, privacidade e auditoria aprovada para o ambiente de produção.
- Ambientes representativos de instalação nova e atualização para validação de aceite.

## Success Criteria *(mandatory)*

- **SC-001**: Em testes moderados, pelo menos 90% dos administradores que não conhecem a estrutura interna concluem a configuração inicial em até 15 minutos, sem editar arquivos, banco ou variáveis manualmente.
- **SC-002**: 95% das mensagens e mudanças operacionais confirmadas tornam-se visíveis aos usuários autorizados em até 2 segundos, e nenhuma atualização é entregue a usuário de outro tenant nos testes de isolamento.
- **SC-003**: Após interrupções de até 5 minutos, 100% das sessões de teste reconciliam o estado em até 10 segundos, sem mensagens duplicadas ou mudanças perdidas.
- **SC-004**: 100% dos valores secretos testados permanecem ausentes de telas de consulta, respostas de erro, exportações, históricos e registros operacionais.
- **SC-005**: Um operador treinado conclui cada procedimento administrativo previsto em até 5 minutos usando apenas a ajuda da própria ferramenta, com resultado e código de saída inequívocos.
- **SC-006**: 100% das operações destrutivas testadas sem confirmação, autorização ou tenant explícito são recusadas sem efeito parcial.
- **SC-007**: Para um mesmo recorte, os totais do dashboard e das exportações correspondem aos registros operacionais de referência em 100% dos cenários de aceite.
- **SC-008**: 95% das mudanças confirmadas que afetam indicadores aparecem no dashboard em até 5 segundos, e dados atrasados são identificados como tal.
- **SC-009**: Pelo menos 85% dos gestores participantes criam, simulam e publicam uma automação válida e uma campanha de exemplo em até 20 minutos, sem editar estruturas textuais.
- **SC-010**: 100% dos fluxos inválidos, referências indisponíveis e conteúdos incompatíveis do conjunto de aceite são bloqueados antes da publicação com indicação do local do problema.
- **SC-011**: 100% dos itens do inventário configurável aprovado possuem jornada completa de gerenciamento, autorização, persistência, efeito operacional e auditoria comprovada.
- **SC-012**: Todas as capacidades prioritárias passam pelos mesmos cenários de aceite em instalação limpa e atualização de uma instalação existente, sem perda de configuração válida.
- **SC-013**: Nenhuma capacidade é aceita com dados simulados, página estática, controle sem efeito ou teste ignorado; cada conclusão possui evidência repetível do fluxo real.
