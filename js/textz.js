// ==================== textz.js – ATHOM (Versão Original Funcional) ====================
(function () {
  // ---------- INJETAR CSS ----------
  const style = document.createElement('style');
  style.textContent = `
    .textz-wrapper {
      display: flex; flex-direction: column; height: 100%;
      overflow-y: auto; padding: 10px 12px; gap: 8px;
      -webkit-overflow-scrolling: touch;
    }
    .textz-contact-card {
      background: #faf3e0; border-radius: 16px; padding: 12px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: pointer;
      height: 95px; flex-shrink: 0; overflow: hidden;
      transition: max-height 0.4s ease, opacity 0.4s ease, margin 0.4s ease, padding 0.4s ease;
      max-height: 95px; opacity: 1; margin-bottom: 8px;
    }
    .textz-contact-card:active { background: #f0e8cc; }
    .textz-contact-card.card-hidden {
      max-height: 0; opacity: 0; margin: 0; padding: 0 12px;
      pointer-events: none; overflow: hidden;
    }
    .textz-contact-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
    }
    .textz-contact-info {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; justify-content: center;
    }
    .textz-contact-name { font-weight: 700; font-size: 16px; color: #222; margin-bottom: 4px; }
    .textz-contact-status {
      font-size: 12px; color: #58d3f7;
      display: flex; align-items: center; gap: 4px; margin-bottom: 4px;
    }
    .textz-contact-preview {
      font-size: 13px; color: #666;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .textz-contact-meta {
      text-align: right; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
    }
    .textz-contact-time { font-size: 11px; color: #999; }
    .textz-contact-checks { color: #4A90D9; font-size: 12px; }

    /* Chat expandido */
    .textz-chat-expanded {
      background: #f5f5f5; border-radius: 24px; overflow: hidden;
      max-height: 0; opacity: 0;
      transition: max-height 0.45s ease, opacity 0.35s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex; flex-direction: column;
      flex-shrink: 0; margin: 0;
    }
    .textz-chat-expanded.open {
      max-height: 55vh; opacity: 1;
    }
    .textz-chat-expanded.closing {
      max-height: 0 !important; opacity: 0;
      transition: max-height 0.45s ease, opacity 0.35s ease;
    }

    .textz-chat-header-inline {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; background: #fff;
      border-radius: 24px 24px 0 0; cursor: pointer;
    }
    .textz-messages-area {
      flex: 1; overflow-y: auto; padding: 8px 12px;
      background: rgba(255,255,255,0.4); margin: 0 6px;
      border-radius: 16px; min-height: 0; max-height: 35vh;
    }
    .textz-input-bar {
      background: #e5e5e5; height: 48px;
      display: flex; align-items: center; padding: 0 10px;
      justify-content: space-between; border-radius: 0 0 24px 24px;
      flex-shrink: 0; position: relative;
    }
    .textz-input-bar i { font-size: 22px; color: #777; padding: 6px; cursor: pointer; }
    .textz-input-hidden {
      flex: 1; background: transparent; border: none; outline: none;
      font-size: 16px; color: #333; padding: 0 8px; opacity: 0.5;
    }
    .textz-input-hidden:focus { opacity: 1; background: rgba(255,255,255,0.8); border-radius: 20px; }
    .textz-send-btn {
      background: var(--bg-header-top); color: #fff; border: none;
      border-radius: 50%; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 18px; margin-left: 4px; flex-shrink: 0;
    }
    .textz-emoji-panel {
      position: absolute; bottom: 50px; left: 10px;
      background: #fff; border-radius: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      padding: 8px; display: grid;
      grid-template-columns: repeat(4, 1fr); gap: 6px;
      z-index: 50; display: none;
    }
    .textz-emoji-panel.show { display: grid; }
    .textz-emoji-panel button { background: none; border: none; font-size: 24px; padding: 4px; cursor: pointer; }
    .textz-emoji-panel button:active { transform: scale(1.2); }

    /* Balões */
    .msg-bubble {
      max-width: 85%; padding: 10px 14px; font-size: 14px;
      line-height: 1.5; position: relative; word-break: break-word;
      margin-bottom: 4px;
    }
    .msg-received {
      background: #fff; float: left;
      border-radius: 2px 12px 12px 12px; margin-left: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .msg-received::before {
      content: ''; position: absolute; top: 0; left: -8px;
      border-top: 10px solid #fff; border-left: 8px solid transparent;
    }
    .msg-sent {
      background: #e8e8e8; float: right;
      border-radius: 12px 2px 12px 12px; margin-right: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .msg-sent::after {
      content: ''; position: absolute; top: 0; right: -8px;
      border-top: 10px solid #e8e8e8; border-right: 8px solid transparent;
    }
    .msg-sent-footer {
      display: flex; align-items: center; gap: 4px;
      margin-top: 5px; font-size: 11px; color: #999;
    }
    .msg-sent-checks { color: #4A90D9; }
    .msg-received-time {
      font-size: 11px; color: #999; margin-left: 14px;
      margin-bottom: 8px; clear: both; float: left; width: 100%;
    }
    .textz-date-separator {
      text-align: center; font-size: 12px; color: #999;
      margin: 8px 0; clear: both;
    }
    .msg-img {
      max-width: 200px; border-radius: 8px; display: block; cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  // ---------- ESTADO ----------
  let chatContacts = [];
  let activeContactId = null;
  let isAnimating = false;
  const listeners = {};

  // ---------- CARREGAR CONTATOS ----------
  async function loadContacts() {
    try {
      if (typeof db === 'undefined' || !auth.currentUser) return;
      const uid = auth.currentUser.uid;
      const userDoc = await db.collection('users').doc(uid).get();
      const friendIds = userDoc.exists ? (userDoc.data().friends || []) : [];
      if (friendIds.length === 0) {
        chatContacts = [];
        return;
      }
      const friendDocs = await Promise.all(
        friendIds.map(id => db.collection('users').doc(id).get())
      );
      chatContacts = friendDocs
        .filter(doc => doc.exists)
        .map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name || (d.firstName + ' ' + d.lastName).trim() || 'Usuário',
            avatar: d.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80',
            status: d.status || '',
            preview: d.quote || '',
            time: '',
            online: d.statusType === 'online',
            unread: 0
          };
        });
    } catch (e) {
      console.warn('Erro ao carregar contatos:', e);
    }
  }

  // ---------- RENDERIZAR LISTA DE CONTATOS ----------
  async function renderTextzList() {
    await loadContacts();
    const feed = document.getElementById('mainFeed');
    if (!feed) return;
    feed.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'textz-wrapper';

    if (chatContacts.length === 0) {
      wrapper.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#888;">
          <p style="font-size:16px; margin-bottom:8px;">📭 Você ainda não tem amigos para conversar.</p>
          <p style="font-size:13px; margin-bottom:16px;">Encontre pessoas e comece uma conversa!</p>
          <button class="btn-primary" onclick="closeModal(); openSearchModal();" style="width:auto; display:inline-block; padding:10px 24px;">🔍 Buscar pessoas</button>
        </div>`;
      feed.appendChild(wrapper);
      return;
    }

    chatContacts.forEach(contact => {
      const card = document.createElement('div');
      card.className = 'textz-contact-card';
      card.id = `contactCard_${contact.id}`;
      card.innerHTML = `
        <img src="${contact.avatar}" class="textz-contact-avatar">
        <div class="textz-contact-info">
          <div class="textz-contact-name">${contact.name}</div>
          <div class="textz-contact-status"><i class="fas ${contact.online ? 'fa-eye' : 'fa-book'}" style="font-size:11px;"></i> ${contact.status}</div>
          <div class="textz-contact-preview">${contact.preview}</div>
        </div>
        <div class="textz-contact-meta">
          <span class="textz-contact-time">${contact.time}</span>
          ${contact.unread > 0 ? '<span class="textz-contact-checks">✓✓</span>' : ''}
        </div>`;

      card.addEventListener('click', () => {
        if (isAnimating) return;
        if (activeContactId === contact.id) return;

        // Fecha chat anterior
        if (activeContactId) {
          const prevChat = document.getElementById(`chatExpanded_${activeContactId}`);
          if (prevChat) {
            prevChat.classList.add('closing');
            prevChat.classList.remove('open');
            if (listeners[activeContactId]) {
              listeners[activeContactId]();
              delete listeners[activeContactId];
            }
            setTimeout(() => {
              if (prevChat.parentNode) prevChat.remove();
            }, 500);
          }
          const prevCard = document.getElementById(`contactCard_${activeContactId}`);
          if (prevCard) prevCard.classList.remove('card-hidden');
        }

        // Abre novo chat
        activeContactId = contact.id;
        isAnimating = true;
        card.classList.add('card-hidden');

        const chat = createChatExpanded(contact.id);
        card.after(chat);

        void chat.offsetWidth;
        chat.classList.add('open');
        listenToMessages(contact.id);
        setupChatInput(contact.id);

        setTimeout(() => { isAnimating = false; }, 500);
      });
      wrapper.appendChild(card);

      // Se já estava ativo
      if (contact.id === activeContactId) {
        card.classList.add('card-hidden');
        const chat = createChatExpanded(contact.id);
        card.after(chat);
        void chat.offsetWidth;
        chat.classList.add('open');
        listenToMessages(contact.id);
        setupChatInput(contact.id);
      }
    });

    feed.appendChild(wrapper);
  }

  function createChatExpanded(contactId) {
    const contact = chatContacts.find(c => c.id === contactId);
    if (!contact) return document.createElement('div');
    const container = document.createElement('div');
    container.className = 'textz-chat-expanded';
    container.id = `chatExpanded_${contactId}`;

    container.innerHTML = `
      <div class="textz-chat-header-inline" id="closeChatHeader_${contactId}">
        <img src="${contact.avatar}" class="textz-contact-avatar" style="width:44px;height:44px;">
        <div>
          <div class="textz-contact-name">${contact.name}</div>
          <div class="textz-contact-status"><i class="fas fa-eye" style="font-size:11px;"></i> ${contact.status}</div>
        </div>
      </div>
      <div class="textz-messages-area" id="chatMessages_${contactId}"></div>
      <div class="textz-input-bar">
        <i class="far fa-smile" id="emoji_${contactId}"></i>
        <input type="text" class="textz-input-hidden" id="input_${contactId}" placeholder="Mensagem...">
        <div style="display:flex;align-items:center;gap:2px;">
          <i class="fas fa-microphone" id="mic_${contactId}"></i>
          <i class="fas fa-folder" id="attach_${contactId}"></i>
          <i class="fas fa-camera" id="camera_${contactId}"></i>
          <button class="textz-send-btn" id="send_${contactId}"><i class="fas fa-paper-plane" style="color:#fff;font-size:16px;"></i></button>
        </div>
        <div class="textz-emoji-panel" id="emojiPanel_${contactId}">
          <button>😀</button><button>😂</button><button>😍</button><button>🔥</button>
          <button>❤️</button><button>👍</button><button>😢</button><button>😡</button>
          <button>🥺</button><button>😎</button><button>🤔</button><button>💬</button>
        </div>
      </div>`;

    container.querySelector(`#closeChatHeader_${contactId}`).addEventListener('click', () => closeChat(contactId));
    return container;
  }

  function closeChat(contactId) {
    if (isAnimating) return;
    isAnimating = true;

    const chat = document.getElementById(`chatExpanded_${contactId}`);
    if (chat) {
      chat.classList.add('closing');
      chat.classList.remove('open');
    }
    if (listeners[contactId]) {
      listeners[contactId]();
      delete listeners[contactId];
    }

    setTimeout(() => {
      if (chat && chat.parentNode) chat.remove();
      const card = document.getElementById(`contactCard_${contactId}`);
      if (card) card.classList.remove('card-hidden');
      activeContactId = null;
      isAnimating = false;
    }, 500);
  }

  // ---------- MENSAGENS ----------
  function listenToMessages(contactId) {
    if (listeners[contactId]) listeners[contactId]();
    const currentUid = auth.currentUser.uid;
    const chatId = [currentUid, contactId].sort().join('_');
    const unsub = db.collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        const msgs = [];
        snap.forEach(doc => {
          const m = doc.data();
          msgs.push({
            sender: m.senderId === currentUid ? 'me' : 'other',
            text: m.text || '',
            imageUrl: m.imageUrl || '',
            time: m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          });
        });
        renderMessages(contactId, msgs);
      }, error => console.warn('Erro no listener de mensagens:', error));
    listeners[contactId] = unsub;
  }

  function renderMessages(contactId, msgs) {
    const area = document.getElementById(`chatMessages_${contactId}`);
    if (!area) return;
    if (msgs.length === 0) {
      area.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Nenhuma mensagem ainda.</p>';
      return;
    }
    let html = '<div class="textz-date-separator">Hoje</div>';
    msgs.forEach(msg => {
      if (msg.sender === 'other') {
        if (msg.imageUrl) {
          html += `<div class="msg-bubble msg-received"><img src="${msg.imageUrl}" class="msg-img" alt="Imagem" onclick="window.open(this.src)"></div><div class="msg-received-time">${msg.time}</div>`;
        } else {
          html += `<div class="msg-bubble msg-received">${msg.text}</div><div class="msg-received-time">${msg.time}</div>`;
        }
      } else {
        if (msg.imageUrl) {
          html += `<div class="msg-bubble msg-sent"><img src="${msg.imageUrl}" class="msg-img" alt="Imagem" onclick="window.open(this.src)"><div class="msg-sent-footer"><span class="msg-sent-checks">✓✓</span> ${msg.time}</div></div><div style="clear:both;"></div>`;
        } else {
          html += `<div class="msg-bubble msg-sent">${msg.text}<div class="msg-sent-footer"><span class="msg-sent-checks">✓✓</span> ${msg.time}</div></div><div style="clear:both;"></div>`;
        }
      }
    });
    area.innerHTML = html;
    area.scrollTop = area.scrollHeight;
  }

  // ---------- ENVIO ----------
  async function sendMessage(contactId, text, imageUrl = '') {
    if ((!text && !imageUrl) || !auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    const chatId = [currentUid, contactId].sort().join('_');
    try {
      await db.collection('chats').doc(chatId).collection('messages').add({
        senderId: currentUid,
        senderName: auth.currentUser.displayName || 'Usuário',
        text: text,
        imageUrl: imageUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const input = document.getElementById(`input_${contactId}`);
      if (input) input.value = '';
    } catch (e) {
      showToast('Erro ao enviar mensagem.');
      console.error(e);
    }
  }

  // ---------- INPUT ----------
  function setupChatInput(contactId) {
    const input = document.getElementById(`input_${contactId}`);
    if (!input || input._listenerSet) return;
    input._listenerSet = true;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = input.value.trim();
        if (text) sendMessage(contactId, text);
      }
    });

    document.getElementById(`send_${contactId}`)?.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) sendMessage(contactId, text);
    });

    const emojiBtn = document.getElementById(`emoji_${contactId}`);
    const emojiPanel = document.getElementById(`emojiPanel_${contactId}`);
    emojiBtn?.addEventListener('click', () => emojiPanel.classList.toggle('show'));
    emojiPanel?.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value += btn.textContent;
        input.focus();
        emojiPanel.classList.remove('show');
      });
    });

    document.getElementById(`mic_${contactId}`)?.addEventListener('click', () => showToast('Gravação em breve'));

    document.getElementById(`attach_${contactId}`)?.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => sendMessage(contactId, '', ev.target.result);
          reader.readAsDataURL(file);
        } else {
          showToast('Por favor, selecione uma imagem.');
        }
      };
      fileInput.click();
    });

    document.getElementById(`camera_${contactId}`)?.addEventListener('click', () => {
      const camInput = document.createElement('input');
      camInput.type = 'file';
      camInput.accept = 'image/*';
      camInput.capture = 'camera';
      camInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => sendMessage(contactId, '', ev.target.result);
          reader.readAsDataURL(file);
        }
      };
      camInput.click();
    });
  }

  // ---------- openChatDirect ----------
  window.openChatDirect = function(userId) {
    if (!auth.currentUser) return;
    if (chatContacts.length === 0) {
      loadContacts().then(() => {
        if (typeof window.setActiveTab === 'function') window.setActiveTab('textz');
        setTimeout(() => {
          const card = document.getElementById(`contactCard_${userId}`);
          if (card) card.click();
        }, 500);
      });
      return;
    }
    if (typeof window.setActiveTab === 'function') window.setActiveTab('textz');
    setTimeout(() => {
      const card = document.getElementById(`contactCard_${userId}`);
      if (card) card.click();
    }, 300);
  };

  // ---------- INTEGRAÇÃO ----------
  function waitForApp(cb) {
    if (window._appStarted) cb();
    else setTimeout(() => waitForApp(cb), 100);
  }

  waitForApp(() => {
    const originalSetActiveTab = window.setActiveTab;
    window.setActiveTab = function (tabName) {
      originalSetActiveTab(tabName);
      if (tabName === 'textz') {
        if (activeContactId) {
          const chat = document.getElementById(`chatExpanded_${activeContactId}`);
          if (chat) chat.remove();
          const card = document.getElementById(`contactCard_${activeContactId}`);
          if (card) card.classList.remove('card-hidden');
          if (listeners[activeContactId]) {
            listeners[activeContactId]();
            delete listeners[activeContactId];
          }
        }
        activeContactId = null;
        isAnimating = false;
        renderTextzList();
      }
    };

    if (document.querySelector('.header-tab.active[data-tab="textz"]')) {
      renderTextzList();
    }

    window.addEventListener('friendshipUpdated', () => {
      if (document.querySelector('.header-tab.active[data-tab="textz"]')) {
        renderTextzList();
      }
    });
  });

  console.log('💬 Textz original funcional ativo.');
})();