// js/modules/bag.js
import { playerData, saveGame } from '../core/state.js';
import { SHOP_GENERAL, EQUIPMENT_DATABASE, HERO_EQUIPMENT_DATABASE } from '../core/config.js'; 
import { showToast} from './ui-notifications.js';
import { addExpToCard, getHeroStats } from '../utils.js';

let selectedItemId = null;
let selectedItemType = null; 

// Helper: แสดงรูปภาพ
function renderIcon(icon) {
    if (!icon) return '?';
    const isImage = icon.includes('/') || icon.includes('.');
    if (isImage) {
        // ✅ เพิ่ม loading="lazy"
        return `<img src="${icon}" class="w-full h-full object-cover rounded-md pointer-events-none" loading="lazy" alt="icon">`;
    } else {
        return `<div class="pointer-events-none">${icon}</div>`;
    }
}

export function init() {
    selectedItemId = null;
    selectedItemType = null;
    
    // ✅ ประกาศฟังก์ชันลง Window เพื่อความชัวร์
    registerGlobalFunctions();
    
    renderBagUI();
}

function registerGlobalFunctions() {
    window.selectBagItem = (itemId, type = 'ITEM') => {
        console.log("Selected:", itemId, type);
        selectedItemId = itemId;
        selectedItemType = type;
        renderBagUI(); // อัปเดตหน้าจอ
    };

    window.useBagItem = async (itemId) => {
        try {
            if (!playerData.items[itemId] || playerData.items[itemId] <= 0) return;

            const itemConfig = SHOP_GENERAL.find(i => i.id === itemId);
            if (!itemConfig) return showToast("Item data error!", "error");

            let success = false;
            let msg = "";

            if (itemConfig.type === 'STAMINA') {
                if (playerData.resources.stamina >= playerData.resources.maxStamina) return showToast("Stamina Full!", "warning");
                playerData.resources.stamina = Math.min(playerData.resources.maxStamina, playerData.resources.stamina + (itemConfig.value || 0));
                success = true;
                msg = `+${itemConfig.value} Stamina`;
            } 
            else if (itemConfig.type === 'EXP_HERO') {
                const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId) || playerData.heroes[0];
                if (activeHero) {
                    const isLvUp = addExpToCard(activeHero, itemConfig.value || 0);
                    success = true;
                    msg = `+${itemConfig.value} EXP ${isLvUp ? '(LEVEL UP!)' : ''}`;
                }
            }
            else {
                return showToast("Cannot use currently.", "info");
            }

            if (success) {
                playerData.items[itemId]--;
                if (playerData.items[itemId] <= 0) {
                    delete playerData.items[itemId];
                    selectedItemId = null;
                }
                
                saveGame();
                renderBagUI(); // Refresh UI
                if(window.updateUI) window.updateUI();
                
                showToast(`${itemConfig.name} Used: ${msg}`, "success");
            }
        } catch (e) {
            console.error(e);
            alert("Error using item: " + e.message);
        }
    };

    window.equipFromBag = (equipId) => {
        try {
            const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId) || playerData.heroes[0];
            if (!activeHero) return showToast("No Active Hero!", "error");

            const eqData = EQUIPMENT_DATABASE[equipId] || HERO_EQUIPMENT_DATABASE[equipId];
            if (!eqData) return showToast("Invalid Equipment", "error");

            const type = eqData.type;

            if (activeHero.equipped[type]) {
                const oldEquipId = activeHero.equipped[type];
                if(!playerData.heroInventory) playerData.heroInventory = [];
                playerData.heroInventory.push(oldEquipId);
            }

            activeHero.equipped[type] = equipId;

            if (playerData.heroInventory) {
                const idx = playerData.heroInventory.indexOf(equipId);
                if (idx > -1) playerData.heroInventory.splice(idx, 1);
            }

            selectedItemId = null;
            saveGame();
            renderBagUI(); // Refresh UI
            
            showToast(`${eqData.name} Equipped to ${getHeroStats(activeHero).name}`, "success");
        } catch (e) {
            console.error(e);
            alert("Error equipping item: " + e.message);
        }
    };
}

function renderBagUI() {
    // 1. เช็คก่อนว่ามี Layout ใหม่อยู่แล้วไหม (ถ้ามีให้ใช้เลย ไม่ต้องหา bag-grid)
    const existingLayout = document.getElementById('inner-bag-slots');
    
    if (existingLayout) {
        // อัปเดตเฉพาะไส้ใน
        renderSlotsHTML();
        renderEquipSlots();
        const panel = document.getElementById('item-detail-panel');
        if(panel) panel.innerHTML = renderDetailPanel();
        return; // ✅ จบงานทันที ไม่ต้องไปหา bag-grid
    }

    // 2. ถ้ายังไม่มี Layout (เพิ่งเข้าครั้งแรก) ถึงค่อยหา bag-grid เพื่อสร้าง
    const container = document.getElementById('bag-grid');
    if (!container) return;

    container.parentElement.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6 h-full items-start">
            
            <div class="flex-1 w-full">
                <div class="flex items-center gap-4 mb-4">
                    <h2 class="text-3xl font-black text-white italic drop-shadow-lg flex items-center gap-2">
                        <i class="fa-solid fa-backpack text-orange-500"></i> INVENTORY
                    </h2>
                    <div class="bg-slate-800 px-3 py-1 rounded-full border border-white/10 text-xs text-gray-400 font-mono">
                        Storage
                    </div>
                </div>

                <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
                    <h3 class="text-gray-400 text-xs font-bold uppercase mb-3 flex justify-between">
                        <span><i class="fa-solid fa-flask text-yellow-500"></i> Consumables</span>
                    </h3>
                    <div id="inner-bag-slots" class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-6 gap-2"></div>
                </div>

                <div class="mt-4 bg-slate-900/80 p-4 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
                    <h3 class="text-gray-400 text-xs font-bold uppercase mb-3">
                        <i class="fa-solid fa-shield-halved text-blue-500"></i> Equipment
                    </h3>
                    <div id="inner-equip-slots" class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-6 gap-2"></div>
                </div>
            </div>

            <div class="w-full md:w-72 sticky top-24">
                <div id="item-detail-panel" class="bg-slate-800 border-2 border-slate-600 rounded-xl p-6 min-h-[350px] flex flex-col items-center text-center shadow-2xl relative overflow-hidden transition-all">
                    <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    ${renderDetailPanel()}
                </div>
            </div>
        </div>
    `;

    // อัปเดตไส้ในครั้งแรก
    renderSlotsHTML();
    renderEquipSlots();
}

function renderSlotsHTML() {
    const slotContainer = document.getElementById('inner-bag-slots');
    if (!slotContainer) return;

    if (!playerData.items) playerData.items = {};
    const itemKeys = Object.keys(playerData.items).filter(k => playerData.items[k] > 0);
    
    let html = '';
    const MIN_SLOTS = 12;
    const totalSlots = Math.max(MIN_SLOTS, Math.ceil(itemKeys.length / 6) * 6);

    for (let i = 0; i < totalSlots; i++) {
        const itemId = itemKeys[i];
        if (itemId) {
            const qty = playerData.items[itemId];
            const itemData = SHOP_GENERAL.find(x => x.id === itemId) || { name: itemId, icon: '❓' };
            const isSelected = selectedItemId === itemId && selectedItemType === 'ITEM';

            html += `
                <div onclick="window.selectBagItem('${itemId}', 'ITEM')" 
                    class="inv-slot filled ${isSelected ? 'selected' : ''} cursor-pointer" title="${itemData.name}">
                    <div class="text-2xl drop-shadow-md z-10 hover:scale-110 transition w-full h-full flex items-center justify-center p-1 pointer-events-none">
                        ${renderIcon(itemData.icon)} 
                    </div>
                    <div class="inv-qty">${qty}</div>
                </div>
            `;
        } else {
            html += `<div class="inv-slot empty"></div>`;
        }
    }
    slotContainer.innerHTML = html;
}

function renderEquipSlots() {
    const container = document.getElementById('inner-equip-slots');
    if(!container) return;
    
    if (!playerData.heroInventory) playerData.heroInventory = [];
    const allEquips = [...playerData.heroInventory];
    
    const MIN_SLOTS = 18;
    const totalSlots = Math.max(MIN_SLOTS, Math.ceil(allEquips.length / 6) * 6);

    let html = '';
    for(let i=0; i<totalSlots; i++) {
        const eqId = allEquips[i];
        if(eqId) {
            const eqData = EQUIPMENT_DATABASE[eqId] || HERO_EQUIPMENT_DATABASE[eqId];
            if (!eqData) continue; 

            // ✅ แก้ไข: ใช้ Class เดียวกับ Card เพื่อดึง Effect แสงวิบวับมาใช้
            // เปลี่ยนจาก border-blue-500 เป็น rarity-R เป็นต้น
            const rarityClass = `rarity-${eqData.rarity || 'C'}`; 
            
            const isSelected = selectedItemId === eqId && selectedItemType === 'EQUIP';

            // เพิ่ม class "game-card-v2" เพื่อให้ CSS จับ Effect ได้ (แม้จะเป็นช่องเล็ก)
            // หรือจะเขียน CSS ใหม่ให้ inv-slot รองรับก็ได้ (แนะนำวิธีนี้ง่ายกว่า)
            html += `
                <div onclick="window.selectBagItem('${eqId}', 'EQUIP')" 
                    class="inv-slot filled game-card-v2 ${rarityClass} ${isSelected ? 'ring-2 ring-yellow-400 scale-95' : ''}" 
                    title="${eqData.name}">
                    
                    <div class="foil-shine"></div>
                    
                    <div class="text-2xl drop-shadow-md z-10 hover:scale-110 transition w-full h-full flex items-center justify-center p-1 pointer-events-none">
                        ${renderIcon(eqData.icon)} 
                    </div>
                    
                    <div class="absolute bottom-0 right-0 text-[8px] bg-black/60 px-1 rounded-tl text-white font-bold backdrop-blur-sm">
                        ${eqData.rarity}
                    </div>
                </div>
            `;
        } else {
            html += `<div class="inv-slot empty"></div>`;
        }
    }
    container.innerHTML = html;
}

function renderDetailPanel() {
    if (!selectedItemId) {
        return `
            <div class="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50 select-none">
                <i class="fa-solid fa-hand-pointer text-5xl mb-4"></i>
                <p class="font-bold">Select an item</p>
                <p class="text-xs">to view details</p>
            </div>
        `;
    }

    if (selectedItemType === 'ITEM') {
        const qty = playerData.items[selectedItemId];
        const itemData = SHOP_GENERAL.find(x => x.id === selectedItemId);
        if (!itemData) return '<div class="text-red-500">Error: Item Data Missing</div>';

        return `
            <div class="relative z-10 w-full flex flex-col h-full animate-fade-in">
                <div class="w-20 h-20 mx-auto bg-slate-900 rounded-2xl border-2 border-orange-500/50 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(249,115,22,0.3)] mb-4 ring-4 ring-slate-800 overflow-hidden">
                    ${renderIcon(itemData.icon)} 
                </div>
                <h2 class="text-lg font-bold text-white mb-1 uppercase tracking-wide">${itemData.name}</h2>
                <div class="inline-block bg-slate-900 text-orange-400 text-xs px-3 py-1 rounded-full border border-orange-500/30 mb-4 font-mono">
                    x${qty} IN BAG
                </div>
                <div class="bg-black/40 rounded-lg p-3 text-xs text-gray-300 text-left mb-auto border border-white/5 shadow-inner">
                    ${itemData.desc}
                </div>
                <button onclick="window.useBagItem('${selectedItemId}')" 
                    class="w-full py-3 mt-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black rounded-lg shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2 border-t border-white/20">
                    <i class="fa-solid fa-sparkles"></i> USE NOW
                </button>
            </div>
        `;
    } 
    else if (selectedItemType === 'EQUIP') {
        const eqData = EQUIPMENT_DATABASE[selectedItemId] || HERO_EQUIPMENT_DATABASE[selectedItemId];
        if (!eqData) return '<div class="text-red-500">Error: Equip Data Missing</div>';

        let statsHtml = '';
        if(eqData.atk) statsHtml += `<div class="flex justify-between text-red-300"><span>ATK</span><span>+${eqData.atk}</span></div>`;
        if(eqData.def) statsHtml += `<div class="flex justify-between text-blue-300"><span>DEF</span><span>+${eqData.def}</span></div>`;
        if(eqData.hp) statsHtml += `<div class="flex justify-between text-green-300"><span>HP</span><span>+${eqData.hp}</span></div>`;
        if(eqData.spd) statsHtml += `<div class="flex justify-between text-yellow-300"><span>SPD</span><span>+${eqData.spd}</span></div>`;
        if(eqData.crit) statsHtml += `<div class="flex justify-between text-purple-300"><span>CRIT</span><span>+${Math.round(eqData.crit*100)}%</span></div>`;

        let glowColor = 'gray';
        if(eqData.rarity === 'R') glowColor = 'blue';
        if(eqData.rarity === 'SR') glowColor = 'purple';
        if(eqData.rarity === 'UR') glowColor = 'yellow';

        return `
            <div class="relative z-10 w-full flex flex-col h-full animate-fade-in">
                <div class="w-20 h-20 mx-auto bg-slate-900 rounded-2xl border-2 border-${glowColor}-500 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-2 relative group overflow-hidden">
                    <div class="absolute inset-0 bg-${glowColor}-500/20 blur-lg rounded-full"></div>
                    <span class="relative z-10 w-full h-full p-2 flex items-center justify-center">
                        ${renderIcon(eqData.icon)} 
                    </span>
                    <div class="absolute top-0 right-0 bg-slate-950 text-white text-[10px] font-bold px-1.5 rounded border border-white/20">${eqData.rarity}</div>
                </div>
                
                <h2 class="text-lg font-bold text-white mb-0 uppercase tracking-wide leading-tight">${eqData.name}</h2>
                <div class="text-[10px] text-gray-400 mb-3 uppercase tracking-widest">${eqData.type}</div>
                
                <div class="bg-black/40 rounded-lg p-3 text-xs w-full mb-auto border border-white/5 shadow-inner space-y-1 font-mono">
                    ${statsHtml}
                </div>

                <div class="mt-2 text-[10px] text-gray-500 italic text-center">
                    "${eqData.desc || 'No description.'}"
                </div>

                <button onclick="window.equipFromBag('${selectedItemId}')" 
                    class="w-full py-3 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-lg shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2 border-t border-white/20">
                    <i class="fa-solid fa-shirt"></i> EQUIP TO HERO
                </button>
            </div>
        `;
    }
}