// ==================== contacts.js – ATHOM ====================
(function() {
  window.openContactsModalReal = function() {
    if (typeof openModal !== 'function') return;
    openModal('contactsModal');
    renderContacts();
  };

  async function renderContacts() {
    const list = document.getElementById('contactsList');
    if (!list) return;
    list.innerHTML = '<p style="text-align:center;">Carregando...</p>';
    try {
      const uid = auth.currentUser.uid;
      const doc = await db.collection('users').doc(uid).get();
      const friendIds = doc.exists ? (doc.data().friends || []) : [];
      if (!friendIds.length) { list.innerHTML = '<p style="text-align:center;">Nenhum amigo.</p>'; return; }
      const docs = await Promise.all(friendIds.map(id => db.collection('users').doc(id).get()));
      const friends = docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
      list.innerHTML = friends.map(f => `
        <div class="contact-card" onclick="openChatWithUser('${f.id}')">
          <img src="${f.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50'}" style="width:40px;height:40px;border-radius:50%;">
          <span>${f.name || f.firstName + ' ' + f.lastName}</span>
        </div>
      `).join('');
    } catch(e) { list.innerHTML = '<p>Erro ao carregar.</p>'; }
  }
})();