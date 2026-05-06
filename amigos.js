// ==================== amigos.js – YOU ====================
// Gerencia todo o ciclo de amizade:
// - Enviar solicitação (seguir)
// - Aceitar solicitação recebida
// - Rejeitar solicitação recebida
// - Deixar de seguir (desfazer amizade)
// - Verificar status de amizade (isFriend, requestSent, requestReceived)
// - Listeners em tempo real (onSnapshot) com cleanup no logout
// - Prevenção de duplicatas (não envia se já for amigo ou já tiver solicitação pendente)

(function () {
  // Aguarda o app iniciar e o usuário estar logado
  function waitForReady(cb) {
    if (window._appStarted && auth.currentUser) {
      cb();
    } else {
      setTimeout(function () { waitForReady(cb); }, 200);
    }
  }

  waitForReady(function () {
    var currentUid = auth.currentUser.uid;

    // ========== ARRAYS LOCAIS (mantidos pelos listeners) ==========
    var friends = [];
    var sentRequests = [];
    var receivedRequests = [];

    // ========== LISTENERS EM TEMPO REAL ==========
    var unsubs = [];

    // Listener da lista de amigos do usuário
    unsubs.push(
      db.collection('users').doc(currentUid).onSnapshot(function (doc) {
        if (doc.exists) {
          friends = doc.data().friends || [];
        }
        window.dispatchEvent(new CustomEvent('friendshipUpdated'));
      })
    );

    // Listener de solicitações ENVIADAS (pendentes)
    unsubs.push(
      db.collection('friendRequests')
        .where('from', '==', currentUid)
        .where('status', '==', 'pending')
        .onSnapshot(function (snapshot) {
          sentRequests = [];
          snapshot.forEach(function (doc) {
            sentRequests.push({ id: doc.id, to: doc.data().to });
          });
          window.dispatchEvent(new CustomEvent('friendshipUpdated'));
        })
    );

    // Listener de solicitações RECEBIDAS (pendentes)
    unsubs.push(
      db.collection('friendRequests')
        .where('to', '==', currentUid)
        .where('status', '==', 'pending')
        .onSnapshot(function (snapshot) {
          receivedRequests = [];
          snapshot.forEach(function (doc) {
            receivedRequests.push({ id: doc.id, from: doc.data().from });
          });
          window.dispatchEvent(new CustomEvent('friendshipUpdated'));
        })
    );

    // Limpa todos os listeners quando o usuário sai
    window.addEventListener('friendshipCleanup', function () {
      for (var i = 0; i < unsubs.length; i++) {
        unsubs[i]();
      }
    });

    // ========== STATUS DE AMIZADE ==========
    // Retorna um objeto com três booleanos: isFriend, requestSent, requestReceived
    window.getFriendshipStatus = function (uid) {
      if (uid === currentUid) {
        return { isFriend: true, requestSent: false, requestReceived: false };
      }
      return {
        isFriend: friends.indexOf(uid) !== -1,
        requestSent: sentRequests.some(function (r) { return r.to === uid; }),
        requestReceived: receivedRequests.some(function (r) { return r.from === uid; })
      };
    };

    // ========== ENVIAR SOLICITAÇÃO DE AMIZADE ==========
    window.sendFriendRequest = async function (toUid) {
      if (!currentUid) return;
      // Verificações locais (evita duplicatas e situações inválidas)
      if (friends.indexOf(toUid) !== -1) {
        if (typeof showToast === 'function') showToast('Vocês já são amigos.');
        return;
      }
      if (sentRequests.some(function (r) { return r.to === toUid; })) {
        if (typeof showToast === 'function') showToast('Solicitação já enviada.');
        return;
      }
      if (receivedRequests.some(function (r) { return r.from === toUid; })) {
        if (typeof showToast === 'function') showToast('Este usuário já te enviou uma solicitação!');
        return;
      }

      try {
        await db.collection('friendRequests').add({
          from: currentUid,
          to: toUid,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (typeof showToast === 'function') showToast('Solicitação enviada!');
      } catch (e) {
        console.error(e);
        if (typeof showToast === 'function') showToast('Erro ao enviar solicitação.');
      }
    };

    // ========== DEIXAR DE SEGUIR ==========
    window.unfriendUser = async function (uid) {
      try {
        // Remove o amigo da sua lista
        await db.collection('users').doc(currentUid).update({
          friends: firebase.firestore.FieldValue.arrayRemove(uid)
        });
        // Remove você da lista do amigo
        await db.collection('users').doc(uid).update({
          friends: firebase.firestore.FieldValue.arrayRemove(currentUid)
        });
        if (typeof showToast === 'function') showToast('Você deixou de seguir.');
        window.dispatchEvent(new CustomEvent('friendshipUpdated'));
      } catch (e) {
        console.error(e);
        if (typeof showToast === 'function') showToast('Erro ao desfazer amizade.');
      }
    };

    // ========== ACEITAR SOLICITAÇÃO RECEBIDA ==========
    window.aceitarSolicitacaoRecebida = async function (fromUid) {
      try {
        // Busca a solicitação pendente
        var snap = await db.collection('friendRequests')
          .where('from', '==', fromUid)
          .where('to', '==', currentUid)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (snap.empty) {
          if (typeof showToast === 'function') showToast('Solicitação não encontrada.');
          return;
        }

        var reqId = snap.docs[0].id;
        var batch = db.batch();

        // Marca a solicitação como aceita
        batch.update(db.collection('friendRequests').doc(reqId), { status: 'accepted' });

        // Adiciona os dois na lista de amigos um do outro
        batch.update(db.collection('users').doc(currentUid), {
          friends: firebase.firestore.FieldValue.arrayUnion(fromUid)
        });
        batch.update(db.collection('users').doc(fromUid), {
          friends: firebase.firestore.FieldValue.arrayUnion(currentUid)
        });

        await batch.commit();
        if (typeof showToast === 'function') showToast('Amigo adicionado! ✅');
        window.dispatchEvent(new CustomEvent('friendshipUpdated'));
      } catch (e) {
        console.error(e);
        if (typeof showToast === 'function') showToast('Erro ao aceitar solicitação.');
      }
    };

    // ========== REJEITAR SOLICITAÇÃO RECEBIDA ==========
    window.rejeitarSolicitacaoRecebida = async function (fromUid) {
      try {
        var snap = await db.collection('friendRequests')
          .where('from', '==', fromUid)
          .where('to', '==', currentUid)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (snap.empty) return;

        await db.collection('friendRequests').doc(snap.docs[0].id).update({ status: 'rejected' });
        if (typeof showToast === 'function') showToast('Solicitação recusada.');
        window.dispatchEvent(new CustomEvent('friendshipUpdated'));
      } catch (e) {
        console.error(e);
        if (typeof showToast === 'function') showToast('Erro ao recusar.');
      }
    };

    console.log('👥 Módulo de amigos carregado.');
  });
})();