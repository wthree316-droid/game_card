// js/modules/auth.js
import { 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { auth, db } from '../core/firebase-config.js';

import { playerData, saveGame, resetGameData } from '../core/state.js';
import { updateMailNotification } from './mail.js'; 
import { createNewCard } from '../utils.js';

let unsubscribeListener = null;

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
// 🔐 AUTH LOGIC
// ============================================================

export function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        const menu = document.getElementById('floating-menu-container');

        if (user) {
            console.log("✅ Logged in:", user.email);
            document.getElementById('login-overlay').classList.add('hidden');

            if (menu) menu.style.display = 'flex';

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // ... โหลดเซฟเก่า ...
                const cloudData = docSnap.data();
                Object.assign(playerData, cloudData);
                
                if (window.checkDailyReset) {
                    console.log("☁️ Cloud loaded, checking daily reset...");
                    window.checkDailyReset(); 
                }
                
                if(window.updateUI) window.updateUI();
                if(window.renderDeckEditor) window.renderDeckEditor();
                if(window.renderHeroDeckSlot) window.renderHeroDeckSlot();
            } else {
                // ... สร้างเซฟใหม่ ...
                console.log("✨ New User Detected: Resetting data & Creating save...");
                resetGameData(); 
                // 💰 แจกเงิน / เพชร
                playerData.resources.gold += 3000;  
                playerData.resources.gems += 50;  
                // 🎒 แจกไอเทม 
                playerData.items['pot_small'] = 1; 
                playerData.items['tkt_exp'] = 1;

                // 🃏 แจกการ์ด 
                const starterIDs = ['c_001','c_002','c_003']; 

                starterIDs.forEach(id => {
                    const card = createNewCard(id); 
                    if (card) {
                        card.level = 1; 
                        playerData.inventory.push(card);
                    } else {
                        console.warn(`⚠️ Starter card ID '${id}' not found in DB.`);
                    }
                });
                
                const cleanData = JSON.parse(JSON.stringify(playerData));
                cleanData.email = user.email;
                await setDoc(doc(db, "users", user.uid), cleanData);
                saveGame();
                console.log("🎁 Starter Gifts Added!");
            }
            
            startMailListener();

        } else {
            console.log("💤 No user");
            stopMailListener();
            document.getElementById('login-overlay').classList.remove('hidden');

            if (menu) menu.style.display = 'none';
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
    
    localStorage.removeItem('cardBattleSave');
    resetGameData(); 
    
    await signOut(auth);
    window.location.reload();
};
