// js/core/api.js
import { playerData, saveGame } from './state.js';
import { createNewCard, getCardStats } from '../utils.js';
import { 
    SHOP_GENERAL, SHOP_EQUIPMENT, SHOP_HEROES, SHOP_CARDS, 
    EQUIPMENT_DATABASE, EQUIPMENT_KEYS, HERO_EQUIPMENT_DATABASE, 
    CARD_DATABASE 
} from './config.js';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

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
        // (โค้ดเดิมส่วน Gacha ปกติไม่ต้องแก้)
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

    // --- 🛒 SHOP SYSTEM (แก้ไขใหม่ รองรับ Bag) ---
    async buyShopItem(itemId) {
        // 1. ค้นหาสินค้า
        const allItems = [...SHOP_GENERAL, ...SHOP_EQUIPMENT, ...SHOP_HEROES, ...SHOP_CARDS];
        const item = allItems.find(i => i.id === itemId);
        if(!item) throw new Error("Item not found");
        
        // 2. จ่ายเงิน
        const currency = item.currency || 'GOLD';
        await this.spendResource(currency, item.cost);
        
        // 3. เตรียมผลลัพธ์
        let result = { ...item, status: 'success' }; 

        // --- A. ของใช้ (Consumables) -> ใส่กระเป๋า 🎒 ---
        if(item.type === 'STAMINA' || item.type === 'EXP_HERO') {
            if(!playerData.items) playerData.items = {};
            if(!playerData.items[itemId]) playerData.items[itemId] = 0;
            playerData.items[itemId]++;
            
            result.rewardType = "ITEM_ADDED";
            result.message = "Added to Inventory";
        } 
        // --- B. กล่องสุ่มอุปกรณ์ -> สุ่มแล้วใส่กระเป๋าอุปกรณ์ 🛡️ ---
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
        // --- C. ปลดล็อคฮีโร่ ---
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
        // --- D. การ์ดตัวละคร ---
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

        // 1. สร้างลูกก่อน (ย้ายขึ้นมา)
        const childTemplate = Math.random() > 0.5 ? pA.cardId : pB.cardId;
        const childCard = createNewCard(childTemplate);

        // 2. คำนวณ Trait
        const parentTraits = [...(pA.traits || []), ...(pB.traits || [])];
        const uniqueTraits = [...new Set(parentTraits)];
        const inheritedTraits = uniqueTraits.filter(() => Math.random() < 0.5);
        childCard.traits = inheritedTraits.slice(0, 3); // ✅ ตอนนี้ childCard มีตัวตนแล้ว
        
        // 3. ตัดเงิน
        await this.spendGold(GAME_CONFIG.BREEDING_COST);

        // 4. คำนวณ Stats Bonus
        const statsA = getCardStats(pA);
        const statsB = getCardStats(pB);
        
        const bonusAtk = Math.floor((statsA.atk + statsB.atk) * GAME_CONFIG.INHERIT_BONUS);
        const bonusHp = Math.floor((statsA.maxHp + statsB.maxHp) * GAME_CONFIG.INHERIT_BONUS);
        
        childCard.bonusAtk = bonusAtk;
        childCard.bonusHp = bonusHp;
        childCard.generation = (Math.max(pA.generation || 1, pB.generation || 1)) + 1;
        childCard.element = Math.random() > 0.5 ? pA.element : pB.element;

        playerData.inventory.push(childCard);
        saveGame();
        return childCard;
    }
};