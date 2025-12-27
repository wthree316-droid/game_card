// js/modules/summon.js
import { playerData, saveGame } from '../core/state.js';
import { CARD_DATABASE } from '../core/config.js';
import { createCardElement } from '../ui-shared.js';
import { showToast } from './ui-notifications.js';
import { getCardStats } from '../utils.js';

// --- CONFIGURATION ---
const BANNERS = {
    BASIC: {
        id: 'BASIC', name: "Novice Summon", desc: "Start your journey here.",
        costType: 'gold', cost: 500,
        rates: { C: 60, U: 30, R: 9, SR: 1, UR: 0, LEGEND: 0, MYTHICAL: 0 },
        color: "from-slate-700 to-slate-900", icon: "🛡️",
        bgImage: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop"
    },
    ADVANCED: {
        id: 'ADVANCED', name: "Elite Recruitment", desc: "Better rates for Rare units.",
        costType: 'gems', cost: 100,
        rates: { C: 20, U: 40, R: 30, SR: 9, UR: 1, LEGEND: 0, MYTHICAL: 0 },
        color: "from-blue-900 to-slate-900", icon: "💎",
        bgImage: "https://images.unsplash.com/photo-1597733336794-12d05021d510?q=80&w=1974&auto=format&fit=crop"
    },
    HIGH: {
        id: 'HIGH', name: "Legendary Banner", desc: "High chance for UR/Legend!",
        costType: 'gems', cost: 300,
        rates: { C: 0, U: 20, R: 50, SR: 20, UR: 8, LEGEND: 2, MYTHICAL: 0 },
        color: "from-purple-900 to-slate-900", icon: "👑",
        bgImage: "https://images.unsplash.com/photo-1633355520330-d309995c6fc9?q=80&w=2070&auto=format&fit=crop"
    },
    SPECIAL: {
        id: 'SPECIAL', name: "Event: Mystic Force", desc: "Chance for MYTHICAL units.",
        costType: 'gems', cost: 500,
        rates: { C: 0, U: 10, R: 40, SR: 30, UR: 15, LEGEND: 4, MYTHICAL: 1 },
        color: "from-red-900 to-slate-900", icon: "🔥",
        bgImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1968&auto=format&fit=crop"
    }
};

let currentBannerId = 'BASIC';

export function init() {
    renderGachaLayout(); // สร้างโครงสร้างครั้งเดียว
    updateGachaContent(); // อัปเดตเนื้อหา
}

// ==========================================
// 🏗️ 1. LAYOUT (สร้างโครงสร้าง HTML ครั้งเดียว)
// ==========================================
function renderGachaLayout() {
    const container = document.getElementById('gacha-container');
    if (!container) return;

    // เช็คว่ามีโครงสร้างอยู่แล้วหรือยัง ถ้ามีแล้วไม่ต้องสร้างใหม่ (กัน Scroll เด้ง)
    if (document.getElementById('gacha-main-layout')) return;

    container.innerHTML = `
        <div id="gacha-main-layout" class="flex flex-col h-full max-w-5xl mx-auto animate-fade-in pb-20 px-4 md:px-0 pt-4">
            
            <div class="flex justify-end items-center mb-4">
                <div class="bg-black/60 px-4 py-2 rounded-full border border-white/10 flex gap-4 text-sm font-bold font-mono shadow-lg">
                    <div class="text-yellow-400 flex items-center gap-2"><i class="fa-solid fa-coins"></i> <span id="gacha-gold-display">0</span></div>
                    <div class="text-blue-400 flex items-center gap-2"><i class="fa-regular fa-gem"></i> <span id="gacha-gem-display">0</span></div>
                </div>
            </div>

            <div id="gacha-tabs-container" class="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar-mobile mask-linear-fade scroll-smooth">
                </div>

            <div id="gacha-banner-area">
                </div>
        </div>
    `;

    // สร้างปุ่ม Tab เตรียมไว้เลย (แต่ยังไม่กำหนดสี Active)
    const tabsContainer = document.getElementById('gacha-tabs-container');
    tabsContainer.innerHTML = Object.values(BANNERS).map(b => `
        <button id="btn-banner-${b.id}" onclick="window.switchBanner('${b.id}')" 
            class="px-5 py-3 rounded-xl border font-bold text-sm transition-all duration-300 relative overflow-hidden group shrink-0 flex items-center gap-2">
            <span class="text-xl filter drop-shadow-md">${b.icon}</span>
            <span class="uppercase tracking-wide">${b.name}</span>
            <div class="active-indicator absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 hidden"></div>
        </button>
    `).join('');
}

// ==========================================
// 🔄 2. CONTENT UPDATE (เรียกเมื่อเปลี่ยน Tab)
// ==========================================
function updateGachaContent() {
    // 1. อัปเดตเงิน
    const goldDisplay = document.getElementById('gacha-gold-display');
    const gemDisplay = document.getElementById('gacha-gem-display');
    if(goldDisplay) goldDisplay.innerText = playerData.resources.gold.toLocaleString();
    if(gemDisplay) gemDisplay.innerText = (playerData.resources.gems || 0).toLocaleString();

    // 2. อัปเดตสถานะปุ่ม Tab (Active State) - ไม่ลบปุ่มทิ้ง Scroll จึงไม่เด้ง
    Object.keys(BANNERS).forEach(id => {
        const btn = document.getElementById(`btn-banner-${id}`);
        if (!btn) return;

        const indicator = btn.querySelector('.active-indicator');
        if (id === currentBannerId) {
            // Active Style
            btn.className = "px-5 py-3 rounded-xl border font-bold text-sm transition-all duration-300 relative overflow-hidden group shrink-0 flex items-center gap-2 bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105 z-10";
            if(indicator) indicator.classList.remove('hidden');
        } else {
            // Inactive Style
            btn.className = "px-5 py-3 rounded-xl border font-bold text-sm transition-all duration-300 relative overflow-hidden group shrink-0 flex items-center gap-2 bg-slate-800/80 text-gray-400 border-white/5 hover:bg-slate-700 hover:text-white";
            if(indicator) indicator.classList.add('hidden');
        }
    });

    // 3. วาด Banner Card ใหม่
    renderBannerCard();
}

function renderBannerCard() {
    const bannerArea = document.getElementById('gacha-banner-area');
    if (!bannerArea) return;

    const banner = BANNERS[currentBannerId];
    const isGold = banner.costType === 'gold';
    const currencyIcon = isGold ? '<i class="fa-solid fa-coins text-yellow-400"></i>' : '<i class="fa-regular fa-gem text-blue-400"></i>';
    const currencyVal = isGold ? playerData.resources.gold : playerData.resources.gems;
    const canAfford = currencyVal >= banner.cost;

    bannerArea.innerHTML = `
        <div class="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br ${banner.color} min-h-[450px] flex flex-col md:flex-row group transition-colors duration-500 animate-fade-in">
            
            <div class="absolute inset-0">
                <img src="${banner.bgImage}" class="w-full h-full object-cover opacity-30 mix-blend-overlay transition-transform duration-[10s] group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
            </div>
            
            <div class="relative z-10 w-full md:w-5/12 flex items-center justify-center p-8 md:p-0">
                <div class="w-48 h-64 md:w-64 md:h-80 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transform transition hover:scale-105 duration-500 hover:shadow-yellow-500/20">
                    <div class="text-9xl drop-shadow-2xl filter hover:brightness-125 transition duration-300 animate-float">${banner.icon}</div>
                    <div class="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/30"></div>
                    <div class="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/30"></div>
                </div>
            </div>

            <div class="relative z-10 w-full md:w-7/12 p-6 md:p-10 flex flex-col justify-center text-center md:text-left">
                <div class="mb-auto">
                    <div class="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/70 mb-2 backdrop-blur-md">
                        Featured Banner
                    </div>
                    <h2 class="text-4xl md:text-6xl font-black text-white italic uppercase leading-none mb-4 drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
                        ${banner.name}
                    </h2>
                    <p class="text-gray-300 text-lg font-light leading-relaxed max-w-md mx-auto md:mx-0 border-l-2 border-yellow-500/50 pl-4 bg-gradient-to-r from-white/5 to-transparent py-2">
                        ${banner.desc}
                    </p>
                </div>

                <div class="mt-8 space-y-4">
                    <div class="flex items-center justify-center md:justify-start gap-4">
                        <div class="bg-black/60 px-6 py-3 rounded-xl border border-white/10 backdrop-blur flex items-center gap-3">
                            <span class="text-xs text-gray-400 uppercase font-bold">Cost</span>
                            <div class="text-2xl font-mono font-bold flex items-center gap-2 ${canAfford ? 'text-white' : 'text-red-500'}">
                                ${currencyIcon} ${banner.cost.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <button onclick="window.performSummon()" 
                        class="w-full md:w-auto px-10 py-5 rounded-xl font-black text-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group
                        ${canAfford ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white' : 'bg-slate-700 text-gray-500 cursor-not-allowed border border-white/5'}">
                        
                        ${canAfford ? `
                            <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                            <i class="fa-solid fa-star text-yellow-200 animate-spin-slow"></i> 
                            <span>SUMMON x1</span>
                        ` : `
                            <i class="fa-solid fa-lock"></i> 
                            <span>INSUFFICIENT FUNDS</span>
                        `}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Global Functions
window.switchBanner = (id) => { 
    currentBannerId = id; 
    updateGachaContent(); // อัปเดตเฉพาะเนื้อหา ไม่ Re-render โครงสร้าง
};

window.performSummon = () => {
    const banner = BANNERS[currentBannerId];
    const cost = banner.cost;
    const isGold = banner.costType === 'gold';

    if (isGold) {
        if (playerData.resources.gold < cost) return showToast("Not enough Gold!", "error");
        playerData.resources.gold -= cost;
    } else {
        if (playerData.resources.gems < cost) return showToast("Not enough Gems!", "error");
        playerData.resources.gems -= cost;
    }

    // RNG Logic
    const rand = Math.random() * 100;
    let cumulative = 0;
    let chosenRarity = 'C';
    for (const [rarity, rate] of Object.entries(banner.rates)) {
        cumulative += rate;
        if (rand <= cumulative) { chosenRarity = rarity; break; }
    }

    const pool = Object.values(CARD_DATABASE).filter(c => c.rarity === chosenRarity);
    const cardTemplate = pool[Math.floor(Math.random() * pool.length)] || pool[0] || Object.values(CARD_DATABASE)[0];

    const newCard = {
        uid: "c_" + Date.now() + Math.random().toString(36).substr(2, 5),
        cardId: Object.keys(CARD_DATABASE).find(key => CARD_DATABASE[key] === cardTemplate),
        level: 1, exp: 0, 
        stars: getStarsFromRarity(chosenRarity),
        obtainedAt: Date.now(),
        element: cardTemplate.element,
        tier: 1, traits: []
    };

    if (!playerData.inventory) playerData.inventory = [];
    playerData.inventory.push(newCard);
    saveGame();
    if(window.updateUI) window.updateUI();

    playSummonAnimation(newCard, banner.id); 
};

function playSummonAnimation(cardData, bannerId) {
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-fade-in select-none";
    modal.id = "gacha-modal";
    document.body.appendChild(modal);

    let glowClass = `gacha-glow-${bannerId}`; 
    let extraEffect = '';
    if (bannerId === 'SPECIAL' || cardData.stars >= 5) {
        for(let i=0; i<15; i++) {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            extraEffect += `<div class="special-ember" style="left:${left}%; animation-delay:${delay}s; bottom: -10px;"></div>`;
        }
    }

    modal.innerHTML = `
        <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
            <div class="gacha-glow ${glowClass} opacity-50 scale-150"></div>
            ${extraEffect}
            <div class="mystery-card z-10 cursor-pointer hover:scale-105 transition-transform duration-300" id="mystery-target">
                <div class="mystery-pattern"></div>
                <div class="text-6xl text-white/20 animate-bounce"><i class="fa-solid fa-question"></i></div>
                <div class="absolute inset-0 border-4 border-white/10 rounded-xl"></div>
            </div>
            <div class="absolute bottom-20 text-center w-full z-20">
                <div class="text-white/50 text-sm uppercase tracking-[0.2em] animate-pulse">Tap to Reveal</div>
            </div>
        </div>
    `;

    const target = document.getElementById('mystery-target');
    target.onclick = () => {
        const stats = getCardStats(cardData);
        const cardEl = createCardElement(stats, 'reward'); 
        cardEl.classList.remove('w-full', 'h-44', 'md:h-[173px]', 'h-[95px]', 'sm:h-[130px]'); 
        cardEl.classList.add('reward-card-size', 'anim-reveal', 'shadow-2xl'); 
        
        const contentContainer = modal.querySelector('.relative');
        contentContainer.innerHTML = ''; 
        contentContainer.appendChild(cardEl);

        const closeBtn = document.createElement('button');
        closeBtn.className = "absolute bottom-10 bg-white text-black px-10 py-3 rounded-full font-black text-lg hover:bg-gray-200 transition animate-fade-in-up shadow-[0_0_20px_white] z-50 transform hover:scale-105 active:scale-95";
        closeBtn.innerText = "CONTINUE";
        closeBtn.onclick = () => { 
            modal.classList.add('opacity-0', 'duration-500'); 
            setTimeout(() => { modal.remove(); updateGachaContent(); }, 500);
        };
        contentContainer.appendChild(closeBtn);

        let burstColor = 'bg-white/20';
        if (cardData.stars >= 4) burstColor = 'bg-purple-500/30';
        if (cardData.stars >= 5) burstColor = 'bg-yellow-500/40';
        if (cardData.stars >= 6) burstColor = 'bg-red-600/50';

        const burst = document.createElement('div');
        burst.className = `absolute inset-0 ${burstColor} blur-3xl -z-10 animate-pulse`;
        contentContainer.appendChild(burst);
    };
}

function getStarsFromRarity(rarity) {
    if (rarity === 'C') return 1;
    if (rarity === 'U') return 2;
    if (rarity === 'R') return 3;
    if (rarity === 'SR') return 4;
    if (rarity === 'UR') return 5;
    if (rarity === 'LEGEND') return 6;
    if (rarity === 'MYTHICAL') return 7;
    return 1;
}

window.switchBanner = switchBanner;
window.performSummon = performSummon;
