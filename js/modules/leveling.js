// js/modules/leveling.js
import { playerData, saveGame } from '../core/state.js';
import { createCardElement } from '../ui-shared.js';
import { getCardStats, getFodderExp, addExpToCard } from '../utils.js';

let currentTargetUid = null;
let selectedMaterialUids = [];

export function openLevelingModal(targetUid) {
    currentTargetUid = targetUid;
    selectedMaterialUids = []; // รีเซ็ตตัวที่เลือก
    renderLevelingUI();
}

function renderLevelingUI() {
    const targetCard = playerData.inventory.find(c => c.uid === currentTargetUid);
    if (!targetCard) return;

    // สร้าง Modal เต็มจอ (ถ้ายังไม่มี)
    let overlay = document.getElementById('leveling-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'leveling-modal';
        overlay.className = "fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-fade-in"; 

        overlay.innerHTML = `
            <div class="bg-slate-900 p-4 border-b border-white/10 flex justify-between items-center shadow-lg z-10">
                <h2 class="text-xl font-bold text-white"><i class="fa-solid fa-angles-up text-green-400"></i> POWER UP</h2>
                <button id="close-leveling-btn" class="bg-red-600/80 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center transition">✕</button>
            </div>

            <div class="flex-1 flex overflow-hidden">
                <div class="w-1/3 bg-slate-900/50 p-6 flex flex-col items-center border-r border-white/5 relative">
                    <div class="text-xs text-gray-400 mb-2 uppercase tracking-widest">Target Card</div>
                    <div id="target-card-preview" class="scale-90 origin-top"></div>
                    
                    <div class="w-full mt-4 bg-slate-800 rounded-full h-4 relative overflow-hidden border border-white/10">
                        <div class="bg-blue-600 h-full transition-all duration-300" style="width: ${(targetCard.exp / (targetCard.level * 100)) * 100}%"></div>
                        <div class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                            Lv.${targetCard.level}
                        </div>
                    </div>

                    <div class="mt-6 w-full space-y-2 bg-black/40 p-3 rounded-lg border border-white/5">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-400">EXP Gain</span>
                            <span id="txt-exp-gain" class="text-green-400 font-bold">+0</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-400">Cost</span>
                            <span id="txt-gold-cost" class="text-yellow-400 font-bold">0 Gold</span>
                        </div>
                    </div>

                    <button id="confirm-levelup-btn" class="mt-auto w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 bg-gray-700 text-gray-500 cursor-not-allowed">
                        CONFIRM
                    </button>
                </div>

                <div class="w-2/3 bg-slate-950 p-4 overflow-y-auto custom-scrollbar">
                    <div class="text-xs text-gray-400 mb-4 uppercase tracking-widest sticky top-0 bg-slate-950 z-10 py-2 flex justify-between">
                        <span>Select Materials</span>
                        <span id="count-selected" class="text-white font-bold">0 Selected</span>
                    </div>
                    
                    <div id="material-grid" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-20">
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Bind Close Event
        document.getElementById('close-leveling-btn').onclick = () => overlay.remove();
        document.getElementById('confirm-levelup-btn').onclick = () => executeLevelUp();
    }

    // Render ตัวหลัก (Target)
    const previewContainer = document.getElementById('target-card-preview');
    previewContainer.innerHTML = '';
    const targetStats = getCardStats(targetCard);
    const targetEl = createCardElement(targetStats, 'collection'); 
    previewContainer.appendChild(targetEl);

    // Render รายการวัตถุดิบ (Materials)
    renderMaterials();
}

function renderMaterials() {
    const grid = document.getElementById('material-grid');
    grid.innerHTML = '';

    const materials = playerData.inventory.filter(c => 
        c.uid !== currentTargetUid && !playerData.deck.includes(c.uid)
    );

    if(materials.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">No materials available</div>`;
        return;
    }

    // ใช้ Fragment เพื่อประสิทธิภาพ
    const fragment = document.createDocumentFragment();

    materials.forEach(mat => {
        const stats = getCardStats(mat);
        const el = createCardElement(stats, 'collection');
        
        // เพิ่ม ID ให้ Element เพื่อใช้อ้างอิงตอนกดเลือก
        el.id = `mat-${mat.uid}`;
        
        const selectOverlay = document.createElement('div');
        selectOverlay.className = `mat-overlay absolute inset-0 z-50 cursor-pointer transition-all duration-200 border-4 rounded-xl flex items-center justify-center hover:bg-white/10 border-transparent`;
        
        selectOverlay.onclick = () => {
            toggleMaterialSelection(mat.uid, selectOverlay);
        };

        el.appendChild(selectOverlay);
        el.className += " relative"; 
        fragment.appendChild(el);
    });

    grid.appendChild(fragment);
    updateStatsDisplay(); // อัปเดตตัวเลขครั้งแรก
}

// ✅ ฟังก์ชันใหม่: จัดการการเลือกโดยไม่วาดใหม่ทั้งหน้า (แก้ Scroll เด้ง)
function toggleMaterialSelection(uid, overlayEl) {
    if (selectedMaterialUids.includes(uid)) {
        // ยกเลิกเลือก
        selectedMaterialUids = selectedMaterialUids.filter(id => id !== uid);
        overlayEl.className = `mat-overlay absolute inset-0 z-50 cursor-pointer transition-all duration-200 border-4 rounded-xl flex items-center justify-center hover:bg-white/10 border-transparent`;
        overlayEl.innerHTML = '';
    } else {
        // เลือก
        selectedMaterialUids.push(uid);
        overlayEl.className = `mat-overlay absolute inset-0 z-50 cursor-pointer transition-all duration-200 border-4 rounded-xl flex items-center justify-center bg-black/60 border-green-500`;
        overlayEl.innerHTML = `<i class="fa-solid fa-check text-4xl text-green-500 drop-shadow-lg animate-bounce"></i>`;
    }
    updateStatsDisplay();
}

// ✅ ฟังก์ชันคำนวณและอัปเดตตัวเลข
function updateStatsDisplay() {
    let totalExpGain = 0;
    let totalGoldCost = 0;

    selectedMaterialUids.forEach(uid => {
        const mat = playerData.inventory.find(c => c.uid === uid);
        if(mat) {
            const exp = getFodderExp(mat);
            totalExpGain += exp;
            totalGoldCost += (exp * 1);
        }
    });

    // อัปเดต UI
    document.getElementById('txt-exp-gain').innerText = `+${totalExpGain.toLocaleString()}`;
    const costEl = document.getElementById('txt-gold-cost');
    costEl.innerText = `${totalGoldCost.toLocaleString()} Gold`;
    costEl.className = playerData.resources.gold < totalGoldCost ? 'text-red-500 font-bold' : 'text-yellow-400 font-bold';

    document.getElementById('count-selected').innerText = `${selectedMaterialUids.length} Selected`;

    const btn = document.getElementById('confirm-levelup-btn');
    if (totalExpGain > 0 && playerData.resources.gold >= totalGoldCost) {
        btn.className = "mt-auto w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white";
        btn.disabled = false;
    } else {
        btn.className = "mt-auto w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 bg-gray-700 text-gray-500 cursor-not-allowed";
        btn.disabled = true;
    }

    // เก็บค่าไว้ใช้ตอนกด Confirm
    btn.dataset.exp = totalExpGain;
    btn.dataset.cost = totalGoldCost;
}

function executeLevelUp() {
    const btn = document.getElementById('confirm-levelup-btn');
    const expGain = parseInt(btn.dataset.exp || 0);
    const goldCost = parseInt(btn.dataset.cost || 0);

    if (expGain <= 0) return;
    if (playerData.resources.gold < goldCost) return alert("Not enough Gold!");

    const targetCard = playerData.inventory.find(c => c.uid === currentTargetUid);
    if(!targetCard) return;

    // 1. จ่ายเงิน
    playerData.resources.gold -= goldCost;

    // 2. ลบวัตถุดิบ
    playerData.inventory = playerData.inventory.filter(c => !selectedMaterialUids.includes(c.uid));

    // 3. เพิ่ม Exp
    addExpToCard(targetCard, expGain);

    // 4. บันทึก
    saveGame();
    
    // 5. ปิด Modal
    document.getElementById('leveling-modal').remove();
    const oldDetail = document.getElementById('card-detail-modal');
    if(oldDetail) oldDetail.remove();

    // Refresh UI หลัก
    if(window.updateUI) window.updateUI();
    if(window.renderDeckEditor) window.renderDeckEditor();

    alert(`🎉 Level Up Successful!\n${targetCard.name} gained ${expGain} EXP.`);
}