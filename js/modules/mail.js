// js/modules/mail.js
import { getFirestore, doc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { playerData, saveGame } from '../core/state.js';
import { showToast } from './ui-notifications.js';

// เปิดหน้าต่าง Mailbox
export function openMailboxModal() {
    const old = document.getElementById('mailbox-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'mailbox-modal';
    modal.className = "fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4 animate-fade-in backdrop-blur-md";
    document.body.appendChild(modal);

    renderMailboxUI();
}

// วาดหน้าจอ
function renderMailboxUI() {
    const modal = document.getElementById('mailbox-modal');
    if(!modal) return;

    const mails = playerData.mailbox || [];
    mails.sort((a, b) => b.timestamp - a.timestamp); // เรียงใหม่สุดก่อน

    const hasMails = mails.length > 0;

    modal.innerHTML = `
        <div class="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-600 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div class="p-5 bg-slate-800 border-b border-slate-700 flex justify-between items-center shadow-md z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl shadow-lg">
                        <i class="fa-solid fa-envelope"></i>
                    </div>
                    <div>
                        <h2 class="text-xl font-black text-white tracking-wide uppercase">Mailbox</h2>
                        <p class="text-xs text-gray-400">Pro System (Realtime)</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${hasMails ? `<button onclick="window.claimAllMails()" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition active:scale-95"><i class="fa-solid fa-check-double mr-1"></i> Claim All</button>` : ''}
                    <button onclick="document.getElementById('mailbox-modal').remove()" class="w-8 h-8 rounded-full bg-slate-700 hover:bg-red-500 text-gray-300 hover:text-white transition flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50 relative custom-scrollbar">
                ${hasMails ? mails.map(mail => renderMailItem(mail)).join('') : renderEmptyState()}
            </div>
        </div>
    `;
}

function renderEmptyState() {
    return `
        <div class="flex flex-col items-center justify-center h-64 text-gray-500 opacity-50">
            <i class="fa-regular fa-envelope-open text-6xl mb-4"></i>
            <p class="text-lg font-bold">No mail available</p>
        </div>
    `;
}

function renderMailItem(mail) {
    const dateStr = new Date(mail.timestamp).toLocaleDateString();
    
    let rewardHtml = '';
    if (mail.rewards && mail.rewards.length > 0) {
        rewardHtml = `<div class="flex gap-2 mt-3 p-2 bg-black/30 rounded-lg border border-white/5 overflow-x-auto">`;
        mail.rewards.forEach(r => {
            let icon = '🎁'; let name = 'Item'; let color = 'text-gray-300';
            if (r.type === 'CARD') { icon = '🃏'; name = r.data.stars + '⭐ Unit'; color = 'text-purple-300'; } 
            else if (r.type === 'EQ') { icon = '🗡️'; name = 'Equip'; color = 'text-blue-300'; } 
            else if (r.type === 'GOLD') { icon = '💰'; name = r.amount.toLocaleString(); color = 'text-yellow-400'; }
            
            rewardHtml += `
                <div class="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded border border-white/10 text-xs shrink-0">
                    <span class="text-lg">${icon}</span>
                    <span class="${color} font-bold">${name}</span>
                </div>`;
        });
        rewardHtml += `</div>`;
    }

    return `
        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-blue-500/50 transition group shadow-sm">
            <div class="flex justify-between items-start mb-1">
                <h3 class="font-bold text-white text-base group-hover:text-blue-300 transition">${mail.title}</h3>
                <span class="text-[10px] text-gray-500 bg-black/30 px-2 py-0.5 rounded">${dateStr}</span>
            </div>
            <p class="text-sm text-gray-400 leading-relaxed">${mail.msg}</p>
            ${rewardHtml}
            <div class="mt-3 text-right">
                <button onclick="window.claimMail('${mail.id}')" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition w-full sm:w-auto">CLAIM</button>
            </div>
        </div>
    `;
}

// ------------------------------------
// 🎁 CLAIM LOGIC (PRO SYSTEM)
// ------------------------------------

function processRewards(mail) {
    if (mail.rewards) {
        mail.rewards.forEach(reward => {
            if (reward.type === 'CARD') {
                if (!playerData.inventory) playerData.inventory = [];
                const newCard = { ...reward.data };
                newCard.uid = "c_" + Date.now() + Math.random().toString(36).substr(2);
                playerData.inventory.push(newCard);
            } 
            else if (reward.type === 'EQ') {
                if (!playerData.equipment) playerData.equipment = [];
                playerData.equipment.push(reward.id);
            }
            else if (reward.type === 'GOLD') {
                playerData.resources.gold += reward.amount;
            }
        });
    }
}

export async function claimMail(mailId) {
    const mail = playerData.mailbox.find(m => m.id === mailId);
    if (!mail) return;

    processRewards(mail); 
    saveGame(); 

    // ✅ เรียกใช้ getFirestore() ข้างในนี้แทน (ตอนที่กดปุ่ม App ต้อง Init เสร็จแล้วแน่นอน)
    try {
        const db = getFirestore(); // <--- ย้ายมาตรงนี้
        const auth = getAuth();    // <--- ย้ายมาตรงนี้
        
        const user = auth.currentUser;
        if(user) {
            await deleteDoc(doc(db, "users", user.uid, "mails", mailId));
            showToast("Claimed!", "success");
        }
    } catch(e) {
        console.error("Delete Error:", e);
        showToast("Error syncing", "error");
    }
}

export async function claimAllMails() {
    if(!playerData.mailbox || playerData.mailbox.length === 0) return;
    if(!confirm(`Claim all ${playerData.mailbox.length} mails?`)) return;

    let count = 0;
    playerData.mailbox.forEach(mail => {
        processRewards(mail);
        count++;
    });

    saveGame();

    try {
        const db = getFirestore(); // <--- ย้ายมาตรงนี้
        const auth = getAuth();    // <--- ย้ายมาตรงนี้

        const user = auth.currentUser;
        if(user) {
            const batch = writeBatch(db);
            playerData.mailbox.forEach(mail => {
                const docRef = doc(db, "users", user.uid, "mails", mail.id);
                batch.delete(docRef);
            });
            await batch.commit();
            showToast(`Claimed ${count} mails!`, "success");
        }
    } catch(e) {
        console.error("Batch Error:", e);
    }
}

export function updateMailNotification() {
    const btn = document.getElementById('btn-open-mail');
    if (!btn) return;
    
    const count = playerData.mailbox ? playerData.mailbox.length : 0;
    
    let badge = btn.querySelector('.mail-badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('div');
            badge.className = "mail-badge absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border border-slate-900 animate-bounce";
            btn.appendChild(badge);
        }
        badge.innerText = count;
        btn.classList.add('text-yellow-400');
    } else {
        if (badge) badge.remove();
        btn.classList.remove('text-yellow-400');
    }
}