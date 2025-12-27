export const GAME_CONFIG = {
    STAMINA_COST: 5,
    WIN_GOLD_MIN: 10, WIN_GOLD_MAX: 20,
    LOSE_GOLD_MIN: 5, LOSE_GOLD_MAX: 10,
    BOSS_STAGE_INTERVAL: 5,
    BREEDING_COST: 2000,
    BREEDING_MIN_LEVEL: 10,
    INHERIT_BONUS: 0.15
};

export const BREEDING_CONFIG = {
    COST: 2000,       // ใช้เงิน 2000
    MIN_LEVEL: 10,    // พ่อแม่ต้อง Lv.10+
    INHERIT_BONUS: 0.15 // ลูกได้โบนัส 15% จากพ่อแม่
};

export const STATUS_CONFIG = {
    BURN: { name: 'Burn', icon: '🔥', dmg: 20, color: 'text-orange-500' },
    POISON: { name: 'Poison', icon: '🤢', dmg: 10, color: 'text-green-400' },
    FREEZE: { name: 'Freeze', icon: '❄️', dmg: 0, color: 'text-blue-300' },
    REGEN: { name: 'Regen', icon: '❤️', val: 30, color: 'text-pink-400' }
};

export const ELEMENTS = {
    FIRE: { name: 'Fire', icon: '🔥', color: 'text-red-500' },
    WATER: { name: 'Water', icon: '💧', color: 'text-blue-500' },
    NATURE: { name: 'Nature', icon: '🌿', color: 'text-green-500' },
    LIGHT: { name: 'Light', icon: '⚡', color: 'text-yellow-400' },
    DARK: { name: 'Dark', icon: '🌑', color: 'text-purple-500' }
};
export const ELEMENTS_LIST = Object.keys(ELEMENTS);

export const ELEMENT_CHART = {
    FIRE: { STRONG: 'NATURE', WEAK: 'WATER' },
    WATER: { STRONG: 'FIRE', WEAK: 'NATURE' },
    NATURE: { STRONG: 'WATER', WEAK: 'FIRE' },
    LIGHT: { STRONG: 'DARK', WEAK: 'LIGHT' }, 
    DARK: { STRONG: 'LIGHT', WEAK: 'DARK' }
};


export const CARD_DATABASE = {
    // --- ⭐ ระดับ 1: COMMON (C) ---
    "c_001": { 
        name: "Blue Slime", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/c1.webp", rarity: "C", element: "NATURE",
        baseHp: 10, baseAtk: 2, baseDef: 5, baseSpd: 1, baseCrit: 0,
        desc: "สไลม์ต้มน้ำ เป็นมิตรกับผู้เริ่มต้น"
    },
    "c_002": { 
        name: "Purple Slime", type: "Melee", role: "Speed", icon: "/js/core/config_IMG/img_card/c2.webp", rarity: "C", element: "NATURE",
        baseHp: 9, baseAtk: 3, baseDef: 2, baseSpd: 3, baseCrit: 0,
        desc: "สุนัขหลงทางที่หิวโหย รวดเร็วแต่เปราะบาง"
    },
    "c_003": { 
        name: "Red Slime", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/c3.webp", rarity: "C", element: "NATURE",
        baseHp: 11, baseAtk: 4, baseDef: 5, baseSpd: 1, baseCrit: 0,
        desc: "หุ่นซ้อม รับดาเมจได้ดีแต่ตอบโต้ไม่ได้"
    },

    // --- ⭐⭐ ระดับ 2: UNCOMMON (U) ---
    "u_001": { 
        name: "stone bear", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/u1.webp", rarity: "U", element: "NATURE",
        baseHp: 20, baseAtk: 8, baseDef: 10, baseSpd: 5, baseCrit: 0.02,
        desc: "กอบลินลาดตระเวน ชอบลอบกัด"
    },
    "u_002": { 
        name: "Skeleton Soldier", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/u2.webp", rarity: "U", element: "NATURE",
        baseHp: 18, baseAtk: 9, baseDef: 7, baseSpd: 6, baseCrit: 0.01,
        desc: "โครงกระดูกทหารเก่า ไม่มีวันเหนื่อย"
    },
    "u_003": { 
        name: "Brutal shark", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/u3.webp", rarity: "U", element: "WATER",
        baseHp: 19, baseAtk: 11, baseDef: 5, baseSpd: 8, baseCrit: 0.1,
        desc: "จอมเวทย์ฝึกหัด กำลังเรียนรู้เวทย์บอลน้ำ"
    },

    // --- ⭐⭐⭐ ระดับ 3: RARE (R) ---
    "r_001": { 
        name: "Storm-Paws", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/r1.webp", rarity: "R", element: "LIGHT",
        baseHp: 33, baseAtk: 15, baseDef: 10, baseSpd: 7, baseCrit: 0.05,
        desc: "อัศวินราชองค์รักษ์ เกราะหนาและภักดี"
    },
    "r_002": { 
        name: "LIGHT Sorcerer", type: "Melee", role: "Speed", icon: "/js/core/config_IMG/img_card/r2.webp", rarity: "R", element: "LIGHT",
        baseHp: 29, baseAtk: 18, baseDef: 12, baseSpd: 10, baseCrit: 0.02,
        desc: "จอมเวทย์เพลิง เผาทุกอย่างที่ขวางหน้า"
    },
    "r_003": { 
        name: "Flame Sorcerer", type: "Ranged", role: "Melee", icon: "/js/core/config_IMG/img_card/r3.webp", rarity: "R", element: "FIRE",
        baseHp: 38, baseAtk: 16, baseDef: 16, baseSpd: 11, baseCrit: 0.05,
        desc: "นักธนูเอลฟ์ แม่นยำราวจับวาง"
    },

    // --- ⭐⭐⭐⭐ ระดับ 4: SUPER RARE (SR) ---
    "sr_001": { 
        name: "Dark Assassin", type: "Melee", role: "Speed", icon: "/js/core/config_IMG/img_card/sr1.webp", rarity: "SR", element: "DARK",
        baseHp: 45, baseAtk: 23, baseDef: 18, baseSpd: 22, baseCrit: 0.1,
        desc: "นักฆ่าในเงามืด ปลิดชีพศัตรูก่อนที่จะรู้ตัว"
    },
    "sr_002": { 
        name: "High Priestess", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/sr2.webp", rarity: "SR", element: "LIGHT",
        baseHp: 65, baseAtk: 15, baseDef: 22, baseSpd: 20, baseCrit: 0.1,
        desc: "นักบวชชั้นสูง ผู้ปกป้องพวกพ้องด้วยแสงศักดิ์สิทธิ์"
    },
    "sr_003": { 
        name: "Berserker", type: "Melee", role: "Melee", icon: "/js/core/config_IMG/img_card/sr3.webp", rarity: "SR", element: "FIRE",
        baseHp: 51, baseAtk: 26, baseDef: 20, baseSpd: 24, baseCrit: 0.1,
        desc: "ราชานรกคลั่ง ยิ่งเจ็บยิ่งเก่ง"
    },

    // --- ⭐⭐⭐⭐⭐ ระดับ 5: ULTRA RARE (UR) ---
    "ur_001": { 
        name: "Bahamut", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/ur2.webp", rarity: "UR", element: "WATER",
        baseHp: 99, baseAtk: 48, baseDef: 38, baseSpd: 32, baseCrit: 0.15,
        desc: "ราชาแห่งมังกร ลมหายใจเยือกเย็น"
    },

    // --- ⭐⭐⭐⭐⭐⭐ ระดับ 6: LEGENDARY ---
    "leg_001": { 
        name: "Zeus", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/leg2.webp", rarity: "LEGEND", element: "DARK",
        baseHp: 110, baseAtk: 60, baseDef: 43, baseSpd: 30, baseCrit: 0.2,
        desc: "จอมมารแห่งความมืด ผู้ปกครองโลกเบื้องล่าง"
    },

    // --- ⭐⭐⭐⭐⭐⭐⭐ ระดับ 7+: MYTHICAL (มายา) ---
    "myth_001": { 
        name: "Void Eater", type: "Melee", role: "Boss", icon: "/js/core/config_IMG/img_card/myl1.webp", rarity: "MYTHICAL", element: "DARK",
        baseHp: 230, baseAtk: 88, baseDef: 56, baseSpd: 45, baseCrit: 0.3,
        desc: "สิ่งมีชีวิตจากต่างมิติ ผู้กลืนกินดวงดาว"
    }
};

export const ENEMY_DATABASE = {
    // --- ⭐ ระดับ 1: COMMON (C) ---
    "c_001": { 
        name: "Blue Slime", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/c1.webp", rarity: "C", element: "NATURE",
        baseHp: 10, baseAtk: 2, baseDef: 5, baseSpd: 1, baseCrit: 0,
        desc: "สไลม์ต้มน้ำ เป็นมิตรกับผู้เริ่มต้น"
    },
    "c_002": { 
        name: "Purple Slime", type: "Melee", role: "Speed", icon: "/js/core/config_IMG/img_card/c2.webp", rarity: "C", element: "NATURE",
        baseHp: 9, baseAtk: 3, baseDef: 2, baseSpd: 3, baseCrit: 0,
        desc: "สุนัขหลงทางที่หิวโหย รวดเร็วแต่เปราะบาง"
    },
    "c_003": { 
        name: "Red Slime", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/c3.webp", rarity: "C", element: "NATURE",
        baseHp: 11, baseAtk: 4, baseDef: 5, baseSpd: 1, baseCrit: 0,
        desc: "หุ่นซ้อม รับดาเมจได้ดีแต่ตอบโต้ไม่ได้"
    },

    // --- ⭐⭐ ระดับ 2: UNCOMMON (U) ---
    "u_001": { 
        name: "stone bear", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/u1.webp", rarity: "U", element: "NATURE",
        baseHp: 20, baseAtk: 8, baseDef: 10, baseSpd: 5, baseCrit: 0.02,
        desc: "กอบลินลาดตระเวน ชอบลอบกัด"
    },
    "u_002": { 
        name: "Skeleton Soldier", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/u2.webp", rarity: "U", element: "NATURE",
        baseHp: 18, baseAtk: 9, baseDef: 7, baseSpd: 6, baseCrit: 0.01,
        desc: "โครงกระดูกทหารเก่า ไม่มีวันเหนื่อย"
    },
    "u_003": { 
        name: "Brutal shark", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/u3.webp", rarity: "U", element: "WATER",
        baseHp: 19, baseAtk: 11, baseDef: 5, baseSpd: 8, baseCrit: 0.1,
        desc: "จอมเวทย์ฝึกหัด กำลังเรียนรู้เวทย์บอลน้ำ"
    },

    // --- ⭐⭐⭐ ระดับ 3: RARE (R) ---
    "r_001": { 
        name: "Storm-Paws", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/r1.webp", rarity: "R", element: "LIGHT",
        baseHp: 33, baseAtk: 15, baseDef: 10, baseSpd: 7, baseCrit: 0.05,
        desc: "อัศวินราชองค์รักษ์ เกราะหนาและภักดี"
    },
    "r_002": { 
        name: "LIGHT Sorcerer", type: "Melee", role: "Speed", icon: "/js/core/config_IMG/img_card/r2.webp", rarity: "R", element: "LIGHT",
        baseHp: 29, baseAtk: 18, baseDef: 12, baseSpd: 10, baseCrit: 0.02,
        desc: "จอมเวทย์เพลิง เผาทุกอย่างที่ขวางหน้า"
    },
    "r_003": { 
        name: "Flame Sorcerer", type: "Ranged", role: "Melee", icon: "/js/core/config_IMG/img_card/r3.webp", rarity: "R", element: "FIRE",
        baseHp: 38, baseAtk: 16, baseDef: 16, baseSpd: 11, baseCrit: 0.05,
        desc: "นักธนูเอลฟ์ แม่นยำราวจับวาง"
    },

    // --- ⭐⭐⭐⭐ ระดับ 4: SUPER RARE (SR) ---
    "sr_001": { 
        name: "Dark Assassin", type: "Melee", role: "Speed", icon: "/js/core/config_IMG/img_card/sr1.webp", rarity: "SR", element: "DARK",
        baseHp: 45, baseAtk: 23, baseDef: 18, baseSpd: 22, baseCrit: 0.1,
        desc: "นักฆ่าในเงามืด ปลิดชีพศัตรูก่อนที่จะรู้ตัว"
    },
    "sr_002": { 
        name: "High Priestess", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/sr2.webp", rarity: "SR", element: "LIGHT",
        baseHp: 65, baseAtk: 15, baseDef: 22, baseSpd: 20, baseCrit: 0.1,
        desc: "นักบวชชั้นสูง ผู้ปกป้องพวกพ้องด้วยแสงศักดิ์สิทธิ์"
    },
    "sr_003": { 
        name: "Berserker", type: "Melee", role: "Melee", icon: "/js/core/config_IMG/img_card/sr3.webp", rarity: "SR", element: "FIRE",
        baseHp: 51, baseAtk: 26, baseDef: 20, baseSpd: 24, baseCrit: 0.1,
        desc: "ราชานรกคลั่ง ยิ่งเจ็บยิ่งเก่ง"
    },

    // --- ⭐⭐⭐⭐⭐ ระดับ 5: ULTRA RARE (UR) ---
    "ur_001": { 
        name: "Bahamut", type: "Melee", role: "Tank", icon: "/js/core/config_IMG/img_card/ur2.webp", rarity: "UR", element: "WATER",
        baseHp: 99, baseAtk: 48, baseDef: 38, baseSpd: 32, baseCrit: 0.15,
        desc: "ราชาแห่งมังกร ลมหายใจเยือกเย็น"
    },

    // --- ⭐⭐⭐⭐⭐⭐ ระดับ 6: LEGENDARY ---
    "leg_001": { 
        name: "Zeus", type: "Ranged", role: "Magic", icon: "/js/core/config_IMG/img_card/leg2.webp", rarity: "LEGEND", element: "DARK",
        baseHp: 110, baseAtk: 60, baseDef: 43, baseSpd: 30, baseCrit: 0.2,
        desc: "จอมมารแห่งความมืด ผู้ปกครองโลกเบื้องล่าง"
    },

    // --- ⭐⭐⭐⭐⭐⭐⭐ ระดับ 7+: MYTHICAL (มายา) ---
    "myth_001": { 
        name: "Void Eater", type: "Melee", role: "Boss", icon: "/js/core/config_IMG/img_card/myl1.webp", rarity: "MYTHICAL", element: "DARK",
        baseHp: 230, baseAtk: 88, baseDef: 56, baseSpd: 45, baseCrit: 0.3,
        desc: "สิ่งมีชีวิตจากต่างมิติ ผู้กลืนกินดวงดาว"
    }
};

export const MASTER_DATABASE = { ...CARD_DATABASE, ...ENEMY_DATABASE };



// --- 🌍 STAGE LIST ---
export const STAGE_LIST = [
    // WORLD 1: ป่าแห่งการเริ่มต้น (C - U)
    {
        id: 1, world: 1, sub: 1, 
        name: "1-1 Slime Field", 
        desc: "ทุ่งสไลม์หน้าหมู่บ้าน",
        image: "/js/core/config_IMG/img_stage/stage1_1.webp",
        stamina: 5, 
        enemies: ["c_001", "c_001"], boss: null,
        rewards: { goldMin: 20, goldMax: 40, exp: 20, drops: [{ itemId: 'eq_w01', chance: 0.2 }] }
    },
    {
        id: 2, world: 1, sub: 2, 
        name: "1-2 Stray Dogs", 
        desc: "ฝูงหมาป่าหิวโหย",
        image: "/js/core/config_IMG/img_stage/stage1_2.webp",
        stamina: 5, 
        enemies: ["c_002", "c_001"], boss: null,
        rewards: { goldMin: 30, goldMax: 50, exp: 30, drops: [{ itemId: 'shop_stamina_1', chance: 0.1 }] }
    },
    {
        id: 3, world: 1, sub: 3, 
        name: "1-3 Goblin Camp", 
        desc: "ค่ายกอบลิน",
        image: "/js/core/config_IMG/img_stage/stage1_3.webp",
        stamina: 6, 
        enemies: ["u_001", "u_001", "c_003"], boss: null,
        rewards: { goldMin: 40, goldMax: 60, exp: 40, drops: [{ itemId: 'eq_a01', chance: 0.2 }] }
    },
    {
        id: 4, world: 1, sub: 4, 
        name: "1-4 Skeleton Cave", 
        desc: "ถ้ำโครงกระดูก",
        image: "/js/core/config_IMG/img_stage/stage1_4.webp",
        stamina: 8, 
        enemies: ["u_002", "u_002", "u_001"], boss: null,
        rewards: { goldMin: 50, goldMax: 80, exp: 50, drops: [{ itemId: 'eq_acc01', chance: 0.1 }] }
    },
    {
        id: 5, world: 1, sub: 5, 
        name: "1-5 Mage Boss", 
        desc: "บอสจอมเวทย์ฝึกหัด",
        image: "/js/core/config_IMG/img_stage/stage1_5.webp",
        stamina: 10, 
        enemies: ["u_003"], boss: "u_003", // มินิบอส
        rewards: { goldMin: 200, goldMax: 300, exp: 200, drops: [{ itemId: 'shop_eq_chest', chance: 1.0 }] }
    },

    // WORLD 2: ดินแดนศักดิ์สิทธิ์และต้องสาป (R - SR)
    {
        id: 6, world: 2, sub: 1, 
        name: "2-1 Royal Guard", 
        desc: "อัศวินหลวงขวางทาง",
        image: "/js/core/config_IMG/img_stage/stage2_1.webp",
        stamina: 10, 
        enemies: ["r_001", "r_001"], boss: null,
        rewards: { goldMin: 100, goldMax: 150, exp: 100, drops: [] }
    },
    {
        id: 7, world: 2, sub: 2, 
        name: "2-2 Deep Fire", 
        desc: "จอมเวทย์เพลิง",
        image: "/js/core/config_IMG/img_stage/stage2_2.webp",
        stamina: 12, 
        enemies: ["r_002", "r_002", "r_001"], boss: null,
        rewards: { goldMin: 150, goldMax: 200, exp: 150, drops: [] }
    },
    {
        id: 8, world: 2, sub: 3, 
        name: "2-3 Assassin", 
        desc: "นักฆ่าในเงามืด",
        image: "/js/core/config_IMG/img_stage/stage2_3.webp",
        stamina: 15, 
        enemies: ["sr_001", "r_003"], boss: "sr_001",
        rewards: { goldMin: 300, goldMax: 500, exp: 300, drops: [] }
    },

    // WORLD 3: มิติเทพเจ้า (UR - MYTHICAL)
    {
        id: 9, world: 3, sub: 1, 
        name: "3-1 Dragon Nest", 
        desc: "รังมังกรบาฮามุท",
        image: "/js/core/config_IMG/img_stage/stage3_1.webp",
        stamina: 20, 
        enemies: ["ur_001", "r_002", "r_002"], boss: "ur_001",
        rewards: { goldMin: 1000, goldMax: 2000, exp: 1000, drops: [] }
    },
    {
        id: 10, world: 3, sub: 2, 
        name: "3-5 THE VOID", 
        desc: "จุดจบของทุกสรรพสิ่ง",
        image: "/js/core/config_IMG/img_stage/stage3_2.webp",
        stamina: 50, 
        enemies: ["myth_001"], boss: "myth_001", // บอสมายา
        rewards: { goldMin: 50000, goldMax: 100000, exp: 50000, drops: [] }
    }
];

// --- 🎰 GACHA POOLS (อัปเดตเรทให้มี 7 ระดับ) ---
export const GACHA_POOLS = [
    { 
        id: 'normal', name: 'Starter Summon', desc: 'เหมาะสำหรับมือใหม่', 
        cost: 1000, currency: 'gold', icon: '🥉', color: 'from-slate-700 to-slate-600', 
        rates: {SR: 0.01, R: 0.10, U: 0.40, C: 0.49 } 
    },
    { 
        id: 'rare', name: 'Advanced Summon', desc: 'โอกาสได้ตัวหายาก', 
        cost: 120, currency: 'GEMS', icon: '🥈', color: 'from-blue-900 to-blue-800', 
        rates: {LEGEND: 0.005, UR: 0.02, SR: 0.15, R: 0.50, U: 0.324, C: 0 } 
    },
    { 
        id: 'epic', name: 'God Summon', desc: 'ลุ้นรับระดับมายา!', 
        cost: 500, currency: 'GEMS', icon: '👑', color: 'from-yellow-700 to-yellow-600', 
        rates: { MYTHICAL: 0.001, LEGEND: 0.05, UR: 0.15, SR: 0.40, R: 0.39 } 
    }
];


// --- 🛒 SHOP CONFIGURATION ---

// 1. หมวดของใช้ทั่วไป (Consumables)
export const SHOP_GENERAL = [
    { id: 'pot_small', name: 'Small Potion', desc: 'ฟื้นฟู 20 Stamina', icon: '🧪', cost: 200, type: 'STAMINA', value: 20 },
    { id: 'pot_large', name: 'Large Potion', desc: 'ฟื้นฟู 100 Stamina', icon: '🍷', cost: 800, type: 'STAMINA', value: 100 },
    { id: 'tkt_exp',   name: 'EXP Ticket',   desc: 'เพิ่ม 500 EXP ให้ฮีโร่', icon: '📜', cost: 500, type: 'EXP_HERO', value: 500 },
];

// 2. หมวดอุปกรณ์ & กล่องสุ่ม (Equipment & Mystery Boxes)
export const SHOP_EQUIPMENT = [
    { 
        id: 'box_common', name: 'Wooden Chest', desc: 'สุ่มอุปกรณ์ระดับ C - R', 
        icon: '📦', cost: 1000, currency: 'GOLD', type: 'GACHA_BOX', 
        pool: ['eq_w01', 'eq_a01', 'eq_w02', 'eq_a02', 'eq_acc01', 'eq_acc02'] 
    },
    { 
        id: 'box_rare', name: 'Golden Chest', desc: 'สุ่มอุปกรณ์ระดับ R - SR', 
        icon: '🧰', cost: 3000, currency: 'GOLD', type: 'GACHA_BOX', 
        pool: ['eq_w02', 'eq_a02', 'eq_acc02', 'eq_w03', 'eq_a03', 'eq_acc03'] 
    },
    { 
        id: 'box_hero', name: 'Hero Gear Box', desc: 'สุ่มอุปกรณ์สำหรับฮีโร่เท่านั้น', 
        icon: '🛡️', cost: 5000, currency: 'GOLD', type: 'GACHA_BOX_HERO', 
        pool: ['he_w01', 'he_h01', 'he_a01', 'he_b01', 'he_w02', 'he_acc01'] 
    }
];

// 3. หมวดฮีโร่ (Hero Shop)
export const SHOP_HEROES = [
    { id: 'unlock_lilith', name: 'Unlock Lilith', desc: 'จอมเวทย์มืด (Sorceress)', icon: '/js/core/config_IMG/img_hero/hero2.webp', cost: 15000, currency: 'GOLD', type: 'UNLOCK_HERO', value: 'h002' },
    { id: 'unlock_grog',   name: 'Unlock Grog',   desc: 'นักรบคลั่ง (Barbarian)', icon: '/js/core/config_IMG/img_hero/hero4.webp', cost: 20000, currency: 'GOLD', type: 'UNLOCK_HERO', value: 'h003' }
];

// 4. หมวดการ์ดพิเศษ (Card Shop)
export const SHOP_CARDS = [
    // แบบปกติ (ได้ Lv.1 ⭐1)
    { 
        id: 'card_bahamut', 
        name: 'Bahamut', 
        desc: 'ราชามังกร (UR)', 
        icon: '/js/core/config_IMG/img_card/ur2.webp', 
        cost: 500,
        currency: 'GEMS', 
        type: 'BUY_CARD', 
        value: 'ur_001' // <--- ID การ์ด
    },
    
    // ✅ แบบระบุสเปค (เช่น ขาย Bahamut ร่างเทพ 5 ดาว)
    { 
        id: 'card_bahamut_god', 
        name: 'Awakened Bahamut', 
        desc: 'ราชามังกรจุติ (Lv.30 ⭐5)', 
        icon: '/js/core/config_IMG/img_card/ur2.webp', 
        cost: 5000, // แพงขึ้น
        currency: 'GEMS',
        type: 'BUY_CARD', 
        value: 'ur_001', 
        // 👇 ระบุสเปคตรงนี้
        specs: { level: 30, stars: 5 } 
    }
];

// รวมทั้งหมดไว้อ้างอิงถ้าจำเป็น
export const ALL_SHOP_ITEMS = [...SHOP_GENERAL, ...SHOP_EQUIPMENT, ...SHOP_HEROES, ...SHOP_CARDS];

// ใน js/core/config.js

export const TRAIT_DATABASE = {
    // --- ⚔️ Trait เดิม (สาย Battle Effect) ---
    // เพิ่ม statMod เข้าไปเพื่อให้มีผลกับค่าพลังด้วย (Option)
    "t_vampire": { name: "Vampire", desc: "ดูดเลือด 15% / ATK+5%", icon: "🩸", statMod: { atk: 1.05 } },
    "t_thorns": { name: "Thorns", desc: "สะท้อน 10% / HP+5%", icon: "🌵", statMod: { hp: 1.05 } },
    "t_crit": { name: "Critical Master", desc: "Cri+20%", icon: "🎯", statMod: { crit: 0.2 } },
    "t_stoneskin": { name: "Stone Skin", desc: "ลดดาเมจ 15% / DEF+10%", icon: "🧱", statMod: { def: 1.1 } },
    "t_berserk": { name: "Berserk", desc: "เลือดน้อยตีแรง / ATK+10%", icon: "😡", statMod: { atk: 1.1 } },
    "t_double_strike": { name: "Double Strike", desc: "ตีเบิ้ล 15% / Spd+5", icon: "⚔️", statMod: { spd: 5 } },

    // --- 🧬 Trait ใหม่ (สาย Breeding / Stat ล้วน) ---
    // เอาไว้ให้ Tier 2 สุ่มได้ง่ายๆ
    "t_hp_up":   { name: "Healthy", desc: "Max HP +10%", icon: "💚", statMod: { hp: 1.1 } },
    "t_atk_up":  { name: "Strong Arm", desc: "ATK +10%", icon: "💪", statMod: { atk: 1.1 } },
    "t_def_up":  { name: "Iron Body", desc: "DEF +10%", icon: "🛡️", statMod: { def: 1.1 } },
    "t_spd_up":  { name: "Swift", desc: "Speed +10", icon: "👟", statMod: { spd: 10 } },
    
    // --- 🌟 Trait ลับ (Secret Evolution) ---
    "t_god_body": { name: "Titan Form", desc: "All Stats +20%", icon: "👑", statMod: { hp: 1.2, atk: 1.2, def: 1.2 } }
};
export const TRAIT_KEYS = Object.keys(TRAIT_DATABASE);

// --- EQUIPMENT DATABASE of card ---

export const EQUIPMENT_DATABASE = {
    // Weapons
    "eq_w01": { 
        name: "Rusty Sword", 
        type: "weapon", 
        icon: "/js/core/config_IMG/img_card/equipment/cc01w.webp", 
        rarity: "C", 
        desc: "ดาบเก่าๆ สนิมเขรอะ",
        atk: 10, hp: 0, 
    },
    "eq_w02": { 
        name: "Iron Blade", 
        type: "weapon", 
        icon: "/js/core/config_IMG/img_card/equipment/cr01w.webp", 
        rarity: "R", 
        desc: "ดาบคม",
        atk: 35, hp: 0, 
        crit: 0.1 // <--- เพิ่มโอกาสคริ 10%
    },
    "eq_w03": { 
        name: "Dragon Slayer", 
        type: "weapon", 
        icon: "/js/core/config_IMG/img_card/equipment/cs01w.webp", 
        rarity: "SR", 
        desc: "ดาบปราบมังกรในตำนาน",
        atk: 100, hp: 50 
    },


    // Armors
    "eq_a01": { 
        name: "Cloth Tunic", 
        type: "armor",
        icon: "/js/core/config_IMG/img_card/equipment/cc01a.webp", 
        rarity: "C", 
        desc: "ชุดผ้าธรรมดา",
        atk: 0, hp: 50,
    },
    "eq_a02": { 
        name: "Chainmail", 
        type: "armor", 
        icon: "/js/core/config_IMG/img_card/equipment/cr01a.webp", 
        rarity: "R", 
        desc: "เกราะโซ่",
        atk: 0, hp: 150, 
        def: 50 
    },
    "eq_a03": { 
        name: "Holy Plate", 
        type: "armor",
        icon: "/js/core/config_IMG/img_card/equipment/cs01a.webp", 
        rarity: "SR", 
        desc: "เกราะศักดิ์สิทธิ์ส่องแสง",
        atk: 20, hp: 300, 
    },


    // Accessories
    "eq_acc01": { 
        name: "Vitality Ring", 
        type: "accessory", 
        icon: "/js/core/config_IMG/img_card/equipment/cc01acc.webp", 
        rarity: "c", 
        desc: "แหวนเพิ่มพลังชีวิต",
        atk: 0, hp: 10,
    },
    "eq_acc02": { 
        name: "Power Glove", 
        type: "accessory", 
        icon: "/js/core/config_IMG/img_card/equipment/cr01acc.webp", 
        rarity: "R", 
        desc: "ถุงมือ",
        atk: 25, hp: 25, 
        spd: 15 // <--- เพิ่มความเร็ว
    },
    "eq_acc03": { 
        name: "Amulet of Strength", 
        type: "accessory", 
        icon: "/js/core/config_IMG/img_card/equipment/cs01acc.webp", 
        rarity: "SR", 
        desc: "จี้แห่งพลัง",
        atk: 50, hp: 50
    }
};

export const EQUIPMENT_KEYS = Object.keys(EQUIPMENT_DATABASE);

// --- HERO DATABASE ---
export const HERO_DATABASE = {
    "h001": { 
        name: "Arthur", job: "Paladin", element: "LIGHT", icon: "/js/core/config_IMG/img_hero/hero1.webp", 
        baseHp: 600, baseAtk: 60, baseDef: 50, baseSpd: 100, baseCrit: 0.1,
        desc: "อัศวินผู้กล้าหาญ เริ่มต้นการผจญภัย",
        skill: { name: "Leadership", desc: "เพิ่ม ATK ให้เพื่อนร่วมทีมทั้งหมด 10%" }
    },
    "h002": { 
        name: "Lilith", job: "Sorceress", element: "DARK", icon: "/js/core/config_IMG/img_hero/hero2.webp", 
        baseHp: 450, baseAtk: 90, baseDef: 30, baseSpd: 110, baseCrit: 0.15,
        desc: "จอมเวทย์มนตร์ดำ ผู้ควบคุมพลังมืด",
        skill: { name: "Vampiric Aura", desc: "เพื่อนร่วมทีมดูดเลือด 10% จากดาเมจที่ทำได้" }
    },
    "h003": { 
        name: "Grog", job: "Barbarian", element: "FIRE", icon: "/js/core/config_IMG/img_hero/hero3.webp",
        baseHp: 800, baseAtk: 70, baseDef: 40, baseSpd: 90, baseCrit: 0.2,
        desc: "นักรบคลั่ง ผู้กระหายสงคราม",
        skill: { name: "War Cry", desc: "เริ่มต่อสู้ เพื่อนร่วมทีมได้เกราะป้องกัน 100 หน่วย" }
    }
};
export const HERO_PASSIVES = {
    'h_warrior': { name: "Commanding Shout", desc: "All allies gain +10% ATK." },
    'h_mage':    { name: "Arcane Aura",      desc: "All allies gain +10% Magic DMG." },
    'h_tank':    { name: "Shield Wall",      desc: "All allies take -10% Damage." },
    'h_rogue':   { name: "Shadow Step",      desc: "Team CRIT Chance +10%." },
    'h_healer':  { name: "Holy Light",       desc: "Heal lowest HP ally for 5% every turn." }
};
// --- HERO EQUIPMENT (แยกจากมอนสเตอร์) ---
// Slots: weapon, helm, armor, boots, accessory
export const HERO_EQUIPMENT_DATABASE = {

    // Weapons
    "he_w01": { 
        type: "weapon", 
        name: "Royal Sword", atk: 50, 
        icon: "/js/core/config_IMG/img_hero/equipment/c01w.webp", 
        rarity: "R" 
    },
    "he_w02": { 
        type: "weapon", 
        name: "Demon Staff", atk: 80, 
        icon: "/js/core/config_IMG/img_hero/equipment/c02w.webp", 
        rarity: "SR" 
    },


    // Helms
    "he_h01": { 
        type: "helm", 
        name: "Iron Helm", def: 30, 
        icon: "/js/core/config_IMG/img_hero/equipment/c01h.webp", 
        rarity: "C" 
    },


    // Armors
    "he_a01": { 
        type: "armor", 
        name: "Plate Mail", def: 60, hp: 200, 
        icon: "/js/core/config_IMG/img_hero/equipment/r01a.webp", 
        rarity: "R" 
    },


    // Boots
    "he_b01": { 
        type: "boots", 
        name: "Leather Boots", spd: 20, 
        icon: "/js/core/config_IMG/img_hero/equipment/c01b.webp", 
        rarity: "C" 
    },


    // Accessories
    "he_acc01": { 
        type: "accessory", 
        name: "King's Ring", hp: 300, crit: 0.05, 
        icon: "/js/core/config_IMG/img_hero/equipment/s01acc.webp", 
        rarity: "SR" 
    }
};

export const HERO_EQUIP_KEYS = Object.keys(HERO_EQUIPMENT_DATABASE);

