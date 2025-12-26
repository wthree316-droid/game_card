// js/modules/arena.js
import { playerData, saveGame } from '../core/state.js';
import { createNewCard, getCardStats, getHeroStats } from '../utils.js';
import { CARD_DATABASE, HERO_DATABASE } from '../core/config.js';
import { showToast } from './ui-notifications.js';

// --- Configuration ---
const ARENA_SLOTS = 6; // จำกัด 6 ตัว (1 Hero + 5 Units) เพื่อความสมดุล

// --- Helper: คำนวณพลังรวม ---
function calculateTeamPower(deckArray) {
    let totalPower = 0;
    if (deckArray && Array.isArray(deckArray)) {
        deckArray.forEach(uid => {
            if (uid) {
                // ถ้าเป็น Hero ID
                if(uid.startsWith('h_') || uid === playerData.activeHeroId) {
                    const hero = playerData.heroes.find(h => (h.uid === uid) || (h.heroId === uid));
                    if(hero) totalPower += getHeroStats(hero).power;
                } 
                // ถ้าเป็น Card UID
                else {
                    const card = playerData.inventory.find(c => c.uid === uid);
                    if(card) totalPower += getCardStats(card).power;
                }
            }
        });
    }
    return totalPower;
}

// สร้างบอทคู่แข่ง (ปรับให้สร้าง Deck 6 ตัวเท่าเรา)
function generateOpponents() {
    const opponents = [];
    const myArenaDeck = getArenaDeck();
    const playerPower = calculateTeamPower(myArenaDeck);
    const basePower = playerPower > 0 ? playerPower : 2000;
    
    const difficulties = [
        { name: "Novice Fighter", diff: 0.8, rank: "Bronze" },
        { name: "Arena Knight", diff: 1.0, rank: "Silver" },
        { name: "Grand Champion", diff: 1.2, rank: "Gold" }
    ];
    
    difficulties.forEach((d, index) => {
        opponents.push({
            id: `bot_${Date.now()}_${index}`,
            name: d.name,
            rank: Math.floor(playerData.arena.rankPoints * d.diff),
            power: Math.floor(basePower * d.diff),
            deck: generateBotDeck(d.diff)
        });
    });
    
    return opponents;
}

// สร้าง Deck บอท 6 ตัว (1 Hero + 5 Minions)
function generateBotDeck(difficulty) {
    const deck = new Array(ARENA_SLOTS).fill(null);
    const allCards = Object.keys(CARD_DATABASE);
    
    // 1. Hero (ตำแหน่ง 4 - หลังกลาง)
    const botHero = JSON.parse(JSON.stringify(HERO_DATABASE['h001']));
    botHero.heroId = 'h001';
    botHero.level = Math.max(1, Math.floor(playerData.profile.level * difficulty));
    botHero.isLeader = true;
    deck[4] = botHero; 

    // 2. Minions (ตำแหน่งที่เหลือ 0,1,2,3,5)
    const emptySlots = [0, 1, 2, 3, 5];
    emptySlots.forEach(slotIdx => {
        const randId = allCards[Math.floor(Math.random() * allCards.length)];
        const card = createNewCard(randId);
        card.level = Math.max(1, Math.floor(playerData.profile.level * difficulty));
        card.stars = Math.floor(Math.random() * 3) + 1;
        deck[slotIdx] = card;
    });

    return deck;
}

// ดึง Deck ของ Arena (ถ้าไม่มีให้สร้างใหม่)
function getArenaDeck() {
    if (!playerData.arena.arenaDeck || playerData.arena.arenaDeck.length !== ARENA_SLOTS) {
        // ถ้ายังไม่มี ให้ดึง Hero ปัจจุบันมาใส่ช่อง 4 ก่อน
        const newDeck = new Array(ARENA_SLOTS).fill(null);
        // หา Active Hero
        const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId);
        if(activeHero) newDeck[4] = activeHero.uid || activeHero.heroId;
        
        playerData.arena.arenaDeck = newDeck;
        saveGame();
    }
    return playerData.arena.arenaDeck;
}

export function init() {
    renderArenaUI();
}

function renderArenaUI() {
    const container = document.getElementById('arena-container');
    if(!container) return;

    const myDeck = getArenaDeck();
    const myPower = calculateTeamPower(myDeck);
    const opponents = generateOpponents();

    container.innerHTML = `
        <div class="p-4 max-w-6xl mx-auto pb-24">
            
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border-y-2 border-yellow-600 mb-8 flex flex-col md:flex-row justify-between items-center shadow-lg gap-6">
                <div class="flex items-center gap-6">
                    <div class="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-xl relative">
                        <i class="fa-solid fa-swords text-4xl text-white"></i>
                        <div class="absolute -bottom-2 bg-black text-xs px-2 py-0.5 rounded text-yellow-500 font-bold border border-yellow-500">PVP</div>
                    </div>
                    <div>
                        <h2 class="text-4xl font-black text-white italic uppercase tracking-wider drop-shadow-md">ARENA</h2>
                        <div class="text-yellow-400 font-mono text-xl font-bold flex items-center gap-2">
                            <span>${playerData.arena.rankPoints.toLocaleString()}</span> <span class="text-xs text-gray-500">RP</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3 bg-slate-800 px-5 py-2 rounded-full border border-slate-600 shadow-inner">
                    <i class="fa-solid fa-ticket text-red-500 text-xl animate-pulse"></i>
                    <span class="font-black text-white text-xl">${playerData.arena.tickets}</span>
                    <span class="text-gray-500 text-sm">/ ${playerData.arena.maxTickets}</span>
                </div>
            </div>

            <div class="bg-slate-900/90 border-2 border-slate-700 rounded-2xl p-6 mb-10 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-5"><i class="fa-solid fa-chess-board text-9xl text-white"></i></div>
                
                <div class="flex justify-between items-end mb-6 relative z-10">
                    <div>
                        <h3 class="text-2xl font-bold text-white flex items-center gap-2">
                            <i class="fa-solid fa-helmet-safety text-yellow-500"></i> MY BATTLE TEAM
                        </h3>
                        <p class="text-sm text-gray-400">Manage your 6-unit squad for Attack & Defense</p>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] text-gray-500 uppercase font-bold">Team Power</div>
                        <div class="text-3xl font-black text-yellow-400 drop-shadow-md">${myPower.toLocaleString()}</div>
                    </div>
                </div>

                <div class="flex justify-center gap-4 flex-wrap relative z-10">
                    ${renderEditableSlots(myDeck)}
                </div>
                
                <div class="mt-4 text-center">
                    <p class="text-[10px] text-gray-500">*Click on a slot to change unit. Hero is recommended in the back row.</p>
                </div>
            </div>

            <div class="flex items-center gap-4 mb-6">
                 <div class="h-10 w-1.5 bg-red-600 rounded-full shadow-[0_0_10px_red]"></div>
                 <h3 class="text-2xl font-black text-white uppercase tracking-wide">Select Opponent</h3>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${opponents.map(bot => `
                    <div class="bg-slate-800 border-2 border-slate-700 rounded-2xl p-1 hover:border-red-500 hover:bg-slate-750 transition-all duration-300 group relative hover:-translate-y-2 shadow-xl cursor-pointer"
                         onclick="window.startPvPBattle('${encodeURIComponent(JSON.stringify(bot))}')">
                        <div class="p-6 flex flex-col items-center relative z-10">
                            <div class="w-20 h-20 bg-slate-700 rounded-full mb-4 border-4 border-slate-600 group-hover:border-red-500 transition-colors flex items-center justify-center text-4xl shadow-inner relative">
                                👺
                            </div>
                            <h4 class="font-bold text-xl text-white mb-1 group-hover:text-red-400 transition">${bot.name}</h4>
                            <div class="text-yellow-500 text-sm font-mono font-bold mb-4 bg-black/30 px-3 py-1 rounded border border-white/5">
                                CP: ${bot.power.toLocaleString()}
                            </div>
                            <button class="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg uppercase text-sm shadow">
                                Battle (-1 Ticket)
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// --------------------------------------------------------
// 🧩 SLOT SYSTEM LOGIC
// --------------------------------------------------------

function renderEditableSlots(deck) {
    let html = '';
    // Layout: 
    // Front Row: [0] [1] [2]
    // Back Row:  [3] [4] [5]
    
    // เราจะวาดเป็น 2 แถวให้เห็นภาพชัดเจน
    const frontRow = [0, 1, 2];
    const backRow = [3, 4, 5];

    const renderSlot = (idx) => {
        const uid = deck[idx];
        let content = `<div class="text-4xl text-slate-700 opacity-50">+</div>`;
        let borderClass = 'border-slate-700 border-dashed';
        let bgClass = 'bg-slate-800/50';
        let badge = '';

        if (uid) {
            let stats = null;
            // เช็คว่าเป็น Hero หรือ Unit
            if (uid.startsWith('h_') || uid === playerData.activeHeroId) {
                const hero = playerData.heroes.find(h => (h.uid === uid) || (h.heroId === uid));
                if (hero) stats = getHeroStats(hero);
            } else {
                const card = playerData.inventory.find(c => c.uid === uid);
                if (card) stats = getCardStats(card);
            }

            if (stats) {
                const isImg = stats.icon.includes('/') || stats.icon.includes('.');
                content = isImg 
                    ? `<img src="${stats.icon}" class="w-full h-full object-cover">`
                    : `<div class="text-3xl">${stats.icon}</div>`;
                
                // สีขอบตามระดับ
                const rarityColors = { 'R': 'border-blue-500', 'SR': 'border-purple-500', 'UR': 'border-yellow-500', 'LEGEND': 'border-orange-500' };
                borderClass = `border-2 border-solid ${rarityColors[stats.rarity] || 'border-gray-500'}`;
                bgClass = 'bg-slate-800';
                
                if (stats.job) badge = `<div class="absolute -top-2 -right-2 bg-yellow-600 text-[8px] text-black font-bold px-1.5 py-0.5 rounded shadow">HERO</div>`;
            }
        }

        return `
            <div onclick="window.openArenaUnitSelector(${idx})" 
                 class="w-20 h-20 rounded-xl ${borderClass} ${bgClass} flex items-center justify-center relative cursor-pointer hover:scale-105 transition shadow-lg group">
                ${content}
                ${badge}
                <div class="absolute bottom-0 w-full text-[8px] text-center bg-black/60 text-gray-400 py-0.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition">Slot ${idx}</div>
            </div>
        `;
    };

    html += `<div class="flex flex-col gap-4 items-center">`;
    
    // Front Row Label
    html += `<div class="flex gap-4 items-center relative">
                <div class="absolute -left-16 text-[10px] text-gray-500 font-bold uppercase tracking-widest -rotate-90">Front Row</div>
                ${frontRow.map(i => renderSlot(i)).join('')}
             </div>`;
             
    // Back Row Label
    html += `<div class="flex gap-4 items-center relative">
                <div class="absolute -left-16 text-[10px] text-gray-500 font-bold uppercase tracking-widest -rotate-90">Back Row</div>
                ${backRow.map(i => renderSlot(i)).join('')}
             </div>`;
             
    html += `</div>`;

    return html;
}

// --------------------------------------------------------
// 📂 MODAL: UNIT SELECTOR (เลือกตัวลงทีม)
// --------------------------------------------------------
window.openArenaUnitSelector = (slotIndex) => {
    // ลบ Modal เก่า
    document.getElementById('arena-selector-modal')?.remove();

    // ดึงยูนิตทั้งหมด (Hero + Inventory)
    // 1. Active Hero
    const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId);
    
    // 2. Inventory Cards (ที่ไม่ซ้ำกับที่ลงไปแล้วในช่องอื่น)
    const currentDeck = getArenaDeck();
    const availableCards = playerData.inventory.filter(c => !currentDeck.includes(c.uid) || currentDeck[slotIndex] === c.uid);

    const modal = document.createElement('div');
    modal.id = 'arena-selector-modal';
    modal.className = "fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in";
    
    let html = `
        <div class="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-600 shadow-2xl flex flex-col max-h-[80vh]">
            <div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-2xl">
                <h3 class="text-xl font-bold text-white uppercase"><i class="fa-solid fa-users-gear text-yellow-500"></i> Select Unit for Slot ${slotIndex}</h3>
                <button onclick="document.getElementById('arena-selector-modal').remove()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            
            <div class="p-4 overflow-y-auto custom-scrollbar grid grid-cols-4 sm:grid-cols-5 gap-3">
                <div onclick="window.setArenaSlot(${slotIndex}, null)" class="aspect-square rounded-xl border-2 border-dashed border-red-500/50 bg-red-900/10 flex flex-col items-center justify-center cursor-pointer hover:bg-red-900/30 text-red-400 transition">
                    <i class="fa-solid fa-ban text-2xl mb-1"></i>
                    <span class="text-[10px] font-bold">REMOVE</span>
                </div>
    `;

    // Hero Card
    if(activeHero) {
        const stats = getHeroStats(activeHero);
        const isSelected = currentDeck.includes(activeHero.uid || activeHero.heroId);
        // ถ้าถูกเลือกในช่องอื่น ห้ามกด (Disabled)
        const isDisabled = isSelected && currentDeck[slotIndex] !== (activeHero.uid || activeHero.heroId);
        
        const isImg = stats.icon.includes('/') || stats.icon.includes('.');
        const content = isImg ? `<img src="${stats.icon}" class="w-full h-full object-cover">` : `<div class="text-4xl">${stats.icon}</div>`;

        html += `
            <div onclick="${isDisabled ? '' : `window.setArenaSlot(${slotIndex}, '${activeHero.uid || activeHero.heroId}')`}" 
                 class="aspect-square rounded-xl border-2 ${isDisabled ? 'border-gray-700 opacity-30 cursor-not-allowed' : 'border-yellow-500 cursor-pointer hover:scale-105'} bg-slate-800 relative overflow-hidden group shadow-lg">
                ${content}
                <div class="absolute top-0 right-0 bg-yellow-600 text-[8px] text-black font-bold px-1">HERO</div>
                ${isDisabled ? '<div class="absolute inset-0 bg-black/60 flex items-center justify-center font-bold text-[10px] text-white">IN USE</div>' : ''}
            </div>
        `;
    }

    // Inventory Cards
    availableCards.forEach(card => {
        const stats = getCardStats(card);
        const isImg = stats.icon.includes('/') || stats.icon.includes('.');
        const content = isImg ? `<img src="${stats.icon}" class="w-full h-full object-cover">` : `<div class="text-4xl">${stats.icon}</div>`;
        const rarityColor = { 'R': 'border-blue-500', 'SR': 'border-purple-500', 'UR': 'border-yellow-500' }[stats.rarity] || 'border-gray-600';

        html += `
            <div onclick="window.setArenaSlot(${slotIndex}, '${card.uid}')" 
                 class="aspect-square rounded-xl border-2 ${rarityColor} bg-slate-800 relative overflow-hidden cursor-pointer hover:scale-105 transition shadow-lg">
                ${content}
                <div class="absolute bottom-0 w-full bg-black/60 text-[8px] text-center text-white truncate px-1">${stats.name}</div>
                <div class="absolute top-0 right-0 bg-black/60 text-[8px] text-yellow-400 font-bold px-1">Lv.${stats.level}</div>
            </div>
        `;
    });

    html += `</div></div>`;
    modal.innerHTML = html;
    document.body.appendChild(modal);
};

// บันทึกการเลือก
window.setArenaSlot = (slotIndex, uid) => {
    const deck = getArenaDeck();
    
    // ถ้าเลือกตัวซ้ำ ให้สลับที่ (Swap) หรือลบตัวเก่าออก
    const existingIndex = deck.indexOf(uid);
    if (existingIndex !== -1 && uid !== null) {
        deck[existingIndex] = null; // เอาตัวเก่าออกจากที่เดิม
    }

    deck[slotIndex] = uid;
    playerData.arena.arenaDeck = deck;
    
    // สำคัญ: Sync ไปที่ Defense Deck ด้วย เพื่อให้คนอื่นตีเราเจอทีมนี้
    playerData.arena.defenseDeck = [...deck]; 
    
    saveGame();
    document.getElementById('arena-selector-modal')?.remove();
    renderArenaUI(); // รีเฟรชหน้าจอ
};

// เริ่มสู้
window.startPvPBattle = (botDataStr) => {
    if(playerData.arena.tickets <= 0) return showToast("No Arena Tickets left!", "error");

    const botData = JSON.parse(decodeURIComponent(botDataStr));
    
    // ส่ง Arena Deck ของเราไปสู้
    const myArenaDeck = getArenaDeck();
    
    // แปลง UID เป็น Object เต็มๆ เพื่อส่งให้ Battle System
    const myTeam = myArenaDeck.map(uid => {
        if(!uid) return null;
        if(uid.startsWith('h_') || uid === playerData.activeHeroId) {
            return playerData.heroes.find(h => (h.uid === uid) || (h.heroId === uid));
        } else {
            return playerData.inventory.find(c => c.uid === uid);
        }
    });

    import('./battle.js').then(Battle => {
        window.currentBattleTeam = myTeam; 
        Battle.startPvP(botData);
    });
};