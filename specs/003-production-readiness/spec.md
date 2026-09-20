# Feature Specification: Production Readiness & Complete Operational Parity

**Feature Branch**: `003-production-readiness`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Inventário: Estado Atual vs. Exigido para Produção (Ideal) - Real-time SSE/WebSockets, Setup Wizard, Painel de Tokens IA/Canais, CLI crm-cli, Editores Visuais WYSIWYG, Dashboard Dinâmico, Cobertura 100% de Módulos Configuráveis."

## Scope & Target State

Implementar os módulos que transformam o CRMTSiAPP em um produto completo, amigável e pronto para produção real de alta demanda:
1. **Comunicação em Tempo Real**: Atualização instantânea do Inbox via Server-Sent Events (SSE) / WebSockets sem necessidade de recarregar a página.
2. **Wizard de Setup & Onboarding**: Interface passo a passo inicial para provisionamento guiado (admin, banco, configurações iniciais).
3. **Painel de Configuração de IA & Provedores**: Interface administrativa rica para inserir tokens/APIs (OmniRoute, OpenAI, Anthropic), selecionar modelos e ajustar prompts por tenant.
4. **Ferramenta CLI Unificada (`crm-cli`)**: Utilitário de linha de comando para tarefas de infraestrutura (gestão de admins, resets, purgas LGPD, drenagem de filas, inspeção).
5. **Dashboard Operacional Dinâmico**: Visualização de métricas e KPIs em tempo real com filtros por período e fila.
6. **Editores Visuais (WYSIWYG/Low-Code)**: Construtores visuais de fluxos para Automações e Campanhas.
7. **Consolidação de Módulos Configuráveis**: Interface 100% web para todas as entidades do sistema.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Inbox Updates (Priority: P1)

As an agent/operator, I receive new messages, status changes, and SLA alerts instantly in the Inbox without manual page reloads.

**Why this priority**: Crucial for high-volume customer support operations.

**Independent Test**: Send an inbound message via webhook and verify it appears in the active chat interface via real-time stream.

---

### User Story 2 - Setup & Provider Management UI (Priority: P1)

As an administrator, I can run the initial setup wizard on first boot and manage LLM/channel tokens directly from a dedicated UI.

**Why this priority**: Removes the barrier of manual database/environment file manipulation.

---

### User Story 3 - Unified Administrative CLI (Priority: P2)

As a DevOps/Sysadmin engineer, I can manage CRMTSiAPP instances directly via `crm-cli` from the terminal.

---

### User Story 4 - Visual Workflow & Campaign Builders (Priority: P2)

As a marketing or operations manager, I can build automations and campaign messages using an intuitive visual editor.

## Functional Requirements

- **FR-001**: System MUST provide an SSE endpoint (`/events`) for streaming real-time notifications to authenticated clients.
- **FR-002**: System MUST offer a first-boot Setup Wizard when no administrative account is detected.
- **FR-003**: System MUST expose a dedicated AI Provider UI to store and test API tokens securely.
- **FR-004**: System MUST bundle a standalone CLI binary (`crm-cli`) with commands for administration, health check, and database operations.
- **FR-005**: System MUST render interactive charts on the Dashboard updating periodically or via event stream.
- **FR-006**: Automations and Campaigns MUST support visual block/node editing in the web workspace.

## Success Criteria

- **SC-001**: Real-time message latency under 500ms from ingestion to UI render.
- **SC-002**: Zero manual SQL required to onboard a fresh instance.
- **SC-003**: All administrative actions available via both Web UI and `crm-cli`.
