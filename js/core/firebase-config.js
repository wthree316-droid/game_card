import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyAd5lxzwrrJF3cgg3mvRe9ei0ZT0og2Y1Q",
    authDomain: "testwebsite-91293.firebaseapp.com",
    projectId: "testwebsite-91293",
    storageBucket: "testwebsite-91293.firebasestorage.app",
    messagingSenderId: "1035234509975",
    appId: "1:1035234509975:web:841f5007ed6399b89955d2"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
