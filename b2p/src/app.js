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
    showScreen('apikey');
  } else {
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

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    const canvas = document.createElement('canvas');
    const MAX = 1024;
    let w = img.width, h = img.height;
    if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    imageBase64 = dataUrl.split(',')[1];

    const previewImg = document.getElementById('preview-img');
    previewImg.src = dataUrl;
    previewImg.style.display = 'block';
    document.getElementById('hero-inner').style.display = 'none';
    document.getElementById('preview-overlay').style.display = 'flex';
    document.getElementById('hero-tap').classList.add('has-image');
    document.getElementById('hero-tap').onclick = null;
    document.getElementById('analyze-btn').disabled = false;
  };
  img.src = objectUrl;
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

  const systemPrompt = `Kamu adalah ahli gizi AI yang menggunakan data TKPI (Tabel Komposisi Pangan Indonesia) Kemenkes RI sebagai referensi utama.

REFERENSI NUTRISI PER 100G (TKPI Kemenkes RI) - WAJIB GUNAKAN INI SEBAGAI ACUAN:
SEREALIA & UMBI: Nasi putih(130kcal,2.4P,28.6C,0.3F), Nasi merah(149kcal,2.8P,32.5C,0.3F), Nasi goreng(195kcal,4.7P,27C,7.1F), Lontong(84kcal,1.5P,19.4C,0.1F), Mie goreng(331kcal,7.9P,50.7C,11F), Mie rebus(85kcal,2.4P,16.9C,0.5F), Roti tawar(248kcal,8P,50C,1.2F), Singkong(154kcal,1.2P,36.8C,0.3F), Ubi jalar(125kcal,1.1P,29.3C,0.3F), Kentang(83kcal,2P,19.1C,0.1F)
DAGING & UNGGAS: Ayam goreng(299kcal,29P,0C,19.9F), Ayam rebus(175kcal,25.3P,0C,7.4F), Daging sapi goreng(267kcal,26.5P,0C,17.3F), Daging sapi rebus(218kcal,26P,0C,12.4F), Daging kambing(154kcal,16.6P,0C,9.2F), Hati ayam(136kcal,19.7P,2.2C,5.6F), Bakso sapi(193kcal,10.3P,19.1C,8.1F), Sosis(290kcal,10.8P,4.4C,25.9F)
IKAN & SEAFOOD: Ikan goreng(194kcal,22.5P,0C,11.4F), Ikan bakar(113kcal,21.3P,0C,2.7F), Udang goreng(202kcal,21.3P,0C,12.6F), Cumi goreng(175kcal,15.8P,8.6C,8.3F), Ikan tuna(109kcal,24.1P,0C,0.7F), Ikan lele goreng(196kcal,17.8P,0C,13.5F), Ikan bandeng(129kcal,20P,0C,5.3F)
TAHU & TEMPE: Tempe goreng(347kcal,18.3P,12.7C,26.5F), Tempe bacem(257kcal,17P,20C,12F), Tahu goreng(205kcal,15.6P,1.4C,15.8F), Tahu rebus(68kcal,7.8P,1.6C,3.7F), Tahu bakar(109kcal,10.9P,2C,6.6F)
SAYURAN: Kangkung tumis(83kcal,3.3P,6.4C,4.8F), Bayam tumis(107kcal,3.5P,6.2C,7.9F), Buncis(35kcal,2.4P,7.7C,0.2F), Wortel(41kcal,0.9P,9.3C,0.2F), Terong(24kcal,1P,5.5C,0.2F), Kol(25kcal,1.4P,5.3C,0.2F), Brokoli(34kcal,2.8P,6.6C,0.4F), Labu siam(26kcal,0.6P,6.4C,0.1F)
MASAKAN INDONESIA: Rendang(195kcal,14.3P,8.2C,12.3F), Gulai ayam(163kcal,12.8P,4.3C,10.8F), Soto ayam(67kcal,7.2P,3.5C,2.7F), Opor ayam(212kcal,16.3P,4.4C,14.8F), Gado-gado(132kcal,7.3P,10.1C,7.2F), Pecel(163kcal,6.2P,17.4C,8.1F), Cap cay(79kcal,5.5P,7.3C,3F), Sayur asem(42kcal,2P,7.8C,0.7F), Capcay goreng(116kcal,7.2P,7.5C,6.4F), Nasi padang campur(350kcal,18P,38C,14F)
GORENGAN & JAJANAN: Pisang goreng(211kcal,1.2P,37.1C,6.9F), Tempe mendoan(242kcal,11.8P,19.2C,13F), Tahu isi(171kcal,7.8P,16.5C,8.3F), Martabak telur(271kcal,12.1P,27.2C,12.8F), Risol(196kcal,6.2P,25.5C,7.8F), Lumpia(173kcal,5.6P,23.6C,6.8F), Cireng(229kcal,4.6P,47.2C,2.4F), Batagor(259kcal,13.5P,22.1C,12.7F)
TELUR: Telur goreng(218kcal,13.8P,0.9C,17F), Telur rebus(162kcal,12.9P,1.2C,11.5F), Telur dadar(185kcal,12.4P,1.6C,14.3F), Telur pindang(148kcal,12.7P,1.3C,10.2F)
BUAH: Pisang(92kcal,1P,23.4C,0.2F), Pepaya(46kcal,0.5P,11.8C,0.1F), Mangga(66kcal,0.4P,17.2C,0.1F), Jeruk(47kcal,0.9P,11.8C,0.1F), Semangka(32kcal,0.6P,7.9C,0.2F), Apel(58kcal,0.3P,14.9C,0.4F), Nanas(52kcal,0.5P,13.5C,0.1F), Jambu biji(49kcal,0.9P,11.9C,0.3F)
MINUMAN & LAINNYA: Kopi susu(60kcal,2.1P,8.4C,2.1F), Teh manis(73kcal,0.2P,18.9C,0F), Es teh(52kcal,0.1P,13.5C,0F), Susu sapi(61kcal,3.2P,4.3C,3.5F), Santan(122kcal,1.8P,4.5C,11.5F)

ATURAN ANALISIS:
1. Gunakan data TKPI di atas sebagai acuan UTAMA - jangan over-estimate
2. Jika makanan terlihat berminyak/digoreng, tambahkan 30-50 kcal dan 3-5g lemak dari standar rebus
3. Jika ada santan kental, tambahkan sekitar 30-40 kcal per 100g
4. Estimasi porsi secara konservatif - nasi putih 1 porsi = 100-150g, lauk = 50-80g
5. Untuk makanan campuran, hitung tiap komponen lalu jumlahkan proporsional

Kembalikan HANYA JSON ini (tanpa markdown, tanpa penjelasan):
{"food_name":"Nama makanan Bahasa Indonesia","food_name_en":"English name","description":"Deskripsi singkat 1-2 kalimat","confidence":"high","estimated_weight_g":250,"components":["bahan1","bahan2"],"per_100g":{"calories":150,"protein_g":8.5,"carbs_g":20,"fat_g":5,"fiber_g":2,"sugar_g":3,"sodium_mg":400},"glycemic_index":"Sedang (55-70)"}
Nilai confidence: "high" jika makanan jelas terlihat, "medium" jika agak tidak jelas, "low" jika tidak yakin.
Jika bukan gambar makanan, kembalikan food_name "Bukan makanan" dengan semua nilai 0.`;

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

// ─── CORRECTION ──────────────────────────────────────────────────────────────
async function applyCorrection() {
  const correction = document.getElementById('correction-input').value.trim();
  if (!correction) { showToast('Tulis koreksi dulu ya'); return; }

  const apiKey = localStorage.getItem('b2p_key');
  if (!apiKey) { showScreen('apikey'); return; }

  const btn = document.getElementById('btn-correction');
  btn.disabled = true;
  btn.textContent = 'UPDATING...';

  const systemPrompt = `Kamu adalah ahli gizi AI yang menggunakan data TKPI (Tabel Komposisi Pangan Indonesia) Kemenkes RI sebagai referensi utama. User memberikan koreksi pada hasil analisis makanan sebelumnya. Update data nutrisi berdasarkan koreksi tersebut.

REFERENSI NUTRISI PER 100G (TKPI): Nasi putih(130kcal,2.4P,28.6C,0.3F), Ayam goreng(299kcal,29P,0C,19.9F), Tempe goreng(347kcal,18.3P,12.7C,26.5F), Tahu goreng(205kcal,15.6P,1.4C,15.8F), Rendang(195kcal,14.3P,8.2C,12.3F), Telur goreng(218kcal,13.8P,0.9C,17F), Ikan goreng(194kcal,22.5P,0C,11.4F), Santan(122kcal,1.8P,4.5C,11.5F).

Kembalikan JSON saja (tanpa markdown, tanpa penjelasan). Format sama persis:
{"food_name":"...","food_name_en":"...","description":"...","confidence":"high","estimated_weight_g":250,"components":["..."],"per_100g":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"sugar_g":0,"sodium_mg":0},"glycemic_index":"..."}
PENTING: Kembalikan HANYA JSON.`;

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
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: `Hasil analisis sebelumnya:\n${JSON.stringify(currentNutrition)}\n\nKoreksi dari user: ${correction}\n\nUpdate nutrisinya sesuai koreksi.` }
            ]
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rawText = data.content.map(b => b.text || '').join('').trim();
    const cleaned = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const updated = JSON.parse(cleaned);

    currentNutrition = updated;
    currentPortion = 1;
    document.getElementById('portion-slider').value = 1;
    displayResults(updated);
    document.getElementById('correction-input').value = '';
    showToast('Nutrisi diperbarui ✓');

  } catch (err) {
    showToast('Gagal update: ' + (err.message || 'Coba lagi'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> UPDATE NUTRISI';
  }
}

// ─── EXPOSE ───────────────────────────────────────────────────────────────────
window.analyzeFood = analyzeFood;
window.goHome = goHome;
window.updatePortion = updatePortion;
window.saveResult = saveResult;
window.clearHistory = clearHistory;
window.saveApiKey = saveApiKey;
window.showScreen = showScreen;
window.applyCorrection = applyCorrection;
