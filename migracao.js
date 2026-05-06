// ==================== migracao.js – YOU ====================

// Migração automática: adiciona os campos "name" e "nameLower"
// aos documentos de usuário que ainda não os possuem.
// Isso é necessário para a busca case‑insensitive funcionar.
// Executa apenas uma vez (controlado pelo localStorage).

(function() {
  async function executarMigracao() {
    try {
      // Se já executou a migração antes, não faz nada
      if (localStorage.getItem('you_migrated_names') === 'v1') {
        return;
      }

      // Busca todos os usuários
      var usersSnap = await db.collection('users').get();
      var count = 0;

      // Percorre cada documento
      for (var i = 0; i < usersSnap.docs.length; i++) {
        var doc = usersSnap.docs[i];
        var data = doc.data();

        // Monta o nome completo (fallback: firstName + lastName)
        var name = data.name || (data.firstName || '') + ' ' + (data.lastName || '');
        name = name.trim();
        var nameLower = name.toLowerCase();

        var updates = {};

        // Se o campo "name" não existe ou está diferente, atualiza
        if (!data.name || data.name !== name) {
          updates.name = name;
        }

        // Se o campo "nameLower" não existe ou está diferente, atualiza
        if (!data.nameLower || data.nameLower !== nameLower) {
          updates.nameLower = nameLower;
        }

        // Se há algo para atualizar, faz o update no Firestore
        if (Object.keys(updates).length > 0) {
          await doc.ref.update(updates);
          count++;
        }
      }

      // Mostra um toast informando quantos perfis foram atualizados
      if (count > 0 && typeof showToast === 'function') {
        showToast('✅ ' + count + ' perfis atualizados para busca.');
      }

      // Marca que a migração já foi feita
      localStorage.setItem('you_migrated_names', 'v1');
    } catch (e) {
      console.warn('Migração automática falhou, mas o app continua funcionando.', e);
    }
  }

  // Executa a migração assim que o app iniciar (após o Firebase estar pronto)
  if (typeof db !== 'undefined') {
    executarMigracao();
  } else {
    // Se o db.js ainda não carregou, espera um pouco
    var interval = setInterval(function() {
      if (typeof db !== 'undefined') {
        clearInterval(interval);
        executarMigracao();
      }
    }, 500);
  }

  console.log('🔄 Migração de perfis configurada.');
})();