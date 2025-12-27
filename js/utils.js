// js/utils.js
import { 
    CARD_DATABASE, ELEMENTS_LIST, ELEMENTS, TRAIT_DATABASE, TRAIT_KEYS, EQUIPMENT_DATABASE,
    HERO_DATABASE, HERO_EQUIPMENT_DATABASE, HERO_PASSIVES 
} from './core/config.js';


// Helper: สุ่ม Trait (ของมินเนี่ยน)
function getRandomTraits(count = 1) {
    const traits = [];
    for(let i=0; i<count; i++) {
        if(Math.random() < 0.3) { 
            const randomKey = TRAIT_KEYS[Math.floor(Math.random() * TRAIT_KEYS.length)];
            if(!traits.includes(randomKey)) traits.push(randomKey);
        }
    }
    return traits;
}

export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function createNewCard(fixedCardId = null) {
    let templateId = fixedCardId;
    
    // ถ้าไม่ได้ระบุ ID มา -> ให้สุ่ม
    if (!templateId) {
        const keys = Object.keys(CARD_DATABASE);
        if (keys.length === 0) {
            console.error("❌ CARD_DATABASE is empty!");
            return null;
        }
        templateId = keys[Math.floor(Math.random() * keys.length)];
    }
    
    const template = CARD_DATABASE[templateId];
    
    // ✅✅✅ เพิ่มจุดเช็ค: ถ้าหา ID ไม่เจอ ให้แจ้งเตือนและกันไม่ให้พัง
    if (!template) {
        console.error(`❌ Error: Card ID '${templateId}' not found in CARD_DATABASE.`);
        
        // กันตาย: ถ้าหาไม่เจอ ให้ลองสุ่มใบอื่นมาแทน (หรือ return null)
        const keys = Object.keys(CARD_DATABASE);
        if(keys.length > 0) {
            const randomId = keys[0];
            console.warn(`⚠️ Fallback to '${randomId}' instead.`);
            return createNewCard(randomId); 
        }
        return null;
    }
    // ✅✅✅ จบจุดเช็ค

    let initialStars = 1;
    if (template.rarity === 'U') initialStars = 2;
    if (template.rarity === 'R') initialStars = 3;
    if (template.rarity === 'SR') initialStars = 4;
    if (template.rarity === 'UR') initialStars = 5;
    if (template.rarity === 'LEGEND') initialStars = 6;
    if (template.rarity === 'MYTHICAL') initialStars = 7;

    let finalElement = template.element; 
    if (!finalElement) {
        finalElement = ELEMENTS_LIST[Math.floor(Math.random() * ELEMENTS_LIST.length)];
    }
    
    return {
        uid: Date.now().toString(36) + Math.random().toString(36).substr(2),
        traits: [],
        cardId: templateId,
        element: finalElement,
        level: 1,
        exp: 0,
        stars: initialStars,
        tier: 1, 
        obtainedAt: Date.now(),
        bonusHp: 0, bonusAtk: 0, generation: 1,
        equipped: { weapon: null, armor: null, accessory: null }
    };
}

// ✅ สร้างตัวแปรเก็บค่า Cache
const statsCache = new Map();

export function getCardStats(inventoryItem) {
    if (!inventoryItem) return null;
    
    // --- 🚀 เริ่มส่วน MEMOIZATION (จำค่า) ---
    // สร้าง Key ที่ระบุเอกลักษณ์ของการ์ด ณ สถานะปัจจุบัน
    // ถ้า Level, Star, หรือของสวมใส่เปลี่ยน Key จะเปลี่ยน ทำให้คำนวณใหม่
    const equipKey = inventoryItem.equipped ? JSON.stringify(inventoryItem.equipped) : 'no_equip';
    const traitKey = inventoryItem.traits ? JSON.stringify(inventoryItem.traits) : 'no_traits';
    
    // Key ประกอบด้วย: UID + Level + Stars + Tier + Equipment + Traits + BonusStats
    const cacheKey = `${inventoryItem.uid}_lv${inventoryItem.level}_s${inventoryItem.stars || 1}_t${inventoryItem.tier || 1}_${equipKey}_${traitKey}_${inventoryItem.bonusHp || 0}_${inventoryItem.bonusAtk || 0}`;

    // ถ้ามีค่านี้ในความจำแล้ว ให้ส่งกลับไปเลย (ไม่ต้องคำนวณ)
    if (statsCache.has(cacheKey)) {
        return statsCache.get(cacheKey);
    }
    // --- จบส่วนตรวจสอบ Cache ---

    const template = CARD_DATABASE[inventoryItem.cardId];
    if (!template) return null;

    const levelMultiplier = 1 + ((inventoryItem.level - 1) * 0.1);
    const starMultiplier = 1 + ((inventoryItem.stars || 1) - 1) * 0.2; 
    const finalMultiplier = levelMultiplier * starMultiplier;
    
    const custom = inventoryItem.customStats || {};
    
    const rawBaseHp = custom.hp || template.baseHp;
    const rawBaseAtk = custom.atk || template.baseAtk;
    const rawBaseDef = custom.def || (template.baseDef || 10);
    const rawBaseSpd = custom.spd || (template.baseSpd || 100);
    const rawBaseCrit = custom.crit || (template.baseCrit || 0.05);

    let maxHpVal = Math.floor(rawBaseHp * finalMultiplier);
    let atkVal = Math.floor(rawBaseAtk * finalMultiplier);
    let finalDef = Math.floor(rawBaseDef * finalMultiplier);
    let finalSpd = rawBaseSpd; 
    let finalCrit = rawBaseCrit;

    // Trait Modifiers
    const traitsData = (inventoryItem.traits || []).map(id => TRAIT_DATABASE[id]).filter(t => t);
    
    let traitMulHp = 1, traitMulAtk = 1, traitMulDef = 1;
    let traitBonusCrit = 0, traitBonusSpd = 0;

    traitsData.forEach(t => {
        if (t.statMod) {
            if (t.statMod.hp) traitMulHp *= t.statMod.hp;
            if (t.statMod.atk) traitMulAtk *= t.statMod.atk;
            if (t.statMod.def) traitMulDef *= t.statMod.def;
            if (t.statMod.crit) traitBonusCrit += t.statMod.crit;
            if (t.statMod.spd) {
                if(t.statMod.spd < 5) finalSpd = Math.floor(finalSpd * t.statMod.spd);
                else traitBonusSpd += t.statMod.spd;
            }
        }
    });

    maxHpVal = Math.floor(maxHpVal * traitMulHp);
    atkVal = Math.floor(atkVal * traitMulAtk);
    finalDef = Math.floor(finalDef * traitMulDef);
    finalSpd += traitBonusSpd;
    finalCrit += traitBonusCrit;

    // Equipment Bonuses
    let equipBonusAtk = 0, equipBonusHp = 0, eqDef = 0, eqSpd = 0, eqCrit = 0;
    const equipped = inventoryItem.equipped || { weapon: null, armor: null, accessory: null };

    Object.values(equipped).forEach(eqId => {
        if (eqId && EQUIPMENT_DATABASE[eqId]) {
            const item = EQUIPMENT_DATABASE[eqId];
            equipBonusAtk += item.atk || 0;
            equipBonusHp += item.hp || 0;
            eqDef += item.def || 0;
            eqSpd += item.spd || 0;
            eqCrit += item.crit || 0;
        }
    });

    const itemBonusHp = inventoryItem.bonusHp || 0;
    const itemBonusAtk = inventoryItem.bonusAtk || 0;

    maxHpVal += itemBonusHp + equipBonusHp;
    atkVal += itemBonusAtk + equipBonusAtk;
    finalDef += eqDef;
    finalSpd += eqSpd;
    finalCrit += eqCrit;

    const colorMap = {
        FIRE: 'border-red-500', WATER: 'border-blue-500', NATURE: 'border-green-500',
        LIGHT: 'border-yellow-300', DARK: 'border-purple-500'
    };
    let borderClass = colorMap[inventoryItem.element] || 'border-gray-500';
    
    const tier = inventoryItem.tier || 1;
    if (tier === 2) borderClass = 'border-yellow-400 shadow-[0_0_10px_gold] ring-1 ring-yellow-200';
    else if (tier === 3) borderClass = 'border-purple-500 shadow-[0_0_15px_magenta] ring-1 ring-purple-300';
    else {
        if (inventoryItem.stars >= 3) borderClass = 'border-yellow-400 shadow-[0_0_10px_gold]';
        if (inventoryItem.stars >= 5) borderClass = 'border-purple-500 shadow-[0_0_15px_magenta]';
    }

    const powerScore = Math.floor((maxHpVal / 5) + atkVal + finalDef + (finalSpd * 0.5) + (finalCrit * 500));

    const result = {
        ...inventoryItem,
        name: template.name, role: template.role, type: template.type, icon: template.icon, rarity: template.rarity,
        maxHp: maxHpVal,
        hp: maxHpVal,
        atk: atkVal,
        def: finalDef,
        spd: finalSpd,
        crit: finalCrit,
        power: powerScore,
        color: borderClass,
        stars: inventoryItem.stars || 1,
        tier: tier,
        traits: traitsData, 
        traitsId: inventoryItem.traits || [],
        equipped: equipped
    };

    // ✅ บันทึกผลลัพธ์ลง Cache ก่อนส่งคืน
    statsCache.set(cacheKey, result);

    return result;
}

// --- ฟังก์ชันฮีโร่ (อัปเดตใหม่) ---
export function getHeroStats(heroData) {
    const template = HERO_DATABASE[heroData.heroId];
    if (!template) return null;

    const multiplier = 1 + ((heroData.level - 1) * 0.2);

    let eqAtk = 0, eqHp = 0, eqDef = 0, eqSpd = 0, eqCrit = 0;
    const equipped = heroData.equipped || {};

    Object.values(equipped).forEach(eqId => {
        if (eqId && HERO_EQUIPMENT_DATABASE[eqId]) {
            const item = HERO_EQUIPMENT_DATABASE[eqId];
            eqAtk += item.atk || 0;
            eqHp += item.hp || 0;
            eqDef += item.def || 0;
            eqSpd += item.spd || 0;
            eqCrit += item.crit || 0;
        }
    });

    const finalHp = Math.floor(template.baseHp * multiplier) + eqHp;
    const finalAtk = Math.floor(template.baseAtk * multiplier) + eqAtk;
    const finalDef = Math.floor(template.baseDef * multiplier) + eqDef;
    const finalSpd = template.baseSpd + eqSpd; 
    const finalCrit = template.baseCrit + eqCrit;

    const power = Math.floor((finalHp/5) + finalAtk + finalDef + (finalSpd*0.5) + (finalCrit*500));

    // ✅ 2. หา Passive ตาม Job ของฮีโร่ (ถ้าไม่มีให้ใช้ Default)
    // การจับคู่: พยายามหาจาก ID ก่อน ถ้าไม่มีให้เดาจาก Job หรือชื่อ
    let passiveKey = heroData.heroId; 
    if (!HERO_PASSIVES[passiveKey]) {
        // Fallback Logic (ถ้า ID ไม่ตรงเป๊ะ)
        if (template.job === 'Warrior') passiveKey = 'h_warrior';
        else if (template.job === 'Mage') passiveKey = 'h_mage';
        else if (template.job === 'Rogue') passiveKey = 'h_rogue';
        else if (template.job === 'Healer') passiveKey = 'h_healer';
        else passiveKey = 'h_warrior'; // Default
    }

    const passiveSkill = HERO_PASSIVES[passiveKey] || { name: "Leadership", desc: "No passive effect." };

    return {
        ...heroData,
        ...template,
        hp: finalHp, maxHp: finalHp,
        atk: finalAtk, def: finalDef, spd: finalSpd, crit: finalCrit,
        power: power,
        passive: passiveSkill // ✅ เพิ่มข้อมูล Passive ลงไป
    };
}

export function getMaxExp(level) {
    return level * 100;
}

export function addExpToCard(cardObj, amount) {
    if (!cardObj) return false;
    
    const isHero = cardObj.uid.startsWith('h_') || cardObj.job; 
    
    let tierMax = 10;
    if (cardObj.tier === 2) tierMax = 20;
    if (cardObj.tier === 3) tierMax = 30;

    const MAX_LEVEL = isHero ? 50 : tierMax; 

    if (cardObj.level >= MAX_LEVEL) {
        cardObj.exp = 0; 
        return false;
    }

    cardObj.exp += amount;
    let leveledUp = false;
    
    const getNext = (lv) => lv * 100;

    while (cardObj.exp >= getNext(cardObj.level)) {
        if (cardObj.level >= MAX_LEVEL) {
            cardObj.exp = 0;
            break;
        }
        cardObj.exp -= getNext(cardObj.level);
        cardObj.level++;
        leveledUp = true;
    }
    return leveledUp;
}

export function getFodderExp(card) {
    let base = 50;
    if(card.rarity === 'SR') base = 500;
    if(card.rarity === 'R') base = 150;
    return base + (card.level * 10);
}

export function renderStars(count) {
    let html = '';
    for(let i=0; i<count; i++) html += '<i class="fa-solid fa-star"></i>';
    return html;
}

export function getAttackTypeIcon(role, type) {
    const roleLower = (role || '').toLowerCase();
    if (roleLower.includes('wizard') || roleLower.includes('mage') || roleLower.includes('healer')) return '✨';
    if (roleLower.includes('ranger')) return '🏹';
    if (type === 'Ranged') return '🎯';
    return '⚔️';
}
