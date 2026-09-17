function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}
const { isEditableSetting } = require('./configuration-contract');
const entries = [
  ['whatsapp','whatsapp_provider','Provedor de canal','WAHA compatível ou não configurado',false],
  ['whatsapp','whatsapp_session_name','Nome da sessão','Identificador da sessão parceira',false],
  ['whatsapp','whatsapp_adapter_url','URL do adaptador','Endpoint HTTP(S) do adaptador local',false],
  ['whatsapp','whatsapp_webhook_signature_required','Assinatura de webhook','Exigir HMAC para eventos recebidos',false],
  ['channels','meta_cloud_enabled','Canal oficial Meta','Habilitar a integração Cloud API',false],
  ['channels','meta_graph_version','Versão Graph API','Versão explícita do endpoint Meta',false],
  ['channels','channel_routing_mode','Roteamento por canal','Manual, round-robin ou restrito',false],
  ['channels','channel_ai_gate','Elegibilidade da IA','Aberto ou allowlist por origem',false],
  ['organization','organization_display_name','Nome de exibição','Identidade operacional da organização',false],
  ['organization','organization_legal_name','Razão social','Identidade legal',false],
  ['organization','organization_timezone','Fuso horário','Base de agenda e regras de atendimento',false],
  ['organization','organization_currency','Moeda','ISO 4217 para valores e catálogo',false],
  ['organization','organization_locale','Idioma padrão','Idioma inicial e fallback',false],
  ['organization','organization_country_iso2','País padrão','Normalização de telefones e localização',false],
  ['profile','profile_first_name','Nome','Preferência pessoal do usuário',false],
  ['profile','profile_last_name','Sobrenome','Preferência pessoal do usuário',false],
  ['profile','profile_phone','Telefone','Contato do usuário',false],
  ['profile','profile_language','Idioma pessoal','Preferência individual',false],
  ['profile','interface_theme','Tema','Claro, escuro ou sistema',false],
  ['profile','interface_density','Densidade','Confortável ou compacta',false],
  ['branding','brand_primary_color','Cor principal','Cor primária da organização',false],
  ['branding','brand_accent_color','Cor de destaque','Cor de ações e foco',false],
  ['branding','brand_font','Fonte','Família tipográfica da marca',false],
  ['branding','brand_radius','Raio','Estilo de bordas',false],
  ['branding','brand_logo_path','Logo','Caminho de arquivo gerenciado',false],
  ['security','mfa_required_for_admins','MFA para administradores','Exigir segundo fator para administradores',false],
  ['security','session_ttl_days','Duração da sessão','Expiração de sessões autenticadas',false],
  ['security','login_rate_limit','Limite de login','Proteção contra tentativas repetidas',false],
  ['notifications','notify_new_message','Nova mensagem','Notificação individual',false],
  ['notifications','notify_new_conversation','Nova conversa','Notificação individual',false],
  ['notifications','notify_mention','Menção','Notificação individual',false],
  ['notifications','notify_assignment','Atribuição','Notificação individual',false],
  ['team','team_roles','Papéis de equipe','viewer, agent, manager e admin',false],
  ['team','attendant_capacity','Capacidade por atendente','Máximo de atendimentos simultâneos',false],
  ['team','attendant_schedule','Horário semanal','Janelas por dia da semana',false],
  ['pipelines','pipeline_default','Funil padrão','Pipeline de entrada',false],
  ['pipelines','pipeline_stages','Etapas','Nome, ordem e terminal ganho/perdido',false],
  ['routing','routing_auto_assign','Atribuição automática','Distribuir novas conversas',false],
  ['routing','routing_prefer_last_assignee','Preferir último responsável','Manter continuidade de atendimento',false],
  ['agenda','appointment_types','Tipos de compromisso','Duração, local, buffers, cor e status',false],
  ['agenda','agenda_deadlines','Prazos de agenda','Confirmação, reagendamento e cancelamento',false],
  ['agenda','google_calendar_enabled','Google Calendar','Conexão OAuth opcional',false],
  ['ads','meta_ads_enabled','Meta Ads','Ativar métricas de anúncios',false],
  ['ads','meta_ads_account_id','Conta de anúncios','Conta padrão para relatórios',false],
  ['commerce','nuvemshop_enabled','Nuvemshop','Ativar integração de comércio',false],
  ['api','api_token_scopes','Tokens de API','Escopos, expiração e revogação',false],
  ['ai','ai_provider','Provedor de IA','Gateway, OpenRouter, Anthropic ou OpenAI',false],
  ['ai','ai_default_model','Modelo padrão','Modelo com suporte a ferramentas',false],
  ['ai','ai_budget_enforcement','Orçamento de IA','Off, avisar ou bloquear',false],
  ['ai','ai_dispatch_consumer','Despacho de agente','Worker ou consumidor nativo',false],
  ['ai','ai_followup_window','Janela de follow-up','Antecedência mínima e máxima',false],
  ['operations','retention_webhook_days','Retenção de webhooks','Corpo bruto e linhas forenses',false],
  ['operations','retention_job_days','Retenção de filas','Jobs concluídos e falhos',false],
  ['operations','retention_audit_days','Retenção de auditoria','Histórico de ações',false],
  ['operations','worker_poll_interval_ms','Ritmo do worker','Intervalos de consumo da fila',false],
  ['privacy','lgpd_export_expiry_hours','Expiração LGPD','Prazo de exportação de dados',false],
  ['privacy','lgpd_dpo_email','E-mail DPO','Contato de privacidade',false],
  ['platform','app_name','Nome da instalação','Marca de fallback',false],
  ['platform','app_logo_url','Logo da instalação','Marca de fallback',false],
  ['platform','app_accent_hex','Cor da instalação','Marca de fallback',false],
  ['platform','support_email','E-mail de suporte','Contato exibido ao cliente',false],
  ['platform','app_url','URL pública','Origem canônica da aplicação',false],
  ['platform','mail_from','Remetente de e-mail','Configuração de entrega transacional',false],
  ['platform','sentry_dsn','Sentry DSN','Observabilidade opcional',true],
  ['platform','waha_api_key','Chave API WAHA','Credencial do transporte',true],
  ['platform','waha_hmac_secret','Segredo HMAC WAHA','Validação de webhook',true],
  ['platform','meta_system_user_token','Token Meta','Credencial do canal oficial',true],
  ['platform','meta_app_secret','Segredo Meta','Validação de webhook oficial',true],
  ['platform','ai_provider_credentials','Credenciais de IA','Chaves por provedor/organização',true],
  ['platform','google_calendar_client_secret','Segredo Google OAuth','Integração de agenda',true],
  ['platform','nuvemshop_client_secret','Segredo Nuvemshop OAuth','Integração de comércio',true],
  ['platform','resend_api_key','Chave Resend','Entrega de e-mail',true],
  ['platform','vapid_private_key','Chave privada VAPID','Web Push',true],
  ['platform','lgpd_signing_key','Chave de assinatura LGPD','Assinatura de exportações',true],
];
const CONFIG_CATALOG = entries.map(([domain,key,label,description,secret]) => ({ domain,key,label,description,secret,runtimeOnly:secret }));
const labels = { whatsapp:'WhatsApp e canais', channels:'Canais e roteamento', organization:'Organização', profile:'Perfil e interface', branding:'Marca', security:'Segurança', notifications:'Notificações', team:'Equipe', pipelines:'Funis e etapas', routing:'Distribuição', agenda:'Agenda', ads:'Meta Ads', commerce:'Comércio', api:'API', ai:'IA e automações', operations:'Operação e retenção', privacy:'LGPD e privacidade', platform:'Plataforma e runtime' };
function renderConfigControl(item, values) {
  const value = values[item.key] ?? DEFAULT_SETTINGS[item.key] ?? '';
  if (BOOLEAN_KEYS.has(item.key)) {
    return `<input type="hidden" name="value" value="false"><label class="switch"><input type="checkbox" name="value" value="true"${value === 'true' ? ' checked' : ''}><span>Ativado</span></label>`;
  }
  if (ENUMS[item.key]) {
    return `<select name="value">${ENUMS[item.key].map((option) => `<option value="${esc(option)}"${value === option ? ' selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
  }
  if (NUMBER_RANGES[item.key]) {
    const [min, max] = NUMBER_RANGES[item.key];
    return `<input type="number" name="value" value="${esc(value)}" min="${min}" max="${max}" step="1">`;
  }
  if (item.key.endsWith('_url') || item.key === 'app_url') return `<input type="url" name="value" value="${esc(value)}" maxlength="300" placeholder="https://…">`;
  if (item.key.endsWith('_email') || item.key === 'mail_from') return `<input type="email" name="value" value="${esc(value)}" maxlength="320" placeholder="contato@empresa.com">`;
  if (item.key.endsWith('_color') || item.key === 'app_accent_hex') return `<input type="color" name="value" value="${/^#[0-9a-fA-F]{6}$/.test(value) ? esc(value) : '#506d48'}">`;
  return `<input name="value" value="${esc(value)}" maxlength="1000" placeholder="Não configurado">`;
}
function renderConfigCatalog(values = {}, { csrfToken = '' } = {}) {
  const csrf = csrfToken ? `<input type="hidden" name="csrf_token" value="${esc(csrfToken)}">` : '';
  const groups = Object.keys(labels).map((domain) => {
    const items = CONFIG_CATALOG.filter((item) => item.domain === domain);
    if (!items.length) return '';
    return `<section class="catalog-group"><h3>${esc(labels[domain])}</h3><div class="catalog-items">${items.map((item) => {
      const unavailable = item.secret || !isEditableSetting(item.key);
      const status = item.secret ? 'Gerenciado pelo runtime' : 'Planejado — sem efeito no runtime';
      return `<article><strong>${esc(item.label)}</strong><span>${esc(item.description)}</span>${unavailable ? `<small>${status}</small>` : `<form method="post" action="/settings/catalog">${csrf}<input type="hidden" name="key" value="${esc(item.key)}">${renderConfigControl(item, values)}<button type="submit">Salvar</button></form>`}</article>`;
    }).join('')}</div></section>`;
  }).join('');
  return `<header class="page-header"><div><p class="eyebrow">CONFIGURAÇÃO</p><h1>Mapa de configurações</h1><p>Exibimos somente controles que têm efeito comprovado. Canais são configurados no workspace próprio.</p></div></header><div class="catalog-notice"><strong>Configurações sem efeito não são graváveis</strong><span>Campos planejados permanecem visíveis como referência, mas não fingem alterar o runtime. Segredos são gerenciados fora desta interface.</span></div>${groups}`;
}
const DEFAULT_SETTINGS = {
  app_url: 'https://crm.tsiapp.io',
  organization_currency: 'BRL',
  organization_locale: 'pt-BR',
  organization_timezone: 'America/Sao_Paulo',
  organization_country_iso2: 'BR',
  whatsapp_provider: 'none',
  whatsapp_webhook_signature_required: 'false',
  meta_cloud_enabled: 'false',
  meta_graph_version: 'v22.0',
  channel_routing_mode: 'manual',
  channel_ai_gate: 'open',
  mfa_required_for_admins: 'false',
  session_ttl_days: '7',
  login_rate_limit: '10',
  interface_theme: 'system',
  interface_density: 'comfortable',
  routing_auto_assign: 'false',
  routing_prefer_last_assignee: 'true',
  google_calendar_enabled: 'false',
  meta_ads_enabled: 'false',
  nuvemshop_enabled: 'false',
  ai_budget_enforcement: 'on',
  ai_dispatch_consumer: 'native',
  retention_webhook_days: '7',
  retention_job_days: '90',
  retention_audit_days: '1825',
  lgpd_export_expiry_hours: '72',
};
const BOOLEAN_KEYS = new Set(['whatsapp_webhook_signature_required','meta_cloud_enabled','mfa_required_for_admins','routing_auto_assign','routing_prefer_last_assignee','google_calendar_enabled','meta_ads_enabled','nuvemshop_enabled']);
const ENUMS = {
  whatsapp_provider: ['none', 'waha'],
  channel_routing_mode: ['manual', 'round_robin', 'restricted'],
  channel_ai_gate: ['open', 'allowlist'],
  organization_locale: ['pt-BR', 'es'],
  interface_theme: ['light', 'dark', 'system'],
  interface_density: ['comfortable', 'compact'],
  ai_provider: ['gateway', 'openrouter', 'anthropic', 'openai'],
  ai_budget_enforcement: ['on', 'avisar', 'off'],
  ai_dispatch_consumer: ['native', 'worker'],
};
const NUMBER_RANGES = {
  session_ttl_days: [1, 30], login_rate_limit: [1, 100], attendant_capacity: [1, 100],
  retention_webhook_days: [1, 3650], retention_job_days: [7, 3650], retention_audit_days: [90, 36500],
  worker_poll_interval_ms: [250, 60000], lgpd_export_expiry_hours: [1, 720],
};
function validateConfigValue(key, raw) {
  const item = CONFIG_CATALOG.find((candidate) => candidate.key === key);
  if (!item || item.secret || !isEditableSetting(key)) return { ok: false, error: 'Chave não editável: não possui consumidor de runtime.' };
  const value = String(raw ?? '').trim();
  if (value.length > 1000) return { ok: false, error: 'Valor excede o limite.' };
  if (BOOLEAN_KEYS.has(key)) return ['true', 'false'].includes(value) ? { ok: true, value } : { ok: false, error: 'Use true ou false.' };
  if (ENUMS[key]) return ENUMS[key].includes(value) ? { ok: true, value } : { ok: false, error: 'Valor fora do conjunto permitido.' };
  if (NUMBER_RANGES[key]) { const parsed = Number(value); const [min, max] = NUMBER_RANGES[key]; return Number.isInteger(parsed) && parsed >= min && parsed <= max ? { ok: true, value: String(parsed) } : { ok: false, error: 'Número fora da faixa permitida.' }; }
  if (key === 'organization_currency') return /^[A-Z]{3}$/.test(value) ? { ok: true, value } : { ok: false, error: 'Use moeda ISO-4217 em maiúsculas.' };
  if (key === 'organization_country_iso2') return /^[A-Z]{2}$/.test(value) ? { ok: true, value } : { ok: false, error: 'Use país ISO-3166 alpha-2 em maiúsculas.' };
  if (key === 'meta_graph_version') return /^v\d+\.\d+$/.test(value) ? { ok: true, value } : { ok: false, error: 'Use versão Graph no formato vNN.N.' };
  if (key.endsWith('_url') || key === 'app_url') { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? { ok: true, value: url.toString().replace(/\/$/, '') } : { ok: false, error: 'Use URL HTTP(S).' }; } catch { return { ok: false, error: 'Use URL HTTP(S) válida.' }; } }
  if (key.endsWith('_email') || key === 'mail_from') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { ok: true, value } : { ok: false, error: 'Use e-mail válido.' };
  if (key.endsWith('_color') || key === 'app_accent_hex') return /^#[0-9a-fA-F]{6}$/.test(value) ? { ok: true, value: value.toLowerCase() } : { ok: false, error: 'Use cor hexadecimal #RRGGBB.' };
  return { ok: true, value };
}
function valuesWithDefaults(values = {}) { return { ...DEFAULT_SETTINGS, ...values }; }
module.exports = { CONFIG_CATALOG, DEFAULT_SETTINGS, renderConfigCatalog, validateConfigValue, valuesWithDefaults };