# aniwatch-shim — sumber streaming English untuk VibeNime

Pembungkus HTTP mungil untuk library npm [`aniwatch`](https://www.npmjs.com/package/aniwatch)
(scraper HiAnime). Pengganti `aniwatch-api` yang **kena DMCA takedown** (Maret 2026,
repo + paket server-nya dihapus). Library scraper-nya masih hidup di npm, jadi shim
ini mengekspos 3 endpoint yang persis diharapkan `AniwatchClient` di app VibeNime.

## ⚠️ WAJIB deploy di cloud (luar Indonesia)

Domain sumber `hianime.to` **diblokir mayoritas ISP Indonesia** (Trust+/Positif).
Jalankan shim ini di **PC lokal → GAGAL** (scraper tak bisa akses hianime.to).
Deploy ke server cloud US/EU (Render/Railway/Koyeb) → **berhasil**, karena di sana
domain tidak diblokir.

## Endpoint
- `GET /api/v2/hianime/search?q={judul}&page=1`
- `GET /api/v2/hianime/anime/{animeId}/episodes`
- `GET /api/v2/hianime/episode/sources?animeEpisodeId={id}&server=hd-1&category=sub`
- `GET /` → health (`{ok, domain}`), `GET /api/v2/hianime/home` → warmup

## Deploy ke Render (gratis, rekomendasi)
1. Push folder ini ke repo GitHub baru (privat boleh).
2. Render → **New → Web Service** → connect repo → Runtime **Docker** (ada `Dockerfile`).
3. Env var: `ANIWATCH_DOMAIN=hianime.to` (ganti kalau domain HiAnime pindah — mis.
   `hianime.pe`, `hianime.nz`). `PORT` diurus Render otomatis.
4. Deploy → dapat URL `https://xxx.onrender.com`.
5. Tes: `https://xxx.onrender.com/api/v2/hianime/search?q=frieren` → harus
   `{"success":true,"data":{"animes":[...]}}` dengan `animes` **> 0**.
   Kalau `animes: 0` → domain-nya salah/parkir, ganti `ANIWATCH_DOMAIN` ke mirror lain.

## Deploy ke Railway (alternatif)
New Project → Deploy from GitHub repo (auto-detect Dockerfile) → Variables:
`ANIWATCH_DOMAIN=hianime.to` → Generate Domain.

## Sambungkan ke app VibeNime
Di `.env` VibeNime:
```
ANIWATCH_API_URL=https://xxx.onrender.com
```
(tanpa trailing slash). `flutter run` ulang → di player muncul source **"Aniwatch (EN)"**.

## Jalankan lokal (hanya untuk cek sintaks; TIDAK akan dapat hasil di Indonesia)
```
npm install
npm start   # http://localhost:4000
```

## Catatan hukum
Ini link-aggregator ke sumber pihak ketiga (sama seperti Sanka). Server hanya untuk
pemakaian pribadi. Karena kategori ini rawan DMCA (aniwatch-api sudah kena),
`hianime.to` bisa berubah/mati sewaktu-waktu → cukup ganti `ANIWATCH_DOMAIN`.
Sumber Indo (Sanka/samehadaku) di app tetap jadi cadangan andal tanpa setup apa pun.
