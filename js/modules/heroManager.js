// js/modules/heroManager.js
import { playerData, saveGame } from '../core/state.js';
import { HERO_DATABASE, HERO_EQUIPMENT_DATABASE, EQUIPMENT_DATABASE } from '../core/config.js';
import { getHeroStats, getMaxExp } from '../utils.js';

// ✅ ฟังก์ชัน Helper สำหรับแสดงไอคอน (เพิ่มไว้บนสุด)
function renderIconHtml(icon, className = "") {
    if (!icon) return '?';
    // เช็คว่าเป็นรูปภาพ (มีนามสกุลไฟล์) หรือ Emoji
    const isImage = icon.includes('/') || icon.includes('.');
    if (isImage) {
        return `<img src="${icon}" class="w-full h-full object-cover rounded ${className}">`;
    } else {
        return `<div class="text-3xl ${className}">${icon}</div>`;
    }
}

// Helper: ดึงข้อมูลไอเทม
function getItemData(id) {
    if (!id) return null;
    return HERO_EQUIPMENT_DATABASE[id] || EQUIPMENT_DATABASE[id] || null;
}

let currentViewingHeroUid = null;

// ==========================================
// 1. หน้าโปรไฟล์ฮีโร่ (HERO PROFILE)
// ==========================================
export function openHeroProfile(heroUid = null) {
    const targetUid = heroUid || playerData.activeHeroId; 
    
    // หา Hero
    let heroData = playerData.heroes.find(h => h.uid === targetUid) || 
                   playerData.heroes.find(h => h.heroId === targetUid) || 
                   playerData.heroes[0];

    if (!heroData) return;

    currentViewingHeroUid = heroData.uid || heroData.heroId;
    const heroStats = getHeroStats(heroData); 
    
    const isImage = heroStats.icon.includes('/') || heroStats.icon.includes('.');

    const oldModal = document.getElementById('hero-profile-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'hero-profile-modal';
    modal.className = "fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-fade-in";
    
    modal.innerHTML = `
        <div class="bg-slate-900 w-full max-w-4xl rounded-2xl border-2 border-yellow-600 shadow-2xl flex flex-col md:flex-row overflow-hidden relative max-h-[90vh]">
            <button onclick="document.getElementById('hero-profile-modal').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-white z-10 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center"><i class="fa-solid fa-xmark text-xl"></i></button>

            <div class="w-full md:w-1/3 bg-slate-800 p-6 flex flex-col items-center border-r border-slate-700 relative overflow-hidden group overflow-y-auto custom-scrollbar">
                
                <div class="my-4 w-40 h-40 flex items-center justify-center relative z-10">
                    ${isImage 
                        ? `<img src="${heroStats.icon}" class="w-full h-full object-cover object-top rounded-full shadow-[0_0_20px_gold] border-4 border-yellow-600" alt="${heroStats.name}">`
                        : `<div class="text-8xl drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-bounce-slow">${heroStats.icon}</div>`
                    }
                </div>

                <h2 class="text-3xl font-bold text-white text-center z-10">${heroStats.name}</h2>
                <div class="text-yellow-400 font-bold mb-4 z-10">${heroStats.job}</div>

                <div class="w-full bg-black/40 p-3 rounded-lg space-y-2 mb-4 border border-white/10 z-10">
                    <div class="flex justify-between text-sm"><span>CP Power</span><span class="text-orange-400 font-bold text-lg">${heroStats.power.toLocaleString()}</span></div>
                    <div class="flex justify-between text-sm"><span>Level</span><span class="text-white font-bold">${heroStats.level}</span></div>
                    <div class="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                        <div class="bg-blue-500 h-full" style="width: ${(heroStats.exp / getMaxExp(heroStats.level)) * 100}%"></div>
                    </div>
                </div>

                <div class="w-full bg-indigo-900/30 p-3 rounded-lg border border-indigo-500/50 mb-4 z-10 relative overflow-hidden">
                    <div class="absolute -right-2 -top-2 text-indigo-500/20 text-4xl"><i class="fa-solid fa-crown"></i></div>
                    <div class="text-[10px] text-indigo-300 font-bold uppercase mb-1">Leader Skill (Passive)</div>
                    <div class="text-white font-bold text-sm mb-1"><i class="fa-solid fa-bolt text-yellow-400 mr-1"></i> ${heroStats.passive.name}</div>
                    <div class="text-xs text-gray-300 leading-tight">${heroStats.passive.desc}</div>
                </div>

                <div class="grid grid-cols-2 gap-2 w-full text-sm z-10">
                    <div class="bg-slate-700/50 p-2 rounded border border-red-500/30 flex justify-between"><span>ATK</span> <span class="text-red-400 font-bold">${heroStats.atk}</span></div>
                    <div class="bg-slate-700/50 p-2 rounded border border-green-500/30 flex justify-between"><span>HP</span> <span class="text-green-400 font-bold">${heroStats.hp}</span></div>
                    <div class="bg-slate-700/50 p-2 rounded border border-blue-500/30 flex justify-between"><span>DEF</span> <span class="text-blue-300 font-bold">${heroStats.def}</span></div>
                    <div class="bg-slate-700/50 p-2 rounded border border-yellow-500/30 flex justify-between"><span>SPD</span> <span class="text-yellow-200 font-bold">${heroStats.spd}</span></div>
                </div>
            </div>

            <div class="w-full md:w-2/3 p-6 flex flex-col bg-slate-900 overflow-y-auto">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                    <i class="fa-solid fa-shirt text-blue-400"></i> Hero Equipment
                </h3>
                
                <div class="flex justify-center gap-3 mb-6 flex-wrap">
                    ${renderHeroSlot(heroStats, 'weapon')}
                    ${renderHeroSlot(heroStats, 'helm')}
                    ${renderHeroSlot(heroStats, 'armor')}
                    ${renderHeroSlot(heroStats, 'boots')}
                    ${renderHeroSlot(heroStats, 'accessory')}
                </div>

                <button onclick="openHeroSwapModal()" class="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold rounded-lg transition">
                    SWITCH HERO
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function renderHeroSlot(hero, type) {
    // 1. ดึงข้อมูลไอเทม
    const equipId = hero.equipped ? hero.equipped[type] : null;
    let item = null;
    
    // ✅ ค้นหาไอเทมจากทั้ง 2 Database (แก้ไขใหม่: ลบ require ออก)
    if (equipId) {
        // ใช้ตัวแปรที่ import มาจากด้านบนได้เลย
        item = (HERO_EQUIPMENT_DATABASE && HERO_EQUIPMENT_DATABASE[equipId]) || 
               (EQUIPMENT_DATABASE && EQUIPMENT_DATABASE[equipId]);
    }

    // fallback icon ถ้าไม่มีของ
    const iconMap = { weapon: '⚔️', helm: '👕', armor: '🛡️', boots: '👢', accessory: '💍' };
    
    // 2. กำหนด Style
    const rarityClass = item ? `rarity-${item.rarity}` : 'border-slate-700 bg-slate-900/50 border-dashed opacity-50';
    
    // 3. สร้าง HTML ของไอคอน (เรียกใช้ฟังก์ชัน Helper)
    let contentHtml = '';
    if (item) {
        contentHtml = renderIconHtml(item.icon);
    } else {
        contentHtml = `<div class="text-2xl opacity-30">${iconMap[type]}</div>`;
    }

    return `
        <div onclick="window.openHeroEquipManager('${type}')" 
             class="w-16 h-16 rounded-lg border-2 ${rarityClass} flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition relative overflow-hidden group shadow-lg">
            
            ${item ? '<div class="foil-shine"></div>' : ''}
            
            <div class="relative z-10 w-full h-full flex items-center justify-center p-1">
                ${contentHtml}
            </div>

            <div class="absolute bottom-0 w-full bg-black/60 text-[6px] text-center text-white font-bold uppercase py-0.5 backdrop-blur-sm z-20">
                ${type}
            </div>
        </div>
    `;
}

// ==========================================
// 2. ระบบจัดการสวมใส่ (คงเดิม)
// ==========================================
export function openHeroEquipManager(type) {
    const modalId = 'hero-equip-manager';
    const oldModal = document.getElementById(modalId);
    if (oldModal) oldModal.remove();

    const hero = playerData.heroes.find(h => (h.uid || h.heroId) === currentViewingHeroUid);
    if(!hero) return;

    if (!playerData.heroInventory) playerData.heroInventory = [];
    
    const availableItems = playerData.heroInventory.filter(id => {
        const dbItem = getItemData(id);
        return dbItem && dbItem.type === type;
    });

    const currentEquipId = hero.equipped[type];
    const currentItem = getItemData(currentEquipId);

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = "fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4 animate-fade-in";
    
    modal.innerHTML = `
        <div class="bg-slate-800 w-full max-w-md rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col max-h-[80vh]">
            <div class="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 class="text-xl font-bold text-yellow-400 uppercase">Manage ${type}</h3>
                <button onclick="document.getElementById('${modalId}').remove()" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark text-2xl"></i></button>
            </div>

            <div class="p-4 flex-1 overflow-y-auto space-y-6">
                <div class="bg-slate-900/50 p-3 rounded-lg border border-blue-500/30">
                    <div class="text-xs text-blue-400 font-bold mb-2 uppercase">Currently Equipped</div>
                    ${currentItem ? `
                        <div class="flex items-center gap-3 bg-slate-800 p-2 rounded border border-blue-500 shadow-md">
                            <div class="w-12 h-12 flex-shrink-0 bg-slate-900 rounded border border-white/10 overflow-hidden flex items-center justify-center">
                                ${renderIconHtml(currentItem.icon)}
                            </div>
                            <div class="flex-1">
                                <div class="font-bold text-white">${currentItem.name}</div>
                                <div class="text-xs text-green-400">${getStatString(currentItem)}</div>
                            </div>
                            <button onclick="heroUnequipItem('${type}')" class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded shadow">UNEQUIP</button>
                        </div>
                    ` : `
                        <div class="flex items-center justify-center h-14 border-2 border-dashed border-gray-700 rounded text-gray-500 text-sm italic">Empty Slot</div>
                    `}
                </div>

                <div>
                    <div class="flex justify-between text-xs text-gray-400 font-bold mb-2 uppercase">
                        <span>Hero Inventory</span>
                        <span>${availableItems.length} Items</span>
                    </div>
                    <div class="space-y-2">
                        ${availableItems.length === 0 ? '<div class="text-center text-gray-600 py-4 italic">No items found.</div>' : ''}
                        ${availableItems.map(itemId => {
                            const item = getItemData(itemId);
                            return `
                                <div class="flex items-center gap-3 bg-slate-700/50 p-2 rounded border border-slate-600 hover:border-yellow-400 transition cursor-pointer group">
                                    <div class="w-10 h-10 flex-shrink-0 bg-slate-800 rounded border border-white/10 overflow-hidden flex items-center justify-center">
                                        ${renderIconHtml(item.icon)}
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-sm font-bold text-gray-200">${item.name}</div>
                                        <div class="text-[10px] text-green-400">${getStatString(item)}</div>
                                    </div>
                                    <button onclick="heroEquipItem('${type}', '${itemId}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded shadow opacity-80 group-hover:opacity-100">EQUIP</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ✅ EXPORT และผูก window
export function heroEquipItem(type, itemId) {
    const hero = playerData.heroes.find(h => (h.uid || h.heroId) === currentViewingHeroUid);
    if(!hero) return;
    if(hero.equipped[type]) playerData.heroInventory.push(hero.equipped[type]);
    const idx = playerData.heroInventory.indexOf(itemId);
    if(idx > -1) playerData.heroInventory.splice(idx, 1);
    hero.equipped[type] = itemId;
    saveAndRefresh(type);
}

export function heroUnequipItem(type) {
    const hero = playerData.heroes.find(h => (h.uid || h.heroId) === currentViewingHeroUid);
    if(!hero || !hero.equipped[type]) return;
    playerData.heroInventory.push(hero.equipped[type]);
    hero.equipped[type] = null;
    saveAndRefresh(type);
}

window.heroEquipItem = heroEquipItem;
window.heroUnequipItem = heroUnequipItem;
window.openHeroEquipManager = openHeroEquipManager;

function saveAndRefresh(type) {
    saveGame();
    openHeroEquipManager(type);
    openHeroProfile(currentViewingHeroUid);
    if(window.renderHeroDeckSlot) window.renderHeroDeckSlot();
    if(window.renderDeckStats) window.renderDeckStats();
}

function getStatString(item) {
    let s = [];
    if(item.atk) s.push(`ATK+${item.atk}`);
    if(item.def) s.push(`DEF+${item.def}`);
    if(item.hp) s.push(`HP+${item.hp}`);
    if(item.spd) s.push(`SPD+${item.spd}`);
    if(item.crit) s.push(`CRIT+${Math.round(item.crit*100)}%`);
    return s.join(', ');
}

// ==========================================
// 3. ระบบเปลี่ยนตัว (SWAP HERO)
// ==========================================
export function openHeroSwapModal() {
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-4 animate-fade-in";
    
    modal.innerHTML = `
        <div class="bg-slate-900 w-full max-w-lg rounded-xl border border-slate-600 shadow-2xl flex flex-col max-h-[80vh]">
            <div class="p-4 border-b border-slate-700 flex justify-between">
                <h3 class="text-xl font-bold text-white">Select Active Hero</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">CLOSE</button>
            </div>
            <div class="p-4 overflow-y-auto space-y-3">
                ${playerData.heroes.map(h => {
                    const stats = getHeroStats(h);
                    const isActive = h.heroId === playerData.activeHeroId;
                    const isImage = stats.icon.includes('/') || stats.icon.includes('.');
                    const iconDisplay = isImage 
                        ? `<img src="${stats.icon}" class="w-12 h-12 object-cover rounded-full border border-gray-500">`
                        : `<div class="text-4xl">${stats.icon}</div>`;

                    return `
                        <div onclick="selectActiveHero('${h.heroId}')" class="flex items-center gap-4 p-3 rounded-lg border-2 cursor-pointer transition ${isActive ? 'bg-yellow-900/20 border-yellow-500' : 'bg-slate-800 border-slate-700 hover:border-blue-500'}">
                            ${iconDisplay}
                            
                            <div class="flex-1">
                                <div class="font-bold text-white flex items-center gap-2">
                                    ${stats.name} 
                                    ${isActive ? '<span class="bg-yellow-600 text-black text-[10px] px-1.5 py-0.5 rounded font-bold">ACTIVE</span>' : ''}
                                </div>
                                <div class="text-xs text-gray-400">${stats.job} • Lv.${stats.level}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-orange-400 font-bold text-sm">CP ${stats.power}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

export function selectActiveHero(heroId) {
    playerData.activeHeroId = heroId;
    saveGame();
    document.querySelectorAll('.fixed').forEach(el => el.remove());
    openHeroProfile(heroId);
    if(window.renderHeroDeckSlot) window.renderHeroDeckSlot();
    window.updateUI();
}

window.selectActiveHero = selectActiveHero;