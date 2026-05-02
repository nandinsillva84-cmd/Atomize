// ==================== interactions.js – ATHOM ====================
(function() {
  const store = {};
  const commentsStore = {};
  let activePostId = null;

  function initPost(postId, likes = 0, comments = 0, shares = 0) {
    if (!store[postId]) {
      store[postId] = { likes, likedBy: [], comments, shares };
    }
    return store[postId];
  }

  function updateButtons(postId) {
    const data = store[postId];
    if (!data) return;
    const likeBtn = document.querySelector(`[data-post-id="${postId}"][data-action="like"]`);
    if (likeBtn) likeBtn.innerHTML = `❤️ ${data.likes}`;
    const commentBtn = document.querySelector(`[data-post-id="${postId}"][data-action="comment"]`);
    if (commentBtn) commentBtn.innerHTML = `💬 ${data.comments}`;
    const shareBtn = document.querySelector(`[data-post-id="${postId}"][data-action="repost"]`);
    if (shareBtn) shareBtn.innerHTML = `🔄 ${data.shares}`;
  }

  window.toggleLike = function(postId) {
    const post = initPost(postId);
    const userId = 'currentUser';
    const idx = post.likedBy.indexOf(userId);
    if (idx === -1) { post.likedBy.push(userId); post.likes++; }
    else { post.likedBy.splice(idx, 1); post.likes--; }
    updateButtons(postId);
  };

  window.repost = function(postId) {
    const post = initPost(postId);
    post.shares++;
    updateButtons(postId);
    if (typeof showToast === 'function') showToast('Repostado! 🔄');
  };

  window.openComments = function(postId) {
    activePostId = postId;
    initPost(postId);
    if (!commentsStore[postId]) commentsStore[postId] = [];
    const input = document.getElementById('commentInput');
    if (input) input.value = '';
    renderComments(postId);
    if (typeof openModal === 'function') openModal('commentsModal');
  };

  window.closeComments = function() {
    if (typeof closeModal === 'function') closeModal('commentsModal');
    activePostId = null;
  };

  function renderComments(postId) {
    const container = document.getElementById('commentsList');
    if (!container) return;
    const comments = commentsStore[postId] || [];
    if (comments.length === 0) {
      container.innerHTML = '<p style="color:#888;text-align:center;">Nenhum comentário ainda.</p>';
    } else {
      container.innerHTML = comments.map(c => `
        <div><strong>${c.user}</strong> <span style="color:#888;font-size:12px;">${c.time}</span><br>${c.text}</div>
      `).join('');
    }
  }

  window.submitComment = function() {
    if (!activePostId) return;
    const input = document.getElementById('commentInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    if (!commentsStore[activePostId]) commentsStore[activePostId] = [];
    commentsStore[activePostId].push({ user: 'Você', text, time: timeStr });
    store[activePostId].comments = commentsStore[activePostId].length;
    updateButtons(activePostId);
    input.value = '';
    renderComments(activePostId);
  };

  window.initInteractions = function(postId, likes, comments, shares) {
    initPost(postId, likes, comments, shares);
    updateButtons(postId);
  };
})();