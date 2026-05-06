// ==================== db.js – YOU ====================
const firebaseConfig = {
  apiKey: "AIzaSyAApYxcRCdKCa5X4B5Mqe_tCVafjTbU6bM",
  authDomain: "chatbox-f7578.firebaseapp.com",
  projectId: "chatbox-f7578",
  storageBucket: "chatbox-f7578.appspot.com",
  messagingSenderId: "136199002752",
  appId: "1:136199002752:web:e36cbea04d75877eb0e465"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log('🔥 Firebase inicializado.');