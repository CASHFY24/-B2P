# NutriSnap 🥗

Foto makananmu, AI langsung analisis nutrisinya. PWA siap pakai di iPhone.

## Setup

### 1. Butuh API Key Anthropic
Daftar di [console.anthropic.com](https://console.anthropic.com/) dan buat API key.

### 2. Deploy ke Vercel (gratis)

```bash
# Install Vercel CLI
npm i -g vercel

# Di folder ini
vercel

# Ikuti promptnya, pilih defaults semua
```

Atau drag-drop folder ini ke [vercel.com/new](https://vercel.com/new).

### 3. Install ke iPhone
1. Buka URL hasil deploy di **Safari** (wajib Safari)
2. Tap ikon **Share** (kotak dengan panah ke atas)
3. Scroll down, tap **"Add to Home Screen"**
4. Kasih nama "NutriSnap", tap Add
5. Selesai! App muncul di home screen

### 4. Pertama kali buka
Masukkan API key Anthropic kamu. Disimpan di perangkat (localStorage), tidak dikirim ke mana-mana kecuali ke Anthropic API langsung.

---

## Struktur folder

```
nutrisnap/
├── index.html          # App shell + semua screens
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── vercel.json         # Vercel headers config
├── src/
│   ├── style.css       # Semua styles, dark mode support
│   └── app.js          # Logic: camera, API call, history
└── public/
    └── icons/
        ├── icon-192.png
        └── icon-512.png
```

## Fitur
- 📷 Foto langsung dari kamera atau galeri
- 🤖 AI detection nama makanan + deskripsi
- 🔢 Kalori, protein, karbo, lemak, serat, gula, sodium
- ⚖️ Slider porsi (0.25× – 3×) dengan recalculation otomatis
- 🗂️ Riwayat analisis tersimpan di device
- 🌙 Dark mode otomatis
- 📱 PWA: installable di iPhone via Safari
