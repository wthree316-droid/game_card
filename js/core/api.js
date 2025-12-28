// js/core/api.js
import { playerData, saveGame } from './state.js';
// ✅ 1. เปลี่ยน import จาก firebaseConfig เป็น db
import { db } from './firebase-config.js'; 
import { createNewCard, getCardStats, getHeroStats } from '../utils.js'; // ✅ 2. เพิ่ม getHeroStats
import { 
    SHOP_GENERAL, SHOP_EQUIPMENT, SHOP_HEROES, SHOP_CARDS, 
    EQUIPMENT_DATABASE, EQUIPMENT_KEYS, HERO_EQUIPMENT_DATABASE, 
    CARD_DATABASE 
} from './config.js';

// ✅ 3. อัปเดต Version ของ Firestore SDK ให้ตรงกัน (10.7.1)
import { collection, query, where, getDocs, doc, setDoc, updateDoc, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ✅ 4. เพิ่มฟังก์ชันช่วยคำนวณพลัง (เพราะไฟล์นี้มองไม่เห็น calculateTeamPower ใน arena.js)
function calculatePower(deckData) {
    if (!Array.isArray(deckData)) return 0;
    return deckData.reduce((total, unit) => {
        if (!unit) return total;
        return total + (unit.power || 0);
    }, 0);
}

export const API = {
    async getProfile() {
        await delay(50);
        return playerData;
    },

    async spendGold(amount) {
        if (playerData.resources.gold < amount) throw new Error("Gold ไม่พอ!");
        playerData.resources.gold -= amount;
        saveGame();
        return playerData.resources;
    },

    async spendResource(type, amount) {
        if (type === 'GEMS') {
            if ((playerData.resources.gems || 0) < amount) throw new Error("💎 Not enough Gems!");
            playerData.resources.gems -= amount;
        } else {
            // Default GOLD
            if (playerData.resources.gold < amount) throw new Error("🟡 Not enough Gold!");
            playerData.resources.gold -= amount;
        }
        saveGame();
    },

    // --- Gacha System ---
    async summonGacha(pool) {
        if (playerData.resources[pool.currency] < pool.cost) throw new Error("เงินไม่พอ!");
        playerData.resources[pool.currency] -= pool.cost;
        await delay(500); 

        const rand = Math.random();
        let rarity = 'C';
        if (rand < (pool.rates.R + pool.rates.SR)) rarity = 'R';
        if (rand < pool.rates.SR) rarity = 'SR';

        const allCards = Object.keys(CARD_DATABASE).map(k => ({...CARD_DATABASE[k], id: k}));
        let validCards = allCards.filter(c => c.rarity === rarity);
        if (pool.filterElement) validCards = validCards.filter(c => c.element === pool.filterElement || c.element === 'LIGHT');
        if(validCards.length === 0) validCards = allCards.filter(c => c.rarity === 'C');
        const pickedTemplate = validCards[Math.floor(Math.random() * validCards.length)];

        const newCard = createNewCard(pickedTemplate.id);
        playerData.inventory.push(newCard);
        saveGame();
        return newCard;
    },

    // --- 🛒 SHOP SYSTEM ---
    async buyShopItem(itemId) {
        const allItems = [...SHOP_GENERAL, ...SHOP_EQUIPMENT, ...SHOP_HEROES, ...SHOP_CARDS];
        const item = allItems.find(i => i.id === itemId);
        if(!item) throw new Error("Item not found");
        
        const currency = item.currency || 'GOLD';
        await this.spendResource(currency, item.cost);
        
        let result = { ...item, status: 'success' }; 

        if(item.type === 'STAMINA' || item.type === 'EXP_HERO') {
            if(!playerData.items) playerData.items = {};
            if(!playerData.items[itemId]) playerData.items[itemId] = 0;
            playerData.items[itemId]++;
            result.rewardType = "ITEM_ADDED";
            result.message = "Added to Inventory";
        } 
        else if(item.type.includes('GACHA')) { 
            let pool = item.pool;
            let targetDB = EQUIPMENT_DATABASE;
            let isHeroGear = item.type === 'GACHA_BOX_HERO';

            if (isHeroGear) {
                targetDB = HERO_EQUIPMENT_DATABASE;
                if (!pool) pool = Object.keys(HERO_EQUIPMENT_DATABASE);
            } else {
                if (!pool) pool = EQUIPMENT_KEYS || Object.keys(EQUIPMENT_DATABASE);
            }

            const randomId = pool[Math.floor(Math.random() * pool.length)];
            
            if (isHeroGear) {
                if(!playerData.heroInventory) playerData.heroInventory = [];
                playerData.heroInventory.push(randomId);
            } else {
                if(!playerData.equipment) playerData.equipment = [];
                playerData.equipment.push(randomId);
            }
            
            result.obtainedItem = targetDB[randomId]; 
            result.rewardType = "EQUIPMENT_GET";
        }
        else if(item.type === 'UNLOCK_HERO') {
            if(playerData.heroes.some(h => h.heroId === item.value)) throw new Error("Already Owned!");
            playerData.heroes.push({
                uid: `h_${Date.now()}`,
                heroId: item.value,
                level: 1, exp: 0,
                equipped: { weapon: null, helm: null, armor: null, boots: null, accessory: null }
            });
            result.rewardType = "HERO_UNLOCKED";
        }
        else if(item.type === 'BUY_CARD') {
            const newCard = createNewCard(item.value);
            if (item.specs) {
                if (item.specs.level) newCard.level = item.specs.level;
                if (item.specs.stars) newCard.stars = item.specs.stars;
            }
            playerData.inventory.push(newCard);
            result.obtainedCard = newCard;
            result.rewardType = "CARD_GET";
        }

        saveGame();
        return result;
    },
    
    // --- Breeding ---
    async breedCards(parentAUid, parentBUid) {
        await delay(500);
        const pA = playerData.inventory.find(c => c.uid === parentAUid);
        const pB = playerData.inventory.find(c => c.uid === parentBUid);
        
        if(!pA || !pB) throw new Error("ไม่พบพ่อแม่พันธุ์");

        const childTemplate = Math.random() > 0.5 ? pA.cardId : pB.cardId;
        const childCard = createNewCard(childTemplate);

        const parentTraits = [...(pA.traits || []), ...(pB.traits || [])];
        const uniqueTraits = [...new Set(parentTraits)];
        const inheritedTraits = uniqueTraits.filter(() => Math.random() < 0.5);
        childCard.traits = inheritedTraits.slice(0, 3); 
        
        await this.spendGold(1000); // Default cost

        const statsA = getCardStats(pA);
        const statsB = getCardStats(pB);
        
        const inheritBonus = 0.1;
        const bonusAtk = Math.floor((statsA.atk + statsB.atk) * inheritBonus);
        const bonusHp = Math.floor((statsA.maxHp + statsB.maxHp) * inheritBonus);
        
        childCard.bonusAtk = bonusAtk;
        childCard.bonusHp = bonusHp;
        childCard.generation = (Math.max(pA.generation || 1, pB.generation || 1)) + 1;
        childCard.element = Math.random() > 0.5 ? pA.element : pB.element;

        playerData.inventory.push(childCard);
        saveGame();
        return childCard;
    },

   // ==========================================
    // ⚔️ ARENA SYSTEM (LOGIC: FAIR MATCHMAKING)
    // ==========================================

    // 1. ดึงคู่ต่อสู้จาก Firestore (แบบสมดุล)
    async getArenaOpponents(myRankPoints, myTeamPower) { // 👈 รับเพิ่ม
        const opponents = [];
        const myUid = playerData.profile.uid; 

        const range = myRankPoints < 1000 ? 100 : 300; 
        const minRank = Math.max(0, myRankPoints - range);
        const maxRank = myRankPoints + range;

        try {
            const usersRef = collection(db, "users");
            const q = query(
                usersRef,
                where("arena.rankPoints", ">=", minRank),
                where("arena.rankPoints", "<=", maxRank),
                limit(10)
            );

            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // คำนวณพลัง
                const enemyPower = calculatePower(data.arena?.defenseDeck);

                // 🛡️ กรองตัวเอง และ กรองคนที่มีพลัง 0 (พวกไม่จัดทีม) ออก
                if (doc.id !== myUid && enemyPower > 0) { 
                    opponents.push({
                        id: doc.id, 
                        name: data.profile?.name || "Unknown Fighter",
                        rankPoints: data.arena?.rankPoints || 0,
                        power: enemyPower, 
                        isBot: false,
                        deck: data.arena?.defenseDeck || [],
                        leaderboardRank: calculateRankTier(data.arena?.rankPoints || 0) 
                    });
                }
            });

        } catch (e) {
            console.error("Firebase Matchmaking Error:", e);
        }

        // 🤖 Fallback: ถ้าคนไม่พอ ให้เติมบอท
        // ส่ง myTeamPower ไปให้ฟังก์ชันสร้างบอทด้วย
        if (opponents.length < 5) {
            const botCountNeeded = 5 - opponents.length;
            const bots = generateBalancedBots(botCountNeeded, myRankPoints, myTeamPower);
            opponents.push(...bots);
        }

        return opponents.sort((a, b) => b.rankPoints - a.rankPoints);
    },
};
// ----------------------------------------------------
// 🧠 AI & CALCULATION HELPERS
// ----------------------------------------------------

// คำนวณอันดับสมมติ (เพราะ Firestore ไม่บอกว่าเราอยู่อันดับที่เท่าไหร่ของทั้งเซิร์ฟเวอร์แบบ Realtime)
function calculateRankTier(points) {
    if (points >= 5000) return 1; // เทพเจ้า
    
    // สูตร: ทุกๆ 10 คะแนนที่หายไป อันดับจะตกลง 1 อันดับ
    // เช่น 4990 = อันดับ 2, 4900 = อันดับ 11
    let rank = Math.floor((5000 - points) / 10) + 1;
    
    return Math.max(1, rank); // ห้ามต่ำกว่า 1
}

// แก้ไข Bot Generator ให้คะแนนสอดคล้องกับชื่อชั้น
function generateBalancedBots(count, myPoints, myTeamPower) {
    const bots = [];
    const botNames = ["Arena Guardian", "Shadow Knight", "Paladin", "Rogue Assassin", "Mystic Mage"];
    const basePower = myTeamPower > 0 ? myTeamPower : 1000;

    for(let i=0; i<count; i++) {
        // สุ่มคะแนนให้เกาะกลุ่มกับผู้เล่น (+/- 50)
        // เพื่อให้เวลาเรียงแล้ว บอทจะแทรกซึมอยู่ใกล้ๆ เราเนียนๆ
        const botPoints = Math.max(0, myPoints + Math.floor(Math.random() * 60) - 30);
        
        // ความเก่ง (Power)
        const difficulty = 0.8 + (Math.random() * 0.4); 

        bots.push({
            id: `bot_fill_${Date.now()}_${i}`,
            name: `${botNames[i % botNames.length]} (Bot)`,
            isBot: true,
            rankPoints: botPoints, // คะแนน
            power: Math.floor(basePower * difficulty), 
            leaderboardRank: calculateRankTier(botPoints), // ✅ คำนวณอันดับจากคะแนนจริง
            deck: [] 
        });
    }
    return bots;
}
