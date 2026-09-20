(function exposeSetupWizard(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CrmSetupWizard = api;
})(typeof globalThis === 'object' ? globalThis : this, function setupWizardFactory() {
  var setTimer = setTimeout;
  var clearTimer = clearTimeout;
  var csrfToken = '';

  function createSetupWizardClient(options) {
    var state = options.initialState || {};
    var currentStep = state.wizardStep || 1;
    var formData = state.draftConfig || {};
    var validationResult = state.validationResult || null;
    var activationResult = state.activationResult || null;
    var errors = state.errors || {};
    var csrf = state.csrfToken || '';

    var setConnectionState = options.setConnectionState || function() {};
    var showError = options.showError || function(msg) { alert(msg); };
    var showSuccess = options.showSuccess || function(msg) { alert(msg); };
    var redirect = options.redirect || function(url) { window.location.href = url; };

    function getCsrf() {
      var meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.content : csrf;
    }

    function updateState(newState) {
      state = Object.assign({}, state, newState);
      currentStep = state.wizardStep || currentStep;
      formData = state.draftConfig || formData;
      validationResult = state.validationResult || validationResult;
      activationResult = state.activationResult || activationResult;
      errors = state.errors || errors;
      render();
    }

    function render() {
      var container = document.getElementById('setup-wizard-container');
      if (!container) return;
      container.innerHTML = renderStep(currentStep);
      bindEvents();
      updateProgress();
    }

    function renderStep(step) {
      switch (step) {
        case 1: return renderStep1();
        case 2: return renderStep2();
        case 3: return renderStep3();
        case 4: return renderStep4();
        default: return renderStep1();
      }
    }

    function renderStep1() {
      var errorHtml = errors.bootstrapSecret ? '<p class="error" role="alert">' + escapeHtml(errors.bootstrapSecret) + '</p>' : '';
      return '<form id="step1-form" class="form-grid"><input type="hidden" name="csrf_token" value="' + escapeHtml(getCsrf()) + '"><h2>Etapa 1: Credencial Bootstrap</h2><p>Informe a credencial bootstrap para inicializar a instância. Esta credencial será consumida e não poderá ser recuperada.</p>' + errorHtml + '<label>Credencial Bootstrap<input type="password" name="secret" autocomplete="new-password" required minlength="16" aria-describedby="bootstrap-hint"></label><small id="bootstrap-hint">Mínimo 16 caracteres. Será armazenada apenas o hash.</small><div class="form-actions"><button type="submit" class="button primary">Continuar</button></div></form>';
    }

    function renderStep2() {
      var provider = formData.provider || '';
      var config = formData.config || {};
      var credentials = formData.credentials || {};
      var errorHtml = errors.provider ? '<p class="error" role="alert">' + escapeHtml(errors.provider) + '</p>' : '';
      var configError = errors.config ? '<p class="error" role="alert">' + escapeHtml(errors.config) + '</p>' : '';
      var credsError = errors.credentials ? '<p class="error" role="alert">' + escapeHtml(errors.credentials) + '</p>' : '';

      var wahaConfig = provider === 'waha' || !provider;
      var metaConfig = provider === 'meta';

      var configHtml = '';
      if (wahaConfig) {
        configHtml = '<label>URL Base (baseUrl)<input type="url" name="config[baseUrl]" value="' + escapeHtml(config.baseUrl || '') + '" placeholder="https://waha.example.com" required pattern="^https?://" aria-describedby="baseurl-hint"></label><small id="baseurl-hint">URL do servidor WAHA. Deve usar http:// ou https://. IPs privados bloqueados em produção.</small><label>Nome da Sessão (sessionName)<input type="text" name="config[sessionName]" value="' + escapeHtml(config.sessionName || '') + '" placeholder="minha-sessao" required maxlength="100"></label>';
      } else {
        configHtml = '<label>Versão Graph (graphVersion)<input type="text" name="config[graphVersion]" value="' + escapeHtml(config.graphVersion || '') + '" placeholder="v22.0" required pattern="^v\\d+\\.\\d+$" aria-describedby="graph-hint"></label><small id="graph-hint">Formato: vXX.Y (ex: v22.0, v21.5).</small><label>Phone Number ID<input type="text" name="config[phoneNumberId]" value="' + escapeHtml(config.phoneNumberId || '') + '" placeholder="123456789" required pattern="^\\d+$" aria-describedby="phone-hint"></label><small id="phone-hint">ID numérico do número de telefone no Meta Business Manager.</small>';
      }

      var credsHtml = '';
      if (wahaConfig) {
        credsHtml = '<label>API Key<input type="password" name="credentials[apiKey]" autocomplete="new-password" required aria-describedby="apikey-hint"></label><small id="apikey-hint">Chave de API do WAHA. Não será reexibida.</small><label>Webhook Token<input type="password" name="credentials[webhookToken]" autocomplete="new-password" required></label>';
      } else {
        credsHtml = '<label>Access Token<input type="password" name="credentials[accessToken]" autocomplete="new-password" required aria-describedby="accesstoken-hint"></label><small id="accesstoken-hint">Token de acesso da Meta Graph API. Não será reexibido.</small><label>App Secret<input type="password" name="credentials[appSecret]" autocomplete="new-password" required></label><label>Verify Token<input type="password" name="credentials[verifyToken]" autocomplete="new-password" required></label>';
      }

      return '<form id="step2-form" class="form-grid"><input type="hidden" name="csrf_token" value="' + escapeHtml(getCsrf()) + '"><h2>Etapa 2: Provedor e Configuração</h2><p>Selecione o provedor e preencha a configuração e credenciais. Segredos nunca são reexibidos.</p>' + errorHtml + '<label>Provedor<select name="provider" required onchange="this.form.submit()"><option value="">Selecione...</option><option value="waha" ' + (wahaConfig ? 'selected' : '') + '>WAHA (WhatsApp HTTP API)</option><option value="meta" ' + (metaConfig ? 'selected' : '') + '>Meta WhatsApp Business API</option></select></label><fieldset class="config-group"><legend>Configuração' + (wahaConfig ? ' (WAHA)' : ' (Meta)') + '</legend>' + configError + configHtml + '</fieldset><fieldset class="credentials-group"><legend>Credenciais' + (wahaConfig ? ' (WAHA)' : ' (Meta)') + '</legend>' + credsError + credsHtml + '</fieldset><div class="form-actions"><button type="submit" name="action" value="next" class="button primary">Validar e Continuar</button><button type="submit" name="action" value="back" class="button secondary">Voltar</button></div></form>';
    }

    function renderStep3() {
      var provider = formData.provider || '';
      var config = formData.config || {};
      var errorHtml = errors.validation ? '<p class="error" role="alert">' + escapeHtml(errors.validation) + '</p>' : '';

      var summaryHtml = '';
      if (provider === 'waha') {
        summaryHtml = '<strong>URL Base:</strong> ' + escapeHtml(config.baseUrl || '') + '<br><strong>Sessão:</strong> ' + escapeHtml(config.sessionName || '');
      } else {
        summaryHtml = '<strong>Graph Version:</strong> ' + escapeHtml(config.graphVersion || '') + '<br><strong>Phone Number ID:</strong> ' + escapeHtml(config.phoneNumberId || '');
      }

      return '<form id="step3-form" class="form-grid"><input type="hidden" name="csrf_token" value="' + escapeHtml(getCsrf()) + '"><h2>Etapa 3: Validação</h2><p>Teste a conexão com o provedor antes de ativar. Credenciais não são exibidas.</p>' + errorHtml + '<div class="validation-summary"><strong>Provedor:</strong> ' + escapeHtml(provider.toUpperCase()) + '<br>' + summaryHtml + '</div>' + (validationResult ? '<div class="validation-result ' + (validationResult.valid ? 'success' : 'error') + '" role="status">' + (validationResult.valid ? '✓ Conexão bem-sucedida' : '✗ Falha na validação: ' + escapeHtml(validationResult.error)) + (validationResult.data ? '<pre>' + escapeHtml(JSON.stringify(validationResult.data, null, 2)) + '</pre>' : '') + '</div>' : '') + '<div class="form-actions"><button type="submit" class="button primary" ' + (validationResult && !validationResult.valid ? 'disabled' : '') + '>Ativar Instalação</button><button type="button" onclick="window.location.href=\'/setup/draft\'" class="button secondary">Editar Configuração</button></div></form>';
    }

    function renderStep4() {
      var provider = formData.provider || '';
      var config = formData.config || {};
      var errorHtml = errors.activation ? '<p class="error" role="alert">' + escapeHtml(errors.activation) + '</p>' : '';

      var summaryHtml = '';
      if (provider === 'waha') {
        summaryHtml = '<strong>URL Base:</strong> ' + escapeHtml(config.baseUrl || '') + '<br><strong>Sessão:</strong> ' + escapeHtml(config.sessionName || '');
      } else {
        summaryHtml = '<strong>Graph Version:</strong> ' + escapeHtml(config.graphVersion || '') + '<br><strong>Phone Number ID:</strong> ' + escapeHtml(config.phoneNumberId || '');
      }

      return '<form id="step4-form" class="form-grid"><input type="hidden" name="csrf_token" value="' + escapeHtml(getCsrf()) + '"><h2>Etapa 4: Ativação</h2><p>Confirme a ativação da instância. Após ativar, a configuração não poderá mais ser alterada.</p>' + errorHtml + '<div class="activation-summary"><strong>Provedor:</strong> ' + escapeHtml(provider.toUpperCase()) + '<br>' + summaryHtml + '</div>' + (activationResult ? '<div class="activation-result ' + (activationResult.success ? 'success' : 'error') + '" role="status">' + (activationResult.success ? '✓ Instalação ativada com sucesso!' : '✗ Falha na ativação: ' + escapeHtml(activationResult.error)) + '</div>' : '') + '<div class="form-actions">' + (!activationResult ? '<button type="submit" class="button primary" onclick="return confirm(\'Confirmar ativação? A configuração será travada.\')">Confirmar Ativação</button>' : '<a href="/setup/status" class="button primary">Ver Status</a>') + '<button type="button" onclick="window.location.href=\'/setup/draft\'" class="button secondary">Cancelar</button></div></form>';
    }

    function bindEvents() {
      var form1 = document.getElementById('step1-form');
      if (form1) form1.addEventListener('submit', handleStep1Submit);

      var form2 = document.getElementById('step2-form');
      if (form2) form2.addEventListener('submit', handleStep2Submit);

      var form3 = document.getElementById('step3-form');
      if (form3) form3.addEventListener('submit', handleStep3Submit);

      var form4 = document.getElementById('step4-form');
      if (form4) form4.addEventListener('submit', handleStep4Submit);
    }

    async function handleStep1Submit(e) {
      e.preventDefault();
      var form = e.target;
      var formData = new FormData(form);
      var secret = formData.get('secret');

      if (!secret || secret.length < 16) {
        showError('Credencial bootstrap deve ter pelo menos 16 caracteres');
        return;
      }

      try {
        var resp = await fetch('/setup/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret: secret, csrf_token: getCsrf() })
        });
        var result = await resp.json();
        if (resp.ok) {
          currentStep = 2;
          redirect('/setup/draft');
        } else {
          showError(result.error?.message || 'Falha no bootstrap');
        }
      } catch (err) {
        showError('Erro de rede: ' + err.message);
      }
    }

    async function handleStep2Submit(e) {
      e.preventDefault();
      var form = e.target;
      var action = e.submitter?.value || 'next';

      if (action === 'back') {
        currentStep = 1;
        redirect('/setup/bootstrap');
        return;
      }

      var formDataObj = new FormData(form);
      var data = {};
      for (var pair of formDataObj.entries()) {
        if (pair[0] === 'csrf_token') continue;
        if (pair[0] === 'action') continue;
        if (pair[0] === 'provider') {
          data.provider = pair[1];
        } else if (pair[0].startsWith('config[')) {
          data.config = data.config || {};
          data.config[pair[0].replace('config[', '').replace(']', '')] = pair[1];
        } else if (pair[0].startsWith('credentials[')) {
          data.credentials = data.credentials || {};
          data.credentials[pair[0].replace('credentials[', '').replace(']', '')] = pair[1];
        }
      }

      if (!data.provider || (!data.config && !data.credentials)) {
        showError('Preencha a configuração e credenciais');
        return;
      }

      formData = data;
      currentStep = 2;
      redirect('/setup/draft');
    }

    async function handleStep3Submit(e) {
      e.preventDefault();
      var form = e.target;

      try {
        var resp = await fetch('/setup/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ csrf_token: getCsrf() })
        });
        var result = await resp.json();
        if (resp.ok) {
          validationResult = result;
          currentStep = 3;
          redirect('/setup/validate');
        } else {
          showError(result.error?.message || 'Falha na validação');
        }
      } catch (err) {
        showError('Erro de rede: ' + err.message);
      }
    }

    async function handleStep4Submit(e) {
      e.preventDefault();
      var form = e.target;

      if (!confirm('Confirmar ativação? A configuração será travada.')) return;

      try {
        var resp = await fetch('/setup/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ csrf_token: getCsrf() })
        });
        var result = await resp.json();
        if (resp.ok) {
          activationResult = result;
          currentStep = 4;
          redirect('/setup/activate');
        } else {
          showError(result.error?.message || 'Falha na ativação');
        }
      } catch (err) {
        showError('Erro de rede: ' + err.message);
      }
    }

    function escapeHtml(text) {
      return String(text ?? '').replace(/[&<>"']/g, function(char) {
        var map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": String.fromCharCode(39) };
        return map[char];
      });
    }

    function updateProgress() {
      var steps = document.querySelectorAll('.wizard-progress li');
      steps.forEach(function(step, i) {
        var num = i + 1;
        step.classList.remove('active', 'completed');
        if (num === currentStep) step.classList.add('active');
        else if (num < currentStep) step.classList.add('completed');
      });
    }

    return {
      updateState: updateState,
      goToStep: function(step) {
        currentStep = step;
        redirect('/setup/' + (step === 1 ? 'bootstrap' : step === 2 ? 'draft' : step === 3 ? 'validate' : 'activate'));
      },
      getCurrentStep: function() { return currentStep; },
      getFormData: function() { return formData; },
      getValidationResult: function() { return validationResult; },
      getActivationResult: function() { return activationResult; }
    };
  }

  return { createSetupWizardClient: createSetupWizardClient };
});
