// js/core/state.js
import { createNewCard } from '../utils.js';
import { HERO_DATABASE } from './config.js';

// ⚠️ สำคัญ: items ในนี้ต้องว่างเปล่า {} ห้ามมีของแถม
// ถ้าอยากแจกของเริ่มต้น ให้ไปเขียนในฟังก์ชันสร้างตัวละครใหม่แทน
const DEFAULT_PLAYER_DATA = {
    profile: { name: "Player", level: 1, exp: 0 },
    resources: { gold: 1000, gems: 0, stamina: 100, maxStamina: 100 },
    arena: { rankPoints: 1000, wins: 0, losses: 0, tickets: 5, maxTickets: 5, lastTicketRegen: Date.now(), 
    defenseDeck: new Array(8).fill(null), arenaDeck: new Array(6).fill(null) },
    heroes: [{ uid: "h_starter", heroId: "h001", level: 1, exp: 0, equipped: {} }],
    activeHeroId: "h001",
    heroInventory: [],
    inventory: [],
    mailbox: [],
    items: {}, // ✅ ต้องเริ่มด้วย Object ว่าง
    deck: new Array(8).fill(null),
    equipment: [],
    stageProgress: { 1: { cleared: false, stars: 0 } },
    stageWins: 0,
    lastLoginDate: null
};

// Export เป็น let เพื่อให้แก้ไขค่าภายในได้ แต่ห้าม Re-assign ตัวแปรนี้ใหม่ในไฟล์อื่น
export let playerData = JSON.parse(JSON.stringify(DEFAULT_PLAYER_DATA));
// ✅ เพิ่มฟังก์ชันนี้ลงไป (Export ออกไปใช้ข้างนอก)
export function resetGameData() {
    Object.assign(playerData, JSON.parse(JSON.stringify(DEFAULT_PLAYER_DATA)));
    
    // ตั้งค่าพื้นฐานใหม่ (กันเหนียว)
    playerData.items = {};
    playerData.heroInventory = [];
    playerData.equipment = [];
    playerData.inventory = [];
    playerData.heroes = [{ uid: "h_starter", heroId: "h001", level: 1, exp: 0, equipped: {} }];
    
    // สำคัญ: ลบเซฟในเครื่องด้วย
    localStorage.removeItem('cardBattleSave');
    console.log("♻️ Game Data Reset to Default");
}
export function loadGame() {
    const saved = localStorage.getItem('cardBattleSave');
    if (saved) {
        try {
            const savedData = JSON.parse(saved);
            
            // ✅ เทคนิคสำคัญ: ใช้ Object.assign เพื่ออัปเดตค่าลงในตัวแปร playerData เดิม
            // ห้ามเขียน playerData = ... ใหม่เด็ดขาด เพราะจะทำให้ Reference ในไฟล์อื่น (เช่น bag.js) หลุด
            
            // 1. รีเซ็ตค่าเป็น Default ก่อน (เผื่อ Save file เก่าไม่มี field ใหม่)
            Object.assign(playerData, JSON.parse(JSON.stringify(DEFAULT_PLAYER_DATA)));
            
            // 2. ทับด้วยข้อมูลที่เซฟไว้ (Recursively merge จะดีกว่า แต่แบบนี้ง่ายสุดสำหรับโครงสร้างชั้นเดียว)
            // หมายเหตุ: Object.assign ทับ Array/Object ทั้งก้อน ไม่ได้ Merge ไส้ใน
            // ดังนั้นเราจะ Loop ทับเฉพาะ Key ที่มีใน Save
            for (const key in savedData) {
                playerData[key] = savedData[key];
            }

            // Patches: ตรวจสอบความสมบูรณ์ของข้อมูล (เผื่อของเก่าเน่า)
            if (!playerData.items) playerData.items = {}; // 👈 กันเหนียว
            if (!playerData.heroInventory) playerData.heroInventory = [];
            if (!playerData.equipment) playerData.equipment = [];

            console.log("Game Loaded Successfully");
            return true;
        } catch (e) {
            console.error("Save file corrupted, loading defaults.", e);
            return false;
        }
    }
    return false;
}
window.playerData = playerData;

export function saveGame() {
    localStorage.setItem('cardBattleSave', JSON.stringify(playerData));
    console.log("Game Saved");
    
    // Trigger Cloud Save (ถ้ามี)
    if (window.cloudSaveTrigger) window.cloudSaveTrigger();
}
