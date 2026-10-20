const env = require('../config/env');

function buildSnippet(widgetId) {
  return `<script src="${env.publicBaseUrl}/widget.js?id=${widgetId}&v=${env.widgetScriptVersion}" async></script>`;
}

function withSnippet(widget) {
  return { ...widget, snippet: buildSnippet(widget.id) };
}

module.exports = { buildSnippet, withSnippet };
