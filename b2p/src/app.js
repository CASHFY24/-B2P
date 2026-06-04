'use strict';

// ─── STATE ───────────────────────────────────────────────────────────────────
let imageBase64 = null;
let currentNutrition = null;
let currentPortion = 1;
let history = [];

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  const apiKey = localStorage.getItem('b2p_key');
  if (!apiKey) {
    showScreen('apikey');hh
  } else {h
    showScreen('home');
  }

  // File inputs
  document.getElementById('file-gallery').addEventListener('change', handleFileSelect);
  document.getElementById('file-camera').addEventListener('change', handleFileSelect);
  document.getElementById('history-btn').addEventListener('click', () => showScreen('history'));

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ─── SCREEN NAVIGATION ───────────────────────────────────────────────────────
function showScreen(name) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById(`screen-${name}`);
  if (!next || next === current) return;
  if (current) {
    current.classList.add('slide-out');
    setTimeout(() => current.classList.remove('active', 'slide-out'), 300);
  }
  next.classList.add('active');
}

function goHome() {
  showScreen('home');
}

// ─── FILE HANDLING ────────────────────────────────────────────────────────────
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    imageBase64 = dataUrl.split(',')[1];

    const previewImg = document.getElementById('preview-img');
    const heroInner = document.getElementById('hero-inner');
    const previewOverlay = document.getElementById('preview-overlay');
    const heroTap = document.getElementById('hero-tap');

    previewImg.src = dataUrl;
    previewImg.style.display = 'block';
    heroInner.style.display = 'none';
    previewOverlay.style.display = 'flex';
    heroTap.classList.add('has-image');
    heroTap.onclick = null;

    document.getElementById('analyze-btn').disabled = false;
  };
  reader.readAsDataURL(file);
}

// ─── ANALYZE ──────────────────────────────────────────────────────────────────
const STEPS = [
  'Mendeteksi jenis makanan',
  'Menghitung kandungan nutrisi',
  'Menganalisis komposisi bahan',
  'Menyusun laporan nutrisi'
];

async function analyzeFood() {
  if (!imageBase64) return;

  const apiKey = localStorage.getItem('b2p_key');
  if (!apiKey) { showScreen('apikey'); return; }

  // Show scan preview
  document.getElementById('scan-preview').src = `data:image/jpeg;base64,${imageBase64}`;
  showScreen('analyzing');

  let stepIdx = 0;
  const stepEl = document.getElementById('analyzing-step');
  stepEl.textContent = STEPS[0];
  const stepInterval = setInterval(() => {
    stepIdx = (stepIdx + 1) % STEPS.length;
    stepEl.style.opacity = '0';
    setTimeout(() => {
      stepEl.textContent = STEPS[stepIdx];
      stepEl.style.opacity = '1';
    }, 150);
  }, 2000);

  const systemPrompt = `Kamu adalah ahli gizi AI. Analisis gambar makanan dan berikan data nutrisi akurat dalam format JSON saja (tanpa markdown, tanpa kode blok, tanpa penjelasan). Format wajib persis seperti ini:
{"food_name":"Nama makanan Bahasa Indonesia","food_name_en":"English name","description":"Deskripsi singkat 1-2 kalimat","confidence":"high","estimated_weight_g":250,"components":["bahan1","bahan2"],"per_100g":{"calories":150,"protein_g":8.5,"carbs_g":20,"fat_g":5,"fiber_g":2,"sugar_g":3,"sodium_mg":400},"glycemic_index":"Sedang (55-70)"}
Nilai confidence: "high" jika makanan jelas terlihat, "medium" jika agak tidak jelas, "low" jika tidak yakin.
Jika bukan gambar makanan, kembalikan food_name "Bukan makanan" dengan semua nilai 0.
PENTING: Kembalikan HANYA JSON, tidak ada teks lain.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
            },
            { type: 'text', text: 'Analisis makanan dalam gambar ini.' }
          ]
        }]
      })
    });

    clearInterval(stepInterval);

    if (response.status === 401) {
      localStorage.removeItem('b2p_key');
      showScreen('apikey');
      showToast('API key tidak valid');
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rawText = data.content.map(b => b.text || '').join('').trim();

    let nutrition;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      nutrition = JSON.parse(cleaned);
    } catch {
      throw new Error('Gagal memproses respons AI');
    }

    currentNutrition = nutrition;
    currentPortion = 1;
    displayResults(nutrition);
    showScreen('results');

  } catch (err) {
    clearInterval(stepInterval);
    showScreen('home');
    showToast('Gagal analisis: ' + (err.message || 'Coba lagi'));
  }
}

// ─── DISPLAY RESULTS ──────────────────────────────────────────────────────────
function displayResults(nutrition) {
  // Thumb
  const imgSrc = document.getElementById('preview-img').src;
  document.getElementById('result-thumb').src = imgSrc;

  // Name + confidence
  document.getElementById('result-food-name').textContent = nutrition.food_name || 'Tidak diketahui';
  document.getElementById('result-desc').textContent = nutrition.description || '';

  const confTag = document.getElementById('conf-tag');
  const c = nutrition.confidence || 'medium';
  confTag.textContent = c === 'high' ? '✓ Akurat' : c === 'medium' ? '~ Estimasi' : '? Kurang yakin';
  confTag.className = `conf-tag ${c}`;

  // Detail
  document.getElementById('val-weight').textContent = (nutrition.estimated_weight_g || 100) + 'g';
  document.getElementById('val-gi').textContent = nutrition.glycemic_index || '—';

  // Components
  if (nutrition.components && nutrition.components.length) {
    const chipsEl = document.getElementById('chips');
    chipsEl.innerHTML = nutrition.components.map(c => `<span class="chip">${c}</span>`).join('');
    document.getElementById('components-section').style.display = 'block';
  } else {
    document.getElementById('components-section').style.display = 'none';
  }

  // Portion reset
  document.getElementById('portion-slider').value = 1;
  updatePortion(1);
}

function updatePortion(val) {
  currentPortion = parseFloat(val);
  if (!currentNutrition) return;

  const wt = currentNutrition.estimated_weight_g || 100;
  const factor = (currentPortion * wt) / 100;
  const n = currentNutrition.per_100g;

  const cal     = Math.round(n.calories * factor);
  const protein = Math.round(n.protein_g * factor * 10) / 10;
  const carbs   = Math.round(n.carbs_g * factor * 10) / 10;
  const fat     = Math.round(n.fat_g * factor * 10) / 10;
  const fiber   = Math.round(n.fiber_g * factor * 10) / 10;
  const sugar   = Math.round(n.sugar_g * factor * 10) / 10;
  const sodium  = Math.round(n.sodium_mg * factor);

  document.getElementById('portion-display').textContent =
    `${currentPortion}× (${Math.round(currentPortion * wt)}g)`;
  document.getElementById('val-cal').textContent = cal;
  document.getElementById('val-protein').textContent = protein;
  document.getElementById('val-carbs').textContent = carbs;
  document.getElementById('val-fat').textContent = fat;
  document.getElementById('val-fiber').textContent = fiber;
  document.getElementById('val-sugar').textContent = sugar + 'g';
  document.getElementById('val-sodium').textContent = sodium + 'mg';

  // Progress bars (relative to total macro)
  const total = protein + carbs + fat + fiber + 0.01;
  document.getElementById('bar-protein').style.width = Math.round(protein / total * 100) + '%';
  document.getElementById('bar-carbs').style.width   = Math.round(carbs / total * 100) + '%';
  document.getElementById('bar-fat').style.width     = Math.round(fat / total * 100) + '%';
  document.getElementById('bar-fiber').style.width   = Math.round(fiber / total * 100) + '%';
}

// ─── SAVE / HISTORY ──────────────────────────────────────────────────────────
function saveResult() {
  if (!currentNutrition) return;
  const imgSrc = document.getElementById('result-thumb').src;
  const entry = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    food_name: currentNutrition.food_name,
    calories: Math.round((currentNutrition.per_100g.calories * currentPortion * (currentNutrition.estimated_weight_g || 100)) / 100),
    portion: currentPortion,
    thumb: imgSrc,
    nutrition: currentNutrition
  };

  history.unshift(entry);
  if (history.length > 30) history = history.slice(0, 30);
  saveHistory();
  showToast('Tersimpan ke riwayat ✓');
}

function loadHistory() {
  try {
    history = JSON.parse(localStorage.getItem('b2p_history') || '[]');
  } catch { history = []; }
}

function saveHistory() {
  // Store without thumb to save space (thumbs are large)
  const slim = history.map(h => ({ ...h, thumb: '' }));
  try { localStorage.setItem('b2p_history', JSON.stringify(slim)); } catch {}
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (history.length === 0) {
    list.innerHTML = `<div class="history-empty"><span>🍽️</span><p>Belum ada riwayat analisis</p></div>`;
    return;
  }
  list.innerHTML = history.map(h => `
    <div class="history-item">
      <div class="history-thumb">
        ${h.thumb
          ? `<img src="${h.thumb}" alt="${h.food_name}" />`
          : `<div style="width:100%;height:100%;background:var(--brand-faint);display:flex;align-items:center;justify-content:center;font-size:20px">🍴</div>`
        }
      </div>
      <div class="history-info">
        <div class="history-name">${h.food_name}</div>
        <div class="history-meta">${h.timestamp} · ${h.portion}× porsi</div>
      </div>
      <div class="history-cal">${h.calories}<small style="font-size:10px;font-weight:400;color:var(--text-3)"> kcal</small></div>
    </div>
  `).join('');
}

document.getElementById('history-btn').addEventListener('click', () => {
  renderHistory();
  showScreen('history');
});

function clearHistory() {
  if (!confirm('Hapus semua riwayat?')) return;
  history = [];
  saveHistory();
  renderHistory();
  showToast('Riwayat dihapus');
}

// ─── API KEY ──────────────────────────────────────────────────────────────────
function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key.startsWith('sk-ant-')) {
    showToast('Format API key tidak valid');
    return;
  }
  localStorage.setItem('b2p_key', key);
  showScreen('home');
  showToast('API key tersimpan ✓');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── EXPOSE ───────────────────────────────────────────────────────────────────
window.analyzeFood = analyzeFood;
window.goHome = goHome;
window.updatePortion = updatePortion;
window.saveResult = saveResult;
window.clearHistory = clearHistory;
window.saveApiKey = saveApiKey;
window.showScreen = showScreen;
