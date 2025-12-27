// js/modules/auth.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Import resetGameData มาใช้งาน
import { playerData, saveGame, resetGameData } from '../core/state.js';
import { updateMailNotification } from './mail.js'; 

const firebaseConfig = {
    apiKey: "AIzaSyAd5lxzwrrJF3cgg3mvRe9ei0ZT0og2Y1Q",
    authDomain: "testwebsite-91293.firebaseapp.com",
    projectId: "testwebsite-91293",
    storageBucket: "testwebsite-91293.firebasestorage.app",
    messagingSenderId: "1035234509975",
    appId: "1:1035234509975:web:841f5007ed6399b89955d2"
};

let app, auth, db;
let unsubscribeListener = null;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Firebase Initialized");
} catch (e) {
    console.error("Firebase Config Error:", e);
}

// ============================================================
// ☁️ CLOUD SAVE SYSTEM
// ============================================================

window.cloudSaveTrigger = async () => {
    if (!auth || !auth.currentUser) return;
    const user = auth.currentUser;

    try {
        const cleanData = JSON.parse(JSON.stringify(playerData));
        cleanData.email = user.email;
        await setDoc(doc(db, "users", user.uid), cleanData, { merge: true });
        showSaveStatus("☁️ Saved");
    } catch (e) {
        console.error("Cloud Save Error:", e);
        showSaveStatus("❌ Save Failed");
    }
};

function showSaveStatus(msg) {
    let el = document.getElementById('save-status-indicator');
    if(!el) {
        el = document.createElement('div');
        el.id = 'save-status-indicator';
        el.className = "fixed bottom-2 right-2 text-[10px] text-gray-500 font-mono opacity-0 transition duration-500 pointer-events-none z-[100]";
        document.body.appendChild(el);
    }
    el.innerText = msg;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 2000);
}

// ============================================================
// 📡 REAL-TIME LISTENER
// ============================================================

export function startMailListener() {
    if (!auth.currentUser) return;
    if (unsubscribeListener) return;

    console.log("📡 Mail Listener: STARTED");
    
    const mailRef = collection(db, "users", auth.currentUser.uid, "mails");
    const q = query(mailRef, orderBy("timestamp", "desc"), limit(50));

    unsubscribeListener = onSnapshot(q, (snapshot) => {
        const mails = [];
        snapshot.forEach(doc => {
            mails.push({ id: doc.id, ...doc.data() });
        });

        const oldLen = playerData.mailbox ? playerData.mailbox.length : 0;
        playerData.mailbox = mails; 

        if (mails.length !== oldLen) {
            console.log("📬 Mailbox Updated:", mails.length);
            if (window.updateUI) window.updateUI(); 
            if (updateMailNotification) updateMailNotification();
        }

    }, (error) => {
        console.error("Listener Error:", error);
    });
}

export function stopMailListener() {
    if (unsubscribeListener) {
        console.log("zzz Mail Listener: STOPPED");
        unsubscribeListener();
        unsubscribeListener = null;
    }
}

// ============================================================
// 🔐 AUTH LOGIC (ส่วนที่คุณขอแก้)
// ============================================================

export function initAuth() {
    if (!auth) return;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("✅ Logged in:", user.email);
            document.getElementById('login-overlay').classList.add('hidden');

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // --- กรณีมีเซฟเก่า: โหลดมาทับ ---
                const cloudData = docSnap.data();
                Object.assign(playerData, cloudData);
                
                if (window.checkDailyReset) {
                    console.log("☁️ Cloud loaded, checking daily reset...");
                    window.checkDailyReset(); 
                }
                
                // Refresh หน้าจอ
                if(window.updateUI) window.updateUI();
                if(window.renderDeckEditor) window.renderDeckEditor();
                if(window.renderHeroDeckSlot) window.renderHeroDeckSlot();
            } else {
                // --- กรณีผู้เล่นใหม่: ล้างค่าก่อนสร้าง! ---
                console.log("✨ New User Detected: Resetting data & Creating save...");
                
                // ✅ 1. ล้างข้อมูลเก่าที่อาจค้างอยู่ใน Memory/Localstorage ทิ้ง
                resetGameData(); 
                
                // 2. เตรียมข้อมูลใหม่ (ที่สะอาดแล้ว)
                const cleanData = JSON.parse(JSON.stringify(playerData));
                cleanData.email = user.email;
                
                // 3. บันทึกขึ้น Cloud
                await setDoc(doc(db, "users", user.uid), cleanData);
                
                // 4. บันทึกลงเครื่อง
                saveGame();
            }
            
            startMailListener();

        } else {
            console.log("💤 No user");
            stopMailListener();
            document.getElementById('login-overlay').classList.remove('hidden');
        }
    });
}

// BIND FUNCTIONS TO WINDOW
window.authLogin = async () => {
    const email = document.getElementById('inp-email').value;
    const pass = document.getElementById('inp-password').value;
    if(!email || !pass) return alert("Enter email/password");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
};

window.authRegister = async () => {
    const email = document.getElementById('inp-email').value;
    const pass = document.getElementById('inp-password').value;
    if(!email || !pass) return alert("Enter email/password");
    
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        alert("Account Created! You can login now.");
    } catch (error) {
        alert("Register Failed: " + error.message);
    }
};

window.authLogout = async () => {
    if(!confirm("Log out?")) return;
    
    // ✅ ล้างข้อมูลในเครื่องทิ้งก่อน Logout ป้องกันข้อมูลค้าง
    localStorage.removeItem('cardBattleSave');
    resetGameData(); 
    
    await signOut(auth);
    window.location.reload();
};
