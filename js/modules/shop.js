// js/modules/shop.js
import { playerData, saveGame } from '../core/state.js';
import { SHOP_GENERAL, SHOP_EQUIPMENT, SHOP_HEROES, SHOP_CARDS, EQUIPMENT_DATABASE, HERO_EQUIPMENT_DATABASE } from '../core/config.js';
import { getCardStats } from '../utils.js';
import { showToast, confirmModal, showRewardPopup } from './ui-notifications.js';

let currentTab = 'GENERAL';
let selectedSellUids = new Set(); // เก็บ UID หรือ Index ของสิ่งที่จะขาย

// ✅ State ใหม่: Tab ย่อยของหน้าขาย และ หน้าปัจจุบัน
let currentSellSubTab = 'CARD'; // 'CARD' หรือ 'EQUIP'
let currentSellPage = 1;
const ITEMS_PER_SELL_PAGE = 50; // ลิมิต 50 ชิ้นต่อหน้า

export function init() {
    renderShopUI();
}

function renderShopUI() {
    const container = document.getElementById('shop-container');
    if (!container) return; 

    container.className = "w-full max-w-6xl mx-auto pb-24";
    container.innerHTML = `
        <div class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-white/10 pb-4 pt-2 mb-6">
            <div class="flex justify-between items-center mb-4 px-4">
                <h2 class="text-3xl font-black text-white italic drop-shadow-lg flex items-center gap-2">
                    <i class="fa-solid fa-cart-shopping text-yellow-500"></i> BLACK MARKET
                </h2>
                <div class="bg-black/40 px-4 py-1 rounded-full border border-yellow-500/30 text-yellow-400 font-mono font-bold">
                    <i class="fa-solid fa-coins"></i> ${playerData.resources.gold.toLocaleString()}
                </div>
            </div>

            <div class="flex justify-center gap-2 overflow-x-auto custom-scrollbar px-2">
                ${renderTabBtn('GENERAL', 'fa-flask', 'Supplies')}
                ${renderTabBtn('EQUIP', 'fa-box-open', 'Equipment')}
                ${renderTabBtn('HERO', 'fa-user-shield', 'Heroes')}
                ${renderTabBtn('CARD', 'fa-id-card', 'Rare Cards')}
                ${renderTabBtn('SELL', 'fa-hand-holding-dollar', 'Sell Items', 'bg-red-900 text-red-200 border-red-500')}
            </div>
        </div>

        <div id="shop-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 animate-fade-in">
        </div>
    `;

    renderShopContent();
}

function renderTabBtn(tabId, icon, label, extraClass = '') {
    const isActive = currentTab === tabId;
    const activeClass = "bg-gradient-to-b from-yellow-500 to-yellow-700 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-105";
    const inactiveClass = "bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 border-white/10";
    const style = isActive ? activeClass : (extraClass || inactiveClass);

    return `
        <button onclick="window.switchShopTab('${tabId}')" 
            class="px-5 py-2 rounded-lg font-bold text-sm border-2 transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${style}">
            <i class="fa-solid ${icon}"></i> ${label}
        </button>
    `;
}

window.switchShopTab = (tabId) => {
    currentTab = tabId;
    // Reset Sell State
    if (tabId === 'SELL') {
        currentSellSubTab = 'CARD';
        currentSellPage = 1;
        selectedSellUids.clear();
    }
    renderShopUI();
};

function renderShopContent() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    if (currentTab === 'SELL') {
        renderSellPage(grid);
        return;
    }

    // (ส่วนการซื้อของ เหมือนเดิม)
    let items = [];
    if (currentTab === 'GENERAL') items = SHOP_GENERAL;
    if (currentTab === 'EQUIP') items = SHOP_EQUIPMENT;
    if (currentTab === 'HERO') items = SHOP_HEROES;
    if (currentTab === 'CARD') items = SHOP_CARDS;

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">No items available.</div>`;
        return;
    }

    items.forEach(item => {
        let isDisabled = false;
        let btnText = "BUY";
        
        if (item.type === 'UNLOCK_HERO') {
            const hasHero = playerData.heroes.some(h => h.heroId === item.value);
            if (hasHero) { isDisabled = true; btnText = "OWNED"; }
        }

        const currency = item.currency || 'GOLD';
        const isGem = currency === 'GEMS';
        const priceIcon = isGem ? '<i class="fa-solid fa-gem"></i>' : '<i class="fa-solid fa-coins"></i>';
        const priceColor = isGem ? 'text-purple-400' : 'text-yellow-400';

        const isImage = item.icon.includes('/') || item.icon.includes('.');
        const iconDisplay = isImage 
            ? `<img src="${item.icon}" class="w-full h-full object-cover rounded-full shadow-inner" loading="lazy" alt="${item.name}">`
            : item.icon;

        const cardHTML = `
            <div class="bg-slate-800/80 rounded-xl border border-white/10 p-4 flex flex-col items-center relative group hover:border-yellow-500/50 transition-all hover:bg-slate-800 shadow-lg">
                <div class="w-20 h-20 mb-3 bg-slate-900 rounded-full flex items-center justify-center text-4xl shadow-inner border border-white/5 group-hover:scale-110 transition-transform overflow-hidden">
                    ${iconDisplay}
                </div>
                <h3 class="font-bold text-white text-lg mb-1">${item.name}</h3>
                <p class="text-xs text-gray-400 text-center mb-4 min-h-[2.5em]">${item.desc}</p>
                <div class="mt-auto w-full">
                    <div class="flex justify-center items-center gap-1 mb-2 ${priceColor} font-mono font-bold">
                        ${priceIcon} ${item.cost.toLocaleString()}
                    </div>
                    <button onclick="window.buyShopItem('${item.id}')" 
                        class="w-full py-2 rounded-lg font-bold text-sm transition-all ${isDisabled 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : (isGem ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/30')
                            } active:scale-95" ${isDisabled ? 'disabled' : ''}>
                        ${btnText}
                    </button>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

// ==========================================
// 💰 SELL SYSTEM (UPDATED: SUB-TABS & PAGINATION)
// ==========================================

function renderSellPage(container) {
    // 1. Render Sub-Tabs
    const subTabHTML = `
        <div class="col-span-full flex justify-center gap-4 mb-6">
            <button onclick="window.switchSellSubTab('CARD')" class="px-6 py-2 rounded-full font-bold border ${currentSellSubTab === 'CARD' ? 'bg-orange-600 text-white border-orange-400' : 'bg-slate-800 text-gray-400 border-slate-700 hover:text-white'}">Sell Cards</button>
            <button onclick="window.switchSellSubTab('EQUIP')" class="px-6 py-2 rounded-full font-bold border ${currentSellSubTab === 'EQUIP' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-gray-400 border-slate-700 hover:text-white'}">Sell Equipment</button>
            <button onclick="window.switchSellSubTab('HERO_EQUIP')" class="px-6 py-2 rounded-full font-bold border ${currentSellSubTab === 'HERO_EQUIP' ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-800 text-gray-400 border-slate-700 hover:text-white'}">Sell Hero Gear</button>
        </div>
    `;
    container.innerHTML = subTabHTML;

    // 2. Prepare Data (ดึงของให้ถูกกระเป๋า) ✅
    let items = [];
    let sourceArray = []; // เก็บตัวแปรนี้ไว้ใช้อ้างอิงตอนคำนวณราคา
    let priceMultiplier = 1; // ตัวคูณราคา

    if (currentSellSubTab === 'CARD') {
        items = playerData.inventory.filter(c => !playerData.deck.includes(c.uid));
    } 
    else if (currentSellSubTab === 'HERO_EQUIP') {
        // ✅ ดึงจากกระเป๋าฮีโร่
        sourceArray = playerData.heroInventory || [];
        items = sourceArray.map((id, index) => ({ id, originalIndex: index }));
        priceMultiplier = 500; // ✅ ราคาของฮีโร่ (คูณ 500)
    } 
    else {
        // ✅ ดึงจากกระเป๋าธรรมดา
        sourceArray = playerData.equipment || [];
        items = sourceArray.map((id, index) => ({ id, originalIndex: index }));
        priceMultiplier = 200; // ✅ ราคาของธรรมดา (คูณ 200)
    }

    if (items.length === 0) {
        container.innerHTML += `<div class="col-span-full text-center text-gray-500 py-10">No items to sell.</div>`;
        return;
    }

    // 3. Pagination Logic
    const totalPages = Math.ceil(items.length / ITEMS_PER_SELL_PAGE);
    if (currentSellPage > totalPages) currentSellPage = totalPages;
    const startIndex = (currentSellPage - 1) * ITEMS_PER_SELL_PAGE;
    const pagedItems = items.slice(startIndex, startIndex + ITEMS_PER_SELL_PAGE);

    // 4. Render Grid & Calculate Total Price
    let gridHtml = "";
    let totalSellPrice = 0;

    if (currentSellSubTab === 'CARD') {
        // --- Render Cards ---
        pagedItems.forEach(card => {
            const stats = getCardStats(card);
            const sellPrice = (card.stars || 1) * 100 + (card.level * 10);
            const isSelected = selectedSellUids.has(card.uid);
            
            if (isSelected) totalSellPrice += sellPrice; // บวกราคา

            const isImage = stats.icon.includes('/') || stats.icon.includes('.');
            const iconDisplay = isImage ? `<img src="${stats.icon}" class="w-12 h-12 object-cover rounded-md">` : `<div class="text-3xl">${stats.icon}</div>`;

            gridHtml += `
                <div onclick="window.toggleSellCard('${card.uid}')" 
                    class="relative bg-slate-800 rounded-lg p-3 border cursor-pointer transition-all duration-200 ${isSelected ? 'border-red-500 bg-red-900/20' : 'border-white/10 hover:bg-slate-700'}">
                    <div class="absolute top-2 right-2 w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-500 bg-black/40 text-transparent'}"><i class="fa-solid fa-check text-xs"></i></div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 flex items-center justify-center bg-slate-900 rounded-md overflow-hidden">${iconDisplay}</div>
                        <div class="flex-1">
                            <div class="font-bold text-white text-sm ${isSelected ? 'text-red-300' : ''}">${stats.name}</div>
                            <div class="text-xs text-gray-400">Lv.${stats.level} • ⭐${stats.stars}</div>
                            <div class="text-xs font-mono text-yellow-500 mt-1">+${sellPrice.toLocaleString()} G</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // คำนวณราคารวมการ์ดใหม่จาก Selected Set (เพื่อให้ชัวร์)
        totalSellPrice = 0;
        selectedSellUids.forEach(uid => {
             const c = playerData.inventory.find(x => x.uid === uid);
             if(c) totalSellPrice += (c.stars || 1) * 100 + (c.level * 10);
        });

    } else {
        // --- Render Equipment (Both Normal & Hero) ---
        pagedItems.forEach(item => {
            const key = `eq_${item.originalIndex}`;
            
            // 1. ดึงข้อมูลไอเทม
            const dbItem = HERO_EQUIPMENT_DATABASE[item.id] || 
                EQUIPMENT_DATABASE[item.id] || 
                { name: item.id, icon: '📦', rarity: 'C' };
            // 2. คำนวณราคา
            const rarityVal = { C:1, U:2, R:3, SR:4, UR:5, LEGEND:6, MYTHICAL:7 }[dbItem.rarity] || 1;
            const sellPrice = rarityVal * priceMultiplier; 
            
            const isSelected = selectedSellUids.has(key);

            // 3. ✅ [แก้ใหม่] กำหนดสีตามระดับ (Rarity) ให้เหมือนหน้ากระเป๋า
            let borderClass = 'border-slate-600 bg-slate-800';
            let textClass = 'text-gray-400';
            let iconBg = 'bg-slate-900';

            // ถ้าถูกเลือกอยู่ ให้เป็นสีแดง/ส้ม (เหมือนเดิม)
            if (isSelected) {
                borderClass = 'border-red-500 bg-red-900/20';
                textClass = 'text-red-300';
                iconBg = 'bg-red-900/50';
            } else {
                // ถ้าไม่เลือก ให้แสดงสีตามระดับ
                if(dbItem.rarity === 'R') { 
                    borderClass = 'border-blue-500 bg-blue-900/10'; 
                    textClass = 'text-blue-300'; 
                }
                if(dbItem.rarity === 'SR') { 
                    borderClass = 'border-purple-500 bg-purple-900/10'; 
                    textClass = 'text-purple-300'; 
                }
                if(dbItem.rarity === 'UR') { 
                    borderClass = 'border-yellow-500 bg-yellow-900/10'; 
                    textClass = 'text-yellow-300'; 
                }
            }
            const isImage = dbItem.icon && (dbItem.icon.includes('/') || dbItem.icon.includes('.'));
            const iconDisplay = isImage 
                ? `<img src="${dbItem.icon}" class="w-full h-full object-cover rounded-full shadow-inner" loading="lazy" alt="${dbItem.name}">`
                : `<div class="text-3xl filter drop-shadow">${dbItem.icon}</div>`;

            gridHtml += `
                <div onclick="window.toggleSellCard('${key}')" 
                    class="relative rounded-lg p-3 border-2 cursor-pointer transition-all duration-200 ${borderClass} hover:brightness-110 shadow-sm">
                    
                    <div class="absolute top-2 right-2 w-5 h-5 rounded-full border flex items-center justify-center shadow ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-500/50 bg-black/40 text-transparent'}">
                        <i class="fa-solid fa-check text-[10px]"></i>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="w-14 h-14 flex items-center justify-center ${iconBg} rounded-lg border border-white/5 shadow-inner overflow-hidden">
                            ${iconDisplay}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-sm truncate ${textClass}">${dbItem.name}</div>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 ${textClass}">${dbItem.rarity}</span>
                                <div class="text-xs font-mono text-yellow-500">
                                    +${sellPrice.toLocaleString()} G
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // ✅ คำนวณราคารวมใหม่ (Fix: ใช้ sourceArray ที่ถูกต้อง)
        totalSellPrice = 0;
        selectedSellUids.forEach(key => {
            const idx = parseInt(key.split('_')[1]);
            // ตรวจสอบว่า Index นี้มีของอยู่จริงไหมในกระเป๋าปัจจุบัน
            if (sourceArray[idx]) {
                const eqId = sourceArray[idx];
                const dbItem = (currentSellSubTab === 'HERO_EQUIP' ? HERO_EQUIPMENT_DATABASE[eqId] : EQUIPMENT_DATABASE[eqId]) || { rarity: 'C' };
                const rarityVal = { C:1, U:2, R:3, SR:4, UR:5, LEGEND:6, MYTHICAL:7 }[dbItem.rarity] || 1;
                totalSellPrice += rarityVal * priceMultiplier; // คูณราคาให้ถูก
            }
        });
    }

    container.innerHTML += gridHtml;

    // 5. Pagination Controls (เหมือนเดิม)
    if (totalPages > 1) {
        const paginationHtml = `
            <div class="col-span-full flex justify-center items-center gap-4 mt-4 mb-20">
                <button onclick="window.changeSellPage(-1)" ${currentSellPage === 1 ? 'disabled class="opacity-30"' : ''} class="w-10 h-10 rounded-full bg-slate-800 text-white hover:bg-slate-700"><i class="fa-solid fa-chevron-left"></i></button>
                <span class="text-gray-400 font-bold">Page ${currentSellPage} / ${totalPages}</span>
                <button onclick="window.changeSellPage(1)" ${currentSellPage === totalPages ? 'disabled class="opacity-30"' : ''} class="w-10 h-10 rounded-full bg-slate-800 text-white hover:bg-slate-700"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        `;
        container.innerHTML += paginationHtml;
    }

    // 6. Action Bar
    const actionBarHtml = `
        <div class="col-span-full sticky bottom-4 z-30 mt-4 animate-fade-in-up">
            <div class="bg-slate-900/95 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
                <div>
                    <div class="text-xs text-gray-400 uppercase tracking-wider">Selected</div>
                    <div class="text-xl font-bold text-white"><span class="text-red-400">${selectedSellUids.size}</span> Items</div>
                </div>
                <div class="text-right flex-1 mr-4">
                    <div class="text-xs text-gray-400 uppercase tracking-wider">Total Gain</div>
                    <div class="text-2xl font-black text-yellow-400 font-mono"><i class="fa-solid fa-coins text-sm"></i> ${totalSellPrice.toLocaleString()}</div>
                </div>
                <button onclick="window.executeSell()" class="px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${selectedSellUids.size > 0 ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-red-500/50' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}">SELL</button>
            </div>
        </div>
    `;
    container.innerHTML += actionBarHtml;
}

window.switchSellSubTab = (subTab) => {
    currentSellSubTab = subTab;
    currentSellPage = 1;
    selectedSellUids.clear();
    const grid = document.getElementById('shop-grid');
    if(grid) renderSellPage(grid);
};

window.changeSellPage = (delta) => {
    currentSellPage += delta;
    const grid = document.getElementById('shop-grid');
    if(grid) renderSellPage(grid);
    document.getElementById('shop-container')?.scrollIntoView({ behavior: 'smooth' });
};

window.toggleSellCard = (key) => {
    if (selectedSellUids.has(key)) selectedSellUids.delete(key);
    else selectedSellUids.add(key);
    const grid = document.getElementById('shop-grid');
    if(grid) renderSellPage(grid);
};

window.executeSell = async () => {
    if (selectedSellUids.size === 0) return showToast("Select items first", "warning");

    let totalGain = 0;
    let count = 0;

    // ---------------------------------------------------------
    // 🃏 CASE 1: ขายการ์ด (Sell Cards)
    // ---------------------------------------------------------
    if (currentSellSubTab === 'CARD') {
        const cardsToSell = playerData.inventory.filter(c => selectedSellUids.has(c.uid));
        
        // เช็คการ์ดหายาก
        const highRarity = cardsToSell.filter(c => (c.stars || 1) > 4);
        if (highRarity.length > 0) {
            const ok = await confirmModal({
                title: "HIGH VALUE WARNING",
                message: `Selling <b class="text-red-400">${highRarity.length}</b> 5⭐+ cards. Proceed?`,
                isDangerous: true, requireInput: "CONFIRM"
            });
            if (!ok) return;
        } else {
            if (!await confirmModal({ title: "CONFIRM SALE", message: `Sell ${cardsToSell.length} cards?`, isDangerous: false })) return;
        }

        cardsToSell.forEach(c => totalGain += (c.stars || 1) * 100 + (c.level * 10));
        playerData.inventory = playerData.inventory.filter(c => !selectedSellUids.has(c.uid));
        count = cardsToSell.length;
    } 
    
    // ---------------------------------------------------------
    // 🛡️ CASE 2: ขายอุปกรณ์ฮีโร่ (Sell Hero Gear) ✅ แก้ไขใหม่
    // ---------------------------------------------------------
    else if (currentSellSubTab === 'HERO_EQUIP') {
        // ดึง Index ที่ต้องการขายออกมา
        const indicesToSell = Array.from(selectedSellUids).map(k => parseInt(k.split('_')[1]));
        
        if (!await confirmModal({ title: "CONFIRM SALE", message: `Sell ${indicesToSell.length} hero gears?`, isDangerous: false })) return;

        indicesToSell.forEach(idx => {
            const eqId = playerData.heroInventory[idx]; // 👈 ดึงจาก heroInventory
            const dbItem = HERO_EQUIPMENT_DATABASE[eqId] || { rarity: 'C' };
            const rarityVal = { C:1, U:2, R:3, SR:4, UR:5, LEGEND:6, MYTHICAL:7 }[dbItem.rarity] || 1;
            totalGain += rarityVal * 500; // ของฮีโร่ราคาแพงกว่า
        });

        // 👈 ลบออกจาก heroInventory
        playerData.heroInventory = playerData.heroInventory.filter((_, index) => !indicesToSell.includes(index));
        count = indicesToSell.length;
    }

    // ---------------------------------------------------------
    // 📦 CASE 3: ขายอุปกรณ์ทั่วไป (Sell Equipment)
    // ---------------------------------------------------------
    else { 
        const indicesToSell = Array.from(selectedSellUids).map(k => parseInt(k.split('_')[1]));
        
        if (!await confirmModal({ title: "CONFIRM SALE", message: `Sell ${indicesToSell.length} equipment?`, isDangerous: false })) return;

        indicesToSell.forEach(idx => {
            const eqId = playerData.equipment[idx]; // 👈 ดึงจาก equipment
            const dbItem = EQUIPMENT_DATABASE[eqId] || { rarity: 'C' };
            const rarityVal = { C:1, U:2, R:3, SR:4, UR:5, LEGEND:6, MYTHICAL:7 }[dbItem.rarity] || 1;
            totalGain += rarityVal * 200;
        });

        // 👈 ลบออกจาก equipment
        playerData.equipment = playerData.equipment.filter((_, index) => !indicesToSell.includes(index));
        count = indicesToSell.length;
    }

    // --- จบขั้นตอน: รับเงินและบันทึก ---
    playerData.resources.gold += totalGain;
    selectedSellUids.clear();
    saveGame();
    window.updateUI();
    
    // รีเฟรชหน้าขายของ
    const grid = document.getElementById('shop-grid');
    if(grid) renderSellPage(grid);

    showRewardPopup({ name: `${totalGain.toLocaleString()} GOLD`, icon: '💰', type: `SOLD ${count} ITEMS` }, 'TRANSACTION COMPLETE');
};

// ==========================================
// 🛒 BUY LOGIC (ใช้ API.js)
// ==========================================
window.buyShopItem = async (itemId) => {
    // โหลด API แบบ Dynamic Import เพื่อป้องกัน Circular Dependency
    const { API } = await import('../core/api.js');
    
    try {
        // เรียกใช้ API หลังบ้าน (Logic การตัดเงินและเพิ่มของอยู่ที่นั่น)
        const result = await API.buyShopItem(itemId);

        // อัปเดตหน้าจอ
        window.updateUI(); 
        renderShopUI();

        // แสดงผลรางวัลตามสิ่งที่ได้กลับมา
        if (result.type.includes('GACHA') && result.obtainedItem) {
            showRewardPopup(result.obtainedItem, result.name, 'MYSTERY_BOX');
        } else if (result.obtainedCard) {
            showRewardPopup(result.obtainedCard, 'UNIT ACQUIRED', 'CARD');
        } else if (result.rewardType === 'ITEM_ADDED') {
            // ✅ ซื้อของแล้วเข้ากระเป๋า
            showRewardPopup({ name: result.name, icon: result.icon, type: "ADDED TO BAG" }, "Purchase Successful");
        } else {
            // กรณีอื่นๆ
            let title = 'PURCHASE SUCCESS';
            showRewardPopup(result, title, 'NORMAL');
        }

    } catch (err) {
        showToast(err.message, 'error');
    }
};