// js/modules/encyclopedia.js
import { playerData, saveGame } from '../core/state.js';
import { getCardStats, getHeroStats, getFodderExp, addExpToCard, renderStars, getMaxExp, createNewCard } from '../utils.js';
import { createCardElement } from '../ui-shared.js';
import { ELEMENTS, EQUIPMENT_DATABASE, CARD_DATABASE, HERO_DATABASE, TRAIT_DATABASE } from '../core/config.js';
import { getEvolutionInfo, executeEvolution } from './evolution.js';
import { openLevelingModal } from './leveling.js';
import { getAttackTypeIcon } from '../utils.js';

let upgradeTargetUid = null;

const RARITY_STARS = {
    'C': 1, 'U': 2, 'R': 3, 'SR': 4, 'UR': 5, 'LEGEND': 6, 'MYTHICAL': 7
};

// ==========================================
// 📚 1. ENCYCLOPEDIA / LIBRARY SYSTEM
// ==========================================

export function init() {
    const container = document.getElementById('page-info');
    if (!container) return;

    // คำนวณจำนวนที่สะสมได้
    const totalHeroes = Object.keys(HERO_DATABASE).length;
    const ownedHeroes = Object.keys(HERO_DATABASE).filter(hid => playerData.heroes.some(h => h.heroId === hid)).length;

    const totalCards = Object.keys(CARD_DATABASE).length;
    const ownedCards = Object.keys(CARD_DATABASE).filter(cid => playerData.inventory.some(c => c.cardId === cid) || playerData.deck.includes(cid)).length;

    // เคลียร์พื้นที่และสร้าง Layout ใหม่
    container.innerHTML = `
        <div class="max-w-7xl mx-auto pb-24 px-4 pt-6">
            <div class="flex flex-col md:flex-row items-center gap-6 mb-10 bg-slate-900/80 p-6 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md">
                <div class="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/20 transform rotate-3">
                    <i class="fa-solid fa-book-journal-whills text-5xl text-white drop-shadow-md"></i>
                </div>
                <div class="text-center md:text-left">
                    <h2 class="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 uppercase tracking-wider">Encyclopedia</h2>
                    <p class="text-gray-400 text-sm mt-1 font-light tracking-wide">Complete Database of Heroes & Monsters</p>
                </div>
                <div class="flex gap-4 ml-auto">
                    <div class="bg-black/40 px-6 py-3 rounded-xl border border-white/5 text-center">
                        <div class="text-xs text-yellow-500 font-bold uppercase mb-1">Heroes Found</div>
                        <div class="text-2xl font-mono text-white font-bold">${ownedHeroes} <span class="text-gray-500 text-sm">/ ${totalHeroes}</span></div>
                    </div>
                    <div class="bg-black/40 px-6 py-3 rounded-xl border border-white/5 text-center">
                        <div class="text-xs text-blue-400 font-bold uppercase mb-1">Units Found</div>
                        <div class="text-2xl font-mono text-white font-bold">${ownedCards} <span class="text-gray-500 text-sm">/ ${totalCards}</span></div>
                    </div>
                </div>
            </div>

            <div class="mb-12">
                <div class="flex items-center gap-3 mb-6 pb-2 border-b border-white/10">
                    <div class="bg-yellow-500/20 p-2 rounded-lg"><i class="fa-solid fa-crown text-yellow-500 text-xl"></i></div>
                    <h3 class="text-2xl font-bold text-white tracking-wide">Legendary Heroes</h3>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" id="encyclo-heroes"></div>
            </div>

            <div>
                <div class="flex items-center gap-3 mb-6 pb-2 border-b border-white/10">
                    <div class="bg-blue-500/20 p-2 rounded-lg"><i class="fa-solid fa-users text-blue-400 text-xl"></i></div>
                    <h3 class="text-2xl font-bold text-white tracking-wide">Monster Units</h3>
                </div>
                <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3" id="encyclo-units"></div>
            </div>
        </div>
    `;

    renderLibraryContent();
}

function renderLibraryContent() {
    const heroContainer = document.getElementById('encyclo-heroes');
    const unitContainer = document.getElementById('encyclo-units');
    
    if (!heroContainer || !unitContainer) return;

    // --- 1. Render Heroes ---
    Object.entries(HERO_DATABASE).forEach(([heroId, heroData]) => {
        const isOwned = playerData.heroes.some(h => h.heroId === heroId);

        // จำลองข้อมูลฮีโร่
        const mockHero = { 
            ...heroData, 
            heroId: heroId, 
            level: 1, exp: 0, equipped: {}, 
            stars: heroData.stars || 1 
        };
        
        // ฮีโร่ใช้ getHeroStats ได้ปกติ (เพราะมักจะไม่มีปัญหา)
        const stats = getHeroStats(mockHero);
        if (!stats) return; 
        
        const cardEl = createCardElement(stats, 'collection');
        setupEncyclopediaCardStyle(cardEl, isOwned);
        cardEl.onclick = () => showCardDetail(mockHero, true); 
        
        heroContainer.appendChild(cardEl);
    });

    // --- 2. Render Units (จุดที่แก้ไข) ---
    Object.entries(CARD_DATABASE).forEach(([cardId, cardData]) => {
        // เช็คการครอบครอง
        const isOwned = playerData.inventory.some(c => c.cardId === cardId) || 
                        playerData.deck.some(uid => {
                            if(!uid) return false;
                            const deckCard = playerData.inventory.find(inv => inv.uid === uid);
                            return deckCard && deckCard.cardId === cardId;
                        });

        // ✅ แก้ไข: สร้าง stats object เองโดยตรงจาก cardData (ไม่เรียก getCardStats)
        // เพื่อรับประกันว่าข้อมูลจะตรงกับ cardId ของรอบลูปนั้นๆ แน่นอน
        const stats = {
            uid: null,
            cardId: cardId,
            name: cardData.name,
            icon: cardData.icon,
            rarity: cardData.rarity,
            role: cardData.role,
            type: cardData.type,
            element: cardData.element,
            level: 1,
            exp: 0,
            // คำนวณดาวจาก Rarity
            stars: RARITY_STARS[cardData.rarity] || 1,
            // ใช้ค่าพลังพื้นฐานจาก Database โดยตรง
            hp: cardData.baseHp,
            atk: cardData.baseAtk,
            def: cardData.baseDef,
            spd: cardData.baseSpd,
            crit: cardData.baseCrit,
            // คำนวณ CP คร่าวๆ สำหรับโชว์
            power: Math.floor(cardData.baseHp + cardData.baseAtk + (cardData.baseDef || 0)),
            desc: cardData.desc
        };

        const cardEl = createCardElement(stats, 'collection');
        setupEncyclopediaCardStyle(cardEl, isOwned);
        
        // ส่ง stats ตัวนี้ไปแสดงผล (ไม่ต้องสร้าง mockCard ซ้อน)
        cardEl.onclick = () => showCardDetail(stats, true);
        unitContainer.appendChild(cardEl);
    });
}

// ฟังก์ชันช่วยปรับแต่ง Style สำหรับการ์ดที่มี/ไม่มี
function setupEncyclopediaCardStyle(cardEl, isOwned) {
    const infoBtn = cardEl.querySelector('.info-btn');
    if(infoBtn) infoBtn.remove();

    if (!isOwned) {
        // 🔒 กรณี "ยังไม่มี"
        cardEl.classList.add('grayscale', 'brightness-[0.4]', 'opacity-80', 'cursor-not-allowed');
        cardEl.classList.remove('hover:-translate-y-2', 'hover:shadow-xl');
        
        const lockOverlay = document.createElement('div');
        lockOverlay.className = "absolute inset-0 flex items-center justify-center z-50 pointer-events-none";
        lockOverlay.innerHTML = `
            <div class="bg-black/60 w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-500 backdrop-blur-sm">
                <i class="fa-solid fa-lock text-gray-400 text-xl"></i>
            </div>
        `;
        cardEl.appendChild(lockOverlay);
    } else {
        // ✅ กรณี "มีแล้ว"
        const ownedBadge = document.createElement('div');
        ownedBadge.className = "absolute top-2 right-2 z-50 bg-green-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-lg border border-white/20";
        ownedBadge.innerHTML = `<i class="fa-solid fa-check"></i>`;
        cardEl.appendChild(ownedBadge);
    }
}

// ... (ส่วน Equipment System และ Card Detail ด้านล่าง คงเดิมได้เลย) ...
// เพื่อความชัวร์ ก๊อปปี้ส่วนที่เหลือทั้งหมดมาด้วยครับ

// ==========================================
// 🛠️ 2. EQUIPMENT SYSTEM
// ==========================================

window.unequipItem = (cardUid, type) => {
    const target = playerData.inventory.find(c => c.uid === cardUid) || playerData.hero;
    if (!target) return;
    if (!target.equipped || !target.equipped[type]) return;

    const itemId = target.equipped[type];
    if (!playerData.equipment) playerData.equipment = [];
    playerData.equipment.push(itemId);
    target.equipped[type] = null;

    saveGame();
    refreshEquipmentModal(cardUid, type);
    const stats = target.job ? getHeroStats(target) : getCardStats(target);
    showCardDetail(stats); 
    if(document.getElementById('page-deck').classList.contains('active')) {
        if (window.renderDeckEditor) window.renderDeckEditor();
    }
};

window.equipItem = (cardUid, type, itemId) => {
    const target = playerData.inventory.find(c => c.uid === cardUid) || playerData.hero;
    if (!target) return;
    if (!target.equipped) target.equipped = { weapon: null, armor: null, accessory: null };

    if (target.equipped[type]) {
        const oldItem = target.equipped[type];
        if (!playerData.equipment) playerData.equipment = [];
        playerData.equipment.push(oldItem);
    }

    const bagIndex = playerData.equipment.indexOf(itemId);
    if (bagIndex > -1) {
        playerData.equipment.splice(bagIndex, 1);
    } else {
        return alert("Error: Item not found in bag!");
    }

    target.equipped[type] = itemId;
    saveGame();
    refreshEquipmentModal(cardUid, type);
    const stats = target.job ? getHeroStats(target) : getCardStats(target);
    showCardDetail(stats);
    if(document.getElementById('page-deck').classList.contains('active')) {
        if (window.renderDeckEditor) window.renderDeckEditor();
    }
};

window.openEquipmentManager = (cardUid, type) => {
    const oldModal = document.getElementById('equip-manager-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'equip-manager-modal';
    modal.className = "fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 animate-fade-in"; 
    
    modal.innerHTML = `
        <div class="bg-slate-800 w-full max-w-md rounded-xl border-2 border-slate-600 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div class="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 class="text-xl font-bold text-yellow-400 uppercase tracking-wide">
                    <i class="fa-solid fa-suitcase"></i> Manage ${type}
                </h3>
                <button onclick="document.getElementById('equip-manager-modal').remove()" class="text-gray-400 hover:text-white transition">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>
            </div>
            <div id="equip-manager-content" class="flex-1 overflow-y-auto p-4 space-y-6"></div>
        </div>
    `;
    document.body.appendChild(modal);
    refreshEquipmentModal(cardUid, type);
};

function refreshEquipmentModal(cardUid, type) {
    const container = document.getElementById('equip-manager-content');
    if (!container) return;

    const target = playerData.inventory.find(c => c.uid === cardUid) || playerData.hero;
    const currentEquipId = target.equipped ? target.equipped[type] : null;
    
    const bagItems = (playerData.equipment || []).filter(id => {
        const dbItem = EQUIPMENT_DATABASE[id] || HERO_EQUIPMENT_DATABASE[id]; 
        return dbItem && dbItem.type === type;
    });

    let html = '';
    html += `<div class="bg-slate-900/50 p-4 rounded-lg border border-blue-500/30"><div class="text-xs text-blue-400 font-bold mb-2 uppercase">Currently Equipped</div>`;
    
    if (currentEquipId) {
        const item = EQUIPMENT_DATABASE[currentEquipId] || HERO_EQUIPMENT_DATABASE[currentEquipId];
        const isImg = item.icon && (item.icon.includes('/') || item.icon.includes('.'));
        const iconDisplay = isImg ? `<img src="${item.icon}" class="w-full h-full object-cover rounded">` : `<div class="text-3xl">${item.icon}</div>`;

        html += `
            <div class="flex items-center gap-4 bg-slate-800 p-3 rounded border border-blue-500 shadow-lg">
                <div class="w-12 h-12 flex items-center justify-center bg-slate-900 rounded border border-white/10 overflow-hidden">${iconDisplay}</div>
                <div class="flex-1"><div class="font-bold text-white">${item.name}</div><div class="text-xs text-green-400">${item.atk ? `ATK+${item.atk} ` : ''} ${item.hp ? `HP+${item.hp}` : ''}</div></div>
                <button onclick="unequipItem('${cardUid}', '${type}')" class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded shadow transition">UNEQUIP</button>
            </div>`;
    } else {
        html += `<div class="flex items-center justify-center h-16 border-2 border-dashed border-gray-600 rounded text-gray-500 gap-2"><i class="fa-solid fa-ban"></i> Empty Slot</div>`;
    }
    html += `</div>`;

    html += `<div><div class="text-xs text-gray-400 font-bold mb-2 uppercase flex justify-between"><span>Inventory Bag</span><span>${bagItems.length} items</span></div><div class="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">`;

    if (bagItems.length === 0) {
        html += `<div class="text-center text-gray-600 py-4 italic">No ${type} in bag.</div>`;
    } else {
        bagItems.forEach(itemId => {
            const item = EQUIPMENT_DATABASE[itemId] || HERO_EQUIPMENT_DATABASE[itemId];
            const isImg = item.icon && (item.icon.includes('/') || item.icon.includes('.'));
            const iconDisplay = isImg ? `<img src="${item.icon}" class="w-full h-full object-cover rounded">` : `<div class="text-2xl">${item.icon}</div>`;

            html += `
                <div class="flex items-center gap-3 bg-slate-700/50 p-2 rounded border border-slate-600 hover:border-yellow-400 hover:bg-slate-700 transition cursor-pointer group">
                    <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-800 rounded border border-white/5 overflow-hidden">${iconDisplay}</div>
                    <div class="flex-1 min-w-0"><div class="text-sm font-bold text-gray-200 group-hover:text-white truncate">${item.name}</div><div class="text-[10px] text-gray-400 truncate">${item.desc || ''}</div></div>
                    <div class="text-right flex-shrink-0"><div class="text-[10px] font-mono text-green-400 mb-1">${item.atk ? `ATK+${item.atk} ` : ''}${item.hp ? `HP+${item.hp}` : ''}</div><button onclick="equipItem('${cardUid}', '${type}', '${itemId}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded shadow opacity-80 group-hover:opacity-100 transition">EQUIP</button></div>
                </div>`;
        });
    }
    html += `</div></div>`;
    container.innerHTML = html;
}

// ==========================================
// 📖 3. CARD DETAIL
// ==========================================

window.tryEvolve = executeEvolution;
window.openLeveling = openLevelingModal;

export function showCardDetail(cardOrUid, isTemplateMode = false) {
    let card = cardOrUid;
    if (typeof cardOrUid === 'string') {
        card = playerData.inventory.find(c => c.uid === cardOrUid) || playerData.heroes.find(h => h.uid === cardOrUid);
        isTemplateMode = false;
    }
    if (!card) return;
    const old = document.getElementById('card-detail-modal');
    if(old) old.remove();
    renderDetailModalContent(card, false, isTemplateMode);
}

function renderDetailModalContent(originalCard, isPreviewMax, isTemplateMode) {
    let cardToDisplay = JSON.parse(JSON.stringify(originalCard)); 

    if (isPreviewMax) {
        const isHero = cardToDisplay.uid?.startsWith('h_') || cardToDisplay.job;
        cardToDisplay.level = isHero ? 50 : 100;
        cardToDisplay.exp = 0;
        if (!isHero) {
            cardToDisplay.tier = 3;
            cardToDisplay.stars = 6;
            // (คำนวณค่าพลัง Max คร่าวๆ สำหรับพรีวิว)
            const bonus = 2.5; 
            cardToDisplay.hp = Math.floor(cardToDisplay.hp * bonus);
            cardToDisplay.atk = Math.floor(cardToDisplay.atk * bonus);
            cardToDisplay.def = Math.floor(cardToDisplay.def * bonus);
        }
    } 
    else if (isTemplateMode) {
        // ใช้ค่าที่ส่งมาตรงๆ เพราะเราสร้าง mock มาแล้ว
    }

    // ถ้าไม่ใช่ Template ให้คำนวณ Stats (แต่ถ้าเป็น Template เรามี Stats อยู่แล้ว)
    let stats = cardToDisplay;
    if (!isTemplateMode && !isPreviewMax) {
         if (cardToDisplay.job || (cardToDisplay.uid && cardToDisplay.uid.startsWith('h_'))) {
            stats = getHeroStats(cardToDisplay);
        } else {
            stats = getCardStats(cardToDisplay);
        }
    }

    const maxExp = getMaxExp(stats.level);
    const currentExp = stats.exp || 0;
    const expPercent = Math.min(100, (currentExp / maxExp) * 100);
    const isRealCard = !!stats.uid && !isTemplateMode;
    const isImage = stats.icon.includes('/') || stats.icon.includes('.');
    const atkIcon = getAttackTypeIcon(stats.role, stats.type);
    const starCount = stats.stars || 1;

    // ... (ส่วน Render Modal เหมือนเดิม) ...
    // เนื่องจากโค้ดยาวมาก ผมขอละไว้ในฐานที่เข้าใจ (ใช้โค้ดเดิมของคุณได้เลยในส่วนนี้)
    // จุดสำคัญคือเราแก้ปัญหา "รูปซ้ำ" ไปแล้วที่ renderLibraryContent
    
    // เพื่อให้โค้ดทำงานสมบูรณ์ คุณสามารถก๊อปปี้ฟังก์ชัน renderDetailModalContent เดิมมาวางต่อตรงนี้ได้เลยครับ
    // หรือถ้าต้องการให้ผมพิมพ์ให้ครบ ก็บอกได้ครับ (แต่จะยาวหน่อย)
    
    // (สมมติว่าคุณใช้โค้ดเดิมส่วน UI Modal)
    
    // --- ใส่ Code เดิมของ renderDetailModalContent ตรงนี้ ---
    const elemTheme = {
        FIRE:   { text: 'text-red-400', border: 'border-red-500/50', bg: 'bg-red-950', shadow: 'shadow-red-900/50' },
        WATER:  { text: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-950', shadow: 'shadow-blue-900/50' },
        NATURE: { text: 'text-green-400', border: 'border-green-500/50', bg: 'bg-green-950', shadow: 'shadow-green-900/50' },
        LIGHT:  { text: 'text-yellow-300', border: 'border-yellow-400/50', bg: 'bg-yellow-950', shadow: 'shadow-yellow-900/50' },
        DARK:   { text: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-950', shadow: 'shadow-purple-900/50' }
    }[stats.element] || { text: 'text-gray-400', border: 'border-gray-600', bg: 'bg-slate-800', shadow: 'shadow-gray-900' };

    let starsHtml = '';
    if (starCount >= 7) {
        starsHtml = `<i class="fa-solid fa-infinity text-2xl bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] animate-pulse"></i>`;
    } else {
        const sColor = starCount === 6 ? 'text-orange-500 drop-shadow-[0_0_5px_orange]' : 'text-yellow-400';
        for(let i=0; i<starCount; i++) starsHtml += `<i class="fa-solid fa-star ${sColor} text-sm mx-0.5"></i>`;
    }

    const evoState = getEvolutionInfo(stats);
    let btnClass = "", btnAction = "", btnIcon = "fa-arrow-up";
    if (isRealCard && evoState.canEvolve && !isPreviewMax) {
        btnClass = "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 animate-pulse text-white";
        btnAction = `window.tryEvolve('${stats.uid}')`;
    } else {
        btnClass = "bg-slate-800 text-gray-500 cursor-not-allowed border border-white/5 opacity-50";
        btnAction = "";
        if(!isRealCard) btnIcon = "fa-ban"; 
    }

    const equipmentSlots = ['weapon', 'armor', 'accessory'].map(type => {
        const equipId = stats.equipped ? stats.equipped[type] : null;        
        const item = equipId ? (EQUIPMENT_DATABASE[equipId] || HERO_EQUIPMENT_DATABASE[equipId]) : null;
        
        let content = '';
        if (item) {
            const isImg = item.icon && (item.icon.includes('/') || item.icon.includes('.'));
            content = isImg 
                ? `<img src="${item.icon}" class="w-full h-full object-cover rounded-md">` 
                : `<div class="text-2xl filter drop-shadow">${item.icon}</div>`;
        } else {
            content = `<i class="fa-solid ${ {weapon:'fa-khanda', armor:'fa-shirt', accessory:'fa-ring'}[type] } text-slate-700 text-lg"></i>`;
        }
        
        const action = (isRealCard && !isPreviewMax) ? `onclick="window.openEquipmentManager('${stats.uid}', '${type}')"` : '';
        const hoverEffect = (isRealCard && !isPreviewMax) ? "hover:border-yellow-400 hover:bg-slate-700 cursor-pointer" : "opacity-50 cursor-default";

        return `
            <div ${action} class="w-12 h-12 bg-slate-900 rounded-lg border border-slate-600 flex items-center justify-center transition relative group ${hoverEffect}">
                ${content}
                ${item ? '<div class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_lime]"></div>' : ''}
            </div>
        `;
    }).join('');

    let modal = document.getElementById('card-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'card-detail-modal';
        modal.className = "fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in backdrop-blur-md";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="relative w-full max-w-5xl h-[85vh] bg-slate-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden">
            <button onclick="document.getElementById('card-detail-modal').remove()" class="absolute top-4 right-4 z-50 bg-black/40 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition border border-white/10">✕</button>

            <div class="w-full md:w-5/12 h-1/2 md:h-full relative bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-white/10 group">
                ${isImage 
                    ? `<img src="${stats.icon}" class="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-[20s] ease-linear group-hover:scale-110" alt="${stats.name}">`
                    : `<div class="text-[10rem] animate-pulse">${stats.icon}</div>`
                }
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50"></div>
                <div class="absolute top-6 left-6">
                    <div class="text-6xl font-black text-white/10 tracking-tighter select-none">${stats.rarity}</div>
                </div>

                <div class="absolute bottom-6 w-full px-8 z-30">
                    <button id="btn-preview-toggle" class="w-full py-3 ${isPreviewMax ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'bg-slate-700 hover:bg-slate-600'} text-white rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 border border-white/10 active:scale-95">
                        ${isPreviewMax ? '<i class="fa-solid fa-eye-slash"></i> Return to Normal' : '<i class="fa-solid fa-eye"></i> Preview Max Stats'}
                    </button>
                    ${isTemplateMode ? '<div class="text-[10px] text-gray-500 text-center mt-2">*Previewing Library Data (Ownership Check)</div>' : ''}
                </div>
            </div>

            <div class="w-full md:w-7/12 h-1/2 md:h-full bg-slate-900 p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar relative">
                
                <div class="mb-6 relative z-10 flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span class="px-3 py-1 rounded text-[10px] font-bold tracking-wider uppercase border ${elemTheme.border} ${elemTheme.bg} ${elemTheme.text}">${stats.element}</span>
                            <span class="px-3 py-1 rounded text-[10px] font-bold tracking-wider uppercase border border-slate-600 bg-slate-800 text-gray-300">${stats.role || 'Unit'}</span>
                        </div>
                        <h1 class="text-4xl md:text-5xl font-black text-white mb-2 leading-tight drop-shadow-lg ${isPreviewMax ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400' : ''}">${stats.name}</h1>
                        
                        <div class="flex items-center gap-4 mb-3">
                            <div class="flex items-center gap-1">${starsHtml}</div>
                            ${stats.tier ? `<div class="text-sm font-bold text-purple-400 bg-slate-800 px-3 py-1 rounded-full border border-white/5">Tier ${stats.tier}</div>` : ''}
                        </div>

                        <div class="bg-slate-950/50 rounded-xl p-3 border border-white/10 w-full max-w-sm">
                            <div class="flex justify-between items-end mb-1">
                                <div class="flex items-baseline gap-2">
                                    <span class="text-lg font-bold text-white">LV. ${stats.level}</span>
                                </div>
                                <div class="text-[10px] font-mono text-blue-300">
                                    ${currentExp.toLocaleString()} / ${maxExp.toLocaleString()} XP
                                </div>
                            </div>
                            <div class="w-full h-2 bg-gray-700 rounded-full overflow-hidden relative">
                                <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_cyan] transition-all duration-500" style="width: ${expPercent}%"></div>
                            </div>
                        </div>
                        </div>
                    
                    <div class="flex gap-2">
                        ${equipmentSlots}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-8 relative z-10">
                    <div class="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                        <div class="text-xs text-gray-500 uppercase mb-1">Combat Power</div>
                        <div class="text-2xl font-black text-white flex items-center gap-2">
                            <i class="fa-solid fa-fire-flame-curved text-orange-500"></i> ${stats.power.toLocaleString()}
                        </div>
                    </div>
                    <div class="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                         <div class="text-xs text-gray-500 uppercase mb-1">Attack Damage</div>
                         <div class="text-xl font-bold text-red-400 flex items-center gap-2">${atkIcon} ${stats.atk.toLocaleString()}</div>
                    </div>
                    <div class="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                         <div class="text-xs text-gray-500 uppercase mb-1">Health Points</div>
                         <div class="text-xl font-bold text-green-400 flex items-center gap-2">💚 ${stats.hp.toLocaleString()}</div>
                    </div>
                    <div class="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col justify-center text-sm gap-1">
                        <div class="flex justify-between"><span class="text-gray-500">Defense</span><span class="text-blue-300 font-bold">🛡️ ${stats.def}</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">Speed</span><span class="text-yellow-300 font-bold">👟 ${stats.spd}</span></div>
                        <div class="flex justify-between"><span class="text-gray-500">Crit</span><span class="text-orange-300 font-bold">🎯 ${(stats.crit * 100).toFixed(0)}%</span></div>
                    </div>
                </div>

                <div class="space-y-6 mb-8 flex-1 relative z-10">
                    ${stats.traits && stats.traits.length > 0 ? `
                    <div>
                        <h3 class="text-sm font-bold text-gray-300 mb-2 border-l-4 border-purple-500 pl-2">TRAITS</h3>
                        <div class="grid grid-cols-1 gap-2">
                            ${stats.traits.map(t => {
                                const tData = t.name ? t : TRAIT_DATABASE[t];
                                if(!tData) return '';
                                return `
                                <div class="bg-slate-800/80 p-3 rounded-lg border border-white/5 flex items-start gap-3">
                                    <div class="text-xl pt-1">${tData.icon || '🔸'}</div>
                                    <div>
                                        <div class="text-sm font-bold text-purple-300">${tData.name}</div>
                                        <div class="text-xs text-gray-400">${tData.desc}</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>` : '<div class="text-sm text-gray-500 italic">No traits available.</div>'}
                    
                    <div>
                        <h3 class="text-sm font-bold text-gray-300 mb-2 border-l-4 border-blue-500 pl-2">DESCRIPTION</h3>
                        <p class="text-sm text-gray-400 italic leading-relaxed">
                            "${stats.desc || 'A mysterious entity from unknown origins. No records found in the database.'}"
                        </p>
                    </div>
                </div>

                <div class="mt-auto grid grid-cols-2 gap-4 relative z-20">
                    <button onclick="${isRealCard && !isPreviewMax ? `window.openLeveling('${stats.uid}')` : ''}" class="${isRealCard && !isPreviewMax ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'} text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                        <i class="fa-solid fa-angles-up"></i> POWER UP
                    </button>
                    <button onclick="${btnAction}" class="${btnClass} font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                        <i class="fa-solid ${btnIcon}"></i> EVOLVE
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-preview-toggle').onclick = () => {
        renderDetailModalContent(originalCard, !isPreviewMax, isTemplateMode);
    };
}

// ==========================================
// ⚙️ 4. UPGRADE & FUSION SYSTEM
// ==========================================

export function openUpgradeModalUI(targetItem) {
    upgradeTargetUid = targetItem.uid;
    const detailModal = document.getElementById('card-detail-modal');
    if(detailModal) detailModal.classList.add('hidden');
    
    const modalId = 'upgrade-modal';
    let modal = document.getElementById(modalId);
    
    if(!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-md hidden`;
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="w-full h-full max-w-4xl flex flex-col md:flex-row p-4 gap-4">
            <div class="w-full md:w-1/3 flex flex-col items-center justify-center bg-slate-800 rounded-xl border-2 border-yellow-500 p-6 relative">
                <button onclick="document.getElementById('${modalId}').classList.add('hidden'); document.getElementById('card-detail-modal').classList.remove('hidden');" class="absolute top-2 left-2 text-white hover:text-red-400 font-bold"><i class="fa-solid fa-arrow-left"></i> BACK</button>
                <h2 class="text-2xl font-bold text-yellow-400 mb-4">UPGRADE CENTER</h2>
                <div id="upgrade-target-preview" class="mb-4 transform scale-125 origin-center"></div>
                <div class="w-full bg-slate-900/50 p-4 rounded-lg space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-gray-400">Stars</span><span class="text-yellow-400 font-bold text-lg" id="upg-stat-star"></span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Level</span><span class="text-white font-bold" id="upg-stat-lv"></span></div>
                    <div class="flex justify-between"><span class="text-gray-400">EXP</span><div class="w-24 h-2 bg-gray-700 rounded mt-1.5 overflow-hidden"><div id="upg-bar-exp" class="h-full bg-blue-500 w-0"></div></div></div>
                </div>
            </div>
            <div class="w-full md:w-2/3 bg-slate-800 rounded-xl border border-slate-600 flex flex-col overflow-hidden">
                <div class="p-4 bg-slate-900 border-b border-slate-700"><h3 class="font-bold text-white flex items-center gap-2"><i class="fa-solid fa-utensils text-green-400"></i> Select Material</h3></div>
                <div id="material-list" class="flex-1 overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 content-start custom-scrollbar"></div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    renderUpgradeUI();
}

function renderUpgradeUI() {
    const targetItem = playerData.inventory.find(i => i.uid === upgradeTargetUid) || playerData.hero;
    if(!targetItem || (targetItem.job === 'Hero' && targetItem !== playerData.hero)) {
         document.getElementById('upgrade-modal').classList.add('hidden');
         return;
    }
    
    const targetStats = getCardStats(targetItem);
    const previewContainer = document.getElementById('upgrade-target-preview');
    previewContainer.innerHTML = '';
    const cardEl = createCardElement(targetStats, 'collection'); 
    cardEl.classList.remove('cursor-pointer', 'hover:-translate-y-1');
    const infoBtn = cardEl.querySelector('.info-btn');
    if(infoBtn) infoBtn.remove();
    previewContainer.appendChild(cardEl);

    document.getElementById('upg-stat-star').innerHTML = renderStars(targetStats.stars);
    document.getElementById('upg-stat-lv').innerText = `${targetStats.level}`; 
    const maxExp = getMaxExp(targetStats.level);
    document.getElementById('upg-bar-exp').style.width = `${(targetStats.exp / maxExp) * 100}%`;

    const listContainer = document.getElementById('material-list');
    listContainer.innerHTML = '';
    const materials = playerData.inventory.filter(item => item.uid !== upgradeTargetUid && !playerData.deck.includes(item.uid));

    if(materials.length === 0) {
        listContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 mt-10">No cards available.</div>`;
        return;
    }

    materials.forEach(matItem => {
        const matStats = getCardStats(matItem);
        const isSameCard = matItem.cardId === targetItem.cardId;
        const isSameStar = (targetItem.stars||1) === (matItem.stars||1);
        const matEl = createCardElement(matStats, 'collection');
        matEl.classList.add('transform', 'scale-90', 'hover:scale-100', 'transition');
        if(matEl.querySelector('.info-btn')) matEl.querySelector('.info-btn').remove();

        const overlay = document.createElement('div');
        overlay.className = `absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition duration-200 z-50 font-bold cursor-pointer`;
        
        if (isSameCard) {
            if (isSameStar) {
                overlay.innerHTML = `<div class="text-yellow-400 text-2xl mb-1"><i class="fa-solid fa-angles-up"></i></div><div class="text-white text-xs">EVOLVE</div>`;
                overlay.classList.add('border-2', 'border-yellow-500');
                overlay.onclick = () => processFusion(targetItem, matItem, 'STAR');
                matEl.classList.add('ring-4', 'ring-yellow-500', 'animate-pulse');
            } else {
                const expVal = getFodderExp(matStats) * 2;
                overlay.innerHTML = `<div class="text-orange-300 text-xl mb-1">Diff Star</div><div class="text-green-400 text-sm">+${expVal} XP</div>`;
                overlay.classList.add('border-2', 'border-orange-500/50');
                overlay.onclick = () => processFusion(targetItem, matItem, 'EXP');
            }
        } else {
            const expVal = getFodderExp(matStats);
            overlay.innerHTML = `<div class="text-green-400 text-2xl mb-1">+${expVal}</div><div class="text-white text-xs">EXP</div>`;
            overlay.classList.add('border-2', 'border-green-500');
            overlay.onclick = () => processFusion(targetItem, matItem, 'EXP');
        }
        
        matEl.appendChild(overlay);
        listContainer.appendChild(matEl);
    });
}

function processFusion(target, material, type) {
    if(!confirm(`Consume ${getCardStats(material).name}? Cannot undo.`)) return;

    if (type === 'STAR') {
        target.stars = (target.stars || 1) + 1;
        alert(`🌟 EVOLUTION SUCCESS!\nNow ${target.stars} Stars!`);
    } 
    else if (type === 'EXP') {
        let expGain = getFodderExp(getCardStats(material));
        if (target.cardId === material.cardId) expGain *= 2;
        const leveledUp = addExpToCard(target, expGain);
        if(leveledUp) alert(`🆙 LEVEL UP! gained ${expGain} EXP.`);
        else alert(`⚡ gained ${expGain} EXP.`);
    }

    const idx = playerData.inventory.findIndex(i => i.uid === material.uid);
    if(idx > -1) playerData.inventory.splice(idx, 1);

    saveGame();
    renderUpgradeUI();
    if(document.getElementById('page-deck').classList.contains('active')) {
        if (window.renderDeckEditor) window.renderDeckEditor();
    }
}
