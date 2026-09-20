function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, function(char) {
    var map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": String.fromCharCode(39) };
    return map[char];
  });
}

function renderSetupWizard(state) {
  var step = state.wizardStep || 1;
  var bootstrapSecret = state.bootstrapSecret || '';
  var errors = state.errors || {};
  var draft = state.draftConfig || {};
  var csrf = state.csrfToken ? '<input type="hidden" name="csrf_token" value="' + esc(state.csrfToken) + '">' : '';

  var step1Active = step === 1 ? 'active' : (step > 1 ? 'completed' : '');
  var step2Active = step === 2 ? 'active' : (step > 2 ? 'completed' : '');
  var step3Active = step === 3 ? 'active' : (step > 3 ? 'completed' : '');
  var step4Active = step === 4 ? 'active' : '';

  return '<header class="page-header"><div><p class="eyebrow">CONFIGURA\u00c7\u00c3O</p><h1>Assistente de Instala\u00e7\u00e3o</h1><p>Configure a inst\u00e2ncia passo a passo. Nenhum segredo \u00e9 reexibido.</p></div></header><section class="panel settings-panel"><nav class="wizard-progress" aria-label="Progresso do assistente"><ol><li class="' + step1Active + '"><span class="step-number">1</span><span class="step-label">Credencial Bootstrap</span></li><li class="' + step2Active + '"><span class="step-number">2</span><span class="step-label">Provedor e Configura\u00e7\u00e3o</span></li><li class="' + step3Active + '"><span class="step-number">3</span><span class="step-label">Valida\u00e7\u00e3o</span></li><li class="' + step4Active + '"><span class="step-number">4</span><span class="step-label">Ativa\u00e7\u00e3o</span></li></ol></nav>' + (step === 1 ? renderStep1(bootstrapSecret, errors, csrf) : '') + (step === 2 ? renderStep2(draft, errors, csrf) : '') + (step === 3 ? renderStep3(draft, errors, csrf) : '') + (step === 4 ? renderStep4(draft, errors, csrf) : '') + '</section>';
}

function renderStep1(bootstrapSecret, errors, csrf) {
  var errorHtml = errors.bootstrapSecret ? '<p class="error" role="alert">' + esc(errors.bootstrapSecret) + '</p>' : '';
  return '<form method="post" action="/setup/bootstrap" class="form-grid">' + csrf + '<h2>Etapa 1: Credencial Bootstrap</h2><p>Informe a credencial bootstrap para inicializar a inst\u00e2ncia. Esta credencial ser\u00e1 consumida e n\u00e3o poder\u00e1 ser recuperada.</p>' + errorHtml + '<label>Credencial Bootstrap<input type="password" name="secret" autocomplete="new-password" required minlength="16" aria-describedby="bootstrap-hint"></label><small id="bootstrap-hint">M\u00ednimo 16 caracteres. Ser\u00e1 armazenada apenas o hash.</small><div class="form-actions"><button type="submit" class="button primary">Continuar</button></div></form>';
}

function renderStep2(draft, errors, csrf) {
  var provider = draft.provider || '';
  var config = draft.config || {};
  var credentials = draft.credentials || {};
  var errorHtml = errors.provider ? '<p class="error" role="alert">' + esc(errors.provider) + '</p>' : '';
  var configError = errors.config ? '<p class="error" role="alert">' + esc(errors.config) + '</p>' : '';
  var credsError = errors.credentials ? '<p class="error" role="alert">' + esc(errors.credentials) + '</p>' : '';

  var wahaConfig = provider === 'waha' || !provider;
  var metaConfig = provider === 'meta';

  var configHtml = '';
  if (wahaConfig) {
    configHtml = '<label>URL Base (baseUrl)<input type="url" name="config[baseUrl]" value="' + esc(config.baseUrl || '') + '" placeholder="https://waha.example.com" required pattern="^https?://" aria-describedby="baseurl-hint"></label><small id="baseurl-hint">URL do servidor WAHA. Deve usar http:// ou https://. IPs privados bloqueados em produ\u00e7\u00e3o.</small><label>Nome da Sess\u00e3o (sessionName)<input type="text" name="config[sessionName]" value="' + esc(config.sessionName || '') + '" placeholder="minha-sessao" required maxlength="100"></label>';
  } else {
    configHtml = '<label>Vers\u00e3o Graph (graphVersion)<input type="text" name="config[graphVersion]" value="' + esc(config.graphVersion || '') + '" placeholder="v22.0" required pattern="^v\\d+\\.\\d+$" aria-describedby="graph-hint"></label><small id="graph-hint">Formato: vXX.Y (ex: v22.0, v21.5).</small><label>Phone Number ID<input type="text" name="config[phoneNumberId]" value="' + esc(config.phoneNumberId || '') + '" placeholder="123456789" required pattern="^\\d+$" aria-describedby="phone-hint"></label><small id="phone-hint">ID num\u00e9rico do n\u00famero de telefone no Meta Business Manager.</small>';
  }

  var credsHtml = '';
  if (wahaConfig) {
    credsHtml = '<label>API Key<input type="password" name="credentials[apiKey]" autocomplete="new-password" required aria-describedby="apikey-hint"></label><small id="apikey-hint">Chave de API do WAHA. N\u00e3o ser\u00e1 reexibida.</small><label>Webhook Token<input type="password" name="credentials[webhookToken]" autocomplete="new-password" required></label>';
  } else {
    credsHtml = '<label>Access Token<input type="password" name="credentials[accessToken]" autocomplete="new-password" required aria-describedby="accesstoken-hint"></label><small id="accesstoken-hint">Token de acesso da Meta Graph API. N\u00e3o ser\u00e1 reexibido.</small><label>App Secret<input type="password" name="credentials[appSecret]" autocomplete="new-password" required></label><label>Verify Token<input type="password" name="credentials[verifyToken]" autocomplete="new-password" required></label>';
  }

  return '<form method="post" action="/setup/draft" class="form-grid">' + csrf + '<h2>Etapa 2: Provedor e Configura\u00e7\u00e3o</h2><p>Selecione o provedor e preencha a configura\u00e7\u00e3o e credenciais. Segredos nunca s\u00e3o reexibidos.</p>' + errorHtml + '<label>Provedor<select name="provider" required onchange="this.form.submit()"><option value="">Selecione...</option><option value="waha" ' + (wahaConfig ? 'selected' : '') + '>WAHA (WhatsApp HTTP API)</option><option value="meta" ' + (metaConfig ? 'selected' : '') + '>Meta WhatsApp Business API</option></select></label><fieldset class="config-group"><legend>Configura\u00e7\u00e3o' + (wahaConfig ? ' (WAHA)' : ' (Meta)') + '</legend>' + configError + configHtml + '</fieldset><fieldset class="credentials-group"><legend>Credenciais' + (wahaConfig ? ' (WAHA)' : ' (Meta)') + '</legend>' + credsError + credsHtml + '</fieldset><div class="form-actions"><button type="submit" name="action" value="next" class="button primary">Validar e Continuar</button><button type="submit" name="action" value="back" class="button secondary">Voltar</button></div></form>';
}

function renderStep3(draft, errors, csrf) {
  var provider = draft.provider || '';
  var config = draft.config || {};
  var validation = state.validationResult || null;
  var errorHtml = errors.validation ? '<p class="error" role="alert">' + esc(errors.validation) + '</p>' : '';

  var summaryHtml = '';
  if (provider === 'waha') {
    summaryHtml = '<strong>URL Base:</strong> ' + esc(config.baseUrl || '') + '<br><strong>Sess\u00e3o:</strong> ' + esc(config.sessionName || '');
  } else {
    summaryHtml = '<strong>Graph Version:</strong> ' + esc(config.graphVersion || '') + '<br><strong>Phone Number ID:</strong> ' + esc(config.phoneNumberId || '');
  }

  return '<form method="post" action="/setup/validate" class="form-grid">' + csrf + '<h2>Etapa 3: Valida\u00e7\u00e3o</h2><p>Teste a conex\u00e3o com o provedor antes de ativar. Credenciais n\u00e3o s\u00e3o exibidas.</p>' + errorHtml + '<div class="validation-summary"><strong>Provedor:</strong> ' + esc(provider.toUpperCase()) + '<br>' + summaryHtml + '</div>' + (validation ? '<div class="validation-result ' + (validation.valid ? 'success' : 'error') + '" role="status">' + (validation.valid ? '\u2713 Conex\u00e3o bem-sucedida' : '\u2717 Falha na valida\u00e7\u00e3o: ' + esc(validation.error)) + (validation.data ? '<pre>' + esc(JSON.stringify(validation.data, null, 2)) + '</pre>' : '') + '</div>' : '') + '<div class="form-actions"><button type="submit" class="button primary" ' + (validation && !validation.valid ? 'disabled' : '') + '>Ativar Instala\u00e7\u00e3o</button><button type="button" onclick="window.location.href=\'/setup/draft\'" class="button secondary">Editar Configura\u00e7\u00e3o</button></div></form>';
}

function renderStep4(draft, errors, csrf) {
  var provider = draft.provider || '';
  var config = draft.config || {};
  var activation = state.activationResult || null;
  var errorHtml = errors.activation ? '<p class="error" role="alert">' + esc(errors.activation) + '</p>' : '';

  var summaryHtml = '';
  if (provider === 'waha') {
    summaryHtml = '<strong>URL Base:</strong> ' + esc(config.baseUrl || '') + '<br><strong>Sess\u00e3o:</strong> ' + esc(config.sessionName || '');
  } else {
    summaryHtml = '<strong>Graph Version:</strong> ' + esc(config.graphVersion || '') + '<br><strong>Phone Number ID:</strong> ' + esc(config.phoneNumberId || '');
  }

  return '<form method="post" action="/setup/activate" class="form-grid">' + csrf + '<h2>Etapa 4: Ativa\u00e7\u00e3o</h2><p>Confirme a ativa\u00e7\u00e3o da inst\u00e2ncia. Ap\u00f3s ativar, a configura\u00e7\u00e3o n\u00e3o poder\u00e1 mais ser alterada.</p>' + errorHtml + '<div class="activation-summary"><strong>Provedor:</strong> ' + esc(provider.toUpperCase()) + '<br>' + summaryHtml + '</div>' + (activation ? '<div class="activation-result ' + (activation.success ? 'success' : 'error') + '" role="status">' + (activation.success ? '\u2713 Instala\u00e7\u00e3o ativada com sucesso!' : '\u2717 Falha na ativa\u00e7\u00e3o: ' + esc(activation.error)) + '</div>' : '') + '<div class="form-actions">' + (!activation ? '<button type="submit" class="button primary" onclick="return confirm(\'Confirmar ativa\u00e7\u00e3o? A configura\u00e7\u00e3o ser\u00e1 travada.\')">Confirmar Ativa\u00e7\u00e3o</button>' : '<a href="/setup/status" class="button primary">Ver Status</a>') + '<button type="button" onclick="window.location.href=\'/setup/draft\'" class="button secondary">Cancelar</button></div></form>';
}

function renderProviderPanel(state) {
  var providers = state.providers || [];
  var csrf = state.csrfToken ? '<input type="hidden" name="csrf_token" value="' + esc(state.csrfToken) + '">' : '';
  var allowedProviders = state.allowedProviders || ['waha', 'meta'];

  var rows = providers.map(function(p) {
    return '<tr><td>' + esc(p.provider.toUpperCase()) + '</td><td>' + esc(p.config ? JSON.stringify(p.config) : '\u2014') + '</td><td><span class="status ' + (p.status === 'active' ? 'online' : p.status === 'draft' ? 'pending' : 'offline') + '">' + esc(p.status) + '</span></td><td>' + esc(p.maskedHint || '\u2014') + '</td><td>' + esc(p.credentialsVersion || '\u2014') + '</td><td>' + (p.status === 'draft' ? '<form method="post" action="/providers/' + esc(p.provider) + '/activate" style="display:inline">' + csrf + '<button type="submit" class="button primary" onclick="return confirm(\'Ativar provedor?\')">Ativar</button></form>' : '') + (p.status === 'active' ? '<form method="post" action="/providers/' + esc(p.provider) + '/test" style="display:inline">' + csrf + '<button type="submit" class="button">Testar</button></form><form method="post" action="/providers/' + esc(p.provider) + '/deactivate" style="display:inline">' + csrf + '<button type="submit" class="button danger" onclick="return confirm(\'Desativar provedor?\')">Desativar</button></form><button type="button" class="button" onclick="openRotateModal(\'' + esc(p.provider) + '\')">Rotacionar</button>' : '') + (p.status !== 'active' && p.status !== 'draft' ? '<form method="post" action="/providers/' + esc(p.provider) + '/delete" style="display:inline">' + csrf + '<button type="submit" class="button danger" onclick="return confirm(\'Excluir configura\u00e7\u00e3o?\')">Excluir</button></form>' : '') + '</td></tr>';
  }).join('');

  var createForm = allowedProviders.map(function(ap) { return '<option value="' + ap + '">' + esc(ap.toUpperCase()) + '</option>'; }).join('');

  return '<header class="page-header"><div><p class="eyebrow">CONFIGURA\u00c7\u00c3O</p><h1>Provedores</h1><p>Gerencie provedores de canais por tenant. Credenciais criptografadas, nunca reexibidas.</p></div></header><section class="panel settings-panel"><h2>Adicionar Provedor</h2><form method="post" action="/providers" class="form-grid">' + csrf + '<label>Provedor<select name="provider" required><option value="">Selecione...</option>' + createForm + '</select></label><button type="submit" class="button primary">Criar Rascunho</button></form><h2>Provedores Configurados</h2>' + (providers.length ? '<div class="table-wrap"><table><thead><tr><th>Provedor</th><th>Configura\u00e7\u00e3o</th><th>Estado</th><th>Credencial (mascarada)</th><th>Vers\u00e3o</th><th>A\u00e7\u00f5es</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty-state">Nenhum provedor configurado.</p>') + '</section><div id="rotate-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="rotate-title" style="display:none"><div class="modal-content"><h3 id="rotate-title">Rotacionar Credencial</h3><form id="rotate-form" method="post" class="form-grid">' + csrf + '<input type="hidden" name="provider" id="rotate-provider"><div id="rotate-fields"></div><div class="form-actions"><button type="submit" class="button primary">Rotacionar</button><button type="button" class="button secondary" onclick="closeRotateModal()">Cancelar</button></div></form></div></div><script>function openRotateModal(provider){var modal=document.getElementById("rotate-modal");document.getElementById("rotate-provider").value=provider;var fields=document.getElementById("rotate-fields");if(provider==="waha"){fields.innerHTML=\'<label>API Key<input type="password" name="credentials[apiKey]" autocomplete="new-password" required></label><label>Webhook Token<input type="password" name="credentials[webhookToken]" autocomplete="new-password" required></label>\';}else{fields.innerHTML=\'<label>Access Token<input type="password" name="credentials[accessToken]" autocomplete="new-password" required></label><label>App Secret<input type="password" name="credentials[appSecret]" autocomplete="new-password" required></label><label>Verify Token<input type="password" name="credentials[verifyToken]" autocomplete="new-password" required></label>\';}modal.style.display="flex";}function closeRotateModal(){document.getElementById("rotate-modal").style.display="none";}document.getElementById("rotate-form").addEventListener("submit",async function(e){e.preventDefault();var form=e.target;var provider=form.provider.value;var formData=new FormData(form);var credentials={};for(var pair of formData.entries()){if(pair[0].startsWith("credentials[")){credentials[pair[0].replace("credentials[","").replace("]","")]=pair[1];}}try{var resp=await fetch("/providers/"+provider+"/rotate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({credentials})});if(resp.ok){location.reload();}else{var err=await resp.json();alert("Erro: "+(err.error?.message||"Falha ao rotacionar"));}}catch(err){alert("Erro de rede: "+err.message);}});</script>';
}

module.exports = { renderSetupWizard: renderSetupWizard, renderProviderPanel: renderProviderPanel };
