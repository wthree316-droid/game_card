// js/modules/bag.js
import { playerData, saveGame } from '../core/state.js';
import { SHOP_GENERAL, EQUIPMENT_DATABASE, HERO_EQUIPMENT_DATABASE } from '../core/config.js'; 
import { showToast } from './ui-notifications.js';
import { addExpToCard, getHeroStats } from '../utils.js';

// State
let selectedItemId = null;
let selectedItemType = null; 
let currentBagTab = 'ITEMS'; 

// Helper: แสดงรูปภาพ
function renderIcon(icon) {
    if (!icon) return '<span class="opacity-20">?</span>';
    const isImage = icon.includes('/') || icon.includes('.');
    if (isImage) {
        return `<img src="${icon}" class="w-full h-full object-cover rounded-md pointer-events-none select-none" loading="lazy" alt="icon">`;
    } else {
        return `<div class="pointer-events-none select-none">${icon}</div>`;
    }
}

export function init() {
    selectedItemId = null;
    selectedItemType = null;
    currentBagTab = 'ITEMS'; 
    
    registerGlobalFunctions();
    renderBagLayout(); // สร้างโครงสร้างครั้งเดียว
    updateBagContent(); // อัปเดตเนื้อหา
}

function registerGlobalFunctions() {
    window.selectBagItem = (itemId, type = 'ITEM') => {
        if(selectedItemId === itemId && selectedItemType === type) return;
        selectedItemId = itemId;
        selectedItemType = type;
        
        updateSelectionVisuals(); 
        renderDetailPanel(); 
    };

    window.switchBagTab = (tab) => {
        currentBagTab = tab;
        selectedItemId = null;
        selectedItemType = null;
        
        // อัปเดต Tabs UI
        document.querySelectorAll('.bag-tab-btn').forEach(btn => {
            const isTarget = btn.dataset.tab === tab;
            btn.className = `bag-tab-btn flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${isTarget ? 'text-white bg-white/10 shadow-[inset_0_-2px_10px_rgba(255,255,255,0.1)]' : 'text-gray-500 hover:bg-white/5'}`;
            btn.querySelector('.tab-indicator').style.display = isTarget ? 'block' : 'none';
        });

        updateBagContent(); 
        renderDetailPanel(); 
    };

    window.closeBag = () => {
        // ✅ [แก้ไข] ถ้ามีหน้าเก่าที่จำไว้ ให้กลับไปหน้านั้น, ถ้าไม่มีให้กลับไป World
        const targetPage = window.lastPageBeforeBag || 'page-stage';
        window.navTo(targetPage); 
    };

    // --- Logic การกดใช้ของ ---
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
            } else {
                return showToast("Cannot use currently.", "info");
            }

            if (success) {
                playerData.items[itemId]--;
                if (playerData.items[itemId] <= 0) {
                    delete playerData.items[itemId];
                    selectedItemId = null;
                }
                saveGame();
                updateBagContent();
                renderDetailPanel();
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
            updateBagContent();
            renderDetailPanel();
            showToast(`${eqData.name} Equipped to ${getHeroStats(activeHero).name}`, "success");
        } catch (e) {
            console.error(e);
            alert("Error equipping item: " + e.message);
        }
    };
}

// ------------------------------------------------------------------
// 🎨 1. LAYOUT (สร้างโครงสร้าง HTML ครั้งเดียว)
// ------------------------------------------------------------------
function renderBagLayout() {
    const pageBag = document.getElementById('page-bag');
    if (!pageBag) return;
    if (document.getElementById('bag-ui-main')) return;

    // ✅ แก้ไข 1: เอา Padding ที่ฝังไว้ออก (pt-20 pb-20) และใช้ h-full เต็มที่
    pageBag.innerHTML = `
        <div id="bag-ui-main" class="flex flex-col h-full w-full max-w-7xl mx-auto overflow-hidden relative">
            
            <div class="flex justify-between items-center mb-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg flex-shrink-0 z-20 mt-4 mx-4 md:mx-0">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg text-white text-2xl border-2 border-white/20">
                        <i class="fa-solid fa-backpack"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-white italic tracking-wide uppercase drop-shadow">Inventory</h2>
                        <div class="text-[10px] text-gray-400 font-mono tracking-widest bg-black/40 px-2 py-0.5 rounded inline-block">STORAGE SYSTEM</div>
                    </div>
                </div>

                <button onclick="window.closeBag()" 
                    class="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 text-gray-400 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all shadow-lg flex items-center justify-center group">
                    <i class="fa-solid fa-xmark text-xl group-hover:scale-110 transition-transform"></i>
                </button>
            </div>

            <div class="flex-1 flex flex-col md:flex-row gap-4 h-full items-start overflow-hidden relative z-10 px-4 md:px-0 pb-4">
                
                <div class="flex-1 w-full h-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
                    
                    <div class="flex border-b border-white/5 bg-black/30 flex-shrink-0 z-10">
                        <button onclick="window.switchBagTab('ITEMS')" data-tab="ITEMS"
                            class="bag-tab-btn flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative text-white bg-white/10 shadow-[inset_0_-2px_10px_rgba(255,255,255,0.1)]">
                            <i class="fa-solid fa-flask text-yellow-400"></i> Consumables
                            <div class="tab-indicator absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500 shadow-[0_0_15px_gold]"></div>
                        </button>
                        <button onclick="window.switchBagTab('EQUIP')" data-tab="EQUIP"
                            class="bag-tab-btn flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative text-gray-500 hover:bg-white/5">
                            <i class="fa-solid fa-shield-halved text-blue-400"></i> Equipment
                            <div class="tab-indicator absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_15px_cyan]" style="display:none;"></div>
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] relative z-0">
                        <div id="bag-slots-container" class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2 content-start">
                            </div>
                    </div>
                    
                    <div class="bg-black/60 p-2 text-center text-[10px] text-gray-500 font-mono border-t border-white/5 flex-shrink-0 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
                        Capacity: Unlimited
                    </div>
                </div>

                <div class="w-full md:w-80 h-auto md:h-full flex-shrink-0">
                    <div id="item-detail-panel" class="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-full flex flex-col items-center text-center shadow-2xl relative overflow-hidden transition-all">
                        </div>
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------------------------------
// 🔄 2. CONTENT UPDATE (อัปเดตเฉพาะไส้ใน)
// ------------------------------------------------------------------
function updateBagContent() {
    const container = document.getElementById('bag-slots-container');
    if (!container) return;

    let html = '';
    // เพิ่มจำนวนช่องขั้นต่ำเพื่อให้ดูเต็มพื้นที่มากขึ้น
    const MIN_SLOTS = currentBagTab === 'ITEMS' ? 42 : 42; 
    let itemsToRender = [];

    if (currentBagTab === 'ITEMS') {
        if (!playerData.items) playerData.items = {};
        const keys = Object.keys(playerData.items).filter(k => playerData.items[k] > 0);
        itemsToRender = keys.map(id => ({ 
            id, 
            type: 'ITEM', 
            qty: playerData.items[id],
            data: SHOP_GENERAL.find(x => x.id === id) || { name: id, icon: '❓' } 
        }));
    } else {
        if (!playerData.heroInventory) playerData.heroInventory = [];
        itemsToRender = playerData.heroInventory.map(id => ({ 
            id, 
            type: 'EQUIP', 
            qty: 1,
            data: EQUIPMENT_DATABASE[id] || HERO_EQUIPMENT_DATABASE[id] 
        })).filter(i => i.data); 
    }

    // คำนวณจำนวนแถวให้เต็มจอ
    const cols = window.innerWidth < 640 ? 5 : (window.innerWidth < 768 ? 6 : 7);
    const totalSlots = Math.max(MIN_SLOTS, Math.ceil(itemsToRender.length / cols) * cols);

    for (let i = 0; i < totalSlots; i++) {
        const item = itemsToRender[i];
        if (item) {
            const isSelected = selectedItemId === item.id && selectedItemType === item.type;
            
            let extraClass = '';
            if (item.type === 'EQUIP') {
                extraClass = `game-card-v2 rarity-${item.data.rarity || 'C'}`;
            }

            // ปรับปรุง Slot ให้ดูมีมิติขึ้น
            html += `
                <div onclick="window.selectBagItem('${item.id}', '${item.type}')" 
                    id="slot-${item.id}"
                    class="inv-slot filled ${extraClass} ${isSelected ? 'selected ring-2 ring-yellow-400 scale-105 z-10 shadow-[0_0_15px_rgba(255,215,0,0.5)]' : 'shadow-md'} cursor-pointer group relative aspect-square bg-slate-800 rounded-lg border border-slate-600/50 hover:border-yellow-400/80 transition-all overflow-hidden bg-gradient-to-br from-slate-700/50 to-slate-800/50" 
                    title="${item.data.name}">
                    
                    ${item.type === 'EQUIP' ? '<div class="foil-shine opacity-20 pointer-events-none"></div>' : ''}

                    <div class="w-full h-full p-2 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-300">
                        ${renderIcon(item.data.icon)} 
                    </div>
                    
                    ${item.qty > 1 ? `<div class="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm border border-white/10 font-mono shadow-sm">x${item.qty}</div>` : ''}
                    
                    ${item.type === 'EQUIP' ? `<div class="absolute top-0.5 left-0.5 text-[7px] font-bold text-shadow-sm opacity-90 bg-black/50 px-1 rounded-sm">${item.data.rarity}</div>` : ''}
                </div>
            `;
        } else {
            // ช่องว่างให้ดูจมลงไป
            html += `<div class="inv-slot empty aspect-square bg-black/30 rounded-lg border border-white/5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"></div>`;
        }
    }
    container.innerHTML = html;
}

function updateSelectionVisuals() {
    document.querySelectorAll('.inv-slot.selected').forEach(el => {
        el.classList.remove('selected', 'ring-2', 'ring-yellow-400', 'scale-105', 'z-10', 'shadow-[0_0_15px_rgba(255,215,0,0.5)]');
        el.classList.add('shadow-md');
    });
    const target = document.getElementById(`slot-${selectedItemId}`);
    if (target) {
        target.classList.remove('shadow-md');
        target.classList.add('selected', 'ring-2', 'ring-yellow-400', 'scale-105', 'z-10', 'shadow-[0_0_15px_rgba(255,215,0,0.5)]');
    }
}

function renderDetailPanel() {
    const panel = document.getElementById('item-detail-panel');
    if (!panel) return;

    // 1. Empty State (Sci-fi Style)
    if (!selectedItemId) {
        panel.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center text-gray-500/50 select-none animate-pulse-soft bg-black/20 rounded-2xl border border-white/5 relative overflow-hidden">
                <div class="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')]"></div>
                <div class="relative z-10 flex flex-col items-center">
                     <div class="w-24 h-24 mb-4 rounded-full bg-slate-800/50 border-2 border-dashed border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                        <i class="fa-solid fa-microchip text-4xl opacity-40"></i>
                    </div>
                    <p class="font-bold uppercase tracking-[0.2em] text-sm text-white/40">Awaiting Input</p>
                    <p class="text-[10px] mt-2 font-mono opacity-60">Select an item to analyze</p>
                </div>
            </div>
        `;
        return;
    }

    // 2. Prepare Data
    let itemData, qty, actionBtn;
    
    if (selectedItemType === 'ITEM') {
        qty = playerData.items[selectedItemId];
        itemData = SHOP_GENERAL.find(x => x.id === selectedItemId);
        actionBtn = `<button onclick="window.useBagItem('${selectedItemId}')" class="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2 border border-white/20 relative overflow-hidden group"><div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div><i class="fa-solid fa-sparkles relative z-10"></i> <span class="relative z-10">USE ITEM</span></button>`;
    } else {
        qty = 1;
        itemData = EQUIPMENT_DATABASE[selectedItemId] || HERO_EQUIPMENT_DATABASE[selectedItemId];
        actionBtn = `<button onclick="window.equipFromBag('${selectedItemId}')" class="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2 border border-white/20 relative overflow-hidden group"><div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div><i class="fa-solid fa-shirt relative z-10"></i> <span class="relative z-10">EQUIP TO HERO</span></button>`;
    }

    if (!itemData) {
        panel.innerHTML = '<div class="text-red-500 font-bold border border-red-500 p-4 rounded">Error: Data Missing</div>';
        return;
    }

    // 3. Theme Colors
    const rarityColors = { 'C': 'gray', 'U': 'green', 'R': 'blue', 'SR': 'purple', 'UR': 'yellow', 'LEGEND': 'orange', 'MYTHICAL': 'red' };
    const glowColor = rarityColors[itemData.rarity] || 'gray';

    // 4. Stats HTML
    let statsHtml = '';
    if (selectedItemType === 'EQUIP') {
        const stats = [
            { label: 'ATK', val: itemData.atk, color: 'text-red-400' },
            { label: 'DEF', val: itemData.def, color: 'text-blue-400' },
            { label: 'HP', val: itemData.hp, color: 'text-green-400' },
            { label: 'SPD', val: itemData.spd, color: 'text-yellow-400' },
            { label: 'CRIT', val: itemData.crit ? Math.round(itemData.crit*100)+'%' : null, color: 'text-purple-400' }
        ];
        const validStats = stats.filter(s => s.val);
        if (validStats.length > 0) {
            statsHtml = `
                <div class="bg-black/40 rounded-lg p-3 w-full border border-white/5 shadow-inner space-y-1 mb-4">
                    ${validStats.map(s => `
                        <div class="flex justify-between items-center text-xs border-b border-white/5 last:border-0 pb-1 last:pb-0">
                            <span class="text-gray-500 font-bold">${s.label}</span>
                            <span class="${s.color} font-mono font-bold">+${s.val}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // 5. Render UI (ปรับปรุงใหม่: Icon ใหญ่, เต็มกรอบ, สวยงาม)
    panel.innerHTML = `
        <div class="w-full h-full flex flex-col animate-fade-in relative z-10">
            <div class="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-${glowColor}-500/20 blur-3xl rounded-full pointer-events-none opacity-60"></div>

            <div class="w-40 h-40 mx-auto bg-slate-900 rounded-3xl border-4 border-${glowColor}-500/50 shadow-[0_0_30px_rgba(var(--color-${glowColor}),0.3)] mb-6 relative overflow-hidden group transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(var(--color-${glowColor}),0.5)]">
                
                <div class="absolute inset-0 bg-gradient-to-t from-${glowColor}-900/60 to-transparent z-10 pointer-events-none"></div>
                
                <div class="w-full h-full flex items-center justify-center bg-slate-950 relative z-0">
                    ${renderIcon(itemData.icon)}
                </div>

                ${itemData.rarity ? `
                <div class="absolute bottom-3 right-3 z-20">
                    <span class="bg-black/80 backdrop-blur-md text-${glowColor}-400 text-[10px] font-black px-3 py-1 rounded-full border border-${glowColor}-500/50 shadow-xl tracking-widest">
                        ${itemData.rarity}
                    </span>
                </div>` : ''}
            </div>
            
            <h2 class="text-2xl font-black text-white mb-1 uppercase tracking-wide leading-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                ${itemData.name}
            </h2>
            
            <div class="text-[10px] text-${glowColor}-400 mb-5 uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-3 opacity-80">
                <span class="w-8 h-px bg-gradient-to-r from-transparent to-${glowColor}-500"></span>
                ${selectedItemType === 'EQUIP' ? itemData.type : 'CONSUMABLE'}
                <span class="w-8 h-px bg-gradient-to-l from-transparent to-${glowColor}-500"></span>
            </div>
            
            ${statsHtml}

            <div class="py-4 px-5 rounded-xl border border-white/10 text-xs text-gray-300 italic text-center mb-auto leading-relaxed bg-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
                "${itemData.desc || 'No description available.'}"
            </div>

            <div class="mt-6 pt-4 border-t border-white/10 w-full z-20 relative">
                ${actionBtn}
            </div>
        </div>
    `;
}
