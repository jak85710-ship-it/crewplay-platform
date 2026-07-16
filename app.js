/**
 * STAGHORN CONFIGURATOR — APP LOGIC
 * Features: State Machine, Layer Engine, Dynamic Pricing,
 *           Simulated Analytics (GA4-style), LINE Redirect
 * LINE ID: @313lykia
 */

/* =====================================================
   DATA: Product Catalog
   ===================================================== */
const PRODUCTS = {
  categories: [{ id: 'all', name: '全部' }],
  plants: [],
  bases: [],
  parts: [
    {
      id: 'none',
      name: '無配件',
      desc: '保持純粹，讓植物自然呈現',
      price: 0,
      visualClass: 'none-vis',
      emoji: '○',
      previewEmoji: null
    },
    {
      id: 'brass_tag',
      name: '黃銅銘牌',
      desc: '刻上植株學名，工藝質感的名片',
      price: 300,
      visualClass: 'brass-vis',
      emoji: '🏷',
      previewEmoji: '🏷'
    },
    {
      id: 'orange_cord',
      name: '橙色日本麻繩',
      desc: '禪意手工綁紮，對比色點睛之筆',
      price: 150,
      visualClass: 'cord-vis',
      emoji: '🧵',
      previewEmoji: '🧵'
    },
    {
      id: 'leather_strap',
      name: '皮革掛帶',
      desc: '職人質感皮革，提升整體陳設品味',
      price: 450,
      visualClass: 'leather-vis',
      emoji: '🤎',
      previewEmoji: '🔶'
    }
  ]
};

const DEFAULT_BASES = [
  {
    id: 'acrylic',
    name: '透明壓克力板',
    brand: 'Studio Botanica',
    desc: '極簡透視，讓植物成為唯一主角。水晶般的清透質感，現代居家首選。',
    price: 600,
    img: 'assets/bases/base_acrylic.webp',
    emoji: '🪵'
  },
  {
    id: 'wood_3d',
    name: '3D 幾何木板',
    brand: 'Weld & Wild',
    desc: '北歐幾何美學，自然與工藝的平衡。實木浮雕六角紋，溫潤手感獨一無二。',
    price: 900,
    img: 'assets/bases/base_wood_3d.webp',
    emoji: '🪵'
  },
  {
    id: 'metal_grid',
    name: 'Cyberpunk 金屬網板',
    brand: 'UrbanGreen Co.',
    desc: '極致通風，硬派工業風首選。啞光黑鍍層金屬，耐腐蝕，室內外皆適用。',
    price: 1200,
    img: 'assets/bases/base_metal_grid.webp',
    emoji: '⬡'
  }
];

const DEFAULT_PARTS = JSON.parse(JSON.stringify(PRODUCTS.parts));

/* =====================================================
   STATE
   ===================================================== */
const state = {
  currentStep: 1,
  plantFilter: {
    category: 'all',
    query: ''
  },
  selections: {
    plant: null,
    base: null,
    parts: ['none']
  },
  analytics: {
    stepViews: { 1: 1, 2: 0, 3: 0, 4: 0 },
    baseClicks: { acrylic: 0, wood_3d: 0, metal_grid: 0 },
    plantClicks: {}, // Dynamic collection for 18 species
    preorderClicks: 0,
    lineRedirects: 0,
    leadSubmissions: 0,
    leads: []
  }
};

/* =====================================================
   SIMULATED ANALYTICS ENGINE (GA4-style)
   ===================================================== */
const Analytics = {
  _load() {
    try {
      const saved = localStorage.getItem('staghorn_analytics');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state.analytics, parsed);
      }
    } catch(e) {}
  },

  _save() {
    try {
      localStorage.setItem('staghorn_analytics', JSON.stringify(state.analytics));
    } catch(e) {}
  },

  track(event, params = {}) {
    console.log(`[Analytics] ${event}`, params);

    switch(event) {
      case 'view_step':
        state.analytics.stepViews[params.step] = (state.analytics.stepViews[params.step] || 0) + 1;
        break;
      case 'select_base':
        state.analytics.baseClicks[params.id] = (state.analytics.baseClicks[params.id] || 0) + 1;
        break;
      case 'select_plant':
        state.analytics.plantClicks[params.id] = (state.analytics.plantClicks[params.id] || 0) + 1;
        break;
      case 'click_preorder':
        state.analytics.preorderClicks++;
        break;
      case 'submit_lead_line':
        state.analytics.lineRedirects++;
        break;
      case 'submit_lead_form':
        state.analytics.leadSubmissions++;
        state.analytics.leads.unshift({
          name: params.name,
          contact: params.contact,
          order: params.order,
          time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        });
        if (state.analytics.leads.length > 20) state.analytics.leads.pop();
        break;
    }

    // Simulate GA4 event push (replace with real gtag() calls when ready)
    if (typeof gtag !== 'undefined') {
      gtag('event', event, params);
    }
    // Simulate Meta Pixel
    if (typeof fbq !== 'undefined') {
      fbq('trackCustom', event, params);
    }

    this._save();
  },

  getConversionRate() {
    const views = state.analytics.stepViews[1] || 1;
    const orders = state.analytics.preorderClicks || 0;
    return Math.round((orders / views) * 100);
  }
};

/* =====================================================
   CATALOG HELPERS
   ===================================================== */
function getPlantById(id) {
  return PRODUCTS.plants.find(p => p.id === id) || null;
}

function getFilteredPlants() {
  const q = state.plantFilter.query.trim().toLowerCase();
  const cat = state.plantFilter.category;
  return PRODUCTS.plants.filter(plant => {
    if (cat !== 'all' && plant.category !== cat) return false;
    if (!q) return true;
    const haystack = `${plant.name} ${plant.categoryName} ${plant.brand} ${plant.desc}`.toLowerCase();
    return haystack.includes(q);
  });
}

function getCategoryCount(categoryId) {
  if (categoryId === 'all') return PRODUCTS.plants.length;
  return PRODUCTS.plants.filter(p => p.category === categoryId).length;
}

async function loadCatalog() {
  const res = await fetch('catalog.json');
  if (!res.ok) throw new Error('catalog.json not found');
  const data = await res.json();
  PRODUCTS.categories = data.categories || [{ id: 'all', name: '全部' }];
  PRODUCTS.plants = data.plants || [];
  const normalizedBases = Array.isArray(data.bases)
    ? data.bases.map((base, i) => ({
        id: base.id || `base_${i + 1}`,
        name: base.name || `板材 ${i + 1}`,
        brand: base.brand || '喚鹿工作室上板材料',
        desc: base.desc || '上板材料',
        price: Number.isFinite(base.price) ? base.price : 0,
        img: base.img || '',
        emoji: base.emoji || '🪵'
      }))
    : null;
  PRODUCTS.bases = (normalizedBases && normalizedBases.length)
    ? normalizedBases
    : JSON.parse(JSON.stringify(DEFAULT_BASES));
  const normalizedParts = Array.isArray(data.parts)
    ? data.parts.map((part, i) => ({
        id: part.id || `part_${i + 1}`,
        name: part.name || `配件 ${i + 1}`,
        desc: part.desc || '上板配件',
        price: Number.isFinite(part.price) ? part.price : 0,
        visualClass: part.visualClass || 'none-vis',
        emoji: part.emoji || '🧩',
        previewEmoji: part.previewEmoji || null,
        img: part.img || null
      }))
    : null;
  PRODUCTS.parts = (normalizedParts && normalizedParts.length) ? normalizedParts : JSON.parse(JSON.stringify(DEFAULT_PARTS));
  return data;
}

function setPlantCategory(categoryId) {
  state.plantFilter.category = categoryId;
  renderCategoryTabs();
  renderPlantCards();
}

function setPlantSearch(query) {
  state.plantFilter.query = query;
  renderPlantCards();
}

/* =====================================================
   PRICE CALCULATOR
   ===================================================== */
function getPrice() {
  const plantTotal = (getPlantById(state.selections.plant)?.price || 0);
  const baseTotal = (PRODUCTS.bases.find(b => b.id === state.selections.base)?.price || 0);
  const partTotal = state.selections.parts
    .map(id => PRODUCTS.parts.find(p => p.id === id))
    .reduce((sum, part) => sum + (part?.price || 0), 0);

  return {
    plant: plantTotal,
    base: baseTotal,
    part: partTotal,
    total: plantTotal + baseTotal + partTotal
  };
}

function formatPrice(n) {
  return `NT$ ${n.toLocaleString('zh-TW')}`;
}

function updatePriceDisplay(animate = true) {
  const prices = getPrice();

  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatPrice(value);
    if (animate) {
      el.classList.remove('updated', 'counting');
      void el.offsetWidth; // reflow
      el.classList.add(id === 'price-total' ? 'counting' : 'updated');
    }
  };

  setVal('price-plant', prices.plant);
  setVal('price-base',  prices.base);
  setVal('price-part',  prices.part);
  setVal('price-total', prices.total);
}

/* =====================================================
   LAYER ENGINE
   ===================================================== */
function updatePreviewLayer(layerId, imgSrc, emoji = null) {
  const layer = document.getElementById(layerId);
  if (!layer) return;

  // Fade out
  layer.style.opacity = '0';
  layer.style.transform = 'scale(0.94)';

  setTimeout(() => {
    if (layerId === 'layer-part') {
      const partVisual = layer.querySelector('.part-overlay');
      const partImg = layer.querySelector('img');
      if (partImg) {
        if (imgSrc) {
          partImg.src = imgSrc;
          partImg.style.display = 'block';
          partImg.style.opacity = '1';
          if (partVisual) {
            partVisual.textContent = '';
            partVisual.style.fontSize = '0px';
            partVisual.style.opacity = '0';
          }
        } else {
          partImg.style.display = 'none';
          partImg.style.opacity = '0';
          if (partVisual) {
            partVisual.textContent = emoji || '';
            partVisual.style.fontSize = emoji ? '48px' : '0px';
            partVisual.style.opacity = emoji ? '1' : '0';
          }
        }
      } else if (partVisual) {
        partVisual.textContent = emoji || '';
        partVisual.style.fontSize = emoji ? '48px' : '0px';
        partVisual.style.opacity = emoji ? '1' : '0';
      }
    } else {
      const img = layer.querySelector('img');
      if (img) {
        if (imgSrc) {
          img.src = imgSrc;
          img.style.display = 'block';
        } else {
          img.style.display = 'none';
        }
      }
    }

    // Check if we should hide placeholder
    const placeholder = document.getElementById('preview-placeholder');
    if (placeholder) {
      const hasPlant = !!state.selections.plant;
      placeholder.style.display = hasPlant ? 'none' : 'flex';
    }

    // Fade in with animation trigger
    layer.style.opacity = '1';
    layer.style.transform = 'scale(1)';
    layer.classList.remove('layer-animate-in');
    void layer.offsetWidth; // Reflow to restart animation
    layer.classList.add('layer-animate-in');
  }, 220);

  layer.style.transition = 'opacity 220ms ease, transform 220ms ease';
}

/* =====================================================
   UI RENDERING
   ===================================================== */
function renderStars(count) {
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

function renderCategoryTabs() {
  const container = document.getElementById('plant-category-tabs');
  if (!container) return;

  container.innerHTML = PRODUCTS.categories.map(cat => {
    const count = getCategoryCount(cat.id);
    const active = state.plantFilter.category === cat.id ? 'active' : '';
    return `
      <button type="button"
              class="category-tab ${active}"
              role="tab"
              aria-selected="${state.plantFilter.category === cat.id}"
              onclick="setPlantCategory('${cat.id}')">
        ${cat.name}
        <span class="category-count">${count}</span>
      </button>
    `;
  }).join('');
}

function renderPlantCards() {
  const container = document.getElementById('plant-cards');
  const countEl = document.getElementById('plant-result-count');
  if (!container) return;

  const filtered = getFilteredPlants();

  if (countEl) {
    const catName = PRODUCTS.categories.find(c => c.id === state.plantFilter.category)?.name || '全部';
    countEl.textContent = filtered.length
      ? `「${catName}」顯示 ${filtered.length} 個品種`
      : `「${catName}」目前沒有符合的品種`;
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="plant-empty-state">
        <div class="plant-empty-icon">🌿</div>
        <p>找不到符合條件的品種</p>
        <p class="plant-empty-hint">試試其他系列，或清除搜尋關鍵字</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(plant => `
    <div class="product-card ${state.selections.plant === plant.id ? 'selected' : ''}"
         id="plant-card-${plant.id}"
         role="radio"
         aria-checked="${state.selections.plant === plant.id}"
         tabindex="0"
         onclick="selectPlant('${plant.id}')"
         onkeydown="if(event.key==='Enter'||event.key===' ')selectPlant('${plant.id}')">
      <div class="card-thumb">
        <img src="${plant.img}" alt="${plant.name}" loading="lazy" onerror="this.parentNode.innerHTML='<span style=&quot;font-size:40px&quot;>🌿</span>'">
      </div>
      <div class="card-info">
        <div class="card-brand">${plant.categoryName || plant.brand}</div>
        <div class="card-name">${plant.name}</div>
        <div class="card-desc">${plant.desc}</div>
        <div class="card-meta">
          <span class="rarity-stars" title="稀有度 ${plant.rarity}/5">${renderStars(plant.rarity)}</span>
          <span class="card-price">${formatPrice(plant.price)}</span>
        </div>
      </div>
      <div class="card-check" aria-hidden="true">✓</div>
    </div>
  `).join('');
}

function renderBaseCards() {
  const container = document.getElementById('base-cards');
  if (!container) return;

  container.innerHTML = PRODUCTS.bases.map(base => `
    <div class="product-card ${state.selections.base === base.id ? 'selected' : ''}"
         id="base-card-${base.id}"
         role="radio"
         aria-checked="${state.selections.base === base.id}"
         tabindex="0"
         onclick="selectBase('${base.id}')"
         onkeydown="if(event.key==='Enter'||event.key===' ')selectBase('${base.id}')">
      <div class="card-thumb">
        <img src="${base.img}" alt="${base.name}" loading="lazy" onerror="this.parentNode.innerHTML='<span style=&quot;font-size:40px&quot;>${base.emoji}</span>'">
      </div>
      <div class="card-info">
        <div class="card-brand">${base.brand}</div>
        <div class="card-name">${base.name}</div>
        <div class="card-desc">${base.desc}</div>
        <div class="card-meta">
          <span class="tag tag-forest">板材</span>
          <span class="card-price add-on">${formatPrice(base.price)}</span>
        </div>
      </div>
      <div class="card-check" aria-hidden="true">✓</div>
    </div>
  `).join('');
}

function renderPartCards() {
  const container = document.getElementById('part-cards');
  if (!container) return;

  container.innerHTML = PRODUCTS.parts.map(part => `
    <div class="part-card ${state.selections.parts.includes(part.id) ? 'selected' : ''}"
         id="part-card-${part.id}"
         role="checkbox"
         aria-checked="${state.selections.parts.includes(part.id)}"
         tabindex="0"
         onclick="selectPart('${part.id}')"
         onkeydown="if(event.key==='Enter'||event.key===' ')selectPart('${part.id}')">
      <div class="part-visual ${part.visualClass}">
        ${part.img
          ? `<img src="${part.img}" alt="${part.name}" loading="lazy" onerror="this.style.display='none'; this.parentNode.textContent='${part.emoji || "🧩"}';">`
          : (part.emoji || '🧩')}
      </div>
      <div class="part-name">${part.name}</div>
      <div class="part-desc">${part.desc}</div>
      <div class="part-price">${part.price > 0 ? '+ ' + formatPrice(part.price) : '免費'}</div>
      <div class="part-check" aria-hidden="true">✓</div>
    </div>
  `).join('');
}

/* =====================================================
   SELECTION HANDLERS
   ===================================================== */
function selectPlant(id) {
  state.selections.plant = id;
  Analytics.track('select_plant', { id });

  const plant = getPlantById(id);
  updatePreviewLayer('layer-plant', plant?.img || null, '🌿');

  document.querySelectorAll('[id^="plant-card-"]').forEach(el => {
    const cardId = el.id.replace('plant-card-', '');
    const isSelected = state.selections.plant === cardId;
    el.classList.toggle('selected', isSelected);
    el.setAttribute('aria-checked', isSelected);
  });
  updatePriceDisplay();
}

function selectBase(id) {
  state.selections.base = id;
  Analytics.track('select_base', { id });

  const base = PRODUCTS.bases.find(b => b.id === id);
  updatePreviewLayer('layer-base', base?.img || null, base?.emoji || null);

  document.querySelectorAll('[id^="base-card-"]').forEach(el => {
    const cardId = el.id.replace('base-card-', '');
    const isSelected = state.selections.base === cardId;
    el.classList.toggle('selected', isSelected);
    el.setAttribute('aria-checked', isSelected);
  });
  updatePriceDisplay();
}

function selectPart(id) {
  let next = [...state.selections.parts];
  if (id === 'none') {
    next = ['none'];
  } else if (next.includes(id)) {
    next = next.filter(x => x !== id);
  } else {
    next = [...next.filter(x => x !== 'none'), id];
  }
  if (!next.length) next = ['none'];
  state.selections.parts = next;
  Analytics.track('select_part', { id, selected: state.selections.parts.includes(id) });

  const previewPartId = state.selections.parts.findLast(pid => pid !== 'none') || 'none';
  const part = PRODUCTS.parts.find(p => p.id === previewPartId);
  if (part?.img) {
    updatePreviewLayer('layer-part', part.img, null);
  } else {
    updatePreviewLayer('layer-part', null, part?.previewEmoji || null);
  }

  document.querySelectorAll('[id^="part-card-"]').forEach(el => {
    const cardId = el.id.replace('part-card-', '');
    const isSelected = state.selections.parts.includes(cardId);
    el.classList.toggle('selected', isSelected);
    el.setAttribute('aria-checked', isSelected);
  });
  updatePriceDisplay();
}

/* =====================================================
   STEP NAVIGATION
   ===================================================== */
function goToStep(step) {
  if (step < 1 || step > 4) return;

  // Validate: must select plant before going past step 1
  if (step > 1 && !state.selections.plant) {
    shakePanel('step-panel-1');
    return;
  }
  // Must select base before going past step 2
  if (step > 2 && !state.selections.base) {
    shakePanel('step-panel-2');
    return;
  }

  state.currentStep = step;
  Analytics.track('view_step', { step });

  // Update step panels
  document.querySelectorAll('.step-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const targetPanel = document.getElementById(`step-panel-${step}`);
  if (targetPanel) targetPanel.classList.add('active');

  // Step 2 之後固定板材視角：植株縮小並底部對齊板材邊框
  const previewCanvas = document.getElementById('preview-canvas');
  if (previewCanvas) {
    previewCanvas.classList.toggle('board-focus', step >= 2);
  }

  // Update progress nodes
  document.querySelectorAll('.step-node').forEach((node, i) => {
    const nodeStep = i + 1;
    node.classList.remove('active', 'completed');
    if (nodeStep === step) node.classList.add('active');
    if (nodeStep < step) node.classList.add('completed');
  });

  // Scroll to top of config on mobile
  const configSection = document.querySelector('.config-section');
  if (configSection) {
    configSection.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shakePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.style.animation = 'none';
  void panel.offsetWidth;
  panel.style.animation = 'shake 0.4s ease';
}

/* =====================================================
   PREORDER MODAL
   ===================================================== */
function openPreorderModal() {
  Analytics.track('click_preorder', {
    plant: state.selections.plant,
    base: state.selections.base,
    parts: state.selections.parts,
    total: getPrice().total
  });

  const prices = getPrice();
  const plant = getPlantById(state.selections.plant);
  const base = PRODUCTS.bases.find(b => b.id === state.selections.base);
  const parts = state.selections.parts
    .filter(id => id !== 'none')
    .map(id => PRODUCTS.parts.find(p => p.id === id))
    .filter(Boolean);

  // Fill order summary
  const setSummary = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setSummary('summary-plant', plant?.name || '—');
  setSummary('summary-base', base?.name || '—');
  setSummary('summary-part', parts.length ? parts.map(p => p.name).join('、') : '無配件');
  setSummary('summary-total', formatPrice(prices.total));

  // Build LINE message
  const lineMsg = encodeURIComponent(
    `您好！我想預購以下搭配：\n` +
    `🌿 植株：${plant?.name || '-'}\n` +
    `🪵 板材：${base?.name || '-'}\n` +
    `✨ 配件：${parts.length ? parts.map(p => p.name).join('、') : '無配件'}\n` +
    `💰 合計：${formatPrice(prices.total)}\n\n` +
    `請協助確認庫存，謝謝！`
  );

  const lineBtn = document.getElementById('btn-line-order');
  if (lineBtn) {
    lineBtn.href = `https://line.me/ti/p/~313lykia`;
    lineBtn.setAttribute('data-message', lineMsg);
  }

  // Open modal
  const overlay = document.getElementById('preorder-overlay');
  if (overlay) {
    overlay.classList.add('open');
    // Reset to form view
    document.getElementById('modal-form-view').style.display = 'block';
    document.getElementById('modal-success').classList.remove('show');
  }
}

function closePreorderModal() {
  const overlay = document.getElementById('preorder-overlay');
  if (overlay) overlay.classList.remove('open');
}

function handleLineRedirect() {
  Analytics.track('submit_lead_line', {
    plant: state.selections.plant,
    base: state.selections.base,
    parts: state.selections.parts
  });

  const prices = getPrice();
  const plant = getPlantById(state.selections.plant);
  const base = PRODUCTS.bases.find(b => b.id === state.selections.base);
  const parts = state.selections.parts
    .filter(id => id !== 'none')
    .map(id => PRODUCTS.parts.find(p => p.id === id))
    .filter(Boolean);

  const msg = `您好！我想預購以下搭配：\n🌿 植株：${plant?.name || '-'}\n🪵 板材：${base?.name || '-'}\n✨ 配件：${parts.length ? parts.map(p => p.name).join('、') : '無配件'}\n💰 合計：${formatPrice(prices.total)}\n\n請協助確認庫存，謝謝！`;

  // Try LINE URL scheme first (works inside LINE app)
  const lineUrl = `https://line.me/R/ti/p/%40313lykia`;
  window.open(lineUrl, '_blank');

  // Copy message to clipboard for convenience
  if (navigator.clipboard) {
    navigator.clipboard.writeText(msg).then(() => {
      showToast('訊息已複製！開啟 LINE 後直接貼上即可 📋');
    }).catch(() => {});
  }
}

function handleLeadSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('lead-name');
  const contactInput = document.getElementById('lead-contact');

  if (!nameInput.value.trim() || !contactInput.value.trim()) return;

  const prices = getPrice();
  const plant = getPlantById(state.selections.plant);
  const base = PRODUCTS.bases.find(b => b.id === state.selections.base);
  const parts = state.selections.parts
    .filter(id => id !== 'none')
    .map(id => PRODUCTS.parts.find(p => p.id === id))
    .filter(Boolean);

  const orderDesc = `植株(${plant?.name || '-'}) + 板材(${base?.name || '-'}) + 配件(${parts.length ? parts.map(p => p.name).join('、') : '無配件'}) = ${formatPrice(prices.total)}`;

  Analytics.track('submit_lead_form', {
    name: nameInput.value.trim(),
    contact: contactInput.value.trim(),
    order: orderDesc
  });

  // Show success state
  document.getElementById('modal-form-view').style.display = 'none';
  document.getElementById('modal-success').classList.add('show');
}

/* =====================================================
   ADMIN ACCESS GATE
   數據儀表板僅限管理員，一般客戶看不到入口。
   開啟方式：在網址後面加上 ?admin=你的密碼
   例如 https://staghornfrenart.com/?admin=huannlu2026
   登出（隱藏）：?admin=logout
   ===================================================== */
const ADMIN_KEY = 'huannlu2026';      // ← 後台密碼，可自行修改成你要的
const ADMIN_FLAG = 'staghorn_admin';

function isAdmin() {
  try { return localStorage.getItem(ADMIN_FLAG) === '1'; } catch { return false; }
}

function applyAdminVisibility() {
  const btn = document.getElementById('btn-open-analytics');
  if (btn) btn.style.display = isAdmin() ? '' : 'none';
}

function initAdminAccess() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('admin')) {
      const key = params.get('admin');
      if (key === 'logout') {
        localStorage.removeItem(ADMIN_FLAG);
        closeAnalyticsPanel();
      } else if (key === ADMIN_KEY) {
        localStorage.setItem(ADMIN_FLAG, '1');
      }
      // 清掉網址上的 admin 參數，避免旁人看到密碼
      params.delete('admin');
      const qs = params.toString();
      const clean = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.replaceState({}, document.title, clean);
    }
  } catch (e) { /* localStorage 不可用時靜默忽略 */ }
  applyAdminVisibility();
}

/* =====================================================
   ANALYTICS PANEL
   ===================================================== */
function openAnalyticsPanel() {
  if (!isAdmin()) return;   // 僅限管理員開啟
  const panel = document.getElementById('analytics-panel');
  if (panel) {
    panel.classList.add('open');
    renderAnalyticsDashboard();
  }
}

function closeAnalyticsPanel() {
  const panel = document.getElementById('analytics-panel');
  if (panel) panel.classList.remove('open');
}

function renderAnalyticsDashboard() {
  const sa = state.analytics;

  // KPIs
  const totalViews = sa.stepViews[1] || 0;
  const convRate = totalViews > 0 ? Math.round((sa.preorderClicks / totalViews) * 100) : 0;

  document.getElementById('kpi-visitors').textContent = totalViews;
  document.getElementById('kpi-preorders').textContent = sa.preorderClicks;
  document.getElementById('kpi-conversion').textContent = convRate + '%';
  document.getElementById('kpi-leads').textContent = sa.leadSubmissions;
  document.getElementById('kpi-line').textContent = sa.lineRedirects;

  // Funnel
  const steps = [
    { label: '選植株', views: sa.stepViews[1] || 0 },
    { label: '選板材', views: sa.stepViews[2] || 0 },
    { label: '選配件', views: sa.stepViews[3] || 0 },
    { label: '預購', views: sa.preorderClicks || 0 }
  ];
  const maxViews = Math.max(...steps.map(s => s.views), 1);

  steps.forEach((step, i) => {
    const bar = document.getElementById(`funnel-bar-${i}`);
    const pct = document.getElementById(`funnel-pct-${i}`);
    if (bar && pct) {
      const width = Math.round((step.views / maxViews) * 100);
      bar.style.width = width + '%';
      const convPct = i === 0 ? 100 : Math.round((step.views / (sa.stepViews[1] || 1)) * 100);
      pct.textContent = convPct + '%';
    }
  });

  // Board click chart
  const boards = [
    { id: 'acrylic', label: '壓克力板' },
    { id: 'wood_3d', label: '3D 木板' },
    { id: 'metal_grid', label: '金屬網板' }
  ];
  const maxClicks = Math.max(...boards.map(b => sa.baseClicks[b.id] || 0), 1);
  boards.forEach(board => {
    const bar = document.getElementById(`board-bar-${board.id}`);
    const count = document.getElementById(`board-count-${board.id}`);
    if (bar && count) {
      const clicks = sa.baseClicks[board.id] || 0;
      bar.style.width = Math.round((clicks / maxClicks) * 100) + '%';
      count.textContent = clicks;
    }
  });

  // Leads log
  const logsContainer = document.getElementById('leads-log');
  if (logsContainer) {
    if (sa.leads.length === 0) {
      logsContainer.innerHTML = '<div class="leads-empty">尚無 Lead 資料</div>';
    } else {
      logsContainer.innerHTML = sa.leads.slice(0, 10).map(lead => `
        <div class="lead-entry">
          <div>${lead.name} — ${lead.contact}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px">${lead.order}</div>
          <div class="lead-time">${lead.time}</div>
        </div>
      `).join('');
    }
  }
}

/* =====================================================
   TOAST NOTIFICATION
   ===================================================== */
function showToast(message) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: #1A3020; color: #fff; padding: 12px 24px;
      border-radius: 999px; font-size: 13px; z-index: 999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      white-space: nowrap; max-width: 90vw; text-align: center;
      animation: slide-up 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

/* =====================================================
   SHAKE ANIMATION (CSS injection)
   ===================================================== */
const shakeCSS = document.createElement('style');
shakeCSS.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeCSS);

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  // Admin access gate (hide analytics from public)
  initAdminAccess();

  // Load persisted analytics
  Analytics._load();

  try {
    const initialCatalog = await loadCatalog();
    if (initialCatalog?.updated) {
      window.__lastCatalogUpdated = initialCatalog.updated;
    }
  } catch (err) {
    console.error('[Catalog] Failed to load catalog.json', err);
    showToast('商品目錄載入失敗，請重新整理頁面');
  }

  renderCategoryTabs();
  renderPlantCards();
  renderBaseCards();
  renderPartCards();

  // Auto refresh catalog when server syncs new images
  let lastCatalogUpdated = window.__lastCatalogUpdated || '';
  const pollCatalog = async () => {
    try {
      const res = await fetch(`catalog.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.updated && data.updated !== lastCatalogUpdated) {
        lastCatalogUpdated = data.updated;
        PRODUCTS.categories = data.categories || PRODUCTS.categories;
        PRODUCTS.plants = data.plants || PRODUCTS.plants;
        if (Array.isArray(data.bases) && data.bases.length) {
          PRODUCTS.bases = data.bases;
        }
        if (Array.isArray(data.parts) && data.parts.length) {
          PRODUCTS.parts = data.parts;
        }
        renderCategoryTabs();
        renderPlantCards();
        renderBaseCards();
        renderPartCards();
      }
    } catch {}
  };
  setInterval(pollCatalog, 3000);

  const plantSearch = document.getElementById('plant-search');
  if (plantSearch) {
    plantSearch.addEventListener('input', (e) => setPlantSearch(e.target.value));
    plantSearch.addEventListener('search', (e) => setPlantSearch(e.target.value));
  }

  // Initialize price display (zero state)
  updatePriceDisplay(false);

  // Initialize step (step 1 is default)
  goToStep(1);

  // Lead form submission
  const leadForm = document.getElementById('lead-form');
  if (leadForm) leadForm.addEventListener('submit', handleLeadSubmit);

  // Close modal on overlay click
  const overlay = document.getElementById('preorder-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePreorderModal();
    });
  }

  // 3D tilt effect on preview (desktop/gyroscope)
  const canvas = document.querySelector('.preview-canvas');
  if (canvas && window.innerWidth > 768) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      canvas.style.transform = `perspective(800px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg)`;
    });
    canvas.addEventListener('mouseleave', () => {
      canvas.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
      canvas.style.transition = 'transform 0.5s ease';
    });
  }

  // Device orientation for mobile tilt
  if (window.DeviceOrientationEvent && window.innerWidth <= 768) {
    window.addEventListener('deviceorientation', (e) => {
      if (!canvas) return;
      const tiltX = Math.min(Math.max((e.beta  - 45) / 30, -1), 1);
      const tiltY = Math.min(Math.max( e.gamma       / 30, -1), 1);
      canvas.style.transform = `perspective(600px) rotateX(${-tiltX * 5}deg) rotateY(${tiltY * 5}deg)`;
    });
  }

  console.log('[Staghorn Configurator] Ready 🌿');
});


