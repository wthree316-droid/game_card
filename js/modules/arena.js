// js/modules/arena.js
import { playerData, saveGame } from '../core/state.js';
import { createNewCard, getCardStats, getHeroStats } from '../utils.js';
import { CARD_DATABASE, HERO_DATABASE } from '../core/config.js';
import { showToast } from './ui-notifications.js';

// ✅ นำเข้า API 
let API = null;
try {
    const module = await import('../core/api.js');
    API = module.API;
} catch (e) {
    console.warn("API module not found, switching to offline mode.");
}

// --- Configuration ---
const ARENA_SLOTS = 6; 
const HERO_FIXED_SLOT = 4; // 🔒 ล็อคฮีโร่ไว้ที่ช่อง
let tempEditingDeck = []; 

// Helper: คำนวณพลังรวม
function calculateTeamPower(deckArray) {
    let totalPower = 0;
    if (deckArray && Array.isArray(deckArray)) {
        deckArray.forEach(uid => {
            if (uid) {
                if(uid.startsWith('h_') || uid === playerData.activeHeroId) {
                    const hero = playerData.heroes.find(h => (h.uid === uid) || (h.heroId === uid));
                    if(hero) totalPower += getHeroStats(hero).power;
                } else {
                    const card = playerData.inventory.find(c => c.uid === uid);
                    if(card) totalPower += getCardStats(card).power;
                }
            }
        });
    }
    return totalPower;
}

// Helper: คำนวณอันดับ
function calculateMyRank(points) {
    if (points >= 5000) return 1;
    let rank = Math.floor((5000 - points) / 10) + 1;
    return Math.max(1, rank);
}

// ดึงคู่ต่อสู้
async function fetchOpponents(myPower) {
    if (API && API.getArenaOpponents) {
        try {
            const onlineOpponents = await API.getArenaOpponents(playerData.arena.rankPoints, myPower);
            if (onlineOpponents && onlineOpponents.length > 0) {
                return onlineOpponents.map(opp => {
                    if (opp.isBot && (!opp.deck || opp.deck.length === 0)) {
                        const difficulty = (opp.power / (myPower || 1500)) || 1.0;
                        opp.deck = generateBotDeck(difficulty);
                    }
                    return opp;
                });
            }
        } catch (err) {
            console.error("Failed to fetch online opponents:", err);
        }
    }
    return generateBotOpponents(myPower);
}

// สร้างบอท
function generateBotOpponents(currentPower) {
    const opponents = [];
    const basePower = currentPower > 0 ? currentPower : 1500;
    
    const botConfigs = [
        { rank: 1, name: "King Arthur", powerMult: 1.25 },
        { rank: 2, name: "Lancelot", powerMult: 1.15 },         
        { rank: 5, name: "Merlin Mage", powerMult: 1.05 },      
        { rank: 45, name: "Elite Guard", powerMult: 0.95 },     
        { rank: 120, name: "Gold Knight", powerMult: 0.85 },    
        { rank: 180, name: "Silver Soldier", powerMult: 0.7 }  
    ];

    botConfigs.forEach((cfg, idx) => {
        const randomJitter = Math.floor(Math.random() * 5); 
        const botPoints = Math.max(0, playerData.arena.rankPoints + (100 - cfg.rank) + randomJitter);
        
        opponents.push({
            id: `bot_${Date.now()}_${idx}`,
            name: cfg.name,
            isBot: true,
            rankPoints: botPoints,
            leaderboardRank: calculateMyRank(botPoints), 
            power: Math.floor(basePower * cfg.powerMult), 
            deck: generateBotDeck(cfg.powerMult)
        });
    });
    
    return opponents.sort((a, b) => a.leaderboardRank - b.leaderboardRank);
}

// ✅ ปรับปรุง Deck บอท: ให้บอทวางฮีโร่ที่ช่อง 1 เหมือนกัน
function generateBotDeck(difficulty) {
    const deck = new Array(ARENA_SLOTS).fill(null);
    const allCards = Object.keys(CARD_DATABASE);
    
    const botHero = JSON.parse(JSON.stringify(HERO_DATABASE['h001']));
    botHero.heroId = 'h001';
    botHero.level = Math.max(1, Math.floor(playerData.profile.level * difficulty));
    botHero.isLeader = true;
    
    // 🔥 บอทวางฮีโร่ที่ช่อง 1 (ตามกฎใหม่)
    deck[1] = botHero; 

    // สุ่มมินเนี่ยนใส่ช่องว่างที่เหลือ
    for(let i=0; i<ARENA_SLOTS; i++) {
        if (i === 1) continue; // ข้ามช่องฮีโร่
        
        const randId = allCards[Math.floor(Math.random() * allCards.length)];
        const card = createNewCard(randId);
        card.level = Math.max(1, Math.floor(playerData.profile.level * difficulty));
        card.stars = Math.floor(Math.random() * 3) + 1;
        deck[i] = card;
    }
    return deck;
}

// ✅ ปรับปรุง: ตรวจสอบและบังคับตำแหน่งฮีโร่เสมอ
function getArenaDeck() {
    // 1. ถ้ายังไม่มี Deck ให้สร้างใหม่
    if (!playerData.arena.arenaDeck || playerData.arena.arenaDeck.length !== ARENA_SLOTS) {
        playerData.arena.arenaDeck = new Array(ARENA_SLOTS).fill(null);
    }

    const deck = playerData.arena.arenaDeck;
    const activeHeroId = playerData.activeHeroId || playerData.heroes[0]?.heroId;
    const activeHeroUid = playerData.heroes.find(h => h.heroId === activeHeroId)?.uid || activeHeroId;

    // 2. 🛡️ กฎเหล็ก: ช่อง HERO_FIXED_SLOT ต้องเป็น Active Hero เท่านั้น
    if (deck[HERO_FIXED_SLOT] !== activeHeroUid) {
        // เคลียร์ฮีโร่ออกจาตำแหน่งอื่นก่อน (ถ้ามี)
        for(let i=0; i<ARENA_SLOTS; i++) {
            if(deck[i] === activeHeroUid) deck[i] = null;
        }
        // บังคับใส่ช่อง Fix
        deck[HERO_FIXED_SLOT] = activeHeroUid;
        saveGame();
    }

    return deck;
}

function getRankVisuals(rank) {
    if (rank === 1) return { bg: "bg-gradient-to-r from-yellow-700/80 to-yellow-900/80 border-yellow-400", icon: "🏆", text: "text-yellow-400", label: "CHAMPION", badge: "bg-yellow-500 text-black" };
    if (rank === 2) return { bg: "bg-gradient-to-r from-slate-400/80 to-slate-600/80 border-slate-300", icon: "🥈", text: "text-slate-300", label: "LEGEND", badge: "bg-slate-300 text-black" };
    if (rank === 3) return { bg: "bg-gradient-to-r from-orange-700/80 to-orange-900/80 border-orange-400", icon: "🥉", text: "text-orange-400", label: "WARLORD", badge: "bg-orange-400 text-black" };
    if (rank <= 10) return { bg: "bg-slate-800/80 border-blue-500/50", icon: rank, text: "text-blue-400", label: "ELITE", badge: "bg-blue-600 text-white" };
    if (rank <= 149) return { bg: "bg-slate-800/60 border-yellow-600/30", icon: rank, text: "text-yellow-600", label: "GOLD", badge: "bg-yellow-700/50 text-yellow-200" };
    if (rank <= 200) return { bg: "bg-slate-800/60 border-slate-500/30", icon: rank, text: "text-slate-400", label: "SILVER", badge: "bg-slate-600/50 text-slate-200" };
    return { bg: "bg-slate-900/50 border-white/5", icon: rank, text: "text-gray-500", label: "BRONZE", badge: "bg-gray-700 text-gray-400" };
}

export function init() {
    renderArenaUI();
}

async function renderArenaUI() {
    const container = document.getElementById('arena-container');
    if(!container) return;

    container.innerHTML = `<div class="flex items-center justify-center h-full text-2xl font-bold text-yellow-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-3"></i> Loading Arena...</div>`;

    const myDeck = getArenaDeck(); // ฟังก์ชันนี้จะ Auto-Fix ตำแหน่งฮีโร่ให้
    const myPower = calculateTeamPower(myDeck); 
    const opponents = await fetchOpponents(myPower);
    const myRank = calculateMyRank(playerData.arena.rankPoints);
    const myRankStyle = getRankVisuals(myRank);

    container.innerHTML = `
        <div class="p-4 max-w-6xl mx-auto pb-24 animate-fade-in flex flex-col gap-6">
            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden group">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition duration-700"><i class="fa-solid fa-trophy text-9xl text-yellow-500"></i></div>
                    <div class="relative z-10 flex items-center gap-6">
                        <div class="relative">
                            <div class="w-20 h-20 rounded-full border-4 ${myRankStyle.bg.split(' ')[2] || 'border-yellow-500'} shadow-[0_0_20px_rgba(234,179,8,0.4)] overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Player" class="w-full h-full bg-slate-700">
                            </div>
                            <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs font-black px-3 py-1 rounded-full border border-yellow-500 shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
                                <span class="text-yellow-400">#${myRank.toLocaleString()}</span>
                            </div>
                        </div>
                        <div>
                            <div class="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-1">My Rank Points</div>
                            <div class="text-4xl font-black text-white drop-shadow-md font-mono">${playerData.arena.rankPoints.toLocaleString()}</div>
                            <div class="text-gray-400 text-sm mt-1 flex items-center gap-2">
                                <i class="fa-solid fa-bolt text-yellow-400"></i> Power: ${myPower.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w-full md:w-1/3 bg-slate-900/80 rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
                    <div class="flex justify-between items-center mb-4">
                        <div class="text-gray-400 text-sm font-bold uppercase">Battle Tickets</div>
                        <div class="flex items-center gap-2 text-white font-mono text-xl font-bold">
                            <i class="fa-solid fa-ticket text-red-500 animate-pulse"></i> ${playerData.arena.tickets} / ${playerData.arena.maxTickets}
                        </div>
                    </div>
                    <button onclick="window.openTeamManager()" 
                        class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition flex items-center justify-center gap-2">
                        <i class="fa-solid fa-users-gear"></i> MANAGE TEAM
                    </button>
                </div>
            </div>

            <div class="bg-black/40 rounded-3xl border border-white/5 p-2 backdrop-blur-sm">
                <div class="flex justify-between items-center px-4 py-4">
                    <h3 class="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                        <i class="fa-solid fa-swords text-red-500"></i> Challengers
                    </h3>
                    <button onclick="window.renderArenaUI()" class="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-blue-400 flex items-center justify-center transition border border-white/10">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                </div>
                <div class="space-y-2">
                    ${opponents.map(renderOpponentRow).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderOpponentRow(bot) {
    const style = getRankVisuals(bot.leaderboardRank);
    const isBot = bot.isBot;
    const avatarUrl = isBot ? `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.id}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${bot.id}`;

    return `
        <div class="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 transition-all duration-300 hover:transform hover:scale-[1.01] hover:shadow-xl group ${style.bg} ${bot.leaderboardRank <= 3 ? 'h-24 md:h-28' : 'h-22'}">
            <div class="w-10 md:w-16 flex flex-col items-center justify-center flex-shrink-0">
                <div class="text-2xl md:text-4xl filter drop-shadow-lg ${style.text} italic">
                    ${isNaN(style.icon) ? style.icon : `<span class="font-black font-mono">#${bot.leaderboardRank}</span>`}
                </div>
            </div>
            <div class="relative flex-shrink-0">
                <div class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-900 border-2 border-white/20 overflow-hidden shadow-lg group-hover:border-yellow-400 transition">
                    <img src="${avatarUrl}" class="w-full h-full object-cover">
                </div>
                ${!isBot ? `<div class="absolute -bottom-1 -right-1 bg-blue-600 text-[8px] text-white px-1.5 rounded border border-white">REAL</div>` : ''}
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div class="flex items-center gap-2">
                    <span class="${style.badge} px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shadow-sm">${style.label}</span>
                    <h4 class="font-bold text-white text-sm md:text-lg truncate">${bot.name}</h4>
                </div>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm">
                    <div class="font-mono font-bold text-gray-300 flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded border border-white/5">
                        <i class="fa-solid fa-trophy text-yellow-500"></i> <span class="text-white">${bot.rankPoints.toLocaleString()}</span> RP
                    </div>
                    <div class="text-yellow-500 font-mono font-bold flex items-center gap-1">
                        <i class="fa-solid fa-bolt"></i> ${bot.power.toLocaleString()}
                    </div>
                </div>
            </div>
            <div class="flex-shrink-0 pl-2">
                <button onclick="window.startPvPBattle('${encodeURIComponent(JSON.stringify(bot))}')" 
                    class="w-10 h-10 md:w-auto md:px-5 md:h-12 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border-t border-red-400 rounded-xl shadow-lg shadow-red-900/50 flex items-center justify-center gap-2 text-white font-black transition-all active:scale-95 group-hover:animate-pulse-soft">
                    <span class="text-lg md:text-xl"><i class="fa-solid fa-swords"></i></span>
                    <span class="hidden md:inline uppercase text-xs md:text-sm tracking-wide">FIGHT</span>
                </button>
            </div>
            ${bot.leaderboardRank <= 3 ? `<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>` : ''}
        </div>
    `;
}

// ==========================================
// 🛠️ SMART TEAM MANAGER (Locked Hero)
// ==========================================

window.openTeamManager = () => {
    // โหลด Deck ปัจจุบัน (ซึ่ง getArenaDeck จะการันตีว่าฮีโร่อยู่ช่อง 1 แล้ว)
    tempEditingDeck = [...getArenaDeck()];
    renderTeamManagerModal();
};

function renderTeamManagerModal() {
    let modal = document.getElementById('team-manager-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'team-manager-modal';
        modal.className = "fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in";
        document.body.appendChild(modal);
    }

    // กรองการ์ดที่ยังไม่ถูกเลือก (Inventory Only)
    // ฮีโร่จะไม่ถูกแสดงใน Inventory นี้เพราะมันถูกล็อคอยู่บนบอร์ดแล้ว
    const availableCards = playerData.inventory.filter(c => !tempEditingDeck.includes(c.uid));
    availableCards.sort((a, b) => getCardStats(b).power - getCardStats(a).power);

    modal.innerHTML = `
        <div class="bg-slate-900 p-4 border-b border-white/10 flex justify-between items-center shadow-lg z-10">
            <h3 class="text-xl font-black text-white flex items-center gap-2">
                <i class="fa-solid fa-users-gear text-blue-500"></i> TEAM MANAGER
            </h3>
            <div class="flex gap-2">
                <button onclick="document.getElementById('team-manager-modal').remove()" class="px-4 py-2 rounded-lg bg-slate-800 text-gray-400 font-bold hover:text-white border border-white/5">CANCEL</button>
                <button onclick="window.saveTeamManager()" class="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-900/50 animate-pulse">SAVE TEAM</button>
            </div>
        </div>

        <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div class="w-full md:w-1/2 p-4 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 overflow-y-auto border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center">
                <div class="text-sm text-gray-400 font-bold uppercase mb-4 tracking-widest text-center">Current Formation</div>
                
                <div class="grid grid-cols-3 gap-3 md:gap-6 mb-8 w-full max-w-md">
                    <div class="col-span-3 text-center text-xs text-gray-500 font-bold mb-1">FRONT ROW</div>
                    ${[0, 1, 2].map(i => renderManagerSlot(i)).join('')}
                </div>
                <div class="grid grid-cols-3 gap-3 md:gap-6 w-full max-w-md">
                    <div class="col-span-3 text-center text-xs text-gray-500 font-bold mb-1">BACK ROW</div>
                    ${[3, 4, 5].map(i => renderManagerSlot(i)).join('')}
                </div>
            </div>

            <div class="w-full md:w-1/2 bg-slate-950 flex flex-col h-[50vh] md:h-auto">
                <div class="p-3 bg-slate-900/50 border-b border-white/5 text-xs font-bold text-gray-400 flex justify-between">
                    <span>AVAILABLE MINIONS</span>
                    <span>${availableCards.length} Found</span>
                </div>
                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-3 content-start">
                        ${renderManagerInventory(availableCards)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderManagerSlot(idx) {
    const uid = tempEditingDeck[idx];
    
    // 🔥 ถ้าเป็นช่อง Hero Fixed (ช่อง 1)
    if (idx === HERO_FIXED_SLOT) {
        // หา Active Hero มาแสดงเสมอ
        const activeHeroId = playerData.activeHeroId || playerData.heroes[0]?.heroId;
        const heroData = playerData.heroes.find(h => h.heroId === activeHeroId);
        
        if (heroData) {
            const stats = getHeroStats(heroData);
            const isImg = stats.icon.includes('/') || stats.icon.includes('.');
            return `
                <div class="relative aspect-square rounded-xl border-2 border-yellow-500 bg-slate-800 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                    <div class="absolute -top-2 -right-2 bg-yellow-600 text-[8px] text-black font-bold px-1.5 py-0.5 rounded shadow z-10">HERO</div>
                    ${isImg 
                        ? `<img src="${stats.icon}" class="w-full h-full object-cover rounded-lg">`
                        : `<div class="w-full h-full flex items-center justify-center text-3xl text-yellow-500">${stats.icon}</div>`
                    }
                    <div class="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <i class="fa-solid fa-lock text-white/50 text-xl"></i>
                    </div>
                    <div class="absolute bottom-0 w-full bg-yellow-900/80 text-[9px] text-yellow-100 text-center truncate px-1 font-bold">LOCKED</div>
                </div>
            `;
        }
    }

    // ช่องปกติ (ว่าง)
    if (!uid) {
        return `
            <div class="aspect-square rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/30 flex items-center justify-center text-slate-600">
                <div class="text-center">
                    <i class="fa-solid fa-plus text-2xl mb-1"></i>
                    <div class="text-[10px] font-bold">EMPTY</div>
                </div>
            </div>
        `;
    }

    // ช่องปกติ (มีมินเนี่ยน)
    const card = playerData.inventory.find(c => c.uid === uid);
    if (!card) return `<div class="aspect-square bg-red-900/50 flex items-center justify-center text-xs">Error</div>`;
    
    const stats = getCardStats(card);
    const isImg = stats.icon.includes('/') || stats.icon.includes('.');
    const rarityColors = { 'R': 'border-blue-500', 'SR': 'border-purple-500', 'UR': 'border-yellow-500', 'LEGEND': 'border-orange-500' };
    const borderClass = rarityColors[stats.rarity] || 'border-gray-500';

    return `
        <div onclick="window.managerRemoveUnit(${idx})" 
             class="relative aspect-square rounded-xl border-2 ${borderClass} bg-slate-800 cursor-pointer hover:bg-red-900/20 hover:border-red-500 transition group shadow-lg">
            ${isImg 
                ? `<img src="${stats.icon}" class="w-full h-full object-cover rounded-lg opacity-90 group-hover:opacity-50 transition">`
                : `<div class="w-full h-full flex items-center justify-center text-3xl opacity-90 group-hover:opacity-50">${stats.icon}</div>`
            }
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <i class="fa-solid fa-xmark text-3xl text-red-500 drop-shadow-lg"></i>
            </div>
            <div class="absolute bottom-0 w-full bg-black/60 text-[9px] text-white text-center truncate px-1 pointer-events-none">${stats.name}</div>
        </div>
    `;
}

function renderManagerInventory(cards) {
    let html = '';
    // ไม่ต้องเรนเดอร์ฮีโร่ใน Inventory แล้ว เพราะมันถูกล็อคบนบอร์ด
    
    cards.forEach(card => {
        const stats = getCardStats(card);
        const isImg = stats.icon.includes('/') || stats.icon.includes('.');
        const rarityColor = { 'R': 'border-blue-500', 'SR': 'border-purple-500', 'UR': 'border-yellow-500' }[stats.rarity] || 'border-gray-600';

        html += `
            <div onclick="window.managerAddUnit('${card.uid}')" 
                 class="aspect-square rounded-xl border-2 ${rarityColor} bg-slate-800 relative cursor-pointer hover:scale-105 transition shadow-lg overflow-hidden">
                ${isImg 
                    ? `<img src="${stats.icon}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center text-3xl">${stats.icon}</div>`
                }
                <div class="absolute bottom-0 w-full bg-black/60 text-[9px] text-white text-center truncate px-1">${stats.name}</div>
                <div class="absolute top-0 right-0 bg-black/60 text-[8px] text-yellow-400 font-bold px-1">Lv.${stats.level}</div>
            </div>
        `;
    });
    return html;
}

// Logic: ลบตัวออกจากทีม (ห้ามลบฮีโร่)
window.managerRemoveUnit = (idx) => {
    if (idx === HERO_FIXED_SLOT) {
        showToast("Leader Hero cannot be removed!", "error");
        return;
    }
    tempEditingDeck[idx] = null;
    renderTeamManagerModal(); 
};

// Logic: เพิ่มตัวใส่ทีม (ข้ามช่องฮีโร่)
window.managerAddUnit = (uid) => {
    const emptyIdx = tempEditingDeck.findIndex((slot, idx) => slot === null && idx !== HERO_FIXED_SLOT);
    
    if (emptyIdx === -1) {
        showToast("Team is Full! Remove a unit first.", "error");
        return;
    }

    tempEditingDeck[emptyIdx] = uid;
    renderTeamManagerModal(); 
};

window.saveTeamManager = () => {
    playerData.arena.arenaDeck = [...tempEditingDeck];
    playerData.arena.defenseDeck = [...tempEditingDeck];

    if (API && API.updateDefenseDeck) {
        const fullDeckData = tempEditingDeck.map(uid => {
            if(!uid) return null;
            if(uid.startsWith('h_') || uid === playerData.activeHeroId) {
                return getHeroStats(playerData.heroes.find(h => (h.uid === uid) || (h.heroId === uid)));
            } else {
                return getCardStats(playerData.inventory.find(c => c.uid === uid));
            }
        });
        API.updateDefenseDeck(fullDeckData).catch(console.error);
    }

    saveGame();
    document.getElementById('team-manager-modal').remove(); 
    showToast("Defense Team Saved!", "success");
    renderArenaUI(); 
};

window.startPvPBattle = (botDataStr) => {
    if(playerData.arena.tickets <= 0) return showToast("No Arena Tickets left!", "error");
    const botData = JSON.parse(decodeURIComponent(botDataStr));
    const myArenaDeck = getArenaDeck();
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

window.renderArenaUI = renderArenaUI;
