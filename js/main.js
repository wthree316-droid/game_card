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
    const menuId = 'floating-menu-container';
    
    // ป้องกันการสร้างซ้ำ
    if (document.getElementById(menuId)) return;

    // 1. สร้าง Container หลัก (มุมขวาบน)
    const container = document.createElement('div');
    container.id = menuId;
    // ใช้ flex-col และ items-end เพื่อให้ปุ่มเรียงลงมาตรงกัน
    container.className = "fixed top-20 right-4 z-[100] flex flex-col items-end gap-2 animate-fade-in";
    container.style.display = 'none';
    // 2. สร้างปุ่มเมนูหลัก (Toggle Button)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'btn-menu-toggle';
    toggleBtn.className = "w-12 h-12 bg-slate-900 border-2 border-yellow-500 rounded-full text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-all z-20 relative";
    toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>'; // ไอคอน 3 ขีด

    // 3. สร้างรายการปุ่มย่อย (List Container)
    const listContainer = document.createElement('div');
    listContainer.id = "floating-menu-list";
    // CSS สำหรับ Animation: ซ่อนไว้ก่อน (scale-y-0) และจะขยายลงมา
    listContainer.className = "flex flex-col gap-3 items-center transition-all duration-300 origin-top transform scale-y-0 opacity-0 h-0 p-1";

    // --- ฟังก์ชันช่วยสร้างปุ่มย่อย ---
    const createSubBtn = (icon, colorClass, label, onClick) => {
        const btn = document.createElement('button');
        // ปุ่มย่อยจะเล็กกว่าปุ่มหลักนิดหน่อย (w-10 h-10)
        btn.className = `w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 border ${colorClass} group relative`;
        btn.innerHTML = icon;
        btn.onclick = onClick;
        
        // Tooltip (แสดงชื่อปุ่มเมื่อเอาเมาส์ชี้)
        const tooltip = document.createElement('span');
        tooltip.className = "absolute right-12 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none border border-white/10";
        tooltip.innerText = label;
        btn.appendChild(tooltip);
        
        return btn;
    };

    // 4. เพิ่มปุ่มย่อยเข้าไปในลิสต์
    
    // ✉️ Mail
    listContainer.appendChild(createSubBtn(
        '<i class="fa-solid fa-envelope"></i>',
        'bg-slate-700 border-slate-500 hover:bg-slate-600',
        'Mailbox',
        () => {
            if(Mail && Mail.openMailboxModal) Mail.openMailboxModal();
            else console.error("Mail module or openMailboxModal not found!"); // เผื่อไว้ debug
            toggleMenu(false); // กดแล้วปิดเมนู
        }
    ));

    // 💼 Bag
    listContainer.appendChild(createSubBtn(
        '<i class="fa-solid fa-briefcase"></i>',
        'bg-orange-700 border-orange-500 hover:bg-orange-600',
        'Inventory',
        () => {
            window.navTo('page-bag');
            toggleMenu(false);
        }
    ));

    // 🔴 Logout
    listContainer.appendChild(createSubBtn(
        '<i class="fa-solid fa-power-off"></i>',
        'bg-red-700 border-red-500 hover:bg-red-600',
        'Logout',
        () => {
            if(window.authLogout) window.authLogout();
        }
    ));

    // 5. Logic การเปิด/ปิด เมนู
    let isOpen = false;
    
    function toggleMenu(forceState = null) {
        isOpen = forceState !== null ? forceState : !isOpen;
        
        if (isOpen) {
            toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'; // เปลี่ยนไอคอนเป็นกากบาท
            toggleBtn.classList.add('bg-slate-800', 'border-white');
            toggleBtn.classList.remove('border-yellow-500', 'text-yellow-400');
            
            // สไลด์ลงมา
            listContainer.classList.remove('scale-y-0', 'opacity-0', 'h-0');
            listContainer.classList.add('scale-y-100', 'opacity-100', 'mt-2');
        } else {
            toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>'; // กลับเป็น 3 ขีด
            toggleBtn.classList.remove('bg-slate-800', 'border-white');
            toggleBtn.classList.add('border-yellow-500', 'text-yellow-400');
            
            // สไลด์เก็บขึ้นไป
            listContainer.classList.add('scale-y-0', 'opacity-0', 'h-0');
            listContainer.classList.remove('scale-y-100', 'opacity-100', 'mt-2');
        }
    }

    toggleBtn.onclick = () => toggleMenu();

    // ประกอบร่าง
    container.appendChild(toggleBtn);
    container.appendChild(listContainer);
    document.body.appendChild(container);
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
    // จำหน้าปัจจุบันก่อนเปลี่ยน
    const currentActive = document.querySelector('.page-section.active');
    
    // ถ้ากำลังจะไปหน้า Bag และหน้าปัจจุบันไม่ใช่หน้า Battle หรือ Bag เอง -> ให้จำหน้าปัจจุบันไว้
    if (pageId === 'page-bag' && currentActive && currentActive.id !== 'page-battle' && currentActive.id !== 'page-bag') {
        window.lastPageBeforeBag = currentActive.id;
    }
    // 1. เคลียร์ Class active เก่า
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // 2. เปิดหน้าใหม่
    const target = document.getElementById(pageId);
    if(target) target.classList.add('active');

    // 3. จัดการ Footer (Bar ด้านล่าง)
    const footer = document.querySelector('nav');
    if (footer) footer.style.display = (pageId === 'page-battle') ? 'none' : 'grid';

    // ✅✅✅ 4. จัดการปุ่มเมนู (แก้ไข Logic แบบ Fail-Safe) ✅✅✅
    
    // เรียกสร้างปุ่มไว้ก่อน (ถ้ายังไม่มี)
    createFloatingButtons();
    
    const menuContainer = document.getElementById('floating-menu-container');
    
    if (pageId === 'page-battle') {
        // A. ถ้าอยู่หน้าสู้ -> ซ่อนเสมอ (อันนี้ชัวร์)
        if (menuContainer) menuContainer.style.display = 'none';
        Auth.stopMailListener();
    } else {
        // B. ถ้าอยู่หน้าปกติ -> เช็คสถานะ
        const loginOverlay = document.getElementById('login-overlay');
        
        // 🔥 จุดเปลี่ยนสำคัญ: 
        // ถ้าหา overlay ไม่เจอ (!loginOverlay) -> ถือว่า Login แล้ว -> ให้เป็น True
        // หรือถ้าเจอแล้วมี class 'hidden' -> ถือว่า Login แล้ว -> ให้เป็น True
        const isLoggedIn = !loginOverlay || loginOverlay.classList.contains('hidden');
        
        if (menuContainer) {
            // โชว์เมนูถ้า isLoggedIn เป็นจริง
            menuContainer.style.display = isLoggedIn ? 'flex' : 'none';
        }
        
        Auth.startMailListener();
    }
    
    // 5. Init ระบบต่างๆ (เหมือนเดิม)
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
