// ==================== chat.js – YOU (Textz + Fundo por Conversa + Microfone Real) ====================
(function () {
  'use strict';

  // ---------- INJETAR ESTILOS ----------
  if (!document.getElementById('chat-styles')) {
    var style = document.createElement('style');
    style.id = 'chat-styles';
    style.textContent =
      '.chat-wrapper{display:flex;flex-direction:column;height:100%;overflow-y:auto;padding:10px 12px;gap:8px;-webkit-overflow-scrolling:touch}' +
      '.chat-contact-card{background:#faf3e0;border-radius:16px;padding:12px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;height:95px;flex-shrink:0;overflow:hidden;transition:max-height 0.4s ease,opacity 0.4s ease,margin 0.4s ease,padding 0.4s ease;max-height:95px;opacity:1;margin-bottom:8px}' +
      '.chat-contact-card:active{background:#f0e8cc}' +
      '.chat-contact-card.chat-card-hidden{max-height:0;opacity:0;margin:0;padding:0 12px;pointer-events:none;overflow:hidden}' +
      '.chat-contact-avatar{width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0}' +
      '.chat-contact-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}' +
      '.chat-contact-name{font-weight:700;font-size:16px;color:#222;margin-bottom:4px}' +
      '.chat-contact-status{font-size:12px;color:#58d3f7;display:flex;align-items:center;gap:4px;margin-bottom:4px}' +
      '.chat-contact-preview{font-size:13px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.chat-contact-meta{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px}' +
      '.chat-contact-time{font-size:11px;color:#999}' +
      '.chat-contact-checks{color:#4A90D9;font-size:12px}' +
      '.chat-expanded{background:#f5f5f5;border-radius:24px;overflow:hidden;max-height:0;opacity:0;transition:max-height 0.45s ease,opacity 0.35s ease;box-shadow:0 4px 20px rgba(0,0,0,0.15);display:flex;flex-direction:column;flex-shrink:0;margin:0}' +
      '.chat-expanded.open{max-height:55vh;opacity:1}' +
      '.chat-expanded.closing{max-height:0!important;opacity:0;transition:max-height 0.45s ease,opacity 0.35s ease}' +
      '.chat-header-inline{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#fff;border-radius:24px 24px 0 0;cursor:pointer;position:relative}' +
      '.chat-messages-area{flex:1;overflow-y:auto;padding:8px 12px;background:rgba(255,255,255,0.4);margin:0 6px;border-radius:16px;min-height:0;max-height:35vh}' +
      '.chat-input-bar{background:#e5e5e5;height:48px;display:flex;align-items:center;padding:0 10px;justify-content:space-between;border-radius:0 0 24px 24px;flex-shrink:0;position:relative}' +
      '.chat-input-bar i{font-size:20px;color:#777;padding:6px;cursor:pointer}' +
      '.chat-input-hidden{flex:1;background:transparent;border:none;outline:none;font-size:16px;color:#333;padding:0 8px;opacity:0.7}' +
      '.chat-input-hidden:focus{opacity:1;background:rgba(255,255,255,0.8);border-radius:20px}' +
      '.chat-send-btn{background:var(--bg-header-top);color:#fff;border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;margin-left:4px;flex-shrink:0}' +
      '.chat-emoji-panel{position:absolute;bottom:50px;left:10px;background:#fff;border-radius:16px;box-shadow:0 4px 15px rgba(0,0,0,0.2);padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;z-index:50;display:none}' +
      '.chat-emoji-panel.show{display:grid}' +
      '.chat-emoji-panel button{background:none;border:none;font-size:24px;padding:4px;cursor:pointer}' +
      '.chat-emoji-panel button:active{transform:scale(1.2)}' +
      '.msg-bubble{max-width:85%;padding:10px 14px;font-size:14px;line-height:1.5;position:relative;word-break:break-word;margin-bottom:4px}' +
      '.msg-received{background:#fff;float:left;border-radius:2px 12px 12px 12px;margin-left:12px;box-shadow:0 1px 2px rgba(0,0,0,0.05)}' +
      '.msg-received::before{content:\'\';position:absolute;top:0;left:-8px;border-top:10px solid #fff;border-left:8px solid transparent}' +
      '.msg-sent{background:#e8e8e8;float:right;border-radius:12px 2px 12px 12px;margin-right:12px;box-shadow:0 1px 2px rgba(0,0,0,0.05)}' +
      '.msg-sent::after{content:\'\';position:absolute;top:0;right:-8px;border-top:10px solid #e8e8e8;border-right:8px solid transparent}' +
      '.msg-sent-footer{display:flex;align-items:center;gap:4px;margin-top:5px;font-size:11px;color:#999}' +
      '.msg-sent-checks{color:#4A90D9}' +
      '.msg-received-time{font-size:11px;color:#999;margin-left:14px;margin-bottom:8px;clear:both;float:left;width:100%}' +
      '.chat-date-separator{text-align:center;font-size:12px;color:#999;margin:8px 0;clear:both}' +
      '.msg-img{max-width:200px;border-radius:8px;display:block;cursor:pointer}' +
      '.msg-audio{max-width:200px;}' +
      '.chat-menu-dropdown{position:absolute;right:16px;top:50px;background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:60;padding:8px 0;display:none;min-width:160px;}' +
      '.chat-menu-dropdown.show{display:block}' +
      '.chat-menu-dropdown button{background:none;border:none;padding:10px 16px;width:100%;text-align:left;font-size:13px;cursor:pointer;}' +
      '.chat-menu-dropdown button:hover{background:#f0f0f0;}' +
      '.recording-indicator{display:none;position:absolute;right:50px;top:8px;background:#e74c3c;color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;animation:pulse 1s infinite;}' +
      '@keyframes pulse{0%{opacity:0.7;}50%{opacity:1;}100%{opacity:0.7;}}';
    document.head.appendChild(style);
  }

  // ---------- SANITIZAÇÃO ----------
  function escMsg(str) {
    if (typeof window.esc === 'function') return window.esc(str);
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ---------- ESTADO ----------
  var chatContacts = [];
  var activeContactId = null;
  var isAnimating = false;
  var listeners = {};

  // ---------- GRAVAÇÃO DE ÁUDIO ----------
  var mediaRecorder = null;
  var audioChunks = [];
  var recordingContactId = null;
  var recordingStartTime = 0;
  var recordingTimer = null;
  var maxRecordTime = 60; // segundos

  async function startRecording(contactId) {
    // Verifica permissão e obtém stream
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      recordingContactId = contactId;

      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = function () {
        var audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        var reader = new FileReader();
        reader.onload = function () {
          var base64 = reader.result;
          sendMessage(contactId, '', base64, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        // Para a stream
        stream.getTracks().forEach(function (track) { track.stop(); });
        // Reseta UI
        stopRecordingUI(contactId);
      };

      mediaRecorder.start();
      recordingStartTime = Date.now();
      updateRecordingUI(contactId, true);

      // Atualiza timer
      recordingTimer = setInterval(function () {
        var elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        if (elapsed >= maxRecordTime) {
          stopRecording();
        }
        var indicator = document.getElementById('recordingIndicator_' + contactId);
        if (indicator) {
          indicator.textContent = '🔴 ' + elapsed + 's';
        }
      }, 1000);

    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      if (typeof showToast === 'function') showToast('Permissão do microfone negada ou microfone indisponível.');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingTimer) clearInterval(recordingTimer);
  }

  function updateRecordingUI(contactId, recording) {
    var micBtn = document.getElementById('mic_' + contactId);
    var indicator = document.getElementById('recordingIndicator_' + contactId);
    if (micBtn) {
      micBtn.className = recording ? 'fas fa-stop' : 'fas fa-microphone';
      micBtn.style.color = recording ? '#e74c3c' : '#777';
    }
    if (indicator) {
      indicator.style.display = recording ? 'inline-block' : 'none';
    }
  }

  function stopRecordingUI(contactId) {
    updateRecordingUI(contactId, false);
    mediaRecorder = null;
    recordingContactId = null;
  }

  // ---------- CARREGAR CONTATOS ----------
  async function loadContacts() {
    try {
      if (typeof db === 'undefined' || !auth.currentUser) return;
      var uid = auth.currentUser.uid;
      var userDoc = await db.collection('users').doc(uid).get();
      var friendIds = userDoc.exists ? (userDoc.data().friends || []) : [];
      if (friendIds.length === 0) {
        chatContacts = [];
        return;
      }
      var friendDocs = await Promise.all(friendIds.map(function (id) { return db.collection('users').doc(id).get(); }));
      chatContacts = [];
      for (var i = 0; i < friendDocs.length; i++) {
        if (friendDocs[i].exists) {
          var d = friendDocs[i].data();
          chatContacts.push({
            id: friendDocs[i].id,
            name: d.name || (d.firstName + ' ' + d.lastName).trim() || 'Usuário',
            avatar: d.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80',
            status: d.status || '',
            preview: d.quote || '',
            time: '',
            online: d.statusType === 'online',
            unread: 0
          });
        }
      }
    } catch (e) { console.warn('Erro ao carregar contatos do chat:', e); }
  }

  // ---------- RENDERIZAR LISTA (FUNÇÃO GLOBAL) ----------
  window.renderChatList = async function () {
    if (activeContactId) {
      var prevChat = document.getElementById('chatExpanded_' + activeContactId);
      if (prevChat) prevChat.remove();
      var prevCard = document.getElementById('contactCard_' + activeContactId);
      if (prevCard) prevCard.classList.remove('chat-card-hidden');
      if (listeners[activeContactId]) {
        listeners[activeContactId]();
        delete listeners[activeContactId];
      }
    }
    activeContactId = null;
    isAnimating = false;

    await loadContacts();
    var feed = document.getElementById('mainFeed');
    if (!feed) return;

    if (typeof window.applyFeedBackground === 'function') {
      await window.applyFeedBackground('textz');
    }

    feed.innerHTML = '';
    var wrapper = document.createElement('div');
    wrapper.className = 'chat-wrapper';

    if (chatContacts.length === 0) {
      wrapper.innerHTML =
        '<div style="text-align:center;padding:40px 20px;color:#888;">' +
          '<p style="font-size:16px;margin-bottom:8px;">📭 Você ainda não tem amigos para conversar.</p>' +
          '<p style="font-size:13px;margin-bottom:16px;">Encontre pessoas e comece uma conversa!</p>' +
          '<button class="btn-primary" onclick="if(typeof closeModal===\'function\')closeModal();if(typeof openSearchModal===\'function\')openSearchModal();" style="width:auto;display:inline-block;padding:10px 24px;">🔍 Buscar pessoas</button>' +
        '</div>';
      feed.appendChild(wrapper);
      return;
    }

    for (var i = 0; i < chatContacts.length; i++) {
      (function (contact) {
        var card = document.createElement('div');
        card.className = 'chat-contact-card';
        card.id = 'contactCard_' + contact.id;
        card.innerHTML =
          '<img src="' + escMsg(contact.avatar) + '" class="chat-contact-avatar">' +
          '<div class="chat-contact-info">' +
            '<div class="chat-contact-name">' + escMsg(contact.name) + '</div>' +
            '<div class="chat-contact-status"><i class="fas ' + (contact.online ? 'fa-eye' : 'fa-book') + '" style="font-size:11px;"></i> ' + escMsg(contact.status) + '</div>' +
            '<div class="chat-contact-preview">' + escMsg(contact.preview) + '</div>' +
          '</div>' +
          '<div class="chat-contact-meta">' +
            '<span class="chat-contact-time">' + contact.time + '</span>' +
            (contact.unread > 0 ? '<span class="chat-contact-checks">✓✓</span>' : '') +
          '</div>';

        card.addEventListener('click', function () {
          if (isAnimating) return;
          if (activeContactId === contact.id) return;

          if (activeContactId) closeChat(activeContactId);

          activeContactId = contact.id;
          isAnimating = true;
          card.classList.add('chat-card-hidden');

          var chat = createChatExpanded(contact.id);
          card.after(chat);

          void chat.offsetWidth;
          chat.classList.add('open');
          listenToMessages(contact.id);
          setupChatInput(contact.id);

          aplicarFundoConversa(contact.id);

          setTimeout(function () { isAnimating = false; }, 500);
        });

        wrapper.appendChild(card);

        if (contact.id === activeContactId) {
          card.classList.add('chat-card-hidden');
          var chat = createChatExpanded(contact.id);
          card.after(chat);
          void chat.offsetWidth;
          chat.classList.add('open');
          listenToMessages(contact.id);
          setupChatInput(contact.id);
          aplicarFundoConversa(contact.id);
        }
      })(chatContacts[i]);
    }

    feed.appendChild(wrapper);
  };

  // ---------- APLICAR FUNDO DA CONVERSA ----------
  async function aplicarFundoConversa(contactId) {
    try {
      var uid = auth.currentUser.uid;
      var chatId = [uid, contactId].sort().join('_');
      var doc = await db.collection('chats').doc(chatId).get();
      var bgUrl = doc.exists ? doc.data().background : null;
      var area = document.getElementById('chatMessages_' + contactId);
      if (area) {
        if (bgUrl) {
          area.style.backgroundImage = 'url(' + bgUrl + ')';
          area.style.backgroundSize = 'cover';
          area.style.backgroundPosition = 'center';
        } else {
          area.style.backgroundImage = '';
          area.style.background = 'rgba(255,255,255,0.4)';
        }
      }
    } catch (e) {}
  }

  // ---------- CRIAR CHAT EXPANDIDO ----------
  function createChatExpanded(contactId) {
    var contact = null;
    for (var i = 0; i < chatContacts.length; i++) {
      if (chatContacts[i].id === contactId) { contact = chatContacts[i]; break; }
    }
    if (!contact) return document.createElement('div');

    var container = document.createElement('div');
    container.className = 'chat-expanded';
    container.id = 'chatExpanded_' + contactId;

    container.innerHTML =
      '<div class="chat-header-inline" id="closeChatHeader_' + contactId + '">' +
        '<img src="' + escMsg(contact.avatar) + '" class="chat-contact-avatar" style="width:44px;height:44px;">' +
        '<div>' +
          '<div class="chat-contact-name">' + escMsg(contact.name) + '</div>' +
          '<div class="chat-contact-status"><i class="fas fa-eye" style="font-size:11px;"></i> ' + escMsg(contact.status) + '</div>' +
        '</div>' +
        '<div style="margin-left:auto;position:relative;">' +
          '<i class="fas fa-ellipsis-v" id="chatMenuBtn_' + contactId + '" style="cursor:pointer;color:#888;font-size:18px;padding:4px;" onclick="window.toggleChatMenu(\'' + contactId + '\')"></i>' +
          '<div class="chat-menu-dropdown" id="chatMenu_' + contactId + '">' +
            '<button onclick="window.triggerChatBackground(\'' + contactId + '\')">🖼️ Mudar fundo</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="chat-messages-area" id="chatMessages_' + contactId + '"></div>' +
      '<div class="chat-input-bar">' +
        '<i class="far fa-smile" id="emoji_' + contactId + '"></i>' +
        '<input type="text" class="chat-input-hidden" id="input_' + contactId + '" placeholder="Mensagem...">' +
        '<span id="recordingIndicator_' + contactId + '" class="recording-indicator">🔴 0s</span>' +
        '<div style="display:flex;align-items:center;gap:2px;">' +
          '<i class="fas fa-microphone" id="mic_' + contactId + '"></i>' +
          '<i class="fas fa-folder" id="attach_' + contactId + '"></i>' +
          '<i class="fas fa-camera" id="camera_' + contactId + '"></i>' +
          '<button class="chat-send-btn" id="send_' + contactId + '"><i class="fas fa-paper-plane" style="color:#fff;font-size:16px;"></i></button>' +
        '</div>' +
        '<div class="chat-emoji-panel" id="emojiPanel_' + contactId + '">' +
          '<button>😀</button><button>😂</button><button>😍</button><button>🔥</button>' +
          '<button>❤️</button><button>👍</button><button>😢</button><button>😡</button>' +
          '<button>🥺</button><button>😎</button><button>🤔</button><button>💬</button>' +
        '</div>' +
      '</div>';

    container.querySelector('#closeChatHeader_' + contactId).addEventListener('click', function () { closeChat(contactId); });
    return container;
  }

  // ---------- MENU TRÊS PONTINHOS ----------
  window.toggleChatMenu = function (contactId) {
    var menu = document.getElementById('chatMenu_' + contactId);
    if (!menu) return;
    document.querySelectorAll('.chat-menu-dropdown.show').forEach(function (m) {
      if (m !== menu) m.classList.remove('show');
    });
    menu.classList.toggle('show');
  };

  window.triggerChatBackground = function (contactId) {
    var menu = document.getElementById('chatMenu_' + contactId);
    if (menu) menu.classList.remove('show');

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (file && typeof window.setChatBackground === 'function') {
        window.setChatBackground(contactId, file);
        setTimeout(function () { aplicarFundoConversa(contactId); }, 1000);
      }
    };
    input.click();
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.fa-ellipsis-v') && !e.target.closest('.chat-menu-dropdown')) {
      document.querySelectorAll('.chat-menu-dropdown.show').forEach(function (m) { m.classList.remove('show'); });
    }
  });

  // ========== SALVAR FUNDO DA CONVERSA ==========
  window.setChatBackground = window.setChatBackground || async function (contactId, file) {
    var reader = new FileReader();
    reader.onload = async function (e) {
      var dataUrl = e.target.result;
      var uid = auth.currentUser.uid;
      var chatId = [uid, contactId].sort().join('_');
      try {
        await db.collection('chats').doc(chatId).set({ background: dataUrl }, { merge: true });
        if (typeof showToast === 'function') showToast('Fundo da conversa atualizado!');
      } catch (err) {
        if (typeof showToast === 'function') showToast('Erro ao salvar.');
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  function closeChat(contactId) {
    if (isAnimating) return;
    isAnimating = true;

    var chat = document.getElementById('chatExpanded_' + contactId);
    if (chat) {
      chat.classList.add('closing');
      chat.classList.remove('open');
    }
    if (listeners[contactId]) {
      listeners[contactId]();
      delete listeners[contactId];
    }

    setTimeout(function () {
      if (chat && chat.parentNode) chat.remove();
      var card = document.getElementById('contactCard_' + contactId);
      if (card) card.classList.remove('chat-card-hidden');
      activeContactId = null;
      isAnimating = false;
    }, 500);
  }

  function listenToMessages(contactId) {
    if (listeners[contactId]) listeners[contactId]();
    var currentUid = auth.currentUser.uid;
    var chatId = [currentUid, contactId].sort().join('_');
    var unsub = db.collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(function (snap) {
        var msgs = [];
        snap.forEach(function (doc) {
          var m = doc.data();
          msgs.push({
            sender: m.senderId === currentUid ? 'me' : 'other',
            text: m.text || '',
            imageUrl: m.imageUrl || '',
            audioUrl: m.audioUrl || '',   // para mensagens de voz
            type: m.type || 'text',       // 'image', 'audio'
            time: m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          });
        });
        renderMessages(contactId, msgs);
      }, function (error) { console.warn('Erro no listener de mensagens:', error); });
    listeners[contactId] = unsub;
  }

  function renderMessages(contactId, msgs) {
    var area = document.getElementById('chatMessages_' + contactId);
    if (!area) return;
    if (msgs.length === 0) {
      area.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Nenhuma mensagem ainda.</p>';
      return;
    }
    var html = '<div class="chat-date-separator">Hoje</div>';
    for (var i = 0; i < msgs.length; i++) {
      var msg = msgs[i];
      if (msg.sender === 'other') {
        html += renderReceivedMessage(msg);
      } else {
        html += renderSentMessage(msg);
      }
    }
    area.innerHTML = html;
    area.scrollTop = area.scrollHeight;
  }

  function renderReceivedMessage(msg) {
    if (msg.type === 'audio' && msg.audioUrl) {
      return '<div class="msg-bubble msg-received"><audio class="msg-audio" controls src="' + escMsg(msg.audioUrl) + '"></audio></div><div class="msg-received-time">' + msg.time + '</div>';
    } else if (msg.imageUrl) {
      return '<div class="msg-bubble msg-received"><img src="' + escMsg(msg.imageUrl) + '" class="msg-img" alt="Imagem" onclick="window.open(this.src)"></div><div class="msg-received-time">' + msg.time + '</div>';
    } else {
      return '<div class="msg-bubble msg-received">' + escMsg(msg.text) + '</div><div class="msg-received-time">' + msg.time + '</div>';
    }
  }

  function renderSentMessage(msg) {
    if (msg.type === 'audio' && msg.audioUrl) {
      return '<div class="msg-bubble msg-sent"><audio class="msg-audio" controls src="' + escMsg(msg.audioUrl) + '"></audio><div class="msg-sent-footer"><span class="msg-sent-checks">✓✓</span> ' + msg.time + '</div></div><div style="clear:both;"></div>';
    } else if (msg.imageUrl) {
      return '<div class="msg-bubble msg-sent"><img src="' + escMsg(msg.imageUrl) + '" class="msg-img" alt="Imagem" onclick="window.open(this.src)"><div class="msg-sent-footer"><span class="msg-sent-checks">✓✓</span> ' + msg.time + '</div></div><div style="clear:both;"></div>';
    } else {
      return '<div class="msg-bubble msg-sent">' + escMsg(msg.text) + '<div class="msg-sent-footer"><span class="msg-sent-checks">✓✓</span> ' + msg.time + '</div></div><div style="clear:both;"></div>';
    }
  }

  // Modifiquei sendMessage para aceitar um tipo (text, image, audio) e a URL do conteúdo.
  // Agora o áudio também é enviado como base64 no campo audioUrl, com type 'audio'.
  async function sendMessage(contactId, text, mediaUrl, type) {
    if ((!text && !mediaUrl) || !auth.currentUser) return;
    var currentUid = auth.currentUser.uid;
    var chatId = [currentUid, contactId].sort().join('_');
    var messageData = {
      senderId: currentUid,
      senderName: auth.currentUser.displayName || 'Usuário',
      text: text || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (type === 'image') {
      messageData.imageUrl = mediaUrl;
      messageData.type = 'image';
    } else if (type === 'audio') {
      messageData.audioUrl = mediaUrl;
      messageData.type = 'audio';
    } else {
      messageData.type = 'text';
    }
    try {
      await db.collection('chats').doc(chatId).collection('messages').add(messageData);
      var input = document.getElementById('input_' + contactId);
      if (input) input.value = '';
    } catch (e) {
      if (typeof showToast === 'function') showToast('Erro ao enviar mensagem.');
      console.error(e);
    }
  }

  // Upload de imagem (já existente) adaptado para chamar sendMessage com type 'image'
  async function uploadImageAndSend(contactId, file) {
    if (typeof showToast === 'function') showToast('Enviando imagem...');
    var reader = new FileReader();
    reader.onload = async function (e) {
      var dataUrl = e.target.result;
      if (dataUrl.length > 500 * 1024) {
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement('canvas');
          var width = img.width, height = img.height;
          if (width > 800) { height *= 800 / width; width = 800; }
          canvas.width = width; canvas.height = height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          sendMessage(contactId, '', dataUrl, 'image');
        };
        img.src = dataUrl;
      } else {
        sendMessage(contactId, '', dataUrl, 'image');
      }
    };
    reader.onerror = function () { if (typeof showToast === 'function') showToast('Erro ao ler a imagem.'); };
    reader.readAsDataURL(file);
  }

  function setupChatInput(contactId) {
    var input = document.getElementById('input_' + contactId);
    if (!input || input._listenerSet) return;
    input._listenerSet = true;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var text = input.value.trim();
        if (text) sendMessage(contactId, text);
      }
    });

    document.getElementById('send_' + contactId)?.addEventListener('click', function () {
      var text = input.value.trim();
      if (text) sendMessage(contactId, text);
    });

    var emojiBtn = document.getElementById('emoji_' + contactId);
    var emojiPanel = document.getElementById('emojiPanel_' + contactId);
    if (emojiBtn) emojiBtn.addEventListener('click', function () {
      emojiPanel.classList.toggle('show');
    });
    if (emojiPanel) {
      var emojiButtons = emojiPanel.querySelectorAll('button');
      for (var i = 0; i < emojiButtons.length; i++) {
        emojiButtons[i].addEventListener('click', function () {
          input.value += this.textContent;
          input.focus();
          emojiPanel.classList.remove('show');
        });
      }
    }

    // Microfone para gravação de voz
    var micBtn = document.getElementById('mic_' + contactId);
    if (micBtn) {
      micBtn.addEventListener('click', function () {
        if (mediaRecorder && mediaRecorder.state === 'recording' && recordingContactId === contactId) {
          // Parar gravação
          stopRecording();
        } else {
          // Iniciar gravação
          startRecording(contactId);
        }
      });
    }

    // Anexo (galeria) – já funcionava, só garantimos que funciona
    document.getElementById('attach_' + contactId)?.addEventListener('click', function () {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = false; // uma imagem por vez para o chat
      fileInput.onchange = function (e) {
        var file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          uploadImageAndSend(contactId, file);
        } else {
          if (typeof showToast === 'function') showToast('Por favor, selecione uma imagem.');
        }
      };
      fileInput.click();
    });

    // Câmera
    document.getElementById('camera_' + contactId)?.addEventListener('click', function () {
      var camInput = document.createElement('input');
      camInput.type = 'file';
      camInput.accept = 'image/*';
      camInput.capture = 'environment'; // câmera traseira
      camInput.onchange = function (e) {
        var file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          uploadImageAndSend(contactId, file);
        }
      };
      camInput.click();
    });
  }

  // ========== ABRIR CHAT DIRETO ==========
  window.openChatDirect = function (userId) {
    if (!auth.currentUser) return;
    if (typeof window.setActiveTab === 'function') window.setActiveTab('textz');
    setTimeout(function () {
      var card = document.getElementById('contactCard_' + userId);
      if (card) card.click();
    }, 600);
  };
  window.openChatWithUser = window.openChatDirect;

  // ========== ATUALIZA LISTA QUANDO AMIZADES MUDAM ==========
  window.addEventListener('friendshipUpdated', function () {
    if (document.querySelector('.header-tab.active[data-tab="textz"]')) {
      window.renderChatList();
    }
  });

  console.log('💬 Chat (textz) com microfone real, galeria e câmera carregado.');
})();