// ==================== live.js – ATHOM (Central de Ajuda + Suporte integrado) ====================
(function () {
  // ========== BOTÃO NA TELA DE LOGIN (ABRE A CENTRAL COMPLETA) ==========
  function injectHelpOnLogin() {
    const loginScreen = document.getElementById('loginScreen');
    if (!loginScreen || document.getElementById('helpBtnOnLogin')) return;
    const helpBtn = document.createElement('button');
    helpBtn.id = 'helpBtnOnLogin';
    helpBtn.innerHTML = '<i class="fas fa-headset"></i> Precisa de ajuda?';
    helpBtn.style.cssText = `
      position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
      background:#8b1031; color:#fff; border:2px solid #fff;
      border-radius:30px; padding:12px 28px; font-size:15px; cursor:pointer;
      z-index:10; font-weight:700; display:flex; align-items:center; gap:8px;
      box-shadow:0 6px 20px rgba(0,0,0,0.5); letter-spacing:1px;
    `;
    helpBtn.addEventListener('click', e => { e.stopPropagation(); openHelpModal(); });
    loginScreen.style.position = 'relative';
    loginScreen.appendChild(helpBtn);
  }

  new MutationObserver(() => {
    const ls = document.getElementById('loginScreen');
    if (ls && ls.style.display !== 'none') injectHelpOnLogin();
  }).observe(document.body, { attributes: true, childList: true, subtree: true });

  // ========== ITEM "AJUDA" NO MENU ==========
  function injectHelpMenu() {
    if (document.getElementById('helpMenuItem')) return;
    const menuList = document.querySelector('.menu-list');
    if (!menuList) { setTimeout(injectHelpMenu, 500); return; }
    const item = document.createElement('div');
    item.id = 'helpMenuItem'; item.className = 'menu-item';
    item.innerHTML = '<i class="fas fa-question-circle menu-icon"></i><span>Ajuda</span>';
    item.addEventListener('click', () => {
      if (typeof closeMenuModal === 'function') closeMenuModal();
      openHelpModal();
    });
    const sair = menuList.querySelector('.menu-item-sair');
    sair ? menuList.insertBefore(item, sair) : menuList.appendChild(item);
  }
  const menuCheck = setInterval(() => {
    if (document.querySelector('.menu-list')) { injectHelpMenu(); clearInterval(menuCheck); }
  }, 500);

  // ========== CENTRAL DE AJUDA + FORMULÁRIO DE SUPORTE ==========
  function openHelpModal() {
    const old = document.getElementById('helpModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'helpModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#3a0814;z-index:9999;overflow-y:auto;display:flex;flex-direction:column;font-family:Roboto,sans-serif;';

    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#8b1031,#b71c3c);color:#fff;padding:20px 15px;display:flex;align-items:center;gap:15px;font-size:18px;font-weight:500;flex-shrink:0;box-shadow:0 4px 15px rgba(0,0,0,0.5);">
        <i class="fas fa-arrow-left" id="helpCloseBtn" style="cursor:pointer;font-size:20px;"></i>
        <span>Central de Ajuda</span>
      </div>
      <div style="flex:1;padding:16px;overflow-y:auto;background:#3a0814;font-size:14px;color:#f0f0f0;">
        <p style="text-align:center;margin-bottom:20px;color:#ddd;">Tudo o que você precisa para aproveitar o <strong style="color:#f1c40f;">ATHOM</strong>.</p>

        <!-- LOGIN -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">🔐</span> Problemas para Entrar
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <ul style="margin:0;padding-left:20px;">
              <li>E‑mail e senha corretos, sem espaços.</li>
              <li>Verifique sua <strong style="color:#f1c40f;">conexão</strong>.</li>
              <li>Esqueceu a senha? Use <strong style="color:#58d3f7;">"Esqueci a senha?"</strong>.</li>
            </ul>
          </div>
        </details>

        <!-- CRIAR CONTA -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">📝</span> Criar Conta
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <ul style="margin:0;padding-left:20px;">
              <li>Preencha Nome, Sobrenome, E‑mail e Senha (mín. 6 caracteres).</li>
              <li>Após criar, você receberá um <strong style="color:#58d3f7;">e‑mail de verificação</strong>.</li>
            </ul>
          </div>
        </details>

        <!-- SPAM -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">📧</span> E‑mails no spam?
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <p>Remetente: <strong style="color:#58d3f7;">supportAthom@chatbox-f7578.firebaseapp.com</strong></p>
            <ul style="margin:0;padding-left:20px;">
              <li>Adicione aos contatos.</li>
              <li>Marque como <strong style="color:#f1c40f;">"não é spam"</strong>.</li>
              <li>Confira a pasta de spam/lixo eletrônico.</li>
            </ul>
          </div>
        </details>

        <!-- PERFIL -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">👤</span> Como usar o Perfil
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <p>Toque no ícone <strong style="color:#f1c40f;">Perfil</strong> na barra inferior (👤).</p>
            <ul style="margin:0;padding-left:20px;">
              <li><strong style="color:#f1c40f;">📷 Foto:</strong> toque na câmera sobre a imagem e escolha uma foto.</li>
              <li><strong style="color:#58d3f7;">🎵 Status:</strong> diga o que você está ouvindo ou fazendo.</li>
              <li><strong style="color:#f1c40f;">💬 Pensamento do dia:</strong> escreva uma frase marcante.</li>
              <li>Toque em <strong style="color:#58d3f7;">💾 Salvar Perfil</strong>.</li>
            </ul>
          </div>
        </details>

        <!-- PUBLICAR -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">📢</span> Como publicar
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <ol style="margin:0;padding-left:20px;">
              <li>Toque no botão <strong style="color:#f1c40f;">+</strong> (centro da barra inferior).</li>
              <li>Na aba <strong style="color:#f1c40f;">Texto</strong>, escreva seu pensamento.</li>
              <li>Na aba <strong style="color:#58d3f7;">Mídia</strong>, envie fotos/vídeos.</li>
              <li>Toque em <strong style="color:#f1c40f;">📨 Publicar</strong>.</li>
            </ol>
          </div>
        </details>

        <!-- SEGUIR AMIGOS -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">👥</span> Seguir amigos
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <ol style="margin:0;padding-left:20px;">
              <li>Toque na <strong style="color:#f1c40f;">lupa</strong> (barra inferior).</li>
              <li>Digite o nome e toque em <strong style="color:#58d3f7;">+ Seguir</strong>.</li>
            </ol>
          </div>
        </details>

        <!-- CHAT -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">💬</span> Chat (Textz)
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <p>A aba <strong style="color:#f1c40f;">Textz</strong> lista os amigos. Toque em um para conversar.</p>
            <p>Envie texto, emojis, imagens da galeria ou tire foto.</p>
          </div>
        </details>

        <!-- EDITAR/EXCLUIR -->
        <details class="help-card" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">
            <span style="font-size:20px;">✏️</span> Editar/Excluir posts
            <i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>
          </summary>
          <div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.6;">
            <p>No seu <strong style="color:#f1c40f;">Perfil</strong>, vá até "Meu Histórico".</p>
            <p>Use <strong style="color:#f1c40f;">✏️</strong> ou <strong style="color:#e74c3c;">🗑️</strong> (disponível por 7 dias).</p>
          </div>
        </details>

        <!-- FORMULÁRIO DE SUPORTE (FALE CONOSCO) -->
        <div style="margin-top:20px; background:rgba(255,255,255,0.08); border-radius:16px; padding:16px; border:1px solid rgba(255,255,255,0.1);">
          <h3 style="color:#f1c40f; margin:0 0 8px 0; text-align:center;">📬 Fale Conosco</h3>
          <p style="color:#ccc; font-size:13px; text-align:center; margin-bottom:12px;">Descreva sua dúvida que responderemos rápido.</p>
          <input type="text" id="supNome" placeholder="Seu nome" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:8px; font-size:14px; background:#fff; color:#000;">
          <input type="email" id="supEmail" placeholder="Seu e‑mail" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:8px; font-size:14px; background:#fff; color:#000;">
          <textarea id="supMensagem" placeholder="Como podemos ajudar?" style="width:100%; height:100px; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:12px; font-size:14px; resize:none; background:#fff; color:#000;"></textarea>
          <button id="btnEnviarSuporte" style="background:#8b1031; color:#fff; border:none; border-radius:24px; padding:14px; font-size:16px; font-weight:700; cursor:pointer; width:100%;">Enviar</button>
        </div>

        <p style="text-align:center;color:#aaa;font-size:11px;margin-top:10px;">ATHOM – onde seus pensamentos ganham voz.</p>
      </div>`;

    document.body.appendChild(modal);

    // Animação dos ícones
    modal.querySelectorAll('details').forEach(detail => {
      detail.addEventListener('toggle', () => {
        const icon = detail.querySelector('.fa-chevron-down');
        if (icon) icon.style.transform = detail.open ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    });

    // Fechar pela seta
    document.getElementById('helpCloseBtn').addEventListener('click', () => modal.remove());

    // Enviar suporte
    document.getElementById('btnEnviarSuporte').addEventListener('click', async () => {
      const nome = document.getElementById('supNome').value.trim();
      const email = document.getElementById('supEmail').value.trim();
      const msg = document.getElementById('supMensagem').value.trim();
      if (!nome || !email || !msg) {
        alert('Preencha todos os campos.');
        return;
      }
      try {
        if (typeof db !== 'undefined' && firebase.auth) {
          await db.collection('feedback').add({
            nome, email, text: msg,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch(e) {}
      alert('✅ Mensagem enviada! Entraremos em contato.');
      // Limpa os campos
      document.getElementById('supNome').value = '';
      document.getElementById('supEmail').value = '';
      document.getElementById('supMensagem').value = '';
    });
  }

  window.openHelpModal = openHelpModal;
  console.log('🆘 Central de Ajuda + Suporte integrado ativo.');
})();