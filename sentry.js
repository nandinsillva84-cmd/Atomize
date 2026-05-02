// ==================== sentry.js – ATHOM ====================
(function() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    setTimeout(arguments.callee, 200);
    return;
  }

  const DEV_EMAIL = 'nandinsillva84@gmail.com';
  let logs = [];

  function addLog(severity, message, details = {}) {
    logs.unshift({ severity, message, details, timestamp: new Date().toISOString() });
    if (logs.length > 300) logs.pop();
    try {
      if (firebase.auth().currentUser?.email === DEV_EMAIL) {
        db.collection('sentry_reports').add({
          severity, message, details, email: DEV_EMAIL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }
    } catch(e) {}
  }

  window.onerror = (msg, src, line, col, err) => {
    addLog('error', msg, { source: src, line, col, stack: err?.stack });
    return true;
  };

  window.addEventListener('unhandledrejection', e => {
    addLog('critical', `Promise rejeitada: ${e.reason?.message || e.reason}`);
  });

  const _err = console.error, _warn = console.warn;
  console.error = function(...args) {
    addLog('error', args.join(' '));
    _err.apply(console, args);
  };
  console.warn = function(...args) {
    addLog('warn', args.join(' '));
    _warn.apply(console, args);
  };
})();