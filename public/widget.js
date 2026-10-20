(function () {
  var script = document.currentScript;
  if (!script) return;

  var scriptUrl;
  try {
    scriptUrl = new URL(script.src);
  } catch (err) {
    return;
  }

  var widgetId = scriptUrl.searchParams.get('id');
  if (!widgetId) return;

  var loaded = window.__widgetPlatformLoaded || {};
  if (loaded[widgetId]) return;
  loaded[widgetId] = true;
  window.__widgetPlatformLoaded = loaded;

  var apiBase = scriptUrl.origin;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      if (character === '&') return '&amp;';
      if (character === '<') return '&lt;';
      if (character === '>') return '&gt;';
      if (character === '"') return '&quot;';
      return '&#39;';
    });
  }

  var POSITIONS = {
    'bottom-right': 'right:20px;bottom:20px;',
    'bottom-left': 'left:20px;bottom:20px;',
    'top-right': 'right:20px;top:20px;',
    'top-left': 'left:20px;top:20px;',
    center: 'left:50%;top:50%;transform:translate(-50%,-50%);',
  };

  function inputHtml(field, formId) {
    var id = formId + '-' + field.name;
    var attributes =
      'id="' + escapeHtml(id) + '" name="' + escapeHtml(field.name) + '"' +
      (field.required ? ' required' : '') +
      (field.maxLength ? ' maxlength="' + Number(field.maxLength) + '"' : '');
    var label =
      '<label for="' + escapeHtml(id) + '">' + escapeHtml(field.label) +
      (field.required ? ' *' : '') + '</label>';
    if (field.type === 'textarea') {
      return label + '<textarea rows="3" ' + attributes + '></textarea>';
    }
    var type =
      field.type === 'email' ? 'email' :
      field.type === 'tel' ? 'tel' :
      field.type === 'number' ? 'number' : 'text';
    return label + '<input type="' + type + '" ' + attributes + '>';
  }

  function render(config) {
    var widget = config.widget;
    var display = widget.display || {};
    var position = POSITIONS[display.position] || POSITIONS['bottom-right'];
    var formId = 'wp-' + String(widget.id).slice(0, 8);

    var host = document.createElement('section');
    host.className = 'wp-widget';
    host.setAttribute('data-widget-platform', widget.id);
    host.innerHTML =
      '<style>' +
      '.wp-widget{position:fixed;z-index:2147483000;width:320px;max-width:calc(100vw - 40px);box-sizing:border-box;padding:20px;border-radius:12px;background:#fff;color:#111827;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 12px 32px rgba(15,23,42,.24);' +
      position +
      '}' +
      '.wp-widget h2{margin:0 0 6px;font-size:18px;line-height:1.3;}' +
      '.wp-widget .wp-description{margin:0 0 14px;font-size:13px;line-height:1.5;color:#4b5563;}' +
      '.wp-field{margin-bottom:10px;}' +
      '.wp-widget label{display:block;margin-bottom:4px;font-size:12px;font-weight:600;}' +
      '.wp-widget input,.wp-widget textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font:inherit;font-size:13px;}' +
      '.wp-widget button{width:100%;padding:10px 12px;border:0;border-radius:8px;background:#111827;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;}' +
      '.wp-widget button:disabled{opacity:.6;cursor:default;}' +
      '.wp-status{margin:10px 0 0;font-size:12px;color:#b91c1c;}' +
      '.wp-done{margin:0;font-size:14px;color:#065f46;}' +
      '.wp-hp{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;}' +
      '</style>' +
      '<h2>' + escapeHtml(widget.title) + '</h2>' +
      (widget.description ? '<p class="wp-description">' + escapeHtml(widget.description) + '</p>' : '') +
      '<form>' +
      (widget.fields || []).map(function (field) {
        return '<div class="wp-field">' + inputHtml(field, formId) + '</div>';
      }).join('') +
      '<div class="wp-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<button type="submit">' + escapeHtml(widget.buttonText || 'Submit') + '</button>' +
      '<p class="wp-status" role="status"></p>' +
      '</form>';

    var form = host.querySelector('form');
    var button = host.querySelector('button');
    var status = host.querySelector('.wp-status');
    var inputs = host.querySelectorAll('.wp-field input, .wp-field textarea');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var fields = {};
      for (var i = 0; i < inputs.length; i += 1) {
        fields[inputs[i].name] = inputs[i].value;
      }
      var honeypot = form.querySelector('input[name="hp"]');
      button.disabled = true;
      status.textContent = '';

      fetch(apiBase + '/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          widgetId: widget.id,
          fields: fields,
          hp: honeypot ? honeypot.value : '',
        }),
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (body) {
            return { ok: response.ok, body: body };
          });
        })
        .then(function (result) {
          if (result.ok) {
            form.innerHTML = '<p class="wp-done">Thanks, we received your submission.</p>';
            return;
          }
          var message = result.body && result.body.error ? result.body.error.message : 'Something went wrong.';
          if (result.body && result.body.error && result.body.error.details && result.body.error.details.length) {
            message = result.body.error.details.map(function (detail) {
              return detail.field + ' ' + detail.message;
            }).join(', ');
          }
          status.textContent = message;
          button.disabled = false;
        })
        .catch(function () {
          status.textContent = 'Network error, please try again.';
          button.disabled = false;
        });
    });

    if (document.body) {
      document.body.appendChild(host);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.appendChild(host);
      });
    }
  }

  fetch(apiBase + '/widgets/' + encodeURIComponent(widgetId) + '/config')
    .then(function (response) {
      if (!response.ok) throw new Error('Widget unavailable');
      return response.json();
    })
    .then(function (config) {
      var display = (config.widget && config.widget.display) || {};
      var delay = display.trigger === 'delay' ? Number(display.delaySeconds || 0) : 0;
      if (delay > 0) {
        window.setTimeout(function () { render(config); }, delay * 1000);
      } else {
        render(config);
      }
    })
    .catch(function () {});
})();
