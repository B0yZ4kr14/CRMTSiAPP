(function exposeProviderSettings(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CrmProviderSettings = api;
})(typeof globalThis === 'object' ? globalThis : this, function providerSettingsFactory() {
  function createProviderSettingsClient(options) {
    var csrfToken = options.csrfToken || '';
    var showError = options.showError || function(msg) { alert(msg); };
    var showSuccess = options.showSuccess || function(msg) { alert(msg); };
    var reload = options.reload || function() { window.location.reload(); };

    function getCsrf() {
      var meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.content : csrfToken;
    }

    async function testProvider(provider) {
      try {
        var resp = await fetch('/providers/' + provider + '/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ csrf_token: getCsrf() })
        });
        var result = await resp.json();
        if (resp.ok) {
          showSuccess('Teste de conexão bem-sucedido: ' + (result.data ? JSON.stringify(result.data) : 'OK'));
        } else {
          showError('Falha no teste: ' + (result.error?.message || 'Erro desconhecido'));
        }
      } catch (err) {
        showError('Erro de rede: ' + err.message);
      }
    }

    async function rotateCredentials(provider, credentials) {
      try {
        var resp = await fetch('/providers/' + provider + '/rotate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials: credentials })
        });
        var result = await resp.json();
        if (resp.ok) {
          showSuccess('Credenciais rotacionadas com sucesso');
          reload();
        } else {
          showError('Falha na rotação: ' + (result.error?.message || 'Erro desconhecido'));
        }
      } catch (err) {
        showError('Erro de rede: ' + err.message);
      }
    }

    function openRotateModal(provider) {
      var modal = document.getElementById('rotate-modal');
      if (!modal) return;

      document.getElementById('rotate-provider').value = provider;
      var fields = document.getElementById('rotate-fields');
      var config = getProviderConfig(provider);

      if (!config) {
        showError('Configuração do provedor não encontrada');
        return;
      }

      if (provider === 'waha') {
        fields.innerHTML = '<label>API Key<input type="password" name="credentials[apiKey]" autocomplete="new-password" required></label><label>Webhook Token<input type="password" name="credentials[webhookToken]" autocomplete="new-password" required></label>';
      } else if (provider === 'meta') {
        fields.innerHTML = '<label>Access Token<input type="password" name="credentials[accessToken]" autocomplete="new-password" required></label><label>App Secret<input type="password" name="credentials[appSecret]" autocomplete="new-password" required></label><label>Verify Token<input type="password" name="credentials[verifyToken]" autocomplete="new-password" required></label>';
      }

      modal.style.display = 'flex';
    }

    function closeRotateModal() {
      var modal = document.getElementById('rotate-modal');
      if (modal) modal.style.display = 'none';
    }

    function getProviderConfig(provider) {
      var row = document.querySelector('tr[data-provider="' + provider + '"]');
      if (!row) return null;

      var configText = row.querySelector('td:nth-child(2)')?.textContent;
      try {
        return configText && configText !== '—' ? JSON.parse(configText) : {};
      } catch {
        return {};
      }
    }

    function bindRotateForm() {
      var form = document.getElementById('rotate-form');
      if (!form) return;

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var formEl = e.target;
        var provider = formEl.provider.value;

        var formData = new FormData(formEl);
        var credentials = {};
        for (var pair of formData.entries()) {
          if (pair[0].startsWith('credentials[')) {
            credentials[pair[0].replace('credentials[', '').replace(']', '')] = pair[1];
          }
        }

        if (Object.keys(credentials).length === 0) {
          showError('Preencha todas as credenciais');
          return;
        }

        await rotateCredentials(provider, credentials);
      });
    }

    function bindTestButtons() {
      document.querySelectorAll('button[data-action="test-provider"]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var provider = btn.dataset.provider;
          if (provider) testProvider(provider);
        });
      });
    }

    function bindRotateButtons() {
      document.querySelectorAll('button[data-action="rotate-provider"]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var provider = btn.dataset.provider;
          if (provider) openRotateModal(provider);
        });
      });
    }

    function init() {
      bindRotateForm();
      bindTestButtons();
      bindRotateButtons();

      var closeBtn = document.querySelector('#rotate-modal .modal-close');
      if (closeBtn) closeBtn.addEventListener('click', closeRotateModal);

      var modal = document.getElementById('rotate-modal');
      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) closeRotateModal();
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    return {
      testProvider: testProvider,
      rotateCredentials: rotateCredentials,
      openRotateModal: openRotateModal,
      closeRotateModal: closeRotateModal,
      init: init
    };
  }

  return { createProviderSettingsClient: createProviderSettingsClient };
});