// js/admin.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, doc, getDoc, updateDoc, 
    addDoc, query, orderBy, limit, where, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// 2. IMPORT CONFIGS
import { 
    CARD_DATABASE, 
    EQUIPMENT_DATABASE, 
    HERO_EQUIPMENT_DATABASE, 
    HERO_DATABASE 
} from './core/config.js';

// --- ⚙️ PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "AIzaSyAd5lxzwrrJF3cgg3mvRe9ei0ZT0og2Y1Q",
    authDomain: "testwebsite-91293.firebaseapp.com",
    projectId: "testwebsite-91293",
    storageBucket: "testwebsite-91293.firebasestorage.app",
    messagingSenderId: "1035234509975",
    appId: "1:1035234509975:web:841f5007ed6399b89955d2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserData = null;
let currentUserId = null;
let currentAdminRole = 'member';

// ==========================================
// 1. SYSTEM LOGIN & ROLE CHECK
// ==========================================
window.adminLogin = async () => {
    const email = document.getElementById('adm-email').value;
    const pass = document.getElementById('adm-pass').value;

    if (!email || !pass) return alert("Please enter credentials");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const roleRef = doc(db, "user_roles", user.uid);
        const roleSnap = await getDoc(roleRef);

        if (roleSnap.exists()) {
            const roleData = roleSnap.data();
            currentAdminRole = roleData.role || 'member'; 

            if (currentAdminRole === 'superadmin' || currentAdminRole === 'admin') {
                const statusEl = document.getElementById('admin-status');
                const roleColor = currentAdminRole === 'superadmin' ? 'text-yellow-400' : 'text-blue-400';
                
                statusEl.innerHTML = `<span class="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>Connected as <span class="${roleColor} uppercase">${currentAdminRole}</span>`;
                statusEl.className = "text-green-400 font-bold text-sm bg-black/30 px-3 py-1 rounded border border-green-500/30";
                
                document.getElementById('admin-login').classList.add('hidden');
                document.getElementById('admin-dashboard').classList.remove('hidden');
                
                // ✅ แสดงปุ่ม Superadmin ใน Tab Bar (ถ้ามีสิทธิ์)
                if (currentAdminRole === 'superadmin') {
                    document.getElementById('btn-tab-super').classList.remove('hidden');
                }
                
                loadAllUsers();
                initItemSelector();
                applyRolePermissions();
            } else {
                alert("⛔ ACCESS DENIED: You are not an Admin!");
                await signOut(auth);
            }
        } else {
            alert("User data not found.");
            await signOut(auth);
        }
    } catch (error) {
        console.error(error);
        alert("Login Failed: " + error.code);
    }
};

function applyRolePermissions() {
    if (currentAdminRole !== 'superadmin') {
        const dangerZone = document.querySelector('.border-red-500');
        if(dangerZone) dangerZone.style.display = 'none';
        
        const inpGems = document.getElementById('inp-gems');
        if(inpGems) {
            inpGems.disabled = true;
            inpGems.classList.add('opacity-50', 'cursor-not-allowed');
        }

        const inpHeroLv = document.getElementById('inp-hero-lv');
        if(inpHeroLv) inpHeroLv.disabled = true;
    }
}

// ==========================================
// 2. LOGGING SYSTEM
// ==========================================
async function logAction(actionType, details) {
    try {
        const logData = {
            timestamp: Date.now(),
            adminEmail: auth.currentUser.email,
            adminUid: auth.currentUser.uid,
            targetUid: currentUserId || 'N/A',
            action: actionType,
            details: details
        };
        await addDoc(collection(db, "admin_logs"), logData);
        console.log("📝 Logged:", actionType);
    } catch (e) {
        console.error("Log Error:", e);
    }
}

// ==========================================
// 3. USER MANAGEMENT
// ==========================================
window.loadAllUsers = async () => {
    const list = document.getElementById('user-list');
    list.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="fa-solid fa-spinner fa-spin text-2xl"></i><br>Fetching Data...</div>';

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        list.innerHTML = ''; 

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const uid = doc.id;
            const name = data.profile?.name || "Unknown";
            const lvl = data.profile?.level || 1;
            const gold = data.resources?.gold || 0;
            const role = data.role || 'member';

            let roleBadge = '';
            if(role === 'superadmin') roleBadge = '<i class="fa-solid fa-crown text-yellow-500 ml-1"></i>';
            else if(role === 'admin') roleBadge = '<i class="fa-solid fa-shield-halved text-blue-400 ml-1"></i>';

            const el = document.createElement('div');
            el.className = "bg-slate-800/80 p-3 rounded-lg border-l-4 border-slate-600 hover:border-blue-500 hover:bg-slate-700 transition cursor-pointer group relative overflow-hidden mb-2 shadow-sm";
            el.innerHTML = `
                <div class="flex justify-between items-center relative z-10">
                    <div>
                        <div class="font-bold text-gray-200 text-sm group-hover:text-blue-300 flex items-center gap-2">
                            ${name} 
                            ${roleBadge}
                        </div>
                        <div class="text-[10px] text-gray-500 font-mono mt-0.5 opacity-60 group-hover:opacity-100 transition">UID: ${uid.substr(0,8)}...</div>
                    </div>
                    <div class="text-right">
                        <span class="text-xs bg-black/30 px-2 py-1 rounded text-yellow-500 font-mono border border-yellow-500/10">
                            Lv.${lvl}
                        </span>
                    </div>
                </div>
            `;
            el.onclick = () => selectUser(uid);
            list.appendChild(el);
        });
    } catch (e) {
        console.error(e);
        alert("Error loading users: " + e.message);
    }
};

async function selectUser(uid) {
    currentUserId = uid;
    document.getElementById('editor-placeholder').classList.add('hidden');
    document.getElementById('user-header').classList.remove('hidden');
    document.getElementById('editor-tabs').classList.remove('hidden');
    document.getElementById('user-editor').classList.remove('hidden');
    
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        currentUserData = docSnap.data();
        if(!currentUserData.arena) currentUserData.arena = { tickets: 0, rankPoints: 0 };
        if(!currentUserData.heroes) currentUserData.heroes = [{ heroId: 'h001', level: 1, exp: 0 }];
        
        renderEditor();
        applyRolePermissions();
        
        if(!document.getElementById('tab-inventory').classList.contains('hidden')) {
            window.renderInventoryList();
        }
    } else {
        alert("User data not found!");
    }
}

function renderEditor() {
    const d = currentUserData;
    document.getElementById('edit-name').innerText = d.profile?.name || "No Name";
    document.getElementById('edit-uid').innerText = currentUserId;
    document.getElementById('edit-email').innerText = d.email || "No Email";

    document.getElementById('inp-gold').value = d.resources?.gold || 0;
    document.getElementById('inp-gems').value = d.resources?.gems || 0;
    document.getElementById('inp-stamina').value = d.resources?.stamina || 0;
    document.getElementById('inp-level').value = d.profile?.level || 1;

    const activeHero = d.heroes.find(h => h.heroId === d.activeHeroId) || d.heroes[0];
    if(activeHero) {
        document.getElementById('inp-hero-lv').value = activeHero.level;
        document.getElementById('inp-hero-exp').value = activeHero.exp;
    }
    document.getElementById('inp-arena-pts').value = d.arena.rankPoints;
    document.getElementById('inp-arena-tkt').value = d.arena.tickets;
    document.getElementById('inp-json').value = JSON.stringify(d, null, 2);
}

// ==========================================
// 4. SAVE DATA
// ==========================================
window.saveUserData = async () => {
    if(!currentUserId) return;

    currentUserData.resources.gold = parseInt(document.getElementById('inp-gold').value);
    
    if (currentAdminRole === 'superadmin') {
        currentUserData.resources.gems = parseInt(document.getElementById('inp-gems').value);
    }
    currentUserData.resources.stamina = parseInt(document.getElementById('inp-stamina').value);
    currentUserData.profile.level = parseInt(document.getElementById('inp-level').value);

    const activeHeroIdx = currentUserData.heroes.findIndex(h => h.heroId === currentUserData.activeHeroId);
    const targetIdx = activeHeroIdx !== -1 ? activeHeroIdx : 0;
    
    if (currentAdminRole === 'superadmin') {
        currentUserData.heroes[targetIdx].level = parseInt(document.getElementById('inp-hero-lv').value);
    }
    currentUserData.heroes[targetIdx].exp = parseInt(document.getElementById('inp-hero-exp').value);

    currentUserData.arena.rankPoints = parseInt(document.getElementById('inp-arena-pts').value);
    currentUserData.arena.tickets = parseInt(document.getElementById('inp-arena-tkt').value);

    try {
        const userRef = doc(db, "users", currentUserId);
        await updateDoc(userRef, currentUserData);
        await logAction("EDIT_STATS", `Edited stats for user ${currentUserId}`);
        alert("✅ Data Saved Successfully!");
        loadAllUsers(); 
        document.getElementById('inp-json').value = JSON.stringify(currentUserData, null, 2);
    } catch (e) {
        console.error(e);
        alert("Save Failed: " + e.message);
    }
};

// ==========================================
// 5. ITEM SPAWNER
// ==========================================
function initItemSelector() {
    const select = document.getElementById('select-item-id');
    select.innerHTML = '<option value="">-- Select Item to Give --</option>';

    const grpEq = document.createElement('optgroup'); grpEq.label = "Equipment";
    Object.entries(EQUIPMENT_DATABASE).forEach(([id, item]) => {
        const opt = document.createElement('option');
        opt.value = `EQ:${id}`;
        opt.innerText = `[${item.rarity}] ${item.name}`;
        grpEq.appendChild(opt);
    });
    select.appendChild(grpEq);

    const grpHe = document.createElement('optgroup'); grpHe.label = "Hero Gear";
    Object.entries(HERO_EQUIPMENT_DATABASE).forEach(([id, item]) => {
        const opt = document.createElement('option');
        opt.value = `EQ:${id}`; 
        opt.innerText = `[${item.rarity}] ${item.name}`;
        grpHe.appendChild(opt);
    });
    select.appendChild(grpHe);

    const grpCard = document.createElement('optgroup'); grpCard.label = "Cards / Units";
    Object.entries(CARD_DATABASE).forEach(([id, card]) => {
        const opt = document.createElement('option');
        opt.value = `CARD:${id}`;
        opt.innerText = `[${card.rarity}] ${card.name}`;
        grpCard.appendChild(opt);
    });
    select.appendChild(grpCard);
}


window.giveSelectedItem = async () => {
    if(!currentUserId) return alert("Select a user first!");
    
    // 1. เช็คว่าเลือกของหรือยัง
    const val = document.getElementById('select-item-id').value;
    if(!val) return alert("Select an item first!");

    // ป้องกันการกดซ้ำ
    const btn = document.querySelector('button[onclick="giveSelectedItem()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    try {
        const title = document.getElementById('inp-mail-title').value || "System Reward";
        const msg = document.getElementById('inp-mail-msg').value || "Enjoy your item!";

        const [type, id] = val.split(':');
        let rewardObj = null;
        let logDetail = "";

        // สร้าง Reward Object
        if (type === 'EQ') {
            rewardObj = { type: 'EQ', id: id };
            logDetail = `Mail: ${id}`;
        } 
        else if (type === 'CARD') {
            const template = CARD_DATABASE[id]; // ดึงข้อมูลการ์ดต้นแบบ
            let customStars = parseInt(document.getElementById('inp-spawn-stars').value) || 1;
            const customLevel = parseInt(document.getElementById('inp-spawn-level').value) || 1;

            // ✅✅✅ ส่วนที่เพิ่ม: ตรวจสอบดาวขั้นต่ำตาม Rarity ✅✅✅
            let minStars = 1;
            if (template.rarity === 'U') minStars = 2;
            if (template.rarity === 'R') minStars = 3;
            if (template.rarity === 'SR') minStars = 4;
            if (template.rarity === 'UR') minStars = 5;
            if (template.rarity === 'LEGEND') minStars = 6;
            if (template.rarity === 'MYTHICAL') minStars = 7;

            if (customStars < minStars) {
                // แจ้งเตือนและยกเลิกการส่ง
                alert(`⛔ Cannot send ${template.name} with ${customStars}⭐.\nMinimum for [${template.rarity}] is ${minStars}⭐.`);
                
                // คืนค่าปุ่มให้กดใหม่ได้
                btn.disabled = false;
                btn.innerHTML = originalText;
                
                // (Optional) ปรับค่าในช่องให้ถูกต้องอัตโนมัติ
                document.getElementById('inp-spawn-stars').value = minStars;
                return; // ❌ จบการทำงานทันที ไม่ส่งของ
            }
            // ✅✅✅ จบส่วนตรวจสอบ ✅✅✅
            
            const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            
            const newCard = {
                uid: "admin_" + uniqueSuffix,
                cardId: id,
                level: customLevel,
                exp: 0,
                stars: customStars,
                obtainedAt: Date.now(),
                element: template.element || 'FIRE',
                tier: 1, 
                traits: [] 
            };
            
            rewardObj = { type: 'CARD', data: newCard };
            logDetail = `Mail: ${id} (${customStars}*)`;
        }
        const mailData = {
            title: title,
            msg: msg,
            timestamp: Date.now(),
            read: false,
            rewards: [rewardObj] // Array
        };
        // ยิงไปที่ users/{uid}/mails (สร้างเอกสารใหม่)
        await addDoc(collection(db, "users", currentUserId, "mails"), mailData);

        // บันทึก Log การกระทำ
        await logAction("GIVE_MAIL", logDetail);

        alert(`📧 Mail Sent to ${currentUserData.profile.name}! (New System)`);

    } catch (e) {
        console.error(e);
        alert("Error sending mail: " + e.message);
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

window.resetAccount = async () => {
    if (currentAdminRole !== 'superadmin') return alert("⛔ Superadmin permission required!");

    if(confirm("⚠️ DANGER: This will wipe all inventory, deck, and equipment. Confirm?")) {
        currentUserData.inventory = [];
        currentUserData.equipment = [];
        currentUserData.deck = new Array(8).fill(null);
        currentUserData.resources.gold = 1000;
        
        await window.saveUserData();
        await logAction("WIPE_ACCOUNT", `Wiped data for user ${currentUserId}`);
        renderEditor();
        alert("💥 Account Wiped.");
    }
};

// ==========================================
// 6. INVENTORY MANAGER
// ==========================================
window.renderInventoryList = () => {
    if (!currentUserData) return;

    // Cards
    const listCards = document.getElementById('list-cards');
    const cards = currentUserData.inventory || [];
    document.getElementById('count-cards').innerText = cards.length;
    listCards.innerHTML = '';
    cards.forEach((card, index) => {
        const dbCard = CARD_DATABASE[card.cardId] || { name: "Unknown Card" };
        const el = document.createElement('div');
        el.className = "bg-black/40 p-2 rounded border border-white/5 flex justify-between items-center group hover:bg-red-900/20 hover:border-red-500 transition";
        el.innerHTML = `
            <div><div class="text-xs font-bold text-gray-300 group-hover:text-red-300">${dbCard.name}</div><div class="text-[10px] text-gray-500">Lv.${card.level} | ${card.stars}⭐</div></div>
            <button onclick="deleteItem('card', ${index})" class="text-gray-600 hover:text-red-500 px-2"><i class="fa-solid fa-trash-can"></i></button>`;
        listCards.appendChild(el);
    });

    // Equipment
    const listEquip = document.getElementById('list-equip');
    const equips = currentUserData.equipment || [];
    document.getElementById('count-equip').innerText = equips.length;
    listEquip.innerHTML = '';
    equips.forEach((eqId, index) => {
        const dbItem = EQUIPMENT_DATABASE[eqId] || HERO_EQUIPMENT_DATABASE[eqId] || { name: eqId };
        const el = document.createElement('div');
        el.className = "bg-black/40 p-2 rounded border border-white/5 flex justify-between items-center group hover:bg-red-900/20 hover:border-red-500 transition";
        el.innerHTML = `
            <div><div class="text-xs font-bold text-gray-300 group-hover:text-red-300">${dbItem.name}</div><div class="text-[10px] text-gray-500 font-mono">${eqId}</div></div>
            <button onclick="deleteItem('equip', ${index})" class="text-gray-600 hover:text-red-500 px-2"><i class="fa-solid fa-trash-can"></i></button>`;
        listEquip.appendChild(el);
    });

    // Heroes
    const listHeroes = document.getElementById('list-heroes');
    const heroes = currentUserData.heroes || [];
    document.getElementById('count-heroes').innerText = heroes.length;
    listHeroes.innerHTML = '';
    heroes.forEach((hero, index) => {
        const dbHero = HERO_DATABASE[hero.heroId] || { name: "Unknown" };
        const isActive = hero.heroId === currentUserData.activeHeroId;
        const el = document.createElement('div');
        el.className = `bg-black/40 p-2 rounded border ${isActive ? 'border-green-500/50' : 'border-white/5'} flex justify-between items-center group hover:bg-red-900/20 hover:border-red-500 transition`;
        el.innerHTML = `
            <div><div class="text-xs font-bold text-gray-300">${dbHero.name} ${isActive?'(Active)':''}</div><div class="text-[10px] text-gray-500">Lv.${hero.level}</div></div>
            ${!isActive ? `<button onclick="deleteItem('hero', ${index})" class="text-gray-600 hover:text-red-500 px-2"><i class="fa-solid fa-trash-can"></i></button>` : ''}`;
        listHeroes.appendChild(el);
    });
};

window.deleteItem = async (type, index) => {
    if (!confirm("Delete this item?")) return;

    if (type === 'card') {
        const deleted = currentUserData.inventory.splice(index, 1);
        if(deleted[0]) currentUserData.deck = currentUserData.deck.map(uid => uid === deleted[0].uid ? null : uid);
    } else if (type === 'equip') {
        currentUserData.equipment.splice(index, 1);
    } else if (type === 'hero') {
        if (currentUserData.heroes.length <= 1) return alert("Cannot delete last hero");
        currentUserData.heroes.splice(index, 1);
    }

    await window.saveUserData();
    await logAction("DELETE_ITEM", `Deleted ${type} from user ${currentUserId}`);
    window.renderInventoryList();
};

// ==========================================
// 7. SUPERADMIN DASHBOARD
// ==========================================
window.renderSuperadminTab = async () => {
    if (currentAdminRole !== 'superadmin') return;
    
    const adminListEl = document.getElementById('list-admins');
    adminListEl.innerHTML = '<div class="col-span-full text-center text-gray-500 animate-pulse">Loading Admin Data...</div>';
    
    const qAdmins = collection(db, "user_roles"); 
    const snap = await getDocs(qAdmins);
    
    adminListEl.innerHTML = '';
    snap.forEach(doc => {
        const d = doc.data();
        // กรองเฉพาะคนที่มี Role
        if (d.role !== 'admin' && d.role !== 'superadmin') return;

        const isMe = doc.id === auth.currentUser.uid;
        const isSuper = d.role === 'superadmin';
        
        // 🎨 ตกแต่ง: แยกสีตามยศ (Super=Gold, Admin=Blue)
        const themeColor = isSuper ? 'yellow' : 'blue';
        const icon = isSuper ? 'fa-crown' : 'fa-shield-halved';
        const bgClass = isSuper 
            ? 'bg-gradient-to-br from-yellow-900/40 to-slate-900 border-yellow-500/50 shadow-yellow-900/20' 
            : 'bg-gradient-to-br from-blue-900/40 to-slate-900 border-blue-500/50 shadow-blue-900/20';

        const div = document.createElement('div');
        // ใช้ Flexbox จัด Layout ภายในการ์ด
        div.className = `p-4 rounded-xl border shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ${bgClass}`;
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center bg-${themeColor}-500/20 text-${themeColor}-400 border border-${themeColor}-500/30">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <div class="font-black text-xs text-${themeColor}-500 tracking-widest uppercase">${d.role}</div>
                        <div class="text-[10px] text-gray-400">Promoted by: ${d.promotedBy ? d.promotedBy.split('@')[0] : 'System'}</div>
                    </div>
                </div>
                ${isMe ? '<span class="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">YOU</span>' : ''}
            </div>

            <div class="bg-black/40 rounded p-2 border border-white/5 mb-3">
                <div class="text-[10px] text-gray-500 uppercase font-bold mb-1">USER UID</div>
                <div class="font-mono text-xs text-gray-300 break-all select-all hover:text-white transition cursor-pointer" onclick="navigator.clipboard.writeText('${doc.id}'); alert('Copied UID!')">
                    ${doc.id} <i class="fa-regular fa-copy ml-1 opacity-50"></i>
                </div>
            </div>

            ${(!isMe && !isSuper) ? `
            <button onclick="demoteAdmin('${doc.id}')" class="w-full text-center text-xs bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 py-2 rounded transition font-bold uppercase">
                <i class="fa-solid fa-user-slash mr-1"></i> Demote
            </button>
            ` : ''}
            
            <i class="fa-solid ${icon} absolute -bottom-4 -right-4 text-8xl opacity-5 text-${themeColor}-500 pointer-events-none group-hover:opacity-10 transition"></i>
        `;
        adminListEl.appendChild(div);
    });

    loadAuditLogs();
};

window.loadAuditLogs = async () => {
    const tbody = document.getElementById('table-logs');
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Loading logs...</td></tr>';
    
    const qLogs = query(collection(db, "admin_logs"), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(qLogs);
    
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const l = doc.data();
        const date = new Date(l.timestamp).toLocaleString();
        
        let actionColor = 'text-gray-300';
        if(l.action === 'GIVE_ITEM') actionColor = 'text-pink-400';
        if(l.action === 'DELETE_ITEM') actionColor = 'text-red-400';
        if(l.action === 'WIPE_ACCOUNT') actionColor = 'text-red-600 font-bold';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 transition";
        tr.innerHTML = `
            <td class="p-3 text-gray-500">${date}</td>
            <td class="p-3 text-blue-300">${l.adminEmail}</td>
            <td class="p-3 ${actionColor}">${l.action}</td>
            <td class="p-3 font-mono text-gray-400">${l.targetUid}</td>
            <td class="p-3 text-white">${l.details}</td>
        `;
        tbody.appendChild(tr);
    });
};

window.promoteToAdmin = async () => {
    const uid = document.getElementById('inp-promote-uid').value.trim();
    if(!uid) return alert("Please enter User UID");
    if(!confirm(`Promote ${uid} to ADMIN?`)) return;
    try {
        // ใช้ setDoc เพราะถ้าเขายังไม่เคยเป็น Admin อาจจะยังไม่มี document นี้
        await setDoc(doc(db, "user_roles", uid), { 
            role: "admin",
            promotedAt: Date.now(),
            promotedBy: auth.currentUser.email
        }, { merge: true });

        await logAction("PROMOTE_ADMIN", `Promoted ${uid} to ADMIN`);
        alert("✅ User Promoted!");
        renderSuperadminTab();
    } catch(e) { alert("Error: " + e.message); }
};

window.demoteAdmin = async (uid) => {
    if(!confirm(`Demote ${uid} to MEMBER?`)) return;
    try {
        // ✅ลบออกจาก user_roles หรือแก้ role เป็น member
        
        await deleteDoc(doc(db, "user_roles", uid));
        
        await logAction("DEMOTE_ADMIN", `Demoted ${uid}`);
        alert("✅ User Demoted!");
        renderSuperadminTab();
    } catch(e) { alert("Error: " + e.message); }
}

window.toggleLogFullScreen = () => {
    const el = document.getElementById('log-container');
    const btnIcon = document.getElementById('btn-icon-expand');
    
    // เช็คว่าตอนนี้เต็มจออยู่ไหม
    const isFull = el.classList.contains('fixed');
    
    if (!isFull) {
        // 🟢 เปิดโหมดเต็มจอ
        el.classList.add('fixed', 'inset-0', 'z-[100]', 'h-screen', 'w-screen', 'p-6', 'bg-slate-900');
        el.classList.remove('rounded-xl', 'border', 'col-span-1'); // เอาขอบมนออก
        btnIcon.className = "fa-solid fa-compress"; // เปลี่ยนไอคอนเป็นย่อ
    } else {
        // 🔴 ปิดโหมดเต็มจอ (กลับสู่สภาพเดิม)
        el.classList.remove('fixed', 'inset-0', 'z-[100]', 'h-screen', 'w-screen', 'p-6', 'bg-slate-900');
        el.classList.add('rounded-xl', 'border');
        btnIcon.className = "fa-solid fa-expand"; // เปลี่ยนไอคอนเป็นขยาย
    }
};
