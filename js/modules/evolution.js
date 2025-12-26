// js/modules/evolution.js
import { playerData, saveGame } from '../core/state.js';
import { getCardStats } from '../utils.js';

// 🛑 กฎจำกัดระดับดาว (Max Star Limits)
const MAX_STAR_LIMITS = {
    'C': 3,
    'U': 4,
    'R': 5,
    'SR': 6,
    'UR': 6,       // UR ตันที่ 6
    'LEGEND': 6,   // Legend อัพต่อไม่ได้ (ตันที่ตัวมันเอง)
    'MYTHICAL': 7  // Mythical อัพไม่ได้
};

export function getEvolutionInfo(card) {
    const currentStars = card.stars || 1;
    const maxStars = MAX_STAR_LIMITS[card.rarity] || 6;
    
    // เช็คว่าตันหรือยัง?
    if (currentStars >= maxStars) {
        return { canEvolve: false, reason: "MAX_STAR_REACHED", label: "MAXED OUT" };
    }

    // 🔍 หาวัตถุดิบ (ต้องเป็น ID เดียวกัน, ดาวเท่ากัน, ไม่ใช่ตัวเอง, ไม่อยู่ใน Deck)
    const materials = playerData.inventory.filter(c => 
        c.cardId === card.cardId && 
        c.stars === currentStars && 
        c.uid !== card.uid && 
        !playerData.deck.includes(c.uid)
    );

    const requiredCount = 2; // เงื่อนไข: ใช้ 2 ใบ

    if (materials.length < requiredCount) {
        return { 
            canEvolve: false, 
            reason: "NOT_ENOUGH_MATS", 
            label: `Need ${materials.length}/${requiredCount} Duplicates`,
            currentMat: materials.length,
            reqMat: requiredCount
        };
    }

    return { 
        canEvolve: true, 
        label: "EVOLVE NOW!", 
        materials: materials.slice(0, requiredCount) // ส่งรายชื่อตัวที่จะโดนกินไป
    };
}

export function executeEvolution(targetCardUid) {
    const targetCard = playerData.inventory.find(c => c.uid === targetCardUid);
    if (!targetCard) return alert("Card not found!");

    const evoInfo = getEvolutionInfo(targetCard);

    if (!evoInfo.canEvolve) {
        return alert("Cannot evolve: " + evoInfo.label);
    }

    if (!confirm(`Confirm Evolution?\nThis will consume 2 duplicates of ${targetCard.name}.`)) {
        return;
    }

    // --- 🚀 เริ่มกระบวนการวิวัฒนาการ ---

    // 1. ลบวัตถุดิบออกจากกระเป๋า
    const materialUids = evoInfo.materials.map(m => m.uid);
    playerData.inventory = playerData.inventory.filter(c => !materialUids.includes(c.uid));

    // 2. อัพดาวตัวหลัก
    // ต้องดึงตัวหลักใหม่จาก inventory ที่เพิ่งอัปเดต (เพื่อความชัวร์)
    const cardToUpdate = playerData.inventory.find(c => c.uid === targetCardUid);
    cardToUpdate.stars = (cardToUpdate.stars || 1) + 1;
    
    // (Optional) เพิ่มโบนัส Stats เล็กน้อยตอนอัพดาว
    cardToUpdate.bonusHp = (cardToUpdate.bonusHp || 0) + 100;
    cardToUpdate.bonusAtk = (cardToUpdate.bonusAtk || 0) + 20;

    // 3. บันทึกและรีเฟรช
    saveGame();
    alert(`🎉 Success! ${cardToUpdate.name} is now ${cardToUpdate.stars} Stars!`);

    // รีเฟรช UI
    if(window.updateUI) window.updateUI();
    if(window.renderDeckEditor) window.renderDeckEditor();
    
    // ปิด Modal เก่าแล้วเปิดใหม่เพื่ออัปเดตข้อมูล
    const oldModal = document.getElementById('card-detail-modal');
    if(oldModal) oldModal.remove();
}