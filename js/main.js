// js/main.js
import { loadGame, playerData, saveGame } from './core/state.js';
import { updateUI } from './ui-shared.js'; 
import * as Deck from './modules/deck.js';
import * as Summon from './modules/summon.js';
import * as StageSystem from './modules/stage.js'; 
import * as Breeding from './modules/breeding.js';
import * as Battle from './modules/battle.js';
import * as HeroManager from './modules/heroManager.js';
import { renderHeroDeckSlot } from './modules/deck.js';
import * as Shop from './modules/shop.js';
import { showToast } from './modules/ui-notifications.js'; 
import * as Arena from './modules/arena.js';
import * as Encyclopedia from './modules/encyclopedia.js';
import { STAGE_LIST } from './core/config.js';
import * as Auth from './modules/auth.js';
import * as Mail from './modules/mail.js';
import * as Bag from './modules/bag.js'; 

// ----------------------------------------------------
// 🛠️ HELPER: สร้างปุ่มลอย (Mail & Bag)
// ----------------------------------------------------
function createFloatingButtons() {
    // 1. ปุ่มจดหมาย (Mail) - อยู่ที่เดิม (Top 20)
    if (!document.getElementById('btn-open-mail')) {
        const mailBtn = document.createElement('button');
        mailBtn.id = 'btn-open-mail';
        mailBtn.className = "fixed top-20 right-4 z-[100] w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded-full shadow-lg flex items-center justify-center text-gray-300 hover:text-white hover:border-yellow-400 hover:bg-slate-700 transition active:scale-95";
        mailBtn.innerHTML = '<i class="fa-solid fa-envelope text-xl"></i>';
        mailBtn.onclick = Mail.openMailboxModal;
        document.body.appendChild(mailBtn);
        
        if (Mail.updateMailNotification) Mail.updateMailNotification();
    }
    
    // 2. Bag Button (แก้ Icon เป็น fa-briefcase)
    if (!document.getElementById('btn-open-bag')) {
        const bagBtn = document.createElement('button');
        bagBtn.id = 'btn-open-bag';
        bagBtn.className = "fixed top-36 right-4 z-[100] w-12 h-12 bg-slate-800 border-2 border-slate-600 rounded-full shadow-lg flex items-center justify-center text-gray-300 hover:text-white hover:border-orange-400 hover:bg-slate-700 transition active:scale-95 animate-fade-in";
        
        // ✅ เปลี่ยน Icon ตรงนี้เป็น fa-briefcase หรือ fa-suitcase
        bagBtn.innerHTML = '<i class="fa-solid fa-briefcase text-xl text-orange-400"></i>';
        
        bagBtn.onclick = () => window.navTo('page-bag');
        document.body.appendChild(bagBtn);
    }
}

// Daily Reset
function checkDailyReset() {
    const now = new Date();
    const todayStr = now.toDateString(); // ได้ค่าเช่น "Fri Dec 26 2025"
    
    // 1. กันเหนียว: ถ้าไม่มีข้อมูล resources เลย ให้สร้างใหม่
    if (!playerData.resources) {
        playerData.resources = { gold: 0, gems: 0, stamina: 100, maxStamina: 100 };
    }

    // ✅ LOGIC ที่ถูกต้อง: เช็คว่า "วันที่บันทึกไว้" ไม่ตรงกับ "วันนี้"
    // ถ้าเพิ่งเล่นครั้งแรก lastLoginDate จะเป็น null ก็จะเข้าเงื่อนไขนี้เช่นกัน
    if (playerData.lastLoginDate !== todayStr) {
        console.log("🔄 New Day Detected! Performing Daily Reset...");
        
        // A. รีเซ็ต Stamina เต็มหลอด
        playerData.resources.stamina = playerData.resources.maxStamina;
        
        // B. รีเซ็ตตั๋ว Arena (ถ้ามีระบบ Arena)
        if(playerData.arena) {
            playerData.arena.tickets = playerData.arena.maxTickets || 5;
        }
        
        // C. อัปเดตวันที่ล่าสุดเป็นวันนี้ (เพื่อไม่ให้รีเซ็ตซ้ำในวันเดียวกัน)
        playerData.lastLoginDate = todayStr;
        
        // D. บันทึกและอัปเดตหน้าจอทันที
        saveGame();
        
        // เรียก updateUI เพื่อให้ตัวเลขเด้งทันที
        if (window.updateUI) window.updateUI();
        
        // (Optional) แจ้งเตือนผู้เล่นว่ารีเซ็ตแล้ว
        if (window.Toast) window.Toast("Daily Reset: Stamina & Tickets Refilled!", "success");
    } else {
        console.log("📅 Same Day - No Reset Needed");
    }
}

// =========================================
// 🧭 NAVIGATION SYSTEM
// =========================================
window.navTo = function(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active');

    const footer = document.querySelector('nav');
    if (footer) footer.style.display = (pageId === 'page-battle') ? 'none' : 'grid';

    // ✅✅✅ แก้ไขจุดที่ปุ่มหาย ✅✅✅
    let mailBtn = document.getElementById('btn-open-mail');
    
    if (pageId === 'page-battle') {
        // ซ่อนทั้ง 2 ปุ่มตอนสู้
        const mailBtn = document.getElementById('btn-open-mail');
        const bagBtn = document.getElementById('btn-open-bag');
        if (mailBtn) mailBtn.style.display = 'none';
        if (bagBtn) bagBtn.style.display = 'none';
        Auth.stopMailListener();
    } else {
        // โชว์กลับมา (หรือสร้างใหม่ถ้าหาย)
        createFloatingButtons(); // ✅ เรียกทีเดียวได้ทั้งคู่

        const mailBtn = document.getElementById('btn-open-mail');
        const bagBtn = document.getElementById('btn-open-bag');

        if (mailBtn) { mailBtn.style.display = 'flex'; mailBtn.style.zIndex = '9999'; }
        if (bagBtn) { bagBtn.style.display = 'flex'; bagBtn.style.zIndex = '9999'; }

        Auth.startMailListener();
    }
    
    // ✅✅✅ จบส่วนแก้ไข ✅✅✅

    if(pageId === 'page-stage') StageSystem.init();
    if(pageId === 'page-arena') Arena.init();
    if(pageId === 'page-deck') { Deck.init(); renderHeroDeckSlot(); }
    if(pageId === 'page-gacha') Summon.init();
    if(pageId === 'page-shop') Shop.init();
    if(pageId === 'page-info') Encyclopedia.init();
    if(pageId === 'page-bag') Bag.init();
};

const originalUpdateUI = updateUI;
window.updateUI = () => {
    originalUpdateUI(); 
    if (Mail && Mail.updateMailNotification) {
        Mail.updateMailNotification();
    }
};

// =========================================
// 🔗 BINDINGS
// =========================================
window.saveGame = saveGame;
window.openBreeding = Breeding.openBreedingModal;
window.clearDeck = Deck.clearDeck;
window.renderDeckEditor = Deck.renderDeckEditor; 
window.toggleAuto = Battle.toggleAuto;           
window.claimMail = Mail.claimMail; 
window.claimAllMails = Mail.claimAllMails;
window.checkDailyReset = checkDailyReset;

window.startGame = (stageId) => {
    const stage = STAGE_LIST.find(s => s.id === stageId);
    if (!stage) return;
    if (playerData.resources.stamina < stage.stamina) return showToast("Not enough Stamina!", "error");
    
    playerData.resources.stamina -= stage.stamina;
    saveGame();
    window.updateUI();
    Battle.startGame(stageId);
};

window.openHeroProfile = HeroManager.openHeroProfile;
window.openHeroSwapModal = HeroManager.openHeroSwapModal;
window.openHeroEquipManager = HeroManager.openHeroEquipManager;           
window.heroEquipItem = HeroManager.heroEquipItem;       
window.heroUnequipItem = HeroManager.heroUnequipItem;   
window.selectActiveHero = HeroManager.selectActiveHero;
window.openCardDetails = (uid) => {
    const card = playerData.inventory.find(c => c.uid === uid) || playerData.heroes.find(h => h.uid === uid);
    if (card) Encyclopedia.showCardDetail(card);
};

// =========================================
// 🚀 INIT
// =========================================
function initApp() {
    Auth.initAuth();
    loadGame();    
    
    // สร้างปุ่มตอนเข้าเกม
    createFloatingButtons();

    // Breed Button
    const deckHeader = document.querySelector('#page-deck .flex.gap-2');
    if(deckHeader && !document.getElementById('btn-open-breed')) {
        const btn = document.createElement('button');
        btn.id = 'btn-open-breed';
        btn.innerHTML = '<i class="fa-solid fa-heart mr-1"></i> Breed';
        btn.className = "px-3 py-1.5 text-xs border border-pink-500 text-pink-500 rounded hover:bg-pink-500 hover:text-white transition uppercase font-bold";
        btn.onclick = Breeding.openBreedingModal;
        deckHeader.insertBefore(btn, deckHeader.firstChild);
    }

    window.updateUI();
    window.navTo('page-stage');
}

initApp();