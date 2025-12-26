// js/modules/summon.js
import { playerData, saveGame } from '../core/state.js';
import { CARD_DATABASE } from '../core/config.js';
import { createCardElement } from '../ui-shared.js';
import { showToast } from './ui-notifications.js';
import { getCardStats } from '../utils.js';

// --- CONFIGURATION ---
const BANNERS = {
    BASIC: {
        id: 'BASIC', name: "Novice Summon", desc: "Standard recruitment.",
        costType: 'gold', cost: 500,
        rates: { C: 60, U: 30, R: 9, SR: 1, UR: 0, LEGEND: 0, MYTHICAL: 0 },
        color: "from-slate-700 to-slate-900", icon: "🛡️"
    },
    ADVANCED: {
        id: 'ADVANCED', name: "Elite Recruitment", desc: "Better rates for Rare units.",
        costType: 'gems', cost: 100,
        rates: { C: 20, U: 40, R: 30, SR: 9, UR: 1, LEGEND: 0, MYTHICAL: 0 },
        color: "from-blue-900 to-slate-900", icon: "💎"
    },
    HIGH: {
        id: 'HIGH', name: "Legendary Banner", desc: "High chance for UR/Legend!",
        costType: 'gems', cost: 300,
        rates: { C: 0, U: 20, R: 50, SR: 20, UR: 8, LEGEND: 2, MYTHICAL: 0 },
        color: "from-purple-900 to-slate-900", icon: "👑"
    },
    SPECIAL: {
        id: 'SPECIAL', name: "Event: Mystic Force", desc: "Chance for MYTHICAL units.",
        costType: 'gems', cost: 500,
        rates: { C: 0, U: 10, R: 40, SR: 30, UR: 15, LEGEND: 4, MYTHICAL: 1 },
        color: "from-red-900 to-slate-900", icon: "🔥"
    }
};

let currentBannerId = 'BASIC';

export function init() { renderGachaUI(); }

function renderGachaUI() {
    const container = document.getElementById('gacha-container');
    if (!container) return;

    const banner = BANNERS[currentBannerId];
    const isGold = banner.costType === 'gold';
    const currencyIcon = isGold ? '<i class="fa-solid fa-coins text-yellow-400"></i>' : '<i class="fa-regular fa-gem text-blue-400"></i>';
    const currencyVal = isGold ? playerData.resources.gold : playerData.resources.gems;
    const canAfford = currencyVal >= banner.cost;

    container.innerHTML = `
        <div class="flex flex-col h-full max-w-4xl mx-auto animate-fade-in pb-10">
            <div class="flex justify-center gap-2 mb-6 overflow-x-auto pb-2 px-2">
                ${Object.values(BANNERS).map(b => `
                    <button onclick="window.switchBanner('${b.id}')" 
                        class="px-4 py-3 rounded-xl border-2 font-bold text-sm md:text-base flex items-center gap-2 transition-all duration-300 relative overflow-hidden group shrink-0
                        ${currentBannerId === b.id ? 'bg-white text-black border-white shadow-[0_0_15px_white]' : 'bg-slate-800 text-gray-400 border-slate-700 hover:border-gray-500'}">
                        <span class="text-xl">${b.icon}</span>
                        <span>${b.name}</span>
                    </button>
                `).join('')}
            </div>

            <div class="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br ${banner.color} p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 min-h-[400px]">
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>
                
                <div class="relative z-10 w-full md:w-1/2 flex justify-center">
                    <div class="w-64 h-80 bg-black/30 rounded-2xl border-2 border-white/20 flex items-center justify-center relative overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition duration-500 group">
                        <div class="text-9xl opacity-50 grayscale group-hover:grayscale-0 transition duration-500">${banner.icon}</div>
                        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    </div>
                </div>

                <div class="relative z-10 w-full md:w-1/2 text-center md:text-left space-y-4">
                    <h2 class="text-4xl md:text-5xl font-black text-white italic uppercase">${banner.name}</h2>
                    <p class="text-gray-300 text-lg border-l-4 border-white/20 pl-4">${banner.desc}</p>
                    <div class="py-4">
                        <div class="text-3xl font-mono font-bold flex items-center justify-center md:justify-start gap-2 ${canAfford ? 'text-white' : 'text-red-500'}">
                            ${currencyIcon} ${banner.cost.toLocaleString()}
                        </div>
                    </div>
                    <button onclick="window.performSummon()" 
                        class="w-full md:w-auto px-8 py-4 rounded-full font-black text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3
                        ${canAfford ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white shadow-orange-500/30' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}">
                        ${canAfford ? 'SUMMON x1' : 'INSUFFICIENT FUNDS'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.switchBanner = (id) => { currentBannerId = id; renderGachaUI(); };

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

    // RNG
    const rand = Math.random() * 100;
    let cumulative = 0;
    let chosenRarity = 'C';
    for (const [rarity, rate] of Object.entries(banner.rates)) {
        cumulative += rate;
        if (rand <= cumulative) { chosenRarity = rarity; break; }
    }

    const pool = Object.values(CARD_DATABASE).filter(c => c.rarity === chosenRarity);
    const cardTemplate = pool[Math.floor(Math.random() * pool.length)] || pool[0];

    const newCard = {
        uid: "c_" + Date.now() + Math.random().toString(36).substr(2, 5),
        cardId: Object.keys(CARD_DATABASE).find(key => CARD_DATABASE[key] === cardTemplate),
        level: 1, exp: 0, stars: getStarsFromRarity(chosenRarity),
        obtainedAt: Date.now(),
        element: cardTemplate.element,
        tier: 1, traits: []
    };

    if (!playerData.inventory) playerData.inventory = [];
    playerData.inventory.push(newCard);
    saveGame();
    if(window.updateUI) window.updateUI();

    playSummonAnimation(newCard, banner.id); // ✅ ส่ง bannerId ไปด้วย
};

// 4. ANIMATION SEQUENCE (UPDATED)
function playSummonAnimation(cardData, bannerId) {
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-fade-in";
    modal.id = "gacha-modal";
    document.body.appendChild(modal);

    // ✅ 1. เลือก Class สีตาม Banner
    let glowClass = `gacha-glow-${bannerId}`; 
    
    // ✅ 2. สร้าง Extra Effect สำหรับ SPECIAL
    let extraEffect = '';
    if (bannerId === 'SPECIAL') {
        // สร้างสะเก็ดไฟ 10 อัน
        for(let i=0; i<10; i++) {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            extraEffect += `<div class="special-ember" style="left:${left}%; animation-delay:${delay}s; bottom: -10px;"></div>`;
        }
    }

    modal.innerHTML = `
        <div class="relative">
            <div class="gacha-glow ${glowClass}"></div>
            ${extraEffect}

            <div class="mystery-card" id="mystery-target">
                <div class="mystery-pattern"></div>
                <i class="fa-solid fa-question animate-bounce"></i>
            </div>
            <div class="mt-8 text-center text-white/50 text-sm animate-pulse">Click to Reveal</div>
        </div>
    `;

    const target = document.getElementById('mystery-target');
    target.onclick = () => {
        const stats = getCardStats(cardData);
        const cardEl = createCardElement(stats, 'reward'); 
        
        // ✅ 3. ปรับขนาดการ์ดให้สวยงาม (ลบ w-full h-44 เดิมทิ้ง แล้วใส่ Class ใหม่)
        cardEl.classList.remove('w-full', 'h-44'); 
        cardEl.classList.add('reward-card-size', 'anim-reveal'); 
        
        modal.innerHTML = '';
        modal.appendChild(cardEl);

        const closeBtn = document.createElement('button');
        closeBtn.className = "mt-8 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition animate-fade-in shadow-lg z-50 relative";
        closeBtn.innerText = "CONTINUE";
        closeBtn.onclick = () => { modal.remove(); renderGachaUI(); };
        modal.appendChild(closeBtn);

        // Background Glow ตามระดับความเกลือ
        let bgGlow = 'bg-white/10';
        if (cardData.stars >= 5) bgGlow = 'bg-yellow-500/20';
        if (cardData.stars >= 6) bgGlow = 'bg-red-600/30';
        if (bannerId === 'SPECIAL') bgGlow = 'bg-red-900/40'; // พิเศษใส่ไข่
        
        const glowBg = document.createElement('div');
        glowBg.className = `absolute inset-0 ${bgGlow} blur-3xl -z-10 animate-pulse`;
        modal.appendChild(glowBg);
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