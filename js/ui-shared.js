// js/ui-shared.js
import { ELEMENTS } from './core/config.js';
import { getAttackTypeIcon, renderStars } from './utils.js';
import { playerData } from './core/state.js'; 

export function updateUI() {
    // 1. ดึง Element ทั้งหมด
    const staminaEl = document.getElementById('stamina-display');
    const goldEl = document.getElementById('gold-display');
    const gemEl = document.getElementById('gem-display');
    const streakEl = document.getElementById('win-streak-display');
    const ticketEl = document.getElementById('arena-ticket-display');
    
    // 2. อัปเดตข้อมูล (ใส่ Safety Check กัน Error)
    if (playerData.resources) {
        if(staminaEl) staminaEl.innerText = `${playerData.resources.stamina}/${playerData.resources.maxStamina}`;
        if(goldEl) goldEl.innerText = playerData.resources.gold.toLocaleString();
        if(gemEl) gemEl.innerText = (playerData.resources.gems || 0).toLocaleString();
    }

    if (playerData.stageWins && streakEl) {
        streakEl.innerText = playerData.stageWins;
    }

    // 3. อัปเดตตั๋ว Arena
    if (ticketEl && playerData.arena) {
        ticketEl.innerText = `${playerData.arena.tickets}/5`;
    }
}

export function createCardElement(card, mode, isSelected = false) {
    const el = document.createElement('div');
    
    // 1. กำหนด Class ตามระดับดาว
    const starCount = card.stars || 1;
    let rarityClass = "rarity-C";
    if (starCount === 2) rarityClass = "rarity-U";
    if (starCount === 3) rarityClass = "rarity-R";
    if (starCount === 4) rarityClass = "rarity-SR";
    if (starCount === 5) rarityClass = "rarity-UR";
    if (starCount === 6) rarityClass = "rarity-LEGEND";
    if (starCount >= 7)  rarityClass = "rarity-MYTHICAL";

    // ข้อมูลธาตุ (ปรับสีพื้นหลังให้ทึบขึ้น ไม่ใช้ opacity เพื่อลดการคำนวณ)
    const elemData = {
        FIRE: { icon: '🔥', color: 'text-red-400', bg: 'bg-red-900' },
        WATER: { icon: '💧', color: 'text-blue-400', bg: 'bg-blue-900' },
        NATURE: { icon: '🌿', color: 'text-green-400', bg: 'bg-green-900' },
        LIGHT: { icon: '⚡', color: 'text-yellow-300', bg: 'bg-yellow-900' },
        DARK: { icon: '🌑', color: 'text-purple-400', bg: 'bg-purple-900' }
    }[card.element] || { icon: '⚪', color: 'text-gray-400', bg: 'bg-gray-800' };

    // ดาว
    let starsHtml = '';
    if (starCount >= 7) {
        starsHtml = `
            <div class="flex items-center justify-center animate-pulse" title="Mythical Rank">
                <i class="fa-solid fa-infinity text-sm text-cyan-400 drop-shadow-md"></i>
            </div>
        `;
    } else {
        const starColor = starCount === 6 ? 'text-orange-500' : 'text-yellow-400';
        for(let i=0; i < starCount; i++) {
            starsHtml += `<i class="fa-solid fa-star text-[9px] mx-[0.5px] ${starColor}"></i>`;
        }
    }

    // เช็คว่าเป็นรูปภาพหรือ Emoji
    const isImage = card.icon.includes('/') || card.icon.includes('.');
    const atkIcon = getAttackTypeIcon(card.role, card.type);

    // --- 🚀 PERFORMANCE OPTIMIZATION ---
    // ใช้ will-change: transform เพื่อให้ GPU ช่วย render
    // ตัด backdrop-blur ออก เปลี่ยนเป็นสีพื้นหลังโปร่งแสงธรรมดา (bg-slate-900/90)
    
    el.className = `game-card-v2 w-full h-[95px] sm:h-[130px] md:h-[173px] rounded-xl flex flex-col justify-between cursor-pointer group ${rarityClass} ${isSelected ? 'ring-4 ring-green-500 scale-95 opacity-60' : ''} relative overflow-hidden bg-slate-900 shadow-md transition-transform duration-200`;
    el.style.willChange = "transform"; 

    el.innerHTML = `
        <div class="absolute inset-0 z-0">
            ${isImage 
                ? `<img src="${card.icon}" class="w-full h-full object-top group-hover:scale-105 transition-transform duration-500" loading="lazy" alt="${card.name}">`
                : `<div class="w-full h-full flex items-center justify-center text-7xl bg-slate-800 text-slate-600">${card.icon}</div>`
            }
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none"></div>
        </div>

        ${(starCount >= 3 && starCount < 6) ? '<div class="foil-shine z-10 opacity-20 pointer-events-none"></div>' : ''}
        ${starCount === 6 ? '<div class="legendary-fire z-10 opacity-30 pointer-events-none"></div>' : ''}
        
        <div class="relative z-20 flex justify-between items-start p-2">
            <div class="w-7 h-7 rounded-lg ${elemData.bg} border border-white/20 flex items-center justify-center shadow">
                <span class="${elemData.color} text-sm">${elemData.icon}</span>
            </div>
            <div class="bg-slate-900/90 px-2 py-0.5 rounded text-[9px] font-bold text-gray-200 border border-white/10 shadow">
                CP <span class="text-white text-[10px]">${card.power || 0}</span>
            </div>
        </div>

        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black text-white/5 pointer-events-none z-10 tracking-tighter">
            ${(card.rarity || 'COM').substring(0,3)} 
        </div>
        
        <div class="flex-1"></div>

        <div class="relative z-20 p-2 space-y-1">
            
            <div class="flex justify-between items-end mb-1 pl-1">
                <div class="text-xs font-bold text-white truncate max-w-[70%] drop-shadow-md">${card.name}</div>
                <div class="flex drop-shadow-md">${starsHtml}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-200 bg-slate-900/95 rounded border border-white/10 p-1 shadow-sm">
                <div class="flex items-center gap-1.5 pl-1">
                    <span class="text-sm">${atkIcon}</span>
                    <span class="font-bold text-white">${card.atk}</span>
                </div>
                <div class="flex items-center justify-end gap-1.5 pr-1">
                    <span class="font-bold text-white">${card.hp}</span>
                    <i class="fa-solid fa-heart text-red-500 text-[10px]"></i>
                </div>
            </div>
        </div>

        <div class="info-btn absolute top-10 right-2 w-6 h-6 hidden group-hover:flex bg-slate-800/90 hover:bg-blue-600 rounded-full items-center justify-center text-[10px] text-white shadow border border-white/20 z-30 transition-colors">
            <i class="fa-solid fa-info"></i>
        </div>

        ${mode === 'deck' ? '<div class="absolute -top-2 -right-2 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg z-30 hover:bg-red-500 border-2 border-slate-900">✕</div>' : ''}
    `;

    return el;
}

export function createEmptySlot(index, container) {
    const empty = document.createElement('div');
    // ลดความซับซ้อนของ CSS
    empty.className = 'deck-slot-empty w-full h-[95px] sm:h-[130px] md:h-[173px] border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition bg-slate-800/30';
    empty.innerHTML = `<span class="text-xs text-gray-500 font-bold">Slot ${index+1}</span><i class="fa-solid fa-plus text-2xl text-gray-600 mt-2"></i>`;
    
    // รองรับการ append เข้าทั้ง Element ปกติและ DocumentFragment
    if (container.nodeType === Node.ELEMENT_NODE || container.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        container.appendChild(empty);
    }
}
