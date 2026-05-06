// ==================== security.js – YOU ====================

// Esta função recebe um texto (data) e gera um hash SHA-256.
// Hash é uma "impressão digital" do texto. Útil para verificar integridade,
// mas NÃO é criptografia (não dá para reverter para o texto original).
async function hash(data) {
  // Converte o texto para bytes (UTF-8)
  const msgBuffer = new TextEncoder().encode(data);
  // Calcula o hash SHA-256 usando a API Web Crypto do navegador
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  // Converte o ArrayBuffer resultante para um array de bytes
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Converte cada byte para hexadecimal e junta tudo em uma string
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Objeto global "security" com funções de segurança.
// As funções encrypt e decrypt são stubs (placeholders).
// Atualmente retornam o texto sem alterar, mas existem no código
// para que no futuro possamos implementar criptografia real
// (ex.: AES-GCM) sem quebrar quem já usa security.encrypt().
window.security = {
  // Função hash (funcional)
  hash: hash,

  // Stub de criptografia – NÃO criptografa nada ainda.
  // Se alguém chamar security.encrypt("senha"), receberá "senha" de volta.
  // Um aviso é exibido no console para lembrar que isso precisa ser implementado.
  encrypt: async (text) => {
    console.warn('[YOU Security] encrypt() não implementado — dados NÃO estão criptografados.');
    return text;
  },

  // Stub de descriptografia – mesmo comportamento do encrypt.
  decrypt: async (text) => {
    console.warn('[YOU Security] decrypt() não implementado.');
    return text;
  },

  // Inicialização (placeholder para futuras configurações)
  initialize: async () => {},

  // Limpeza (placeholder)
  clear: () => {}
};

console.log('🔐 Segurança carregada.');