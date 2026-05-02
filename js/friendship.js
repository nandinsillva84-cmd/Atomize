// ==================== friendship.js – ATHOM ====================
(function() {
  function waitForReady(cb) {
    if (window._appStarted && auth.currentUser) { cb(); }
    else { setTimeout(() => waitForReady(cb), 200); }
  }

  waitForReady(() => {
    const currentUid = auth.currentUser.uid;
    let friends = [], sentRequests = [], receivedRequests = [];

    db.collection('users').doc(currentUid).onSnapshot(doc => {
      if (doc.exists) { friends = doc.data().friends || []; }
      window.dispatchEvent(new CustomEvent('friendshipUpdated'));
    });

    db.collection('friendRequests').where('to', '==', currentUid).onSnapshot(snapshot => {
      receivedRequests = [];
      snapshot.forEach(doc => {
        if (doc.data().status === 'pending') receivedRequests.push({ id: doc.id, ...doc.data() });
      });
      window.dispatchEvent(new CustomEvent('friendshipUpdated'));
    });

    db.collection('friendRequests').where('from', '==', currentUid).where('status', '==', 'pending').onSnapshot(snapshot => {
      sentRequests = [];
      snapshot.forEach(doc => sentRequests.push({ id: doc.id, ...doc.data() }));
      window.dispatchEvent(new CustomEvent('friendshipUpdated'));
    });

    window.getFriendshipStatus = function(uid) {
      if (uid === currentUid) return { isFriend: true, requestSent: false, requestReceived: false };
      return {
        isFriend: friends.includes(uid),
        requestSent: sentRequests.some(r => r.to === uid),
        requestReceived: receivedRequests.some(r => r.from === uid)
      };
    };

    window.sendFriendRequest = async function(toUid) {
      if (!currentUid) return;
      if (friends.includes(toUid)) return showToast('Vocês já são amigos.');
      await db.collection('friendRequests').add({
        from: currentUid, to: toUid, status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('Solicitação enviada!');
    };

    window.unfriendUser = async function(uid) {
      await db.collection('users').doc(currentUid).update({ friends: firebase.firestore.FieldValue.arrayRemove(uid) });
      await db.collection('users').doc(uid).update({ friends: firebase.firestore.FieldValue.arrayRemove(currentUid) });
      showToast('Você deixou de seguir.');
    };
  });
})();