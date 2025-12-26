// js/modules/breeding.js
import { playerData, saveGame } from '../core/state.js';
import { createNewCard, getCardStats } from '../utils.js';
import { CARD_DATABASE, MASTER_DATABASE } from '../core/config.js';
import { showToast } from './ui-notifications.js'; // ถ้าไม่มีให้ใช้ alert แทน

// ==========================================
// 🧬 CONFIGURATION (ตั้งค่าระบบผสมพันธุ์)
// ==========================================

const TIER_CONFIG = {
    1: { name: "Normal", maxLevel: 10, bonus: 1.00, slots: 0 },
    2: { name: "Elite",  maxLevel: 20, bonus: 1.05, slots: 1 }, // +5% stats
    3: { name: "Legend", maxLevel: 30, bonus: 1.10, slots: 2 }  // +10% stats
};

// ฐานข้อมูล Trait (คุณสามารถเพิ่ม Trait ใหม่ๆ ที่นี่)
const TRAIT_POOL = {
    COMMON: [
        { id: "t_hp_up",  name: "Healthy" },
        { id: "t_atk_up", name: "Strong Arm" },
        { id: "t_def_up", name: "Iron Body" }
    ],
    RARE: [
        { id: "t_vampire",   name: "Vampire" },    
        { id: "t_thorns",    name: "Thorns" },      
        { id: "t_crit",      name: "Critical" },    
        { id: "t_stoneskin", name: "Stone Skin" },  
        { id: "t_spd_up",    name: "Swift" }
    ],
    SECRET: [
        { id: "t_god_body",  name: "Titan Form" }
    ]
};

// ✅ อัปเดตสูตรผสมตาม ID ใหม่
const EVO_RECIPES = [
    {
        // Healthy + Iron Body = Titan Form
        parents: ["t_hp_up", "t_def_up"], 
        resultTrait: "t_god_body",
        resultCardId: "h_titan_guardian"
    }
];

// State สำหรับหน้าจอ Breeding
let breedingState = {
    parent1: null, // uid
    parent2: null  // uid
};

// ==========================================
// 🖥️ UI FUNCTIONS
// ==========================================

export function openBreedingModal() {
    breedingState = { parent1: null, parent2: null }; // Reset
    renderBreedingUI();
}

function renderBreedingUI() {
    // กรองการ์ดที่ใช้ได้ (ต้อง Max Level เท่านั้น!)
    const eligibleCards = playerData.inventory.filter(c => {
        const tier = c.tier || 1;
        const config = TIER_CONFIG[tier];
        // ต้อง Level ตัน และ Tier ไม่เกิน 3
        return c.level >= config.maxLevel && tier < 3; 
    });

    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 animate-fade-in";
    modal.innerHTML = `
        <div class="w-full max-w-4xl h-[90vh] bg-slate-900 border border-pink-500/50 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(236,72,153,0.2)]">
            
            <div class="p-4 border-b border-pink-500/30 flex justify-between items-center bg-pink-900/20">
                <div>
                    <h2 class="text-2xl font-black text-pink-400 uppercase tracking-widest"><i class="fa-solid fa-dna"></i> Breeding Lab</h2>
                    <p class="text-xs text-pink-200/50">Combine Max Level cards to evolve to the next Tier</p>
                </div>
                <button id="btn-close-breed" class="w-8 h-8 rounded-full bg-black/50 text-white hover:bg-red-500 transition">✕</button>
            </div>

            <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                <div class="w-full md:w-1/2 p-4 border-r border-white/10 overflow-y-auto custom-scrollbar bg-black/20">
                    <h3 class="text-sm font-bold text-gray-400 mb-3 uppercase">Select Parents (Max Level Only)</h3>
                    ${eligibleCards.length === 0 ? '<div class="text-gray-500 text-center mt-10">No max level cards available.<br>Go level up some cards!</div>' : ''}
                    <div class="grid grid-cols-3 gap-2">
                        ${eligibleCards.map(card => renderSelectableCard(card)).join('')}
                    </div>
                </div>

                <div class="w-full md:w-1/2 p-6 flex flex-col items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]">
                    
                    <div class="flex gap-4 mb-8">
                        ${renderParentSlot(1)}
                        <div class="flex items-center text-pink-500 text-2xl animate-pulse">➕</div>
                        ${renderParentSlot(2)}
                    </div>

                    <div id="breeding-preview" class="text-center mb-8 h-12">
                        <div class="text-gray-500 text-sm">Select 2 parents of the same Tier</div>
                    </div>

                    <button id="btn-confirm-breed" onclick="window.confirmBreed()" disabled 
                        class="px-10 py-4 bg-gray-700 text-gray-400 font-black rounded-xl text-xl shadow-lg transition-all w-full max-w-xs uppercase tracking-widest flex items-center justify-center gap-2">
                        <span>🧬 Evolve</span>
                    </button>
                    
                    <div class="mt-4 text-[10px] text-gray-500 text-center max-w-xs">
                        *Parents will be consumed permanently.<br>
                        *Child will inherit improved stats & random traits.
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove old modal if exists
    const old = document.getElementById('breeding-modal');
    if(old) old.remove();
    
    modal.id = 'breeding-modal';
    document.body.appendChild(modal);

    // Events
    document.getElementById('btn-close-breed').onclick = () => modal.remove();
}

// Render Card ในรายการเลือก
function renderSelectableCard(card) {
    const isSelected = breedingState.parent1 === card.uid || breedingState.parent2 === card.uid;
    const stats = getCardStats(card);
    const tier = card.tier || 1;
    
    let isDisabled = false;
    if (breedingState.parent1 && !breedingState.parent2 && breedingState.parent1 !== card.uid) {
        const p1 = playerData.inventory.find(c => c.uid === breedingState.parent1);
        if (p1 && (p1.tier || 1) !== tier) isDisabled = true;
    }

    const borderClass = tier === 2 ? 'border-yellow-400' : (tier === 3 ? 'border-purple-500' : 'border-gray-600');
    
    // เช็คว่าเป็นรูปภาพหรือ Emoji
    const isImage = stats.icon.includes('/') || stats.icon.includes('.');
    const iconDisplay = isImage 
        ? `<img src="${stats.icon}" class="w-full h-full object-cover">` 
        : `<div class="text-2xl mb-1">${stats.icon}</div>`;

    return `
        <div onclick="window.selectBreedingParent('${card.uid}')" 
            class="relative aspect-[3/4] bg-slate-800 rounded border-2 ${isSelected ? 'border-pink-500 ring-2 ring-pink-500' : borderClass} ${isDisabled ? 'opacity-20 grayscale pointer-events-none' : 'cursor-pointer hover:scale-105 transition'} flex flex-col items-center justify-center overflow-hidden group">
            
            ${iconDisplay}
            
            <div class="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center font-bold py-1 truncate">${stats.name}</div>
            <div class="absolute top-1 left-1 text-[8px] bg-black/60 px-1 rounded text-white">T${tier}</div>
            <div class="absolute top-1 right-1 text-[8px] bg-blue-600 px-1 rounded text-white">Lv.${card.level}</div>
        </div>
    `;
}

// ✅ แก้ไข 2: รองรับรูปภาพใน Slot กลาง
function renderParentSlot(slotNum) {
    const uid = slotNum === 1 ? breedingState.parent1 : breedingState.parent2;
    let content = `<div class="text-4xl opacity-20">❓</div><div class="text-xs text-gray-500 mt-2">Parent ${slotNum}</div>`;
    let borderClass = "border-gray-700 border-dashed";
    let bgClass = "bg-slate-800/80";

    if (uid) {
        const card = playerData.inventory.find(c => c.uid === uid);
        const stats = getCardStats(card);
        const tier = card.tier || 1;
        borderClass = tier === 2 ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'border-gray-500';
        
        const isImage = stats.icon.includes('/') || stats.icon.includes('.');
        const iconDisplay = isImage 
            ? `<img src="${stats.icon}" class="w-full h-full object-cover">` 
            : `<div class="text-5xl mb-2 animate-bounce-short">${stats.icon}</div>`;

        bgClass = "bg-slate-800 overflow-hidden"; // ถ้ามีรูปต้องซ่อนส่วนเกิน
        
        content = `
            ${iconDisplay}
            <div class="absolute bottom-0 inset-x-0 bg-black/60 py-1">
                <div class="font-bold text-xs text-center text-white">${stats.name}</div>
                <div class="text-[9px] text-pink-400 text-center">Tier ${tier}</div>
            </div>
        `;
    }

    return `
        <div onclick="window.deselectBreedingParent(${slotNum})" class="w-32 h-44 ${bgClass} rounded-xl border-2 ${borderClass} flex flex-col items-center justify-center cursor-pointer transition hover:bg-slate-700 relative">
            ${uid ? '<div class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow z-10">✕</div>' : ''}
            ${content}
        </div>
    `;
}

// ==========================================
// 🧠 LOGIC & ACTIONS
// ==========================================

window.selectBreedingParent = (uid) => {
    if (!breedingState.parent1) breedingState.parent1 = uid;
    else if (!breedingState.parent2 && breedingState.parent1 !== uid) breedingState.parent2 = uid;
    
    updateBreedingState();
};

window.deselectBreedingParent = (slotNum) => {
    if (slotNum === 1) {
        breedingState.parent1 = breedingState.parent2; // เลื่อน 2 มา 1
        breedingState.parent2 = null;
    } else {
        breedingState.parent2 = null;
    }
    updateBreedingState();
};

function updateBreedingState() {
    // Re-render UI (แบบบ้านๆ คือปิดแล้วเปิดใหม่ หรือ refresh content)
    // เพื่อความง่าย เราจะ refresh แค่ส่วนที่จำเป็น แต่ในที่นี้ขอ refresh ทั้ง modal function
    // ใน production ควรใช้ DOM manipulation
    
    // ...แต่เพื่อความเร็ว ขออนุญาตปิดเปิด modal ใหม่ (อาจจะกระพริบหน่อย)
    // หรือถ้าเขียน DOM update:
    const modal = document.getElementById('breeding-modal');
    if(modal) {
        modal.remove();
        renderBreedingUI(); // วาดใหม่หมด
    }

    // Check Button State
    const btn = document.getElementById('btn-confirm-breed');
    const preview = document.getElementById('breeding-preview');
    
    if (btn && breedingState.parent1 && breedingState.parent2) {
        btn.disabled = false;
        btn.className = "px-10 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black rounded-xl text-xl shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all w-full max-w-xs uppercase tracking-widest flex items-center justify-center gap-2 transform hover:scale-105 cursor-pointer animate-pulse";
        
        const p1 = playerData.inventory.find(c => c.uid === breedingState.parent1);
        const nextTier = (p1.tier || 1) + 1;
        preview.innerHTML = `<div class="text-green-400 font-bold">Ready to Evolve! Result: <span class="text-white">Tier ${nextTier}</span></div>`;
    }
}

window.confirmBreed = () => {
    if (!breedingState.parent1 || !breedingState.parent2) return;

    const p1 = playerData.inventory.find(c => c.uid === breedingState.parent1);
    const p2 = playerData.inventory.find(c => c.uid === breedingState.parent2);

    // 1. ตรวจสอบความถูกต้อง
    const currentTier = p1.tier || 1;
    if ((p2.tier || 1) !== currentTier) {
        alert("Parents must be same Tier!");
        return;
    }

    // 2. คำนวณ Tier ใหม่ และ Config
    const nextTier = currentTier + 1;
    const tierConfig = TIER_CONFIG[nextTier];
    
    if (!tierConfig) {
        alert("Max Tier Reached! Cannot evolve further.");
        return;
    }

    // 3. คำนวณ Stats (Average Parents * Bonus)
    const p1Stats = getCardStats(p1);
    const p2Stats = getCardStats(p2);
    
    const newBaseStats = {
        hp: Math.floor(((p1Stats.maxHp + p2Stats.maxHp) / 2) * tierConfig.bonus),
        atk: Math.floor(((p1Stats.atk + p2Stats.atk) / 2) * tierConfig.bonus),
        def: Math.floor(((p1Stats.def + p2Stats.def) / 2) * tierConfig.bonus),
        spd: Math.floor(((p1Stats.spd + p2Stats.spd) / 2) * 1.02), // Speed โตช้าหน่อย
        crit: Math.max(p1Stats.crit, p2Stats.crit) // เอา Crit ตัวมากสุด
    };

    // 4. จัดการ Traits
    let childTraits = [];
    let isSecretEvo = false;
    let resultCardId = p1.cardId; // เริ่มต้นใช้ ID ของพ่อ (หรือสุ่ม)
    
    if (Math.random() > 0.5) resultCardId = p2.cardId; // 50% โอกาสได้ร่างแม่

    if (nextTier === 2) {
        // --- ขึ้น Tier 2: สุ่ม 1 Trait ใหม่ ---
        const pool = [...TRAIT_POOL.COMMON, ...TRAIT_POOL.RARE];
        const randomTrait = pool[Math.floor(Math.random() * pool.length)];
        childTraits.push(randomTrait.id);
    } 
    else if (nextTier === 3) {
        // --- ขึ้น Tier 3: สืบทอด Trait พ่อแม่ + เช็คสูตรลับ ---
        const t1 = (p1.traits || [])[0];
        const t2 = (p2.traits || [])[0];

        if (t1 && t2) {
            // เช็ค Recipe
            const recipe = EVO_RECIPES.find(r => 
                (r.parents.includes(t1) && r.parents.includes(t2))
            );

            if (recipe) {
                // 🎉 JACKPOT! ตรงสูตรลับ
                isSecretEvo = true;
                childTraits.push(recipe.resultTrait);
                resultCardId = recipe.resultCardId; // เปลี่ยนร่าง!
            } else {
                // ไม่ตรงสูตร: ถือ 2 Traits
                childTraits.push(t1, t2);
            }
        } else {
            // กรณีพ่อแม่ไม่มี Trait (ไม่ควรเกิดถ้าเล่นตาม Tier) ใส่สุ่มให้
            childTraits.push(TRAIT_POOL.COMMON[0].id);
        }
    }

    // 5. สร้างการ์ดลูก (Child)
    const childCard = createNewCard(resultCardId);
    childCard.uid = `b_${Date.now()}_${Math.floor(Math.random()*1000)}`; // unique id ใหม่
    childCard.tier = nextTier;
    childCard.level = 1; // รีเซ็ตเลเวล
    childCard.exp = 0;
    childCard.traits = childTraits;
    
    // บันทึก Base Stat ใหม่ลงไปในการ์ด (Override default)
    childCard.customStats = newBaseStats; 

    // 6. ลบพ่อแม่ และ เพิ่มลูก
    playerData.inventory = playerData.inventory.filter(c => c.uid !== p1.uid && c.uid !== p2.uid);
    
    // ถ้าพ่อแม่อยู่ใน Deck ต้องเอาออกด้วย (ป้องกันบั๊ก)
    playerData.deck = playerData.deck.map(uid => (uid === p1.uid || uid === p2.uid) ? null : uid);
    playerData.arena.defenseDeck = playerData.arena.defenseDeck.map(uid => (uid === p1.uid || uid === p2.uid) ? null : uid);

    playerData.inventory.push(childCard);
    
    saveGame();

    // 7. Show Success Animation
    showBreedingResult(childCard, isSecretEvo);
}

function showBreedingResult(child, isSecret) {
    const modal = document.getElementById('breeding-modal');
    modal.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full animate-fade-in">
            <div class="text-6xl mb-4 animate-bounce">🥚</div>
            <h2 class="text-3xl font-black text-white mb-2">HATCHING...</h2>
            <div class="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-pink-500 animate-[width_2s_ease-out_forwards]" style="width: 0%"></div>
            </div>
        </div>
    `;
    
    // Wait for animation
    setTimeout(() => {
        const stats = getCardStats(child);
        const traitNames = (child.traits || []).map(tid => {
            // Find name from all pools
            const all = [...TRAIT_POOL.COMMON, ...TRAIT_POOL.RARE, ...TRAIT_POOL.SECRET];
            return all.find(t => t.id === tid)?.name || tid;
        }).join(", ");

        const secretHtml = isSecret ? 
            `<div class="text-yellow-400 font-black text-xl mb-2 animate-pulse">🌟 SECRET EVOLUTION! 🌟</div>` : '';

        modal.innerHTML = `
            <div class="bg-slate-900 border-4 ${isSecret ? 'border-yellow-400' : 'border-pink-500'} rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(236,72,153,0.5)] relative overflow-hidden animate-pop-in">
                ${secretHtml}
                <div class="text-xs text-gray-400 uppercase tracking-widest mb-4">New Generation Born</div>
                
                <div class="w-32 h-32 mx-auto bg-slate-800 rounded-xl mb-4 border-2 border-white flex items-center justify-center text-6xl relative">
                    ${stats.icon}
                    <div class="absolute -top-3 -right-3 w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center font-bold text-white border-2 border-slate-900">T${child.tier}</div>
                </div>

                <h2 class="text-3xl font-black text-white mb-2">${stats.name}</h2>
                
                <div class="bg-black/40 rounded p-4 mb-6 text-left space-y-2">
                    <div class="flex justify-between text-sm"><span class="text-gray-400">HP:</span> <span class="text-green-400 font-bold">${stats.maxHp}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-400">ATK:</span> <span class="text-red-400 font-bold">${stats.atk}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-400">Traits:</span> <span class="text-yellow-400 font-bold">${traitNames || 'None'}</span></div>
                </div>

                <button onclick="document.getElementById('breeding-modal').remove(); window.navTo('page-deck');" 
                    class="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl shadow-lg transition transform hover:scale-105">
                    COLLECT
                </button>
            </div>
        `;
    }, 2000);
}

// ==========================================
// 🩹 Patch Utils: getCardStats 
// (ต้องแก้ฟังก์ชันนี้ใน utils.js เพื่อให้รองรับ customStats และ Traits)
// ==========================================
/* คุณต้องไปแก้ไฟล์ js/utils.js ฟังก์ชัน getCardStats 
   ให้เช็คว่าถ้ามี card.customStats ให้ใช้ค่าจากตรงนั้นแทนค่าจาก Database
   และคำนวณโบนัสจาก Traits ด้วย
*/