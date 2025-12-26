// js/modules/stage.js
import { playerData, saveGame } from '../core/state.js';
import { STAGE_LIST, CARD_DATABASE, ENEMY_DATABASE, EQUIPMENT_DATABASE, HERO_EQUIPMENT_DATABASE, SHOP_GENERAL } from '../core/config.js';
import { showToast } from './ui-notifications.js';

// State สำหรับจำว่ากำลังดู World ไหนอยู่ (null = ดูหน้ารวม World)
let currentSelectedWorld = null;

// Helper: ดึงข้อมูลไอเทม (เหมือนเดิม)
function getItemInfo(itemId) {
    if (EQUIPMENT_DATABASE[itemId]) return EQUIPMENT_DATABASE[itemId];
    if (HERO_EQUIPMENT_DATABASE[itemId]) return HERO_EQUIPMENT_DATABASE[itemId];
    const shopItem = SHOP_GENERAL.find(i => i.id === itemId);
    if (shopItem) return shopItem;
    return { name: itemId, icon: '❓', rarity: 'C' };
}

// Helper: สร้าง HTML รูปภาพ (เหมือนเดิม)
function renderIconHtml(icon, className = "") {
    if (!icon) return '?';
    const isImage = icon.includes('/') || icon.includes('.');
    if (isImage) {
        return `<img src="${icon}" class="w-full h-full object-cover ${className}" alt="icon">`;
    } else {
        return `<div class="${className}">${icon}</div>`; 
    }
}

export function init() {
    currentSelectedWorld = null; // รีเซ็ตทุกครั้งที่เข้าใหม่
    renderStageUI();
}

// ฟังก์ชันหลัก เลือกวาดหน้าจอตาม State
function renderStageUI() {
    const container = document.getElementById('stage-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (currentSelectedWorld === null) {
        renderWorldSelector(container);
    } else {
        renderStageList(container, currentSelectedWorld);
    }
}

// ------------------------------------------------------------------
// 🌍 1. หน้าเลือก WORLD (World Select)
// ------------------------------------------------------------------
function renderWorldSelector(container) {
    // หาจำนวน World ทั้งหมดที่มี
    const uniqueWorlds = [...new Set(STAGE_LIST.map(s => s.world))];
    
    // Header
    container.innerHTML = `
        <div class="text-center mb-8 animate-fade-in-down">
            <h2 class="text-4xl font-black text-white italic drop-shadow-lg uppercase">
                <i class="fa-solid fa-map-location-dot text-yellow-500"></i> World Select
            </h2>
            <p class="text-gray-400 text-sm mt-2">Choose your destination</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in px-4 pb-24">
            ${uniqueWorlds.map(worldId => renderWorldCard(worldId)).join('')}
        </div>
    `;
}

function renderWorldCard(worldId) {
    // หาด่านแรกของ World นี้เพื่อเอารูปมาเป็นปก
    const firstStage = STAGE_LIST.find(s => s.world === worldId);
    const bgImage = firstStage?.image || ''; 
    const hasBg = bgImage.includes('/') || bgImage.includes('.');
    
    // เช็คว่า World นี้ปลดล็อคหรือยัง (เช็คด่านแรกของ World)
    // หรือเช็คว่าจบ World ก่อนหน้าหรือยัง
    const prevWorldLastStage = STAGE_LIST.filter(s => s.world === worldId - 1).pop();
    let isUnlocked = true;
    
    if (worldId > 1) {
        // ต้องจบด่านสุดท้ายของ World ก่อนหน้า
        if (playerData.stageProgress && prevWorldLastStage) {
            const prog = playerData.stageProgress[prevWorldLastStage.id];
            isUnlocked = prog && prog.cleared;
        } else {
            isUnlocked = false; // กันเหนียว
        }
    }

    // จำนวนดาวที่ได้ใน World นี้
    const stagesInWorld = STAGE_LIST.filter(s => s.world === worldId);
    let totalStars = 0;
    let maxStars = stagesInWorld.length * 3;
    stagesInWorld.forEach(s => {
        if (playerData.stageProgress && playerData.stageProgress[s.id]) {
            totalStars += playerData.stageProgress[s.id].stars;
        }
    });

    const clickAction = isUnlocked ? `window.selectWorld(${worldId})` : "";
    
    // Style
    const grayscale = isUnlocked ? '' : 'grayscale opacity-50 cursor-not-allowed';
    const bgStyle = hasBg 
        ? `background-image: url('${bgImage}');` 
        : `background: linear-gradient(135deg, #1e293b, #0f172a);`;

    return `
        <div onclick="${clickAction}" 
             class="relative h-48 rounded-2xl border-2 border-slate-600 overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:border-yellow-500 shadow-xl cursor-pointer ${grayscale}">
            
            <div class="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110" style="${bgStyle}"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

            <div class="absolute inset-0 p-6 flex flex-col justify-end">
                <div class="flex justify-between items-end">
                    <div>
                        <div class="text-yellow-500 font-black text-sm tracking-widest uppercase mb-1">World ${worldId}</div>
                        <h3 class="text-3xl font-bold text-white leading-none drop-shadow-md group-hover:text-yellow-300 transition">
                            ${isUnlocked ? `Chapter ${worldId}` : 'LOCKED'}
                        </h3>
                    </div>
                    ${isUnlocked ? `
                    <div class="text-right">
                        <div class="text-2xl font-bold text-white drop-shadow-md">${totalStars}/${maxStars}</div>
                        <div class="text-[10px] text-gray-300 uppercase"><i class="fa-solid fa-star text-yellow-400"></i> Stars Collected</div>
                    </div>` : '<i class="fa-solid fa-lock text-3xl text-gray-500"></i>'}
                </div>
            </div>
        </div>
    `;
}

// ------------------------------------------------------------------
// ⚔️ 2. หน้าเลือก STAGE (Inside World)
// ------------------------------------------------------------------
function renderStageList(container, worldId) {
    const stages = STAGE_LIST.filter(s => s.world === worldId);

    container.innerHTML = `
        <div class="mb-6 flex items-center justify-between px-2 animate-fade-in-down">
            <button onclick="window.backToWorlds()" class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 hover:border-white transition flex items-center gap-2">
                <i class="fa-solid fa-arrow-left"></i> Back to Map
            </button>
            <h2 class="text-2xl font-black text-white uppercase italic drop-shadow-lg">
                World ${worldId} <span class="text-yellow-500 text-lg not-italic ml-2">(${stages.length} Stages)</span>
            </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in pb-24">
            ${stages.map(stage => renderStageCardWithImage(stage)).join('')}
        </div>
    `;
}

// ✅ การ์ดด่านแบบใหม่ (มีรูป Background ตามที่คุณขอ)
function renderStageCardWithImage(stage) {
    if (!playerData.stageProgress) playerData.stageProgress = {};
    const prevStageId = stage.id - 1;
    const isUnlocked = stage.id === 1 || (playerData.stageProgress[prevStageId] && playerData.stageProgress[prevStageId].cleared);
    const progress = playerData.stageProgress[stage.id] || { stars: 0, cleared: false };

    let starsHtml = '';
    for (let i = 1; i <= 3; i++) {
        if (i <= progress.stars) starsHtml += '<i class="fa-solid fa-star text-yellow-400 text-xs drop-shadow"></i>';
        else starsHtml += '<i class="fa-regular fa-star text-gray-600 text-xs"></i>';
    }

    const clickAction = isUnlocked ? `window.openStagePreview(${stage.id})` : "";
    
    // Background Logic
    const bgUrl = stage.image || '';
    const hasBg = bgUrl.includes('/') || bgUrl.includes('.');
    const bgStyle = hasBg 
        ? `background-image: url('${bgUrl}');` 
        : `background: linear-gradient(135deg, #1e293b, #0f172a);`;

    const grayscale = isUnlocked ? '' : 'grayscale opacity-60';

    return `
        <div onclick="${clickAction}" class="relative h-32 rounded-xl border-2 border-slate-600 overflow-hidden cursor-pointer group hover:border-yellow-400 hover:scale-[1.02] transition-all shadow-lg ${grayscale}">
            
            <div class="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-110" style="${bgStyle}"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>

            <div class="absolute top-0 left-0 bg-blue-600 text-white font-black text-xs px-3 py-1 rounded-br-lg shadow-lg z-10 border-r border-b border-blue-400">
                ${stage.world}-${stage.sub}
            </div>

            <div class="absolute inset-0 p-4 flex flex-col justify-center pl-16"> <div class="flex justify-between items-start">
                    <h4 class="text-lg font-bold text-white leading-tight group-hover:text-yellow-300 transition drop-shadow-md">
                        ${stage.name}
                    </h4>
                    ${isUnlocked ? '' : '<i class="fa-solid fa-lock text-gray-400"></i>'}
                </div>
                <p class="text-[10px] text-gray-400 truncate mb-2">${stage.desc}</p>
                
                <div class="flex items-center justify-between mt-auto">
                    <div class="flex -space-x-1">
                        ${stage.enemies.slice(0,3).map(eId => {
                            const enemy = ENEMY_DATABASE[eId] || CARD_DATABASE[eId];
                            const iconHtml = renderIconHtml(enemy?.icon, "rounded-full"); 
                            return `<div class="w-6 h-6 rounded-full bg-slate-800 border border-slate-500 overflow-hidden shadow-sm">${iconHtml}</div>`;
                        }).join('')}
                        ${stage.boss ? `<div class="w-6 h-6 rounded-full bg-red-900 border border-red-500 flex items-center justify-center text-[10px] shadow-sm z-10">💀</div>` : ''}
                    </div>

                    <div class="text-right">
                        <div class="flex gap-0.5 justify-end mb-0.5">${starsHtml}</div>
                        <div class="text-[9px] text-yellow-500 font-mono font-bold bg-black/40 px-1.5 rounded border border-yellow-500/20">
                            -${stage.stamina} STAMINA
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}


// --- Global Functions สำหรับปุ่มกด ---

window.selectWorld = (worldId) => {
    currentSelectedWorld = worldId;
    renderStageUI(); // วาดหน้าใหม่
    // เลื่อนจอขึ้นบนสุด
    document.getElementById('stage-container')?.scrollIntoView({ behavior: 'smooth' });
};

window.backToWorlds = () => {
    currentSelectedWorld = null;
    renderStageUI(); // วาดหน้าเดิม
};


// 3. ✅ [NEW] หน้าต่างเริ่มเกม (Stage Preview) - (ส่วนนี้เหมือนเดิม หรือก๊อปปี้อันเดิมมาวางต่อท้ายได้เลยครับ)
// ... (ก๊อปปี้ฟังก์ชัน openStagePreview และ confirmStartStage จากไฟล์เดิมมาวางตรงนี้ได้เลย) ...
window.openStagePreview = (stageId) => {
    // ... (Code เดิมของคุณ ใช้ได้เลยครับ) ...
    // ผมละไว้เพื่อไม่ให้โค้ดยาวเกินไป ให้ใช้ Code ส่วนที่ 3 จากไฟล์เดิมครับ
    const stage = STAGE_LIST.find(s => s.id === stageId);
    if (!stage) return;

    // --- A. เตรียม Drop Items ---
    let dropsHtml = '<div class="text-gray-500 text-xs italic col-span-4 text-center">No special drops</div>';
    if (stage.rewards.drops && stage.rewards.drops.length > 0) {
        dropsHtml = stage.rewards.drops.map(drop => {
            const item = getItemInfo(drop.itemId);
            const chancePercent = Math.round(drop.chance * 100);
            let borderClass = 'border-gray-600';
            if (item.rarity === 'R') borderClass = 'border-blue-500';
            if (item.rarity === 'SR') borderClass = 'border-purple-500';
            const iconHtml = renderIconHtml(item.icon, ""); 

            return `
                <div class="flex flex-col items-center gap-1 bg-black/40 p-2 rounded border ${borderClass} relative group cursor-help transition hover:bg-white/10">
                    <div class="text-2xl w-8 h-8 flex items-center justify-center overflow-hidden rounded">${iconHtml}</div>
                    <div class="text-[8px] text-gray-300 w-full text-center truncate px-1">${item.name}</div>
                    <div class="absolute top-0 right-0 text-[8px] bg-black/80 px-1 rounded-bl text-yellow-400 border-l border-b border-white/10">${chancePercent}%</div>
                </div>
            `;
        }).join('');
    }

    // --- B. 🖼️ พื้นหลัง (Background) ---
    const bgUrl = stage.image; 
    const hasBg = bgUrl && (bgUrl.includes('/') || bgUrl.includes('.'));
    const bgStyle = hasBg 
        ? `background-image: url('${bgUrl}'); background-size: cover; background-position: center center;`
        : `background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);`;

    // --- C. 👹 รูปบอส ---
    let bossHtml = '';
    if (stage.boss) {
        const bossData = ENEMY_DATABASE[stage.boss] || CARD_DATABASE[stage.boss];
        if (bossData) {
            const isImg = bossData.icon.includes('/') || bossData.icon.includes('.');
            const bossContent = isImg 
                ? `<img src="${bossData.icon}" class="w-full h-full object-cover">`
                : `<div class="text-5xl animate-bounce-slow">${bossData.icon}</div>`;

            bossHtml = `
                <div class="mx-auto w-24 h-24 mb-3 bg-slate-900 rounded-full flex items-center justify-center border-4 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)] overflow-hidden relative z-20 group">
                    <div class="absolute inset-0 bg-red-500/10 group-hover:bg-red-500/0 transition"></div>
                    ${bossContent}
                    <div class="absolute bottom-0 w-full bg-red-600 text-[8px] text-white text-center font-bold tracking-widest leading-tight py-0.5 shadow-lg">BOSS</div>
                </div>
            `;
        }
    }

    // --- Create Modal ---
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in backdrop-blur-md";
    
    modal.innerHTML = `
        <div class="w-full max-w-md rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/20 animate-pop-in"
             style="${bgStyle}">
            
            <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black z-0"></div>
            
            <div class="relative z-10 p-6 flex flex-col h-full min-h-[500px]">
                
                <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-red-600/80 backdrop-blur rounded-full text-white transition flex items-center justify-center border border-white/10 z-50">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div class="mt-4 mb-4 text-center">
                    ${bossHtml}
                    <h2 class="text-4xl font-black text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none mb-1">
                        ${stage.name}
                    </h2>
                    <div class="inline-block px-3 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-[10px] font-bold tracking-widest uppercase mb-2 shadow-lg backdrop-blur-sm">
                        Stage ${stage.world}-${stage.sub}
                    </div>
                    <p class="text-gray-300 text-sm font-medium drop-shadow-md px-4 py-1 rounded bg-black/30 backdrop-blur-sm border border-white/5 inline-block">
                        ${stage.desc}
                    </p>
                </div>

                <div class="flex-1 space-y-4">
                    <div class="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-inner">
                        <div class="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 tracking-wider">
                            <i class="fa-solid fa-gift text-yellow-500"></i> Potential Rewards
                        </div>
                        <div class="grid grid-cols-4 gap-2">
                           ${dropsHtml}
                            <div class="flex flex-col items-center gap-1 bg-white/5 p-2 rounded border border-yellow-500/20">
                                <div class="text-xl text-yellow-400 drop-shadow"><i class="fa-solid fa-coins"></i></div>
                                <div class="text-[8px] text-gray-300">Gold</div>
                            </div>
                             <div class="flex flex-col items-center gap-1 bg-white/5 p-2 rounded border border-blue-500/20">
                                <div class="text-xl text-blue-400 drop-shadow"><i class="fa-solid fa-star"></i></div>
                                <div class="text-[8px] text-gray-300">EXP</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-6 pt-4 border-t border-white/10">
                    <button onclick="confirmStartStage(${stage.id})" class="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.5)] transform transition active:scale-95 flex justify-center items-center gap-3 group relative overflow-hidden">
                        <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                        <span class="relative z-10 tracking-widest">BATTLE START</span>
                        <span class="relative z-10 bg-black/30 px-3 py-1 rounded-lg text-xs text-yellow-300 font-mono border border-white/10 shadow-inner">
                            <i class="fa-solid fa-bolt"></i> -${stage.stamina}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.confirmStartStage = (stageId) => {
    document.querySelectorAll('.fixed').forEach(el => el.remove());
    if (window.startGame) {
        window.startGame(stageId);
    } else {
        console.error("startGame function not found!");
    }
};