// js/modules/shop.js
import { playerData, saveGame } from '../core/state.js';
import { SHOP_GENERAL, SHOP_EQUIPMENT, SHOP_HEROES, SHOP_CARDS, EQUIPMENT_DATABASE, HERO_EQUIPMENT_DATABASE, CARD_DATABASE, HERO_DATABASE } from '../core/config.js';
import { getCardStats, createNewCard, getHeroStats } from '../utils.js';
import { createCardElement } from '../ui-shared.js';
import { showToast, confirmModal, showRewardPopup } from './ui-notifications.js';

let currentTab = 'GENERAL';
let selectedSellUids = new Set(); 

// State หน้าขาย
let currentSellSubTab = 'CARD'; 
let currentSellPage = 1;
const ITEMS_PER_SELL_PAGE = 40; 

// ตัวแปรสำหรับนับเลขวิ่ง
let currentDisplayGold = 0;
let targetSellGold = 0;
let countUpInterval = null;

export function init() {
    renderShopUI();
}

// ==========================================
// 🏗️ MAIN LAYOUT
// ==========================================
function renderShopUI() {
    const container = document.getElementById('shop-container');
    if (!container) return; 

    container.className = "w-full max-w-7xl mx-auto pb-24 px-2 md:px-4";
    
    let html = `
        <div class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-white/10 pb-4 pt-2 mb-6 shadow-xl transition-all">
            <div class="flex justify-between items-center mb-4 px-2">
                <h2 class="text-2xl md:text-3xl font-black text-white italic drop-shadow-lg flex items-center gap-2">
                    <i class="fa-solid fa-store text-yellow-500"></i> <span class="hidden md:inline">TRADING POST</span><span class="md:hidden">SHOP</span>
                </h2>
                <div class="bg-black/60 px-4 py-1.5 rounded-full border border-yellow-500/30 text-yellow-400 font-mono font-bold flex items-center gap-2 shadow-inner">
                    <i class="fa-solid fa-coins text-yellow-500"></i> ${playerData.resources.gold.toLocaleString()}
                </div>
            </div>

            <div class="flex justify-start md:justify-center gap-2 overflow-x-auto custom-scrollbar px-2 pb-1 no-scrollbar-mobile">
                ${renderTabBtn('GENERAL', 'fa-flask', 'Items')}
                ${renderTabBtn('EQUIP', 'fa-shield-halved', 'Gears')}
                ${renderTabBtn('HERO', 'fa-user-tag', 'Heroes')}
                ${renderTabBtn('CARD', 'fa-id-card', 'Units')}
                ${renderTabBtn('SELL', 'fa-sack-dollar', 'Sell', 'bg-gradient-to-r from-red-900 to-red-700 text-white border-red-500')}
            </div>
        </div>
        
        <div id="shop-content-area" class="animate-fade-in min-h-[50vh]"></div>
    `;

    container.innerHTML = html;
    renderShopContent();
}

function renderTabBtn(tabId, icon, label, extraClass = '') {
    const isActive = currentTab === tabId;
    const activeClass = "bg-gradient-to-b from-yellow-500 to-yellow-600 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] scale-105 ring-2 ring-yellow-400/30";
    const inactiveClass = "bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 border-white/10 hover:border-white/30";
    const style = isActive ? activeClass : (extraClass || inactiveClass);

    return `
        <button onclick="window.switchShopTab('${tabId}')" 
            class="px-4 md:px-6 py-2 rounded-xl font-bold text-xs md:text-sm border transition-all duration-200 flex items-center gap-2 flex-shrink-0 whitespace-nowrap ${style}">
            <i class="fa-solid ${icon}"></i> ${label}
        </button>
    `;
}

window.switchShopTab = (tabId) => {
    if (currentTab === tabId) return;
    currentTab = tabId;
    if (tabId === 'SELL') {
        currentSellSubTab = 'CARD';
        currentSellPage = 1;
        selectedSellUids.clear();
        targetSellGold = 0;
        currentDisplayGold = 0;
    }
    renderShopUI();
};

// ==========================================
// 🛍️ BUY SYSTEM
// ==========================================
function renderShopContent() {
    const area = document.getElementById('shop-content-area');
    if (!area) return;

    if (currentTab === 'SELL') {
        renderSellInterface(area);
        return;
    }

    let items = [];
    if (currentTab === 'GENERAL') items = SHOP_GENERAL;
    if (currentTab === 'EQUIP') items = SHOP_EQUIPMENT;
    if (currentTab === 'HERO') items = SHOP_HEROES;
    if (currentTab === 'CARD') items = SHOP_CARDS;

    if (items.length === 0) {
        area.innerHTML = `<div class="text-center text-gray-500 py-20 bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700">Currently Out of Stock</div>`;
        return;
    }

    const useCardLayout = currentTab === 'CARD' || currentTab === 'HERO';
    
    // ปรับ Grid ให้เหมาะกับการ์ด (2 คอลัมน์ในมือถือ, 5 ใน PC)
    const gridClass = useCardLayout 
        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        : "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4"; // 👈 แก้ตรงนี้: xl:grid-cols-6 -> 5, gap-3 -> 4

    const fragment = document.createDocumentFragment();
    const gridEl = document.createElement('div');
    gridEl.className = gridClass;

    items.forEach(item => {
        let isDisabled = false;
        let btnText = "BUY";
        
        // เช็ค Hero ซ้ำ
        if (item.type === 'UNLOCK_HERO') {
            const isOwned = playerData.heroes.some(h => h.heroId === item.value);
            if (isOwned) { isDisabled = true; btnText = "OWNED"; }
        }

        const currency = item.currency || 'GOLD';
        const isGem = currency === 'GEMS';
        const costVal = item.cost;
        const canAfford = isGem ? playerData.resources.gems >= costVal : playerData.resources.gold >= costVal;
        
        const priceTag = `
            <div class="font-mono font-bold text-sm md:text-base flex items-center justify-center gap-1 ${canAfford ? (isGem ? 'text-purple-300' : 'text-yellow-300') : 'text-red-400'}">
                ${isGem ? '<i class="fa-solid fa-gem"></i>' : '<i class="fa-solid fa-coins"></i>'} ${costVal.toLocaleString()}
            </div>
        `;

        const buyButton = `
            <button onclick="${!canAfford || isDisabled ? '' : `window.buyShopItem('${item.id}')`}" 
                class="w-full py-2 rounded-lg font-bold text-xs md:text-sm uppercase tracking-wider transition-all transform active:scale-95 shadow-lg
                ${isDisabled ? 'bg-slate-700 text-gray-500 cursor-not-allowed border border-white/5' : 
                  (!canAfford ? 'bg-gray-800 text-red-400 border border-red-900/50 cursor-not-allowed' : 
                  'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30')}"
                ${isDisabled || !canAfford ? 'disabled' : ''}>
                ${isDisabled ? 'OWNED' : (!canAfford ? 'NO FUNDS' : btnText)}
            </button>
        `;

        // 🔥 CASE 1: Render แบบการ์ด (แก้ให้รองรับ BUY_CARD)
        // ✅ เพิ่ม 'BUY_CARD' ในเงื่อนไข
        let renderedAsCard = false;

        if (useCardLayout && (item.type === 'BUY_CARD' || item.type === 'UNLOCK_CARD' || item.type === 'UNLOCK_HERO')) {
            let mockStats = null;
            
            if (item.type === 'UNLOCK_HERO') {
                const heroTemplate = HERO_DATABASE[item.value];
                if (heroTemplate) {
                    mockStats = getHeroStats({ 
                        ...heroTemplate, 
                        level: 1, exp: 0, equipped: {} 
                    });
                }
            } else {
                // สร้างการ์ดจำลอง
                const tempCard = createNewCard(item.value);
                if (tempCard && tempCard.cardId) {
                    // ✅ เสริม: ถ้าใน Config มีระบุ specs (level, stars) ให้ปรับตามนั้น
                    if (item.specs) {
                        if(item.specs.level) tempCard.level = item.specs.level;
                        if(item.specs.stars) tempCard.stars = item.specs.stars;
                    }
                    mockStats = getCardStats(tempCard);
                }
            }

            if (mockStats) {
                renderedAsCard = true;
                const cardEl = createCardElement(mockStats, 'shop'); 
                cardEl.classList.remove('cursor-pointer'); 
                
                const wrapper = document.createElement('div');
                wrapper.className = "relative group flex flex-col gap-2 animate-fade-in-up";
                wrapper.appendChild(cardEl);
                
                const btnContainer = document.createElement('div');
                btnContainer.className = "bg-slate-900 rounded-lg p-2 border border-white/10 shadow-lg flex flex-col items-center gap-1";
                btnContainer.innerHTML = `${priceTag}${buyButton}`;
                
                wrapper.appendChild(btnContainer);
                gridEl.appendChild(wrapper);
            }
        } 

        // 🔥 CASE 2: Fallback (Render แบบกล่องสี่เหลี่ยม)
        if (!renderedAsCard) {
            const rarityColor = item.rarity === 'UR' ? 'border-yellow-500 shadow-yellow-500/20' : 
                               item.rarity === 'SR' ? 'border-purple-500 shadow-purple-500/20' : 
                               'border-slate-600 shadow-black/20';
            
            const isImg = item.icon.includes('/') || item.icon.includes('.');
            
            const itemEl = document.createElement('div');
            itemEl.className = `relative aspect-[4/5] bg-slate-800 rounded-xl border-2 ${rarityColor} p-3 flex flex-col items-center justify-between shadow-xl group hover:-translate-y-1 transition-transform duration-300 overflow-hidden animate-fade-in`;
            
            itemEl.innerHTML = `
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                
                <div class="flex-1 flex items-center justify-center w-full relative z-10 pointer-events-none min-h-0"> ${isImg ? `<img src="${item.icon}" class="w-2/3 h-2/3 object-contain drop-shadow-xl group-hover:scale-110 transition-transform">` 
                            : `<div class="text-5xl drop-shadow-lg">${item.icon}</div>`}
                </div>

                <div class="w-full relative z-10 text-center mb-2 pointer-events-none shrink-0"> <div class="text-xs md:text-sm font-bold text-white truncate px-1">${item.name}</div>
                    <div class="mt-1">${priceTag}</div>
                </div>

                <div class="w-full relative z-20 shrink-0"> ${buyButton}
                </div>
            `;
            gridEl.appendChild(itemEl);
        }
    });

    fragment.appendChild(gridEl);
    area.innerHTML = '';
    area.appendChild(fragment);
}

// ==========================================
// 💰 SELL SYSTEM
// ==========================================
function renderSellInterface(container) {
    container.innerHTML = `
        <div class="flex flex-col md:flex-row gap-4 h-auto md:h-[calc(100vh-200px)] animate-fade-in">
            <div class="w-full md:w-1/3 flex flex-col gap-0 shadow-2xl rounded-2xl overflow-hidden border border-white/10 order-1 md:order-1">
                <div class="bg-slate-900 p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 class="font-black text-white text-lg flex items-center gap-2"><i class="fa-solid fa-basket-shopping text-orange-400"></i> SELL BASKET</h3>
                    <button onclick="window.clearSellBasket()" class="text-xs text-red-400 hover:text-red-300 underline">Clear All</button>
                </div>
                
                <div id="sell-basket-list" class="flex-1 bg-slate-950/80 p-2 overflow-y-auto custom-scrollbar space-y-1 relative min-h-[150px] md:min-h-0">
                    <div id="basket-empty-msg" class="absolute inset-0 flex flex-col items-center justify-center text-gray-600 pointer-events-none">
                        <span class="text-sm">Select items to sell</span>
                    </div>
                </div>

                <div class="bg-slate-900 p-4 border-t border-white/10 relative overflow-hidden">
                    <div class="relative z-10">
                        <div class="flex justify-between items-end mb-1">
                            <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Value</span>
                            <span class="text-xs text-gray-500" id="sell-count-label">0 items</span>
                        </div>
                        <div class="flex justify-between items-center mb-3">
                            <div class="text-3xl font-black text-white font-mono flex items-center gap-2 text-yellow-500">
                                <i class="fa-solid fa-coins text-xl"></i> <span id="total-sell-display">0</span>
                            </div>
                        </div>
                        <button onclick="window.executeSell()" id="btn-confirm-sell" disabled class="w-full py-3 rounded-lg font-bold bg-slate-700 text-gray-500 cursor-not-allowed">
                            Confirm Sale
                        </button>
                    </div>
                </div>
            </div>

            <div class="w-full md:w-2/3 bg-slate-800/50 rounded-2xl border border-white/5 flex flex-col overflow-hidden order-2 md:order-2 h-[500px] md:h-auto">
                <div id="sell-tabs-container" class="flex gap-2 p-3 border-b border-white/5 overflow-x-auto no-scrollbar-mobile bg-slate-900/50"></div>

                <div id="sell-inventory-grid" class="flex-1 overflow-y-auto p-3 custom-scrollbar"></div>
                
                <div class="p-2 bg-slate-900/50 border-t border-white/5 flex justify-center items-center gap-4 text-xs">
                    <button onclick="window.changeSellPage(-1)" class="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center"><i class="fa-solid fa-chevron-left"></i></button>
                    <span id="sell-page-info" class="font-mono text-gray-400">Page 1</span>
                    <button onclick="window.changeSellPage(1)" class="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    `;

    renderSellSubTabs(); 
    renderSellInventory(); 
}

function renderSellSubTabs() {
    const container = document.getElementById('sell-tabs-container');
    if (!container) return;

    const tabs = [
        { id: 'CARD', label: 'Units' },
        { id: 'EQUIP', label: 'Equipment' },
        { id: 'HERO_EQUIP', label: 'Hero Gear' }
    ];

    container.innerHTML = tabs.map(t => {
        const isActive = currentSellSubTab === t.id;
        const activeClass = isActive 
            ? (t.id === 'CARD' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30' : 
               t.id === 'EQUIP' ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/30' : 
               'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/30')
            : 'bg-slate-800 border-slate-600 text-gray-400 hover:bg-slate-700 hover:text-white';
        
        return `<button onclick="window.switchSellSubTab('${t.id}')" 
                class="px-5 py-2 rounded-full text-xs font-bold border transition-all duration-200 transform ${isActive ? 'scale-105' : ''} ${activeClass}">
                ${t.label}
                </button>`;
    }).join('');
}

function renderSellInventory() {
    const gridContainer = document.getElementById('sell-inventory-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    let items = [];
    if (currentSellSubTab === 'CARD') {
        items = playerData.inventory.filter(c => !playerData.deck.includes(c.uid));
    } else if (currentSellSubTab === 'HERO_EQUIP') {
        items = (playerData.heroInventory || []).map((id, idx) => ({ id, idx, type: 'HERO_EQUIP' }));
    } else {
        items = (playerData.equipment || []).map((id, idx) => ({ id, idx, type: 'EQUIP' }));
    }

    if (items.length === 0) {
        gridContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500 gap-2"><i class="fa-solid fa-box-open text-4xl opacity-30"></i><span>Empty Inventory</span></div>`;
        return;
    }

    const totalPages = Math.ceil(items.length / ITEMS_PER_SELL_PAGE);
    if (currentSellPage > totalPages) currentSellPage = totalPages || 1;
    document.getElementById('sell-page-info').innerText = `Page ${currentSellPage} / ${totalPages}`;
    
    const startIndex = (currentSellPage - 1) * ITEMS_PER_SELL_PAGE;
    const pagedItems = items.slice(startIndex, startIndex + ITEMS_PER_SELL_PAGE);

    const gridEl = document.createElement('div');
    gridEl.className = "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2";

    pagedItems.forEach(item => {
        let uid, name, icon, price, isSelected;

        if (currentSellSubTab === 'CARD') {
            const stats = getCardStats(item);
            uid = item.uid;
            name = stats.name;
            icon = stats.icon;
            price = (item.stars || 1) * 100 + (item.level * 10);
        } else {
            uid = `${item.type}_${item.idx}`;
            const db = item.type === 'HERO_EQUIP' ? HERO_EQUIPMENT_DATABASE : EQUIPMENT_DATABASE;
            const data = db[item.id] || { name: 'Unknown', icon: '❓', rarity: 'C' };
            name = data.name;
            icon = data.icon;
            price = (item.type === 'HERO_EQUIP' ? 500 : 200) * ({C:1,U:2,R:3,SR:4,UR:5,LEGEND:6,MYTHICAL:7}[data.rarity] || 1);
        }

        isSelected = selectedSellUids.has(uid);
        const isImg = icon.includes('/') || icon.includes('.');
        
        const el = document.createElement('div');
        el.className = `relative aspect-square bg-slate-700/50 rounded-lg border-2 border-slate-600/50 cursor-pointer overflow-hidden transition-all duration-200 group hover:border-white/30
            ${isSelected ? 'opacity-30 grayscale scale-95 border-dashed border-gray-500' : 'hover:-translate-y-1 shadow-md'}`;
        
        el.onclick = () => toggleSellItem(uid, name, icon, price, isImg);

        el.innerHTML = `
            ${isImg ? `<img src="${icon}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-2xl">${icon}</div>`}
            <div class="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] text-white text-center truncate backdrop-blur-sm">${name}</div>
            ${isSelected ? '<div class="absolute inset-0 flex items-center justify-center text-green-500 font-bold text-2xl drop-shadow-md"><i class="fa-solid fa-check"></i></div>' : ''}
        `;
        gridEl.appendChild(el);
    });
    gridContainer.appendChild(gridEl);
}

// ==========================================
// ⚡ INTERACTION LOGIC
// ==========================================

window.toggleSellItem = (uid, name, icon, price, isImg) => {
    const basketList = document.getElementById('sell-basket-list');
    const emptyMsg = document.getElementById('basket-empty-msg');
    
    if (selectedSellUids.has(uid)) {
        selectedSellUids.delete(uid);
        targetSellGold -= price;
        const basketItem = document.getElementById(`basket-item-${uid}`);
        if(basketItem) basketItem.remove();
    } else {
        selectedSellUids.add(uid);
        targetSellGold += price;
        const div = document.createElement('div');
        div.id = `basket-item-${uid}`;
        div.className = "flex items-center gap-3 p-2 bg-slate-800 rounded border border-white/5 animate-slide-in-left shadow-sm shrink-0";
        div.innerHTML = `
            <div class="w-10 h-10 rounded bg-slate-900 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                ${isImg ? `<img src="${icon}" class="w-full h-full object-cover">` : `<span class="text-xl">${icon}</span>`}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-gray-200 truncate">${name}</div>
                <div class="text-[10px] text-yellow-500 font-mono">+${price.toLocaleString()}</div>
            </div>
            <button onclick="window.toggleSellItem('${uid}', '', '', ${price}, false)" class="w-6 h-6 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-400 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
        `;
        basketList.appendChild(div);
        basketList.scrollTop = basketList.scrollHeight;
    }

    renderSellInventory();
    updateTotalDisplay();
    if(emptyMsg) emptyMsg.style.display = selectedSellUids.size > 0 ? 'none' : 'flex';
};

function updateTotalDisplay() {
    const btn = document.getElementById('btn-confirm-sell');
    if(btn) {
        if (selectedSellUids.size > 0) {
            btn.className = "w-full py-3 rounded-lg font-bold text-white shadow-lg shadow-green-500/20 transition-all transform active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 cursor-pointer animate-pulse-soft";
            btn.disabled = false;
        } else {
            btn.className = "w-full py-3 rounded-lg font-bold text-gray-500 bg-slate-800 border border-white/5 cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest";
            btn.disabled = true;
        }
    }

    const countLabel = document.getElementById('sell-count-label');
    if(countLabel) countLabel.innerText = `${selectedSellUids.size} items`;

    if (countUpInterval) clearInterval(countUpInterval);
    const displayEl = document.getElementById('total-sell-display');
    if (!displayEl) return;

    countUpInterval = setInterval(() => {
        const diff = targetSellGold - currentDisplayGold;
        if (Math.abs(diff) < 5) {
            currentDisplayGold = targetSellGold;
            displayEl.innerText = currentDisplayGold.toLocaleString();
            clearInterval(countUpInterval);
        } else {
            currentDisplayGold += Math.ceil(diff / 5);
            displayEl.innerText = currentDisplayGold.toLocaleString();
        }
    }, 20);
}

window.clearSellBasket = () => {
    selectedSellUids.clear();
    targetSellGold = 0;
    document.getElementById('sell-basket-list').innerHTML = `<div id="basket-empty-msg" class="absolute inset-0 flex flex-col items-center justify-center text-gray-600 pointer-events-none"><span class="text-sm">Select items to sell</span></div>`;
    renderSellInventory();
    updateTotalDisplay();
};

window.switchSellSubTab = (subTab) => {
    currentSellSubTab = subTab;
    currentSellPage = 1;
    renderSellSubTabs(); 
    renderSellInventory();
};

window.changeSellPage = (delta) => {
    currentSellPage += delta;
    renderSellInventory();
};

// ==========================================
// 🤝 EXECUTE & BUY LOGIC
// ==========================================
window.executeSell = async () => {
    if (selectedSellUids.size === 0) return;

    if (!await confirmModal({
        title: "CONFIRM TRANSACTION",
        message: `Sell <b class="text-white">${selectedSellUids.size}</b> items for <b class="text-yellow-400">${targetSellGold.toLocaleString()} G</b>?`,
        isDangerous: false
    })) return;

    const ids = Array.from(selectedSellUids);
    const cardsToRemove = new Set();
    const equipIndices = [];
    const heroEquipIndices = [];

    ids.forEach(id => {
        if (id.startsWith('c_')) cardsToRemove.add(id);
        else if (id.startsWith('EQUIP_')) equipIndices.push(parseInt(id.split('_')[1]));
        else if (id.startsWith('HERO_EQUIP_')) heroEquipIndices.push(parseInt(id.split('_')[2]));
    });

    if (cardsToRemove.size > 0) playerData.inventory = playerData.inventory.filter(c => !cardsToRemove.has(c.uid));
    if (equipIndices.length > 0) playerData.equipment = playerData.equipment.filter((_, idx) => !equipIndices.includes(idx));
    if (heroEquipIndices.length > 0) playerData.heroInventory = (playerData.heroInventory || []).filter((_, idx) => !heroEquipIndices.includes(idx));

    playerData.resources.gold += targetSellGold;
    saveGame();
    window.updateUI();
    showRewardPopup({ name: `${targetSellGold.toLocaleString()} GOLD`, icon: '💰', type: `SOLD ${ids.length} ITEMS` }, 'TRANSACTION COMPLETE');
    window.clearSellBasket();
};

window.buyShopItem = async (itemId) => {
    const { API } = await import('../core/api.js');
    try {
        const result = await API.buyShopItem(itemId);
        window.updateUI(); 
        renderShopUI();

        if (result.type && result.type.includes('GACHA') && result.obtainedItem) {
            showRewardPopup(result.obtainedItem, result.name, 'MYSTERY_BOX');
        } else if (result.obtainedCard) {
            showRewardPopup(result.obtainedCard, 'UNIT ACQUIRED', 'CARD');
        } else if (result.rewardType === 'ITEM_ADDED') {
            showRewardPopup({ name: result.name, icon: result.icon, type: "ADDED TO BAG" }, "Purchase Successful");
        } else {
            showRewardPopup(result, 'PURCHASE SUCCESS', 'NORMAL');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};
