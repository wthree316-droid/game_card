// js/modules/deck.js
import { playerData, saveGame } from '../core/state.js';
import { createCardElement, createEmptySlot } from '../ui-shared.js';
import { showCardDetail } from './encyclopedia.js';
import { openHeroProfile } from './heroManager.js';
import { getCardStats, getHeroStats } from '../utils.js'; 

// ✅ STATE
let currentCollectionPage = 1;
const ITEMS_PER_PAGE = 50; 
let lastFilterType = 'ALL';

export function init() {
    renderDeckStats(); // วาดโครงสร้าง Stats ครั้งแรก
    renderFilterBar('ALL'); // วาด Filter ครั้งแรก
    renderHeroDeckSlot(); 
    renderDeckEditor(); // วาดเนื้อหา
}

// ----------------------------------------------------
// ⚡ OPTIMIZED: อัปเดต Stats แบบไม่กระพริบ
// ----------------------------------------------------
function renderDeckStats() {
    let totalCP = 0, totalHP = 0, totalATK = 0;

    // คำนวณ (Logic เดิม)
    const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId) || playerData.heroes[0];
    if (activeHero) {
        const hStats = getHeroStats(activeHero);
        totalCP += hStats.power || 0;
        totalHP += hStats.hp || 0;
        totalATK += hStats.atk || 0;
    }
    playerData.deck.forEach(uid => {
        if (uid) {
            const card = playerData.inventory.find(c => c.uid === uid);
            if (card) {
                const cStats = getCardStats(card);
                totalCP += cStats.power || 0;
                totalHP += cStats.hp || 0;
                totalATK += cStats.atk || 0;
            }
        }
    });

    // 1. หา Container
    const deckArea = document.getElementById('deck-slots-area');
    if (!deckArea) return;
    
    let statsContainer = document.getElementById('deck-stats-dashboard');

    // 2. ถ้ายังไม่มี ให้สร้างโครงสร้าง HTML (ทำแค่ครั้งเดียว)
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'deck-stats-dashboard';
        statsContainer.className = "w-full mb-6 animate-fade-in";
        // HTML โครงสร้างคงเดิม (แต่ใส่ ID ให้ตัวเลข)
        statsContainer.innerHTML = `
            <div class="bg-slate-900/90 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div class="relative z-10 flex items-center gap-4 w-full md:w-auto">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg text-white text-2xl border border-white/20"><i class="fa-solid fa-shield-halved"></i></div>
                    <div>
                        <div class="text-[10px] text-blue-300 font-bold tracking-widest uppercase mb-0.5">Team Power</div>
                        <div id="stat-val-cp" class="text-3xl md:text-4xl font-black text-white drop-shadow-md font-mono leading-none">0</div>
                    </div>
                </div>
                <div class="relative z-10 flex gap-4 md:gap-8 w-full md:w-auto justify-center bg-black/40 px-6 py-3 rounded-xl border border-white/5 shadow-inner">
                    <div class="flex flex-col items-center min-w-[80px]">
                        <div class="text-[9px] text-gray-400 uppercase font-bold mb-1">Total ATK</div>
                        <div class="text-lg font-bold text-red-400 flex items-center gap-2"><i class="fa-solid fa-sword text-sm"></i> <span id="stat-val-atk">0</span></div>
                    </div>
                    <div class="w-px bg-white/10 my-1"></div>
                    <div class="flex flex-col items-center min-w-[80px]">
                        <div class="text-[9px] text-gray-400 uppercase font-bold mb-1">Total HP</div>
                        <div class="text-lg font-bold text-green-400 flex items-center gap-2"><i class="fa-solid fa-heart text-sm"></i> <span id="stat-val-hp">0</span></div>
                    </div>
                </div>
            </div>
        `;
        const pageDeck = document.getElementById('page-deck') || deckArea.parentElement;
        pageDeck.insertBefore(statsContainer, pageDeck.firstChild);
    }

    // 3. อัปเดตแค่ตัวเลข (Browser ชอบสิ่งนี้ เพราะไม่ต้องวาด Layout ใหม่)
    document.getElementById('stat-val-cp').innerText = totalCP.toLocaleString();
    document.getElementById('stat-val-atk').innerText = totalATK.toLocaleString();
    document.getElementById('stat-val-hp').innerText = totalHP.toLocaleString();
}

// ----------------------------------------------------
// ⚡ OPTIMIZED: Main Render Function
// ----------------------------------------------------
export function renderDeckEditor(filterType = lastFilterType) {
    const deckContainer = document.getElementById('deck-slots-area');
    const collectionContainer = document.getElementById('collection-container');
    
    if(!deckContainer) return;

    if (filterType !== lastFilterType) {
        currentCollectionPage = 1;
        lastFilterType = filterType;
        renderFilterBar(filterType); // อัปเดตปุ่ม Filter
    }

    renderDeckStats(); // อัปเดตตัวเลขพลัง

    // --- 1. Render Deck Slots (ใช้ Fragment) ---
    const deckFragment = document.createDocumentFragment();
    for(let i=0; i<8; i++) {
        const uid = playerData.deck[i];
        if(uid) {
            const item = playerData.inventory.find(c => c.uid === uid);
            if(item) {
                const cardStats = getCardStats(item); 
                const slot = createCardElement(cardStats, 'deck');
                // Performance: ลด Backdrop Blur ใน Deck Slot
                slot.classList.remove('backdrop-blur-sm'); 
                
                slot.onclick = () => { 
                    playerData.deck[i] = null; 
                    saveGame(); 
                    renderDeckEditor(filterType); 
                };
                const infoBtn = slot.querySelector('.info-btn');
                if(infoBtn) infoBtn.onclick = (e) => { e.stopPropagation(); showCardDetail(cardStats); };
                deckFragment.appendChild(slot);
            } else {
                 playerData.deck[i] = null; 
                 createEmptySlot(i, deckFragment); // แก้ createEmptySlot ให้รับ fragment หรือ append เอง
            }
        } else {
            createEmptySlot(i, deckFragment);
        }
    }
    deckContainer.innerHTML = '';
    deckContainer.appendChild(deckFragment);


    // --- 2. Render Collection (ใช้ Fragment) ---
    collectionContainer.innerHTML = '';
    const allFiltered = playerData.inventory.filter(item => filterType === 'ALL' || item.element === filterType);
    const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE);
    
    if (currentCollectionPage > totalPages) currentCollectionPage = totalPages || 1;
    if (currentCollectionPage < 1) currentCollectionPage = 1;

    const startIndex = (currentCollectionPage - 1) * ITEMS_PER_PAGE;
    const pagedItems = allFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (allFiltered.length === 0) {
        collectionContainer.innerHTML = `<div class="col-span-full text-center text-gray-600 py-10">No units found.</div>`;
    } else {
        const collectionFragment = document.createDocumentFragment();
        pagedItems.forEach(item => {
            const isInDeck = playerData.deck.includes(item.uid);
            const cardStats = getCardStats(item);
            const cardEl = createCardElement(cardStats, 'collection', isInDeck);
            
            // 🔥 PERFORMANCE TWEAK: บอก Browser ว่าตัวนี้จะมีการเปลี่ยนรูปทรง (ช่วย GPU)
            cardEl.style.willChange = 'transform'; 
            
            cardEl.onclick = () => { 
                const emptyIdx = playerData.deck.indexOf(null);
                if(!isInDeck && emptyIdx !== -1) { 
                    playerData.deck[emptyIdx] = item.uid; 
                    saveGame(); 
                    renderDeckEditor(filterType); 
                }
            };
            const infoBtn = cardEl.querySelector('.info-btn');
            if(infoBtn) infoBtn.onclick = (e) => { e.stopPropagation(); showCardDetail(cardStats); };
            collectionFragment.appendChild(cardEl);
        });
        collectionContainer.appendChild(collectionFragment);
    }

    renderPaginationControls(totalPages);
}

// ----------------------------------------------------
// ⚡ OPTIMIZED: Filter Bar (สร้างครั้งเดียว อัปเดตแค่ Class)
// ----------------------------------------------------
function renderFilterBar(activeFilter) {
    const collectionArea = document.getElementById('collection-container');
    if (!collectionArea) return;

    let filterContainer = document.getElementById('deck-filter-bar');
    
    // สร้างครั้งแรก
    if (!filterContainer) {
        filterContainer = document.createElement('div');
        filterContainer.id = 'deck-filter-bar';
        filterContainer.className = "flex flex-wrap justify-center gap-2 mb-6 animate-fade-in sticky top-0 z-40 bg-slate-950/95 py-2 border-b border-white/5"; // ลดความใสของพื้นหลัง
        collectionArea.parentElement.insertBefore(filterContainer, collectionArea);

        const filters = [
            { id: 'ALL', icon: '♾️', label: 'ALL', color: 'from-gray-600 to-slate-600' },
            { id: 'FIRE', icon: '🔥', label: 'FIRE', color: 'from-red-600 to-orange-600' },
            { id: 'WATER', icon: '💧', label: 'WATER', color: 'from-blue-600 to-cyan-600' },
            { id: 'NATURE', icon: '🌿', label: 'NATURE', color: 'from-green-600 to-emerald-600' },
            { id: 'LIGHT', icon: '⚡', label: 'LIGHT', color: 'from-yellow-500 to-amber-500' },
            { id: 'DARK', icon: '🌑', label: 'DARK', color: 'from-purple-600 to-indigo-600' }
        ];

        // สร้างปุ่มแล้วเก็บไว้
        filterContainer.innerHTML = filters.map(f => `
            <button id="filter-btn-${f.id}" onclick="window.changeDeckFilter('${f.id}')" 
                class="filter-btn px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all duration-200 flex items-center gap-2 border">
                <span>${f.icon}</span><span>${f.label}</span>
            </button>
        `).join('');
    }

    // อัปเดตแค่หน้าตาปุ่ม (ไม่ต้องสร้างใหม่)
    const buttons = filterContainer.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        const type = btn.id.replace('filter-btn-', '');
        const isActive = type === activeFilter;
        
        // กำหนด Class ตามสถานะ (หลีกเลี่ยง innerHTML)
        if (isActive) {
            btn.className = `filter-btn px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all duration-200 flex items-center gap-2 border text-white shadow-lg scale-105 ring-2 ring-white/30 border-transparent bg-gradient-to-b ${getFilterColor(type)}`;
        } else {
            btn.className = `filter-btn px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all duration-200 flex items-center gap-2 border bg-slate-800 text-gray-500 border-white/5 hover:bg-slate-700`;
        }
    });
}

function getFilterColor(type) {
    const map = {
        'ALL': 'from-gray-600 to-slate-600',
        'FIRE': 'from-red-600 to-orange-600',
        'WATER': 'from-blue-600 to-cyan-600',
        'NATURE': 'from-green-600 to-emerald-600',
        'LIGHT': 'from-yellow-500 to-amber-500',
        'DARK': 'from-purple-600 to-indigo-600'
    };
    return map[type] || 'from-gray-600 to-slate-600';
}


function renderPaginationControls(totalPages) {
    const collectionArea = document.getElementById('collection-container');
    if (!collectionArea) return;

    let paginationContainer = document.getElementById('collection-pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'collection-pagination';
        paginationContainer.className = "w-full flex justify-center items-center gap-4 mt-8 mb-12 animate-fade-in";
        collectionArea.parentNode.insertBefore(paginationContainer, collectionArea.nextSibling);
    }

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = `
        <button onclick="window.changeCollectionPage(-1)" 
            class="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center hover:bg-slate-700 hover:border-yellow-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
            ${currentCollectionPage === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left text-white"></i>
        </button>
        <span class="text-gray-300 font-mono font-bold bg-black/40 px-4 py-1 rounded-full border border-white/10">
            Page <span class="text-yellow-400">${currentCollectionPage}</span> / ${totalPages}
        </span>
        <button onclick="window.changeCollectionPage(1)" 
            class="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center hover:bg-slate-700 hover:border-yellow-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
            ${currentCollectionPage === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right text-white"></i>
        </button>
    `;
}

window.changeCollectionPage = (delta) => {
    const newPage = currentCollectionPage + delta;
    if(newPage > 0) {
        currentCollectionPage = newPage;
        renderDeckEditor(lastFilterType);
        const filterBar = document.getElementById('deck-filter-bar');
        if(filterBar) filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.changeDeckFilter = (type) => {
    renderDeckEditor(type);
};

export function clearDeck() {
    if(confirm("Clear Deck?")) {
        playerData.deck = new Array(8).fill(null);
        saveGame();
        renderDeckEditor();
    }
}

export function renderHeroDeckSlot() {
    const heroSlotContainer = document.querySelector('#page-deck .w-32.h-\\[15rem\\]')?.parentElement || document.getElementById('hero-slot-container');
    if (!heroSlotContainer) return;

    const activeHero = playerData.heroes.find(h => h.heroId === playerData.activeHeroId) || playerData.heroes[0];
    const stats = getHeroStats(activeHero);
    
    const isImage = stats.icon.includes('/') || stats.icon.includes('.');
    const maxExp = stats.level * 100;
    const expPercent = Math.min(100, (stats.exp / maxExp) * 100);

    heroSlotContainer.innerHTML = `
        <div onclick="openHeroProfile()" class="relative w-[130px] sm:w-[200px] md:w-[280px] h-[200px] sm:h-[270px] md:h-[360px] bg-slate-900 rounded-2xl border-[3px] border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] flex flex-row md:flex-col overflow-hidden cursor-pointer group hover:border-yellow-400 transition-all duration-300">
            <div class="absolute inset-0 z-0 bg-black">
                ${isImage 
                    ? `<img src="${stats.icon}" class="w-full h-full object-cover object-top opacity-60 group-hover:opacity-80 transition duration-500" loading="lazy" alt="${stats.name}">`
                    : `<div class="w-full h-full flex items-center justify-center text-7xl sm:text-9xl opacity-20">${stats.icon}</div>`
                }
                <div class="absolute inset-0 bg-gradient-to-r md:bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
            </div>
            
            <div class="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex flex-col sm:flex-row gap-1 sm:gap-2">
                <div class="bg-yellow-600 text-black text-[9px] sm:text-xs font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded shadow-lg flex items-center gap-1 w-fit"><i class="fa-solid fa-crown"></i> LEADER</div>
                <div class="bg-black/80 text-white text-[9px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded border border-white/10 w-fit">CP ${stats.power.toLocaleString()}</div>
            </div>

            <div class="relative z-10 mt-auto p-2 sm:p-4 w-full">
                <div class="mb-1 sm:mb-2">
                    <h2 class="text-lg sm:text-3xl font-black text-white leading-none drop-shadow-md uppercase tracking-wide truncate">${stats.name}</h2>
                    <div class="text-yellow-500 text-[10px] sm:text-sm font-bold tracking-widest opacity-80">${stats.job || 'Hero'}</div>
                </div>
                
                <div class="mb-2 sm:mb-3">
                    <div class="flex justify-between text-[8px] sm:text-[10px] text-gray-300 mb-1 font-mono">
                        <span>LV.${stats.level}</span>
                        <span>${stats.exp} / ${maxExp}</span>
                    </div>
                    <div class="w-full h-1.5 sm:h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                        <div class="h-full bg-gradient-to-r from-yellow-600 to-yellow-400" style="width: ${expPercent}%"></div>
                    </div>
                </div>
                
                <div class="flex gap-2 sm:gap-4 text-[9px] sm:text-xs font-bold bg-black/60 p-1.5 sm:p-2 rounded-lg border border-white/5 justify-between md:justify-start">
                    <div class="flex items-center gap-1 text-red-400"><i class="fa-solid fa-sword"></i> ${stats.atk}</div>
                    <div class="flex items-center gap-1 text-green-400"><i class="fa-solid fa-heart"></i> ${stats.hp}</div>
                    <div class="flex items-center gap-1 text-blue-400"><i class="fa-solid fa-shield"></i> ${stats.def}</div>
                </div>
            </div>
            
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-300 z-30">
                <div class="bg-black/80 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border border-white/20 whitespace-nowrap"><i class="fa-solid fa-gear"></i> MANAGE</div>
            </div>
        </div>
    `;
}

// Bind Global
window.renderHeroDeckSlot = renderHeroDeckSlot;
window.openHeroProfile = openHeroProfile;
window.renderDeckEditor = renderDeckEditor;
