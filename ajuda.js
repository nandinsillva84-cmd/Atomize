// ==================== ajuda.js – YOU ====================
// Central de Ajuda completa e ultra‑detalhada.
// Pode ser acessada pelo botão "Precisa de ajuda?" na tela de login
// ou pelo item "Ajuda" no menu principal (☰ → Ajuda).
// Inclui:
// - Índice rápido com links para todas as seções
// - 10 seções detalhadas cobrindo todas as funcionalidades do app
// - Metragens e tamanhos exatos para fotos e vídeos
// - Formulário de contato (delegado para ajuda-fale-conosco.js)

(function () {
  // ========== INJETAR ITEM "AJUDA" NO MENU ==========
  function injectHelpMenu() {
    if (document.getElementById('helpMenuItem')) return;
    var menuList = document.querySelector('.menu-list');
    if (!menuList) {
      setTimeout(injectHelpMenu, 500);
      return;
    }
    var item = document.createElement('div');
    item.id = 'helpMenuItem';
    item.className = 'menu-item';
    item.innerHTML = '<i class="fas fa-question-circle menu-icon"></i><span>Ajuda</span>';
    item.addEventListener('click', function () {
      if (typeof closeMenuModal === 'function') closeMenuModal();
      openHelpModal();
    });
    var sair = menuList.querySelector('.menu-item-sair');
    if (sair) {
      menuList.insertBefore(item, sair);
    } else {
      menuList.appendChild(item);
    }
  }

  // Tenta injetar assim que possível
  var menuCheck = setInterval(function () {
    if (document.querySelector('.menu-list')) {
      injectHelpMenu();
      clearInterval(menuCheck);
    }
  }, 500);

  // ========== BOTÃO NA TELA DE LOGIN ==========
  function injectHelpOnLogin() {
    var loginScreen = document.getElementById('loginScreen');
    if (!loginScreen || document.getElementById('helpBtnOnLogin')) return;
    var helpBtn = document.createElement('button');
    helpBtn.id = 'helpBtnOnLogin';
    helpBtn.innerHTML = '<i class="fas fa-headset"></i> Precisa de ajuda?';
    helpBtn.style.cssText =
      'position:absolute; bottom:20px; left:50%; transform:translateX(-50%);' +
      'background:#8b1031; color:#fff; border:2px solid #fff;' +
      'border-radius:30px; padding:12px 28px; font-size:15px; cursor:pointer;' +
      'z-index:10; font-weight:700; display:flex; align-items:center; gap:8px;' +
      'box-shadow:0 6px 20px rgba(0,0,0,0.5); letter-spacing:1px;';
    helpBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openHelpModal();
    });
    loginScreen.style.position = 'relative';
    loginScreen.appendChild(helpBtn);
  }

  function setupLoginObserver() {
    var loginScreen = document.getElementById('loginScreen');
    if (!loginScreen) {
      setTimeout(setupLoginObserver, 300);
      return;
    }
    new MutationObserver(function () {
      if (loginScreen.style.display !== 'none') {
        injectHelpOnLogin();
      }
    }).observe(loginScreen, { attributes: true, attributeFilter: ['style'] });
    if (loginScreen.style.display !== 'none') {
      injectHelpOnLogin();
    }
  }
  setupLoginObserver();

  // ========== ABRIR MODAL DA CENTRAL DE AJUDA ==========
  function openHelpModal() {
    var old = document.getElementById('helpModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'helpModal';
    modal.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:#3a0814;z-index:9999;overflow-y:auto;' +
      'display:flex;flex-direction:column;font-family:Roboto,sans-serif;';

    modal.innerHTML =
      // Cabeçalho
      '<div style="background:linear-gradient(135deg,#8b1031,#b71c3c);color:#fff;padding:20px 15px;' +
      'display:flex;align-items:center;gap:15px;font-size:18px;font-weight:500;' +
      'flex-shrink:0;box-shadow:0 4px 15px rgba(0,0,0,0.5);">' +
        '<i class="fas fa-arrow-left" id="helpCloseBtn" style="cursor:pointer;font-size:20px;"></i>' +
        '<span>Central de Ajuda Completa</span>' +
      '</div>' +

      // Corpo
      '<div style="flex:1;padding:16px;overflow-y:auto;background:#3a0814;font-size:14px;color:#f0f0f0;">' +

        // ===== ÍNDICE =====
        '<details class="help-card" style="margin-bottom:12px;background:rgba(255,215,0,0.15);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,215,0,0.3);">' +
          '<summary style="font-weight:700;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#ffd700;">' +
            '<span style="font-size:20px;">📑</span> Índice Rápido' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ffd700;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:2;">' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=primeiros-passos]\').open=true;return false;" style="color:#58d3f7;">🔹 Primeiros Passos</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=perfil]\').open=true;return false;" style="color:#58d3f7;">🔹 Personalização do Perfil (com metragens)</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=publicacoes]\').open=true;return false;" style="color:#58d3f7;">🔹 Fazer Publicações (com tamanhos)</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=interacoes]\').open=true;return false;" style="color:#58d3f7;">🔹 Curtir, Comentar e Republicar</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=amigos]\').open=true;return false;" style="color:#58d3f7;">🔹 Amigos e Seguidores</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=chat]\').open=true;return false;" style="color:#58d3f7;">🔹 Chat (Textz)</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=abas]\').open=true;return false;" style="color:#58d3f7;">🔹 Abas do Aplicativo</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=config]\').open=true;return false;" style="color:#58d3f7;">🔹 Configurações</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=problemas]\').open=true;return false;" style="color:#58d3f7;">🔹 Problemas Comuns</a><br>' +
            '<a href="#" onclick="document.getElementById(\'helpModal\').querySelector(\'[data-section=seguranca]\').open=true;return false;" style="color:#58d3f7;">🔹 Segurança e Privacidade</a><br>' +
          '</div>' +
        '</details>' +

        // ===== 1. PRIMEIROS PASSOS =====
        '<details class="help-card" data-section="primeiros-passos" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">🔐</span> Primeiros Passos (Criar Conta, Entrar, Verificar E-mail)' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong style="color:#f1c40f;">📝 Criar uma conta:</strong></p>' +
            '<ul style="margin:0 0 12px 20px;">' +
              '<li>Na tela de login, toque em <strong style="color:#fff;">"Criar Conta"</strong>.</li>' +
              '<li>Preencha <strong>Nome</strong> (mínimo 2 caracteres, apenas letras), <strong>Sobrenome</strong>, <strong>E‑mail</strong> válido e uma <strong>Senha</strong> de no mínimo 6 caracteres.</li>' +
              '<li>Toque em <strong style="color:#fff;">"Criar Conta"</strong>. Sua conta será criada instantaneamente e você já entrará no app.</li>' +
            '</ul>' +
            '<p><strong style="color:#f1c40f;">🔑 Entrar na conta:</strong></p>' +
            '<ul style="margin:0 0 12px 20px;">' +
              '<li>Na tela inicial, digite seu <strong>e‑mail</strong> e <strong>senha</strong> e toque em <strong>"Entrar"</strong>.</li>' +
              '<li>Se esquecer a senha, clique em <strong>"Esqueci a senha?"</strong> abaixo dos campos. Você receberá um link de redefinição no e‑mail cadastrado.</li>' +
            '</ul>' +
          '</div>' +
        '</details>' +

        // ===== 2. PERFIL (COM METRAGENS) =====
        '<details class="help-card" data-section="perfil" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">👤</span> Personalização do Perfil (com metragens exatas)' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong style="color:#f1c40f;">🖼️ Foto de Perfil (Avatar):</strong></p>' +
            '<ul style="margin:0 0 12px 20px;">' +
              '<li>Medida ideal: <strong>400 x 400 pixels</strong> (quadrado).</li>' +
              '<li>Proporção: <strong>1:1</strong> (qualquer imagem quadrada serve).</li>' +
              '<li>Tamanho máximo do arquivo: <strong>90 MB</strong>.</li>' +
              '<li>Formatos aceitos: JPG, PNG, WebP, HEIC, GIF.</li>' +
              '<li>Toque no botão 📷 sobre a imagem circular. Escolha uma foto da galeria.</li>' +
              '<li>A imagem será exibida em formato circular automaticamente.</li>' +
            '</ul>' +
            '<p><strong style="color:#f1c40f;">🎨 Capa do Perfil:</strong></p>' +
            '<ul style="margin:0 0 12px 20px;">' +
              '<li>Medidas recomendadas: <strong>800 pixels de largura x 200 pixels de altura</strong>.</li>' +
              '<li>Proporção: <strong>4:1</strong> (paisagem bem larga).</li>' +
              '<li>Tamanho máximo do arquivo: <strong>90 MB</strong>.</li>' +
              '<li>Formatos aceitos: JPG, PNG, WebP, HEIC.</li>' +
              '<li>A imagem será exibida como fundo no topo do seu perfil.</li>' +
            '</ul>' +
            '<p><strong style="color:#f1c40f;">🎵 Status:</strong> máximo de <strong>50 caracteres</strong>.</p>' +
            '<p><strong style="color:#f1c40f;">💬 Pensamento do Dia:</strong> máximo de <strong>200 caracteres</strong>.</p>' +
            '<p>Toque em <strong style="color:#58d3f7;">💾 Salvar Perfil</strong> para aplicar todas as alterações.</p>' +
          '</div>' +
        '</details>' +

        // ===== 3. PUBLICAÇÕES (COM TAMANHOS) =====
        '<details class="help-card" data-section="publicacoes" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">📢</span> Fazer Publicações (com tamanhos e limites)' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong style="color:#f1c40f;">📝 Texto:</strong> máximo de <strong>280 caracteres</strong>.</p>' +
            '<p><strong style="color:#f1c40f;">📁 Fotos:</strong> até <strong>10 imagens</strong>, máximo <strong>90 MB</strong> cada. Formatos: JPG, PNG, GIF, WebP, HEIC.</p>' +
            '<p><strong style="color:#f1c40f;">🎬 Vídeos:</strong> até <strong>5 vídeos</strong>, máximo <strong>90 MB</strong> cada. Formatos: MP4, MOV.</p>' +
            '<p>Use o botão <strong>+</strong> na barra inferior para criar uma nova publicação.</p>' +
          '</div>' +
        '</details>' +

        // ===== 4. INTERAÇÕES =====
        '<details class="help-card" data-section="interacoes" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">❤️</span> Curtir, Comentar e Republicar' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong>❤️ Curtir:</strong> Toque no botão ❤️ abaixo de qualquer post. O número aumenta instantaneamente. Para descurtir, toque novamente.</p>' +
            '<p><strong>💬 Comentar:</strong> Toque em 💬, digite seu comentário e pressione Enviar.</p>' +
            '<p><strong>🔄 Republicar:</strong> Toque em 🔄 para compartilhar aquele pensamento com seus amigos.</p>' +
          '</div>' +
        '</details>' +

        // ===== 5. AMIGOS =====
        '<details class="help-card" data-section="amigos" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">👥</span> Amigos e Seguidores' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong>➕ Seguir alguém:</strong> Use a lupa 🔍 na barra inferior. Digite o nome e toque em <strong>"+ Seguir"</strong>.</p>' +
            '<p><strong>✅ Aceitar solicitação:</strong> No menu (☰), vá em <strong>"Solicitações"</strong>. Toque em <strong>✓ Aceitar</strong> ou <strong>✕ Recusar</strong>.</p>' +
            '<p><strong>❌ Deixar de seguir:</strong> No perfil da pessoa, toque em <strong>"Deixar de seguir"</strong>.</p>' +
          '</div>' +
        '</details>' +

        // ===== 6. CHAT =====
        '<details class="help-card" data-section="chat" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">💬</span> Chat (Textz)' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p>A aba <strong>Textz</strong> exibe seus amigos. Toque em qualquer nome para abrir o chat privado.</p>' +
            '<p><strong>📤 Enviar mensagem:</strong> Digite e pressione Enter ou toque no botão ✈️.</p>' +
            '<p><strong>📎 Anexar imagem:</strong> Toque no clipe 📎 (galeria) ou na câmera 📷 (tirar foto).</p>' +
            '<ul style="margin:0 0 12px 20px;">' +
              '<li>Medida ideal: <strong>800 x 800 pixels</strong>.</li>' +
              '<li>Tamanho máximo: <strong>2 MB</strong>.</li>' +
              '<li>Formatos: JPG, PNG, WebP.</li>' +
            '</ul>' +
          '</div>' +
        '</details>' +

        // ===== 7. ABAS =====
        '<details class="help-card" data-section="abas" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">📑</span> Abas do Aplicativo' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong>🕒 Now:</strong> Mostra o que seus amigos estão pensando agora.</p>' +
            '<p><strong>🎨 Exposição:</strong> Feed público com as últimas publicações de todos os usuários.</p>' +
            '<p><strong>💬 Textz:</strong> Seus amigos para conversar. Toque em um nome para abrir o chat privado.</p>' +
          '</div>' +
        '</details>' +

        // ===== 8. CONFIGURAÇÕES =====
        '<details class="help-card" data-section="config" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">⚙️</span> Configurações' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong>🎨 Tema:</strong> Escolha uma cor de destaque. O cabeçalho e rodapé mantêm um degradê com o vinho da marca.</p>' +
            '<p><strong>🔔 Notificações:</strong> Ative ou desative (o navegador pedirá permissão).</p>' +
            '<p><strong>🔒 Privacidade:</strong> Controle se seu perfil é público e se seu status online aparece.</p>' +
            '<p><strong>🗂️ Dados:</strong> Limpe o cache ou exporte seus dados pessoais.</p>' +
          '</div>' +
        '</details>' +

        // ===== 9. PROBLEMAS COMUNS =====
        '<details class="help-card" data-section="problemas" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">⚠️</span> Problemas Comuns e Soluções' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p><strong>🔑 Esqueci a senha?</strong> Na tela de login, clique em "Esqueci a senha?".</p>' +
            '<p><strong>🐢 App lento?</strong> Limpe o cache em Configurações > Dados.</p>' +
            '<p><strong>📷 Upload de capa falha?</strong> Verifique o tamanho do arquivo (máx. 90 MB).</p>' +
            '<p><strong>💬 Chat não abre?</strong> Apenas amigos podem conversar.</p>' +
          '</div>' +
        '</details>' +

        // ===== 10. SEGURANÇA =====
        '<details class="help-card" data-section="seguranca" style="margin-bottom:12px;background:rgba(255,255,255,0.08);border-radius:16px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;border:1px solid rgba(255,255,255,0.1);">' +
          '<summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;">' +
            '<span style="font-size:20px;">🔒</span> Segurança e Privacidade' +
            '<i class="fas fa-chevron-down" style="margin-left:auto;transition:transform 0.3s;color:#ccc;"></i>' +
          '</summary>' +
          '<div style="padding:0 16px 16px 16px;font-size:13px;color:#ddd;line-height:1.8;">' +
            '<p>🔒 Suas senhas são protegidas pelo Firebase Authentication.</p>' +
            '<p>🛡️ Dados pessoais ficam no Firestore com acesso restrito.</p>' +
            '<p>👁️ Você pode tornar seu perfil privado nas Configurações.</p>' +
          '</div>' +
        '</details>' +

        // ===== FORMULÁRIO DE CONTATO (DELEGADO) =====
        '<div style="margin-top:20px;background:rgba(255,255,255,0.08);border-radius:16px;padding:16px;border:1px solid rgba(255,255,255,0.1);">' +
          '<h3 style="color:#f1c40f;margin:0 0 8px 0;text-align:center;">📬 Fale Conosco</h3>' +
          '<p style="color:#ccc;font-size:13px;text-align:center;margin-bottom:12px;">Não encontrou o que precisava? Descreva sua dúvida que responderemos rápido.</p>' +
          '<input type="text" id="supNome" placeholder="Seu nome" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;background:#fff;color:#000;">' +
          '<input type="email" id="supEmail" placeholder="Seu e‑mail" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;background:#fff;color:#000;">' +
          '<textarea id="supMensagem" placeholder="Como podemos ajudar?" style="width:100%;height:100px;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;font-size:14px;resize:none;background:#fff;color:#000;"></textarea>' +
          '<button id="btnEnviarSuporte" style="background:#8b1031;color:#fff;border:none;border-radius:24px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;width:100%;">Enviar Mensagem</button>' +
        '</div>' +
        '<p style="text-align:center;color:#aaa;font-size:11px;margin-top:10px;">YOU – onde seus pensamentos ganham voz.</p>' +
      '</div>';

    document.body.appendChild(modal);

    // Animações das setas
    var details = modal.querySelectorAll('details');
    for (var i = 0; i < details.length; i++) {
      details[i].addEventListener('toggle', function () {
        var icon = this.querySelector('.fa-chevron-down');
        if (icon) {
          icon.style.transform = this.open ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    }

    // Fechar pela seta
    document.getElementById('helpCloseBtn').addEventListener('click', function () {
      modal.remove();
    });

    // Enviar suporte
    document.getElementById('btnEnviarSuporte').addEventListener('click', async function () {
      var nome = document.getElementById('supNome').value.trim();
      var email = document.getElementById('supEmail').value.trim();
      var msg = document.getElementById('supMensagem').value.trim();
      if (!nome || !email || !msg) {
        alert('Preencha todos os campos.');
        return;
      }
      try {
        if (typeof db !== 'undefined' && firebase.auth) {
          await db.collection('feedback').add({
            nome: nome,
            email: email,
            text: msg,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (e) {}
      alert('✅ Mensagem enviada! Entraremos em contato.');
      document.getElementById('supNome').value = '';
      document.getElementById('supEmail').value = '';
      document.getElementById('supMensagem').value = '';
    });
  }

  // Exporta a função para uso externo
  window.openHelpModal = openHelpModal;

  console.log('🆘 Central de Ajuda (ajuda.js) carregada.');
})();