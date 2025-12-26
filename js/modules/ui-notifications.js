// js/modules/ui-notifications.js

// ==========================================
// 🔔 TOAST SYSTEM (แทน Alert เล็กๆ)
// ==========================================
export function showToast(message, type = 'info') {
    const colors = {
        success: 'border-green-500 text-green-400 bg-green-900/95',
        error: 'border-red-500 text-red-400 bg-red-900/95',
        info: 'border-blue-500 text-blue-400 bg-blue-900/95',
        warning: 'border-yellow-500 text-yellow-400 bg-yellow-900/95'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-triangle-exclamation',
        info: 'fa-circle-info',
        warning: 'fa-bell'
    };

    const toast = document.createElement('div');
    toast.className = `fixed top-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-3 rounded-full border shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-fade-in-down transition-all duration-300 backdrop-blur-sm ${colors[type] || colors.info}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info} text-lg"></i>
        <span class="font-bold text-sm tracking-wide whitespace-nowrap">${message}</span>
    `;

    document.body.appendChild(toast);

    // ลบออกอัตโนมัติ
    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 🛡️ SMART CONFIRM MODAL (แทน Confirm/Prompt)
// ==========================================
export function confirmModal({ title, message, isDangerous = false, requireInput = null, confirmText = 'CONFIRM', cancelText = 'CANCEL' }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm";
        
        const confirmBtnClass = isDangerous 
            ? "bg-red-600 hover:bg-red-500 shadow-[0_0_15px_red]" 
            : "bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_blue]";

        overlay.innerHTML = `
            <div class="bg-slate-900 w-full max-w-md p-6 rounded-2xl border-2 ${isDangerous ? 'border-red-500' : 'border-blue-500'} shadow-2xl transform scale-100 transition-all">
                <div class="text-center mb-6">
                    <div class="text-5xl mb-4 ${isDangerous ? 'text-red-500 animate-pulse' : 'text-blue-400'}">
                        <i class="fa-solid ${isDangerous ? 'fa-triangle-exclamation' : 'fa-circle-question'}"></i>
                    </div>
                    <h3 class="text-2xl font-black text-white uppercase mb-2">${title}</h3>
                    <p class="text-gray-300 leading-relaxed text-sm">${message.replace(/\n/g, '<br>')}</p>
                </div>

                ${requireInput ? `
                <div class="mb-6">
                    <label class="block text-xs text-gray-500 uppercase font-bold mb-2">Type "<span class="text-white select-all">${requireInput}</span>" to confirm</label>
                    <input type="text" id="confirm-input" class="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white text-center font-bold focus:border-red-500 focus:outline-none transition tracking-widest uppercase" placeholder="...">
                </div>
                ` : ''}

                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-cancel" class="py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800 font-bold transition">${cancelText}</button>
                    <button id="btn-confirm" class="py-3 rounded-xl text-white font-bold transition transform active:scale-95 ${confirmBtnClass}" ${requireInput ? 'disabled' : ''}>${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const btnConfirm = overlay.querySelector('#btn-confirm');
        const btnCancel = overlay.querySelector('#btn-cancel');
        const input = overlay.querySelector('#confirm-input');

        if (requireInput && input) {
            btnConfirm.classList.add('opacity-50', 'cursor-not-allowed');
            input.addEventListener('input', (e) => {
                if (e.target.value.toUpperCase() === requireInput) {
                    btnConfirm.classList.remove('opacity-50', 'cursor-not-allowed');
                    btnConfirm.disabled = false;
                } else {
                    btnConfirm.classList.add('opacity-50', 'cursor-not-allowed');
                    btnConfirm.disabled = true;
                }
            });
            input.focus();
        }

        const close = (val) => {
            overlay.classList.remove('animate-fade-in');
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.remove(), 200);
            resolve(val);
        };

        btnConfirm.onclick = () => close(true);
        btnCancel.onclick = () => close(false);
    });
}

// ==========================================
// ✨ REWARD POPUP (ใช้ตอนได้ของ)
// ==========================================
export function showRewardPopup(item, title = 'REWARD RECEIVED', mode = 'NORMAL') {
    // Logic เช็ครูปภาพ vs Emoji
    const iconSrc = item.icon || item.obtainedItem?.icon || '🎁';
    const isImage = iconSrc.includes('/') || iconSrc.includes('.');
    
    let iconHTML = '';
    if (isImage) {
        if (mode === 'CARD') {
            iconHTML = `<img src="${iconSrc}" class="w-32 h-44 object-cover rounded-lg shadow-[0_0_20px_gold] border-2 border-white animate-bounce">`;
        } else {
            iconHTML = `<img src="${iconSrc}" class="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-bounce">`;
        }
    } else {
        iconHTML = `<div class="text-7xl my-6 animate-bounce filter drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">${iconSrc}</div>`;
    }

    const overlay = document.createElement('div');
    overlay.className = "fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fade-in";
    
    overlay.innerHTML = `
        <div class="relative bg-slate-900 p-8 rounded-2xl border-2 border-yellow-500 text-center shadow-[0_0_50px_rgba(234,179,8,0.3)] max-w-sm w-full mx-4 overflow-hidden transform scale-100 transition-all">
            <div class="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                 <div class="w-[500px] h-[500px] bg-[conic-gradient(from_0deg,transparent_0_deg,gold_90deg,transparent_180deg,gold_270deg,transparent_360deg)] animate-[spin_4s_linear_infinite]"></div>
            </div>

            <div class="relative z-10 text-yellow-400 text-sm uppercase font-black tracking-[0.2em] mb-4 border-b border-yellow-500/30 pb-2">${title}</div>
            
            <div class="relative z-10 flex justify-center my-4">${iconHTML}</div>

            <h2 class="relative z-10 text-3xl font-black text-white mb-1 drop-shadow-md">${item.name}</h2>
            
            <div class="relative z-10 inline-block px-4 py-1 rounded-full bg-slate-800 text-xs text-gray-300 font-mono mb-8 border border-white/10 shadow-inner">
                ${(item.type || 'Item').replace(/_/g, ' ')}
            </div>
            
            <button onclick="this.closest('.fixed').remove()" class="relative z-10 w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 border border-white/20">
                COLLECT
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Bind to window เพื่อให้เรียกใช้ได้ง่ายๆ โดยไม่ต้อง import ทุกครั้ง (Optional)
window.Toast = showToast;
window.Confirm = confirmModal;
window.Reward = showRewardPopup;