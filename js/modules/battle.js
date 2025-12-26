// js/modules/battle.js
import { playerData, saveGame } from '../core/state.js';
import { getCardStats, getHeroStats, getAttackTypeIcon, wait, addExpToCard } from '../utils.js';
import { updateUI } from '../ui-shared.js';
import { TRAIT_DATABASE, STAGE_LIST, MASTER_DATABASE, ELEMENT_CHART, STATUS_CONFIG, EQUIPMENT_KEYS, EQUIPMENT_DATABASE } from '../core/config.js';

// State ภายใน Module
let battleState = {
    isPlaying: false,
    isAuto: false,
    isGameEnded: false,
    selectedAttackerIndex: null,
    turnCount: 1,
    reserves: [],
    mode: 'STAGE', // STAGE or PVP
    currentStageId: null,
    enemyData: null,
    leaderJob: null // ✅ เพิ่ม: เก็บอาชีพฮีโร่เพื่อใช้ Passive
};

let isPaused = false;

// ==========================================
// 🚀 START GAME FUNCTIONS
// ==========================================

export function startGame(stageId) {
    const hasCards = playerData.deck.some(id => id !== null);
    if(!hasCards) {
        alert("กรุณาจัดทีมก่อน (Deck ว่างเปล่า)");
        if(window.navTo) window.navTo('page-deck');
        return;
    }

    battleState.currentStageId = stageId;
    battleState.mode = 'STAGE';
    battleState.enemyData = null;
    isPaused = false;

    if(window.navTo) window.navTo('page-battle');
    renderBattleUI(); 
    setupBattle(); 
    addLog(`--- Start Stage ${stageId} ---`);
}

// ✅ แก้ไข: รองรับทีมจาก Arena (window.currentBattleTeam)
export function startPvP(enemyData) {
    if(playerData.arena.tickets <= 0) {
        alert("No Arena Tickets left!");
        return;
    }

    // ตรวจสอบว่ามีทีมส่งมาไหม หรือ Deck หลักพร้อมไหม
    const hasArenaTeam = window.currentBattleTeam && window.currentBattleTeam.length > 0;
    const hasMainDeck = playerData.deck.some(id => id !== null);

    if(!hasArenaTeam && !hasMainDeck) {
        alert("Please set up your deck first.");
        return;
    }

    playerData.arena.tickets--;
    if(window.updateUI) window.updateUI();

    battleState.mode = 'PVP';
    battleState.enemyData = enemyData;
    isPaused = false;

    if(window.navTo) window.navTo('page-battle');
    renderBattleUI();
    setupBattle(); 
    addLog(`--- PvP Battle vs ${enemyData.name} ---`);
}

// ==========================================
// 🎨 RENDER UI (สนามรบ)
// ==========================================

function renderBattleUI() {
    const container = document.getElementById('page-battle');
    if (!container) return;

    container.innerHTML = `
        <div class="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
            <div class="pointer-events-auto bg-black/60 backdrop-blur px-4 py-1.5 rounded-full border border-white/10 text-white text-xs font-bold shadow-lg flex items-center gap-2">
                <span class="text-gray-400">TURN</span> 
                <span id="turn-count" class="text-yellow-400 text-lg">1</span>
            </div>
            <button onclick="window.pauseBattle()" class="pointer-events-auto w-10 h-10 rounded-full bg-slate-800 border border-slate-600 text-white shadow-lg hover:bg-slate-700 active:scale-95 transition flex items-center justify-center">
                <i class="fa-solid fa-pause"></i>
            </button>
        </div>

        <div id="battle-scene" class="relative w-full h-full flex flex-col justify-between pt-16 pb-4 overflow-hidden bg-slate-900">
            <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
            
            <div class="flex-1 flex items-center justify-center p-4 relative z-10">
                <div id="enemy-field" class="grid grid-cols-3 gap-3 md:gap-6 transition-all duration-500 perspective-1000"></div>
            </div>

            <div class="flex-1 flex items-end justify-center p-4 pb-12 relative z-10">
                <div id="player-field" class="grid grid-cols-3 gap-3 md:gap-6 transition-all duration-500 perspective-1000"></div>
            </div>
            
            <div id="battle-effects-layer" class="absolute inset-0 pointer-events-none z-[60]"></div>
        </div>
        
        <button id="btn-auto" onclick="window.toggleAuto()" class="absolute bottom-6 right-4 z-50 bg-blue-600/90 backdrop-blur text-white px-5 py-2 rounded-full font-black shadow-lg border-2 border-white/20 active:scale-95 transition flex items-center gap-2">
            <i class="fa-solid fa-robot"></i> <span id="auto-text">AUTO</span>
        </button>

        <div id="battle-log" class="hidden md:block absolute bottom-4 left-4 w-64 h-32 overflow-y-auto bg-black/60 backdrop-blur-md text-[10px] p-2 rounded-lg border border-white/5 text-gray-300 font-mono z-40 pointer-events-none"></div>

        <div id="battle-pause-modal" class="hidden fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div class="bg-slate-900 w-64 rounded-xl border border-slate-600 shadow-2xl p-6 flex flex-col gap-3">
                <h3 class="text-xl font-black text-white text-center mb-2 uppercase tracking-widest">PAUSED</h3>
                <button onclick="window.resumeBattle()" class="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"><i class="fa-solid fa-play"></i> RESUME</button>
                <button onclick="window.restartBattle()" class="py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"><i class="fa-solid fa-rotate-right"></i> RESTART</button>
                <button onclick="window.quitBattle()" class="py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"><i class="fa-solid fa-door-open"></i> GIVE UP</button>
            </div>
        </div>
    `;
}

// ==========================================
// 🎮 GAMEPLAY CONTROLS (คงไว้ตามเดิม)
// ==========================================

export function toggleAuto() {
    battleState.isAuto = !battleState.isAuto;
    updateAutoButton();
    if(battleState.isAuto && !battleState.isPlaying) runAutoLoop();
}

function updateAutoButton() {
    const btnText = document.getElementById('auto-text');
    const btn = document.getElementById('btn-auto');
    if(btnText && btn) {
        btnText.innerText = battleState.isAuto ? 'ON' : 'OFF';
        if(battleState.isAuto) {
            btn.classList.add('bg-green-600', 'border-green-400');
            btn.classList.remove('bg-blue-600', 'border-white/20');
        } else {
            btn.classList.add('bg-blue-600', 'border-white/20');
            btn.classList.remove('bg-green-600', 'border-green-400');
        }
    }
}

// Bind to Window
window.toggleAuto = toggleAuto;
window.pauseBattle = () => { isPaused = true; document.getElementById('battle-pause-modal').classList.remove('hidden'); };
window.resumeBattle = () => { isPaused = false; document.getElementById('battle-pause-modal').classList.add('hidden'); if(battleState.isAuto) runAutoLoop(); };
window.quitBattle = (goHome = true) => { isPaused = false; battleState.isAuto = false; if(goHome) { if(battleState.mode === 'PVP' && window.navTo) window.navTo('page-arena'); else if(window.navTo) window.navTo('page-stage'); } };
window.restartBattle = () => {
    if(confirm("Restart Stage?")) {
        window.quitBattle(false);
        setTimeout(() => { if(window.startGame) window.startGame(battleState.currentStageId); }, 100);
    }
};

// ==========================================
// ⚙️ BATTLE LOGIC & SETUP (แก้ใหม่หมด)
// ==========================================

function setupBattle() {
    const pField = document.getElementById('player-field');
    const eField = document.getElementById('enemy-field');
    if (!pField || !eField) return;

    pField.innerHTML = ''; eField.innerHTML = '';

    // Reset State
    battleState.isPlaying = false; battleState.isAuto = false; battleState.isGameEnded = false;
    battleState.selectedAttackerIndex = null; battleState.turnCount = 1; battleState.reserves = [];
    battleState.leaderJob = null; // Reset Passive
    document.getElementById('turn-count').innerText = 1;
    updateAutoButton();

    // --- 1. SETUP PLAYER (Logic ใหม่: เช็ค Arena Team ก่อน) ---
    
    // A. กรณีเป็นทีมจาก Arena (มี 6 ช่องเป๊ะ)
    if (window.currentBattleTeam && window.currentBattleTeam.length > 0) {
        console.log("⚔️ Using Arena Team Configuration");
        
        // วางตามตำแหน่งที่ Arena ส่งมาเลย (0-5)
        window.currentBattleTeam.forEach((cardRaw, i) => {
            if(cardRaw) {
                let cardData = null;
                // แปลง raw object ให้เป็น stats (เช็คว่าเป็น Hero หรือ Unit)
                if (cardRaw.heroId || (cardRaw.uid && cardRaw.uid.startsWith('h_'))) {
                    cardData = getHeroStats(cardRaw);
                    cardData.role = cardData.job || "Hero"; 
                    cardData.isLeader = true; // ให้ Arena Hero เป็น Leader
                    // Set Passive
                    battleState.leaderJob = cardData.job;
                } else {
                    cardData = getCardStats(cardRaw);
                }

                if (cardData) {
                    pField.appendChild(createBattleSlot(cardData, 'player', i, cardData.isLeader));
                }
            } else {
                // ช่องว่าง
                pField.appendChild(createBattleSlot(null, 'player', i));
            }
        });

        // ล้างค่าทิ้งเพื่อไม่ให้กระทบโหมดอื่น
        window.currentBattleTeam = null; 
    } 
    
    // B. กรณีทีมปกติ (Stage Mode - ใช้ Logic เดิมที่บังคับ Hero อยู่ช่อง 4)
    else {
        console.log("🛡️ Using Main Deck Configuration");
        const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId) || playerData.heroes[0];
        if (activeHero) {
            const hStats = getHeroStats(activeHero);
            battleState.leaderJob = hStats.job; 
        }

        const fullDeck = playerData.deck.map(uid => {
            if(!uid) return null;
            const item = playerData.inventory.find(i => i.uid === uid);
            return item ? getCardStats(item) : null;
        }).filter(c => c !== null);

        const fieldUnits = fullDeck.slice(0, 6);
        battleState.reserves = fullDeck.slice(6); // ตัวที่เหลือเป็นตัวสำรอง

        let deckIndex = 0;
        for(let i=0; i<6; i++) {
            let cardData = null;
            let isHero = false;

            // บังคับ Hero อยู่ Slot 4 (หลังกลาง)
            if (i === 4 && activeHero) { 
                isHero = true;
                const hStats = getHeroStats(activeHero);
                cardData = hStats;
                cardData.role = hStats.job || "Hero"; 
                cardData.type = "Melee"; 
                cardData.isLeader = true;
            } else if (deckIndex < fieldUnits.length) {
                cardData = fieldUnits[deckIndex];
                deckIndex++;
            }
            pField.appendChild(createBattleSlot(cardData, 'player', i, isHero));
        }
    }

    // --- 2. SETUP ENEMY (คงเดิม) ---
    if (battleState.mode === 'PVP' && battleState.enemyData) {
        const enemyDeck = battleState.enemyData.deck || [];
        // สร้าง Slot ศัตรู 6 ช่อง
        for(let i=0; i<6; i++) {
            const rawCard = enemyDeck[i];
            if(rawCard) {
                let cardData;
                if (rawCard.isLeader || rawCard.heroId) {
                    cardData = getHeroStats(rawCard);
                    cardData.role = cardData.job || "Hero"; cardData.isLeader = true;
                } else { cardData = getCardStats(rawCard); }
                
                if (cardData) {
                    cardData.maxHp = cardData.hp; 
                    eField.appendChild(createBattleSlot(cardData, 'enemy', i, cardData.isLeader));
                } else {
                    eField.appendChild(createBattleSlot(null, 'enemy', i));
                }
            } else {
                eField.appendChild(createBattleSlot(null, 'enemy', i));
            }
        }
    } else {
        // Stage Enemy Logic
        const stageConfig = STAGE_LIST.find(s => s.id === battleState.currentStageId) || STAGE_LIST[0];
        let enemyList = [...(stageConfig.enemies || [])];
        for(let i=0; i<6; i++) {
            let cardData = null; let isBoss = false;
            if (i === 1 && stageConfig.boss) {
                isBoss = true;
                const bossTemplate = MASTER_DATABASE[stageConfig.boss];
                const enemyLv = stageConfig.world * 2 + stageConfig.sub; 
                cardData = createEnemyInstance(bossTemplate, enemyLv); 
            } else if (enemyList.length > 0) {
                const enemyId = enemyList.shift();
                if(enemyId) {
                    const enemyTemplate = MASTER_DATABASE[enemyId];
                    const enemyLv = stageConfig.world * 2 + stageConfig.sub;
                    cardData = createEnemyInstance(enemyTemplate, enemyLv);
                }
            }
            eField.appendChild(createBattleSlot(cardData, 'enemy', i, isBoss));
        }
    }
}

function createEnemyInstance(template, levelScaler) {
    if(!template) return null;
    const multiplier = 1 + (levelScaler * 0.1);
    return {
        ...template,
        maxHp: Math.floor(template.baseHp * multiplier),
        hp: Math.floor(template.baseHp * multiplier),
        atk: Math.floor(template.baseAtk * multiplier),
        def: Math.floor((template.baseDef||5) * multiplier),
        spd: template.baseSpd || 90, 
        crit: template.baseCrit || 0.05,
        level: levelScaler, element: template.element
    };
}

function createBattleSlot(data, side, index, isLeader = false) {
    const div = document.createElement('div');
    let borderClass = side === 'player' ? 'border-blue-500/30' : 'border-red-500/30';
    let bgClass = side === 'player' ? 'bg-slate-800' : 'bg-slate-900';
    let shadowClass = '';

    if (data) {
        const starCount = data.stars || 1;
        if (starCount >= 3) { borderClass = 'border-blue-400'; shadowClass = 'shadow-blue-500/20'; }
        if (starCount >= 5) { borderClass = 'border-yellow-400'; shadowClass = 'shadow-yellow-500/30'; }
        if (starCount >= 7) { borderClass = 'border-purple-400'; bgClass = 'bg-slate-950'; } 
        if (isLeader) {
            const ringClass = side === 'player' ? 'ring-2 ring-yellow-500' : 'ring-2 ring-red-600';
            borderClass += ` ${ringClass}`; div.style.zIndex = 20; div.classList.add('scale-105');
        }
    } else { div.classList.add('opacity-30', 'border-dashed'); }

    div.className = `battle-slot w-20 h-28 md:w-24 md:h-32 rounded-lg flex flex-col items-center justify-center relative transition-all duration-300 border-2 ${borderClass} ${bgClass} ${shadowClass} overflow-hidden group cursor-pointer hover:brightness-110`;
    div.id = `${side}-slot-${index}`;
    div.onclick = () => onBattleSlotClick(side, index);

    if(!data) {
        div.innerHTML = `<i class="fa-solid fa-plus text-white/20"></i>`;
        div.dataset.alive = "false";
    } else {
        if(isLeader) div.dataset.isLeader = "true";
        div.dataset.name = data.name;
        div.dataset.hp = data.hp;
        div.dataset.maxHp = data.maxHp;
        div.dataset.atk = data.atk;
        div.dataset.def = data.def;
        div.dataset.spd = data.spd;
        div.dataset.crit = data.crit;
        div.dataset.element = data.element;
        div.dataset.alive = "true";
        div.dataset.traits = JSON.stringify(data.traitsId || []);
        div.dataset.role = data.role; // เก็บ Role ไว้เช็ค Magic

        const elemIcon = { FIRE:'🔥', WATER:'💧', NATURE:'🌿', LIGHT:'⚡', DARK:'🌑' }[data.element] || '⚪';
        const roleIcon = { Tank:'🛡️', Speed:'👟', Magic:'✨', Melee:'⚔️', Boss:'👹' }[data.role] || '⚔️';
        const isImage = data.icon.includes('/') || data.icon.includes('.');
        
        let visualContent = isImage 
            ? `<div class="absolute inset-0 z-0"><img src="${data.icon}" class="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500"><div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40"></div></div>`
            : `<div class="text-5xl filter drop-shadow-lg z-10 animate-bounce-slow">${data.icon}</div>`;

        div.innerHTML = `
            ${visualContent}
            <div class="absolute top-1 left-1 flex gap-1 z-20">
                <span class="bg-black/60 border border-white/20 text-[8px] px-1 rounded text-white backdrop-blur-sm">${roleIcon}</span>
                <span class="bg-black/60 border border-white/20 text-[8px] px-1 rounded text-white backdrop-blur-sm">${elemIcon}</span>
            </div>
            <div class="absolute bottom-2 w-[90%] h-1.5 bg-gray-700/50 rounded-full overflow-hidden border border-white/10 z-20 backdrop-blur-sm">
                <div class="hp-fill h-full ${side==='player'?'bg-green-500':'bg-red-500'} w-full transition-all duration-300"></div>
            </div>
            ${isLeader ? `<div class="absolute -bottom-2 text-[7px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black shadow z-30 border border-white uppercase tracking-wider">HERO</div>` : ''}
        `;
    }
    return div;
}

// ==========================================
// ⚔️ BATTLE EXECUTION LOOP
// ==========================================

function onBattleSlotClick(side, index) {
    if(battleState.isPlaying || battleState.isAuto || battleState.isGameEnded || isPaused) return;
    const slot = document.getElementById(`${side}-slot-${index}`);
    if(slot.dataset.alive !== "true") return;

    if(side === 'player') {
        battleState.selectedAttackerIndex = (battleState.selectedAttackerIndex === index) ? null : index;
        updateHighlights();
    } else if(side === 'enemy') {
        if(battleState.selectedAttackerIndex !== null) {
            if (isInvincible(side, slot)) { showFloatingText(slot, "🛡️ BLOCKED", "text-gray-400", "normal"); return; }
            const attacker = document.getElementById(`player-slot-${battleState.selectedAttackerIndex}`);
            if(attacker && attacker.dataset.alive === "true") executeRound(attacker, slot);
        }
    }
}

async function executeRound(attacker, target) {
    if(battleState.isGameEnded || isPaused) return;
    
    battleState.isPlaying = true;
    battleState.selectedAttackerIndex = null;
    updateHighlights();
    
    // 1. Player Attack
    await attackAction(attacker, target, 'up');
    if(checkEndGame()) return; 

    // 2. Enemy Turn
    await wait(300);
    const enemies = getAliveCards('enemy');
    const players = getAliveCards('player');
    
    if(enemies.length > 0 && players.length > 0) {
        const bossUnit = enemies.find(e => e.dataset.isLeader === "true");
        if (bossUnit && battleState.turnCount % 4 === 0) {
             addLog(`⚠️ BOSS ULTIMATE!`, "text-red-500 font-bold");
             await wait(500);
             await bossUltimateSkill(bossUnit, players);
        } else {
             const eAttacker = enemies[Math.floor(Math.random() * enemies.length)];
             let validTargets = players.filter(p => !isInvincible('player', p));
             if(validTargets.length === 0) validTargets = players;
             const pTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
             addLog("Enemy Turn...", "text-red-400");
             await attackAction(eAttacker, pTarget, 'down');
        }
    }

    // 3. End Turn
    checkAndRefillReserves('player');
    await resolveStatusEffects(); 
    
    // ✅ HEALER PASSIVE: ฮีลเพื่อนที่เลือดน้อยสุด 5% ทุกเทิร์น
    if (battleState.leaderJob === 'Healer') {
        const alivePlayers = getAliveCards('player');
        if (alivePlayers.length > 0) {
            // หาคนที่เลือด % น้อยสุด
            let lowest = alivePlayers[0];
            let minPct = 100;
            alivePlayers.forEach(p => {
                const pct = (parseInt(p.dataset.hp) / parseInt(p.dataset.maxHp)) * 100;
                if(pct < minPct) { minPct = pct; lowest = p; }
            });

            const healAmt = Math.floor(parseInt(lowest.dataset.maxHp) * 0.05);
            if (healAmt > 0) {
                await wait(200);
                updateHp(lowest, healAmt);
                showFloatingText(lowest, `PASSIVE +${healAmt}`, "text-green-300", "heal");
                addLog(`Hero healed ${lowest.dataset.name} (Passive)`, "text-green-400");
            }
        }
    }

    battleState.turnCount++;
    document.getElementById('turn-count').innerText = battleState.turnCount;
    
    if(!checkEndGame()) {
        battleState.isPlaying = false;
        if(battleState.isAuto) runAutoLoop();
    }
}

async function runAutoLoop() {
    if(isPaused) return;
    const players = getAliveCards('player');
    const enemies = getAliveCards('enemy');
    if(!players.length || !enemies.length) return;
    const p = players[Math.floor(Math.random() * players.length)];
    let targets = enemies.filter(e => !isInvincible('enemy', e));
    if(!targets.length) targets = enemies;
    await executeRound(p, targets[0]);
}

async function bossUltimateSkill(boss, players) {
    boss.style.zIndex = 100; boss.classList.add('scale-125', 'brightness-150');
    showFloatingText(boss, "ULTIMATE!!!", "text-red-600", "crit");
    await wait(800);
    boss.classList.add('anim-attack-down'); await wait(300);
    for (const p of players) {
        if(p.dataset.alive === "true") {
            createSkillEffect(p); p.classList.add('anim-shake');
            const dmg = Math.floor(parseInt(boss.dataset.atk) * 1.2);
            updateHp(p, -dmg); showFloatingText(p, `-${dmg}`, "text-red-500", "crit");
        }
    }
    await wait(500);
    boss.classList.remove('anim-attack-down', 'scale-125', 'brightness-150'); boss.style.zIndex = '';
    players.forEach(p => p.classList.remove('anim-shake'));
}

// ==========================================
// ⚔️ UPGRADED ATTACK LOGIC (PASSIVES & TRAITS)
// ==========================================

async function attackAction(attacker, target, direction, isBonus = false) {
    if(battleState.isGameEnded) return;

    const atkTraits = JSON.parse(attacker.dataset.traits || "[]");
    const defTraits = JSON.parse(target.dataset.traits || "[]");

    let atkVal = parseInt(attacker.dataset.atk) || 0;
    let defVal = parseInt(target.dataset.def) || 0;     
    let atkCrit = parseFloat(attacker.dataset.crit) || 0; 
    let atkSpd = parseInt(attacker.dataset.spd) || 0;
    let targetSpd = parseInt(target.dataset.spd) || 0;
    const atkElem = attacker.dataset.element;
    const defElem = target.dataset.element;
    
    // --- 👑 HERO PASSIVE (BUFFS) ---
    // ตรวจสอบว่าใครกำลังโจมตี (Player หรือ Enemy) เพื่อใช้ Passive ฝั่ง Player
    const isPlayerAttacking = direction === 'up'; 
    
    if (isPlayerAttacking && battleState.leaderJob) {
        // WARRIOR: +10% ATK
        if (battleState.leaderJob === 'Warrior') atkVal = Math.floor(atkVal * 1.10);
        
        // ROGUE: +10% CRIT
        if (battleState.leaderJob === 'Rogue') atkCrit += 0.10;

        // MAGE: +10% Magic DMG (เช็ค Role ว่าเป็นสายเวทย์ไหม)
        if (battleState.leaderJob === 'Mage') {
            const role = attacker.dataset.role || '';
            if (role.includes('Mage') || role.includes('Wizard') || role.includes('Healer') || role.includes('Magic')) {
                atkVal = Math.floor(atkVal * 1.10);
            }
        }
    }

    // --- 🧬 TRAIT MODIFIERS ---
    if (hasTraitId(atkTraits, 't_atk_up')) atkVal = Math.floor(atkVal * 1.10);
    if (hasTraitId(defTraits, 't_def_up')) defVal = Math.floor(defVal * 1.10);
    if (hasTraitId(atkTraits, 't_crit')) atkCrit += 0.20;

    // --- HIT CHANCE ---
    let hitChance = 1.0;
    if (targetSpd > atkSpd) {
        const diff = targetSpd - atkSpd;
        hitChance = Math.max(0.6, 1.0 - (diff / 10 * 0.05));
    }

    // Titan Block
    if (hasTraitId(defTraits, 't_god_body') && Math.random() < 0.10) {
        showFloatingText(target, "🛡️ BLOCKED", "text-yellow-400", "normal");
        return;
    }

    if (Math.random() > hitChance) {
        attacker.classList.add(direction === 'up' ? 'anim-attack-up' : 'anim-attack-down');
        await wait(300);
        showFloatingText(target, "MISS", "text-gray-400", "miss");
        await wait(300);
        attacker.classList.remove(direction === 'up' ? 'anim-attack-up' : 'anim-attack-down');
        return; 
    }

    // --- DAMAGE CALCULATION ---
    let damage = atkVal;
    let textType = 'normal';
    
    if(ELEMENT_CHART[atkElem]) {
        if(ELEMENT_CHART[atkElem].STRONG === defElem) { damage *= 1.5; textType = 'crit'; } 
        else if(ELEMENT_CHART[atkElem].WEAK === defElem) { damage *= 0.7; textType = 'weak'; } 
    }

    if (Math.random() < atkCrit) {
        damage *= 1.5; textType = 'crit'; target.classList.add('animate-ping'); 
    }

    const reduction = defVal / (defVal + 300);
    damage = Math.floor(damage * (1 - reduction));

    // --- 👑 HERO PASSIVE (DEFENSE) ---
    // ถ้าฝ่าย Player โดนตี และมี Tank เป็น Leader
    if (!isPlayerAttacking && battleState.leaderJob === 'Tank') {
        damage = Math.floor(damage * 0.90); // ลดดาเมจ 10%
    }

    // --- 🧬 TRAIT DAMAGE REDUCTION ---
    if (hasTraitId(defTraits, 't_stoneskin')) damage = Math.floor(damage * 0.85);
    if (hasTraitId(defTraits, 't_god_body')) damage = Math.floor(damage * 0.80);

    damage = Math.max(1, damage);

    // --- ANIMATION ---
    attacker.style.zIndex = 50;
    attacker.classList.add(direction === 'up' ? 'anim-attack-up' : 'anim-attack-down');
    await wait(300);

    createSkillEffect(target, atkElem); 
    target.classList.add('anim-shake');
    
    updateHp(target, -damage); 
    
    if (textType === 'crit') showFloatingText(target, `CRITICAL! -${damage}`, '', 'crit');
    else if (textType === 'weak') showFloatingText(target, `Weak... -${damage}`, '', 'miss');
    else showFloatingText(target, `-${damage}`, '', 'normal');

    // --- POST EFFECTS ---
    if (hasTraitId(atkTraits, 't_vampire')) {
        const heal = Math.floor(damage * 0.20);
        if(heal > 0 && attacker.dataset.alive === "true") { updateHp(attacker, heal); showFloatingText(attacker, `+${heal}`, '', 'heal'); }
    }
    if (hasTraitId(defTraits, 't_thorns')) {
        const reflect = Math.floor(damage * 0.10);
        if(reflect > 0 && attacker.dataset.alive === "true") { await wait(150); updateHp(attacker, -reflect); showFloatingText(attacker, `Reflect -${reflect}`, "text-orange-500", "normal"); }
    }
    if (!isBonus && hasTraitId(atkTraits, 't_spd_up') && target.dataset.alive === "true") {
        if (Math.random() < 0.30) { await wait(400); showFloatingText(attacker, "SPEED UP!", "text-cyan-400", "crit"); await attackAction(attacker, target, direction, true); }
    }

    if(!isBonus) await wait(300);
    target.classList.remove('animate-ping', 'anim-shake');
    attacker.classList.remove(direction === 'up' ? 'anim-attack-up' : 'anim-attack-down');
    attacker.style.zIndex = '';
}

function hasTraitId(traitIds, targetId) {
    if (!traitIds || !Array.isArray(traitIds)) return false;
    return traitIds.includes(targetId);
}

function updateHp(element, change) {
    let current = parseInt(element.dataset.hp);
    let max = parseInt(element.dataset.maxHp);
    let newHp = Math.max(0, Math.min(max, current + change));
    element.dataset.hp = newHp;
    const percent = (newHp / max) * 100;
    const bar = element.querySelector('.hp-fill');
    bar.style.width = `${percent}%`;
    if (percent > 50) bar.className = 'hp-fill h-full w-full bg-green-500 transition-all duration-300';
    else if (percent > 20) bar.className = 'hp-fill h-full w-full bg-yellow-500 transition-all duration-300';
    else bar.className = 'hp-fill h-full w-full bg-red-600 animate-pulse transition-all duration-300';
    if (newHp === 0 && element.dataset.alive === "true") {
        element.dataset.alive = "false"; element.classList.add('grayscale', 'opacity-50', 'blur-[1px]');
        element.classList.remove('selected-attacker', 'valid-target', 'ring-4');
        showFloatingText(element, "DEAD", "text-gray-500", "miss");
    }
}
function checkEndGame() {
    if(battleState.isGameEnded) return true;
    const playerHero = document.querySelector('#player-field .battle-slot[data-is-leader="true"]');
    const enemyBoss = document.querySelector('#enemy-field .battle-slot[data-is-leader="true"]');
    if(playerHero && playerHero.dataset.alive === "false") { endBattle(false); return true; }
    const enemiesAlive = getAliveCards('enemy').length;
    if((enemyBoss && enemyBoss.dataset.alive === "false") || (!enemyBoss && enemiesAlive === 0)) { endBattle(true); return true; }
    return false;
}

function endBattle(isWin) {
    if(battleState.isGameEnded) return; 
    battleState.isGameEnded = true; battleState.isPlaying = false; battleState.isAuto = false; updateAutoButton();
    setTimeout(() => {
        let rewards = { gold: 0, exp: 0 }; let dropItem = null; let earnedStars = 0;
        if (battleState.mode === 'PVP') {
            const pointChange = isWin ? 25 : 10;
            if(isWin) { playerData.arena.rankPoints += pointChange; playerData.arena.wins++; rewards.gold = 100; showBattleResult(true, rewards, 0, null, 0, `Rank +${pointChange}`); } 
            else { playerData.arena.rankPoints = Math.max(0, playerData.arena.rankPoints - pointChange); playerData.arena.losses++; rewards.gold = 10; showBattleResult(false, rewards, 0, null, 0, `Rank -${pointChange}`); }
        } else {
            const stageConfig = STAGE_LIST.find(s => s.id === battleState.currentStageId) || STAGE_LIST[0]; 
            const confRew = stageConfig.rewards || { goldMin: 10, goldMax: 20, exp: 10, drops: [] };
            if(isWin) {
                rewards.gold = Math.floor(Math.random() * (confRew.goldMax - confRew.goldMin + 1)) + confRew.goldMin;
                rewards.exp = confRew.exp;
                if (confRew.drops && confRew.drops.length > 0) {
                    for (const drop of confRew.drops) {
                        if (Math.random() < drop.chance) {
                            let item = drop.itemId;
                            if (item === 'shop_eq_chest' && typeof EQUIPMENT_KEYS !== 'undefined') item = EQUIPMENT_KEYS[Math.floor(Math.random() * EQUIPMENT_KEYS.length)];
                            dropItem = item;
                            const isEquipment = item.startsWith('eq_') || item.startsWith('he_');
                            if (isEquipment) {
                                if(!playerData.equipment) playerData.equipment = []; 
                                playerData.equipment.push(item);
                            } else {
                                if(!playerData.items) playerData.items = {};
                                if(!playerData.items[item]) playerData.items[item] = 0;
                                playerData.items[item]++;
                            }
                            break; 
                        }
                    }
                }
                const heroAlive = document.querySelector('#player-field .battle-slot[data-is-leader="true"][data-alive="true"]');
                earnedStars = 1; if (heroAlive) earnedStars++; if (heroAlive && battleState.turnCount <= 15) earnedStars++;
                const stageId = battleState.currentStageId;
                if (!playerData.stageProgress) playerData.stageProgress = {};
                if (typeof playerData.stageProgress === 'number') playerData.stageProgress = {}; 
                if (!playerData.stageProgress[stageId]) playerData.stageProgress[stageId] = { stars: 0, cleared: false };
                playerData.stageProgress[stageId].cleared = true;
                if (earnedStars > playerData.stageProgress[stageId].stars) playerData.stageProgress[stageId].stars = earnedStars;
                playerData.stageWins++;
            } else { rewards.gold = Math.floor(confRew.goldMin * 0.1); rewards.exp = Math.floor(confRew.exp * 0.1); }
            playerData.resources.gold += rewards.gold;
            const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId);
            if (activeHero && rewards.exp > 0) addExpToCard(activeHero, rewards.exp);
            if (rewards.exp > 0) playerData.deck.forEach(uid => { if (uid) { const card = playerData.inventory.find(c => c.uid === uid); if (card) addExpToCard(card, rewards.exp); } });
            showBattleResult(isWin, rewards, rewards.exp, dropItem, earnedStars);
        }
        saveGame();
    }, 1000);
}
function showBattleResult(isWin, rewards, expGained, dropItem, starCount = 0, customMessage = null) {
    const modal = document.createElement('div');
    modal.className = `fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in`;
    let dropHtml = '';
    if(dropItem) {
        // ค้นหาในทั้ง 2 DB เผื่อเป็นของ Hero หรือของธรรมดา
        let itemData = EQUIPMENT_DATABASE[dropItem] || 
                       HERO_EQUIPMENT_DATABASE[dropItem] || // ✅ เพิ่มบรรทัดนี้
                       { name: "Unknown Item", icon: "📦", rarity: "C" };
        
        const rColor = (itemData.rarity === 'SR' || itemData.rarity === 'UR') ? 'text-yellow-400 border-yellow-500' : 'text-blue-400 border-blue-500';
        
        // ✅ สร้าง HTML สำหรับ Icon (เช็คว่าเป็นรูปภาพหรือไม่)
        const isImg = itemData.icon && (itemData.icon.includes('/') || itemData.icon.includes('.'));
        const iconDisplay = isImg 
            ? `<div class="w-12 h-12 bg-slate-900 rounded-lg border border-white/20 overflow-hidden shadow-inner"><img src="${itemData.icon}" class="w-full h-full object-cover"></div>` 
            : `<div class="text-3xl">${itemData.icon}</div>`;

        dropHtml = `
            <div class="mt-4 p-3 bg-slate-900/80 rounded-xl border ${rColor} flex items-center gap-4 shadow-lg animate-bounce-short">
                ${iconDisplay}
                <div class="text-left">
                    <div class="text-[10px] text-gray-400 uppercase tracking-wider">DROP REWARD</div>
                    <div class="font-bold ${rColor} text-sm">${itemData.name}</div>
                </div>
            </div>`;
    }
    let starsHtml = '';
    if(isWin && battleState.mode !== 'PVP') {
        starsHtml = `<div class="flex justify-center gap-2 my-4 h-12">`;
        for(let i=1; i<=3; i++) starsHtml += `<div id="star-${i}" class="text-4xl text-gray-700 transition-all transform scale-0"><i class="fa-solid fa-star"></i></div>`;
        starsHtml += `</div>`;
    }
    modal.innerHTML = `<div class="bg-slate-800 border-4 ${isWin ? 'border-yellow-500' : 'border-red-600'} rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative"><div class="text-6xl mb-2 animate-bounce-short">${isWin ? '🏆' : '💀'}</div><h2 class="text-3xl font-black ${isWin ? 'text-yellow-400' : 'text-red-500'} uppercase mb-2">${isWin ? "VICTORY" : "DEFEAT"}</h2>${customMessage ? `<div class="text-lg font-bold mb-2 ${isWin?'text-green-400':'text-red-400'}">${customMessage}</div>` : ''}${starsHtml}<div class="bg-black/40 p-4 rounded-xl space-y-2 mt-4"><div class="flex justify-between"><span class="text-gray-400">Gold</span><span class="text-yellow-400">+${rewards.gold}</span></div>${expGained > 0 ? `<div class="flex justify-between"><span class="text-gray-400">EXP</span><span class="text-blue-400">+${expGained}</span></div>` : ''}</div>${dropHtml}<button id="btn-close-result" class="w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white">${isWin ? 'CONTINUE' : 'TRY AGAIN'}</button></div>`;
    document.body.appendChild(modal);
    if(isWin && starCount > 0) {
        for(let i=1; i<=starCount; i++) { setTimeout(() => { const el = document.getElementById(`star-${i}`); if(el) { el.classList.remove('text-gray-700', 'scale-0'); el.classList.add('text-yellow-400', 'scale-100', 'drop-shadow-lg'); } }, i * 300); }
    }
    document.getElementById('btn-close-result').onclick = () => {
        modal.remove(); saveGame(); if(window.updateUI) window.updateUI(); 
        if (battleState.mode === 'PVP') { if(window.navTo) window.navTo('page-arena'); } else { if(window.renderStages) window.renderStages(); if(window.navTo) window.navTo('page-stage'); }
    };
}
function getAliveCards(side) { return Array.from(document.querySelectorAll(`#${side}-field .battle-slot`)).filter(el => el.dataset.alive === "true"); }
function isInvincible(side, targetSlot) { if (targetSlot.dataset.isLeader !== "true") return false; return getAliveCards(side).some(el => el.dataset.isLeader !== "true"); }
function updateHighlights() {
    document.querySelectorAll('.battle-slot').forEach(el => { el.classList.remove('ring-4', 'ring-green-500', 'ring-red-500', 'cursor-crosshair'); el.style.transform = ''; });
    if(battleState.selectedAttackerIndex !== null) {
        const attacker = document.getElementById(`player-slot-${battleState.selectedAttackerIndex}`);
        if(attacker) {
            attacker.classList.add('ring-4', 'ring-yellow-400');
            const atkElem = attacker.dataset.element;
            document.querySelectorAll('#enemy-field .battle-slot').forEach(el => {
                if(el.dataset.alive === "true" && !isInvincible('enemy', el)) {
                    const defElem = el.dataset.element; el.classList.add('cursor-crosshair'); 
                    if (ELEMENT_CHART[atkElem]?.STRONG === defElem) el.classList.add('ring-4', 'ring-green-500'); 
                    else if (ELEMENT_CHART[atkElem]?.WEAK === defElem) el.classList.add('ring-4', 'ring-red-500'); 
                    else el.classList.add('ring-4', 'ring-white/30'); 
                }
            });
        }
    }
}
function showFloatingText(target, text, color, type = 'normal') {
    const rect = target.getBoundingClientRect(); const el = document.createElement('div');
    let animClass = 'text-white text-lg font-bold animate-float-up';
    if (type === 'crit') animClass = 'text-orange-400 text-2xl font-black animate-bounce-short';
    if (type === 'heal') animClass = 'text-green-400 text-lg font-bold animate-float-up';
    if (type === 'miss') animClass = 'text-gray-400 text-sm font-bold opacity-80 animate-float-up';
    el.className = `fixed pointer-events-none z-[80] drop-shadow-md ${animClass} ${color}`;
    el.innerText = text; el.style.left = (rect.left + rect.width / 2 - 10) + 'px'; el.style.top = (rect.top) + 'px';
    document.body.appendChild(el); setTimeout(() => el.remove(), 800);
}
function createSkillEffect(target, element = 'NORMAL') {
    // เช็คก่อนว่าอยู่ในหน้าจอไหม ถ้าไม่อยู่ไม่ต้องวาด
    if (!document.getElementById('page-battle').classList.contains('active')) return;

    const rect = target.getBoundingClientRect(); 
    const fx = document.createElement('div');
    
    // ลดความซับซ้อนของ Effect
    // ใช้ translate3d เพื่อบังคับใช้ GPU
    fx.className = `absolute pointer-events-none z-[70] w-12 h-12 rounded-full animate-ping opacity-75`;
    fx.style.transform = "translate3d(0,0,0)"; 

    if(element === 'FIRE') fx.className += ' bg-red-500 shadow-md'; // ลด shadow-spread
    else if(element === 'WATER') fx.className += ' bg-blue-500 shadow-md';
    else fx.className += ' bg-white shadow-md';

    fx.style.left = (rect.left + rect.width / 2 - 24) + 'px'; 
    fx.style.top = (rect.top + rect.height / 2 - 24) + 'px';
    
    document.body.appendChild(fx); 
    setTimeout(() => fx.remove(), 400);
}
function addLog(msg, color = 'text-gray-300') {
    const log = document.getElementById('battle-log');
    if (log) {
        const line = document.createElement('div');
        line.innerHTML = `<span class="text-gray-500 font-mono text-[8px]">[T${battleState.turnCount}]</span> <span class="${color}">${msg}</span>`;
        line.className = `mb-1 border-b border-white/5 pb-0.5 last:border-0 animate-fade-in`;
        log.appendChild(line); log.scrollTop = log.scrollHeight;
    }
}
function checkAndRefillReserves(side) {
    if (side !== 'player') return;
    const deadSlots = Array.from(document.querySelectorAll(`#${side}-field .battle-slot`)).filter(el => el.dataset.alive === "false" && el.dataset.isLeader !== "true");
    if (deadSlots.length > 0 && battleState.reserves.length > 0) {
        deadSlots.forEach(slot => {
            if (battleState.reserves.length > 0) {
                const newCardStats = battleState.reserves.shift(); const idx = slot.id.split('-')[2];
                const newSlot = createBattleSlot(newCardStats, side, idx, false);
                newSlot.classList.add('animate-slide-in-right'); slot.replaceWith(newSlot);
                addLog(`Reinforcement! ${newCardStats.name} enters.`, "text-blue-300 font-bold");
            }
        });
        updateHighlights();
    }
}
async function resolveStatusEffects() {
    const allCards = document.querySelectorAll('.battle-slot'); let effectHappened = false;
    for (const card of allCards) {
        if (card.dataset.alive === "true" && card.dataset.status) {
            const status = card.dataset.status; const config = STATUS_CONFIG[status];
            if (!config) continue;
            if (config.dmg > 0) {
                const dmg = config.dmg; updateHp(card, -dmg); showFloatingText(card, `-${dmg}`, config.color, "normal");
                card.classList.add('anim-shake'); setTimeout(() => card.classList.remove('anim-shake'), 300);
                addLog(`${card.dataset.name} takes ${dmg} dmg from ${config.name}.`, "text-gray-400"); effectHappened = true;
            }
            if (Math.random() > 0.5) {
                delete card.dataset.status;
                const icon = card.querySelector('.status-icon'); if (icon) icon.remove();
                const overlay = card.querySelector('.status-overlay');
                if (overlay) { overlay.classList.add('opacity-0'); setTimeout(() => overlay.remove(), 300); }
                addLog(`${card.dataset.name} recovered from ${config.name}.`, "text-green-400");
            }
        }
    }
    if (effectHappened) await wait(600);
}