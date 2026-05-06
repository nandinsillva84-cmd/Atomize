// ==================== sentry.js – YOU ====================

// Sentry é um sistema simples de log de erros para desenvolvedores.
// Ele captura erros globais e envia para o Firestore, mas APENAS
// se o usuário logado for o desenvolvedor (nandinsillva84@gmail.com).
// Tem proteção anti-recursão para não criar loops infinitos de erros.

(function() {
  // Espera o Firebase estar disponível
  if (typeof firebase === 'undefined' || !firebase.auth) {
    setTimeout(arguments.callee, 200);
    return;
  }

  // E-mail do desenvolvedor que receberá os logs
  const DEV_EMAIL = 'nandinsillva84@gmail.com';

  // Array local para armazenar os últimos 300 logs
  let logs = [];

  // Função que adiciona um log (severidade, mensagem, detalhes)
  function addLog(severity, message, details = {}) {
    // Adiciona o log no início do array
    logs.unshift({
      severity: severity,
      message: message,
      details: details,
      timestamp: new Date().toISOString()
    });

    // Mantém apenas os últimos 300 logs (evita consumo infinito de memória)
    if (logs.length > 300) {
      logs.pop();
    }

    // Envia para o Firestore apenas se for o desenvolvedor logado
    try {
      const currentUser = firebase.auth().currentUser;
      if (currentUser && currentUser.email === DEV_EMAIL) {
        // Proteção anti-recursão: se já estiver salvando, não tenta de novo
        if (!addLog._saving) {
          addLog._saving = true;
          db.collection('sentry_reports').add({
            severity: severity,
            message: message,
            details: details,
            email: DEV_EMAIL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(function(err) {
            // Se falhar ao salvar, ignora silenciosamente
          }).finally(function() {
            // Libera a flag para permitir novas tentativas
            addLog._saving = false;
          });
        }
      }
    } catch(e) {
      // Se algo der errado ao tentar logar, ignora
    }
  }

  // Captura erros globais de JavaScript (ex.: variável não definida)
  window.onerror = function(msg, src, line, col, err) {
    addLog('error', msg, {
      source: src,
      line: line,
      col: col,
      stack: err ? err.stack : ''
    });
    // Retorna true para evitar que o erro apareça no console
    return true;
  };

  // Captura promessas rejeitadas sem tratamento (ex.: fetch que falhou)
  window.addEventListener('unhandledrejection', function(e) {
    addLog('critical', 'Promise rejeitada: ' + (e.reason ? (e.reason.message || e.reason) : ''));
  });

  // Guarda as funções originais de console.error e console.warn
  var _err = console.error;
  var _warn = console.warn;

  // Substitui console.error: exibe o erro normalmente E registra no log
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    addLog('error', args.join(' '));
    _err.apply(console, args);
  };

  // Substitui console.warn: exibe o aviso normalmente E registra no log
  console.warn = function() {
    var args = Array.prototype.slice.call(arguments);
    addLog('warn', args.join(' '));
    _warn.apply(console, args);
  };

  console.log('📊 Sentry carregado (erros serão enviados para o desenvolvedor).');
})();