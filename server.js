// Pembungkus HTTP mungil untuk library `aniwatch` (HiAnime scraper) — pengganti
// `aniwatch-api` yang kena DMCA. Mengekspos 3 endpoint persis seperti kontrak
// aniwatch-api v2 yang diharapkan AniwatchClient di app VibeNime, jadi drop-in
// tanpa ubah kode Flutter. Output library dipetakan ke bentuk {success, data}.
//
// PENTING soal DOMAIN:
// - Default library (`aniwatchtv.to`) sekarang domain PARKIR → 0 hasil.
// - Domain HiAnime asli (`hianime.to`) diblokir banyak ISP Indonesia → shim
//   HARUS jalan di server cloud (Render/Railway/Koyeb, luar Indonesia).
// - Override domain via env ANIWATCH_DOMAIN kalau `hianime.to` pindah/berubah.
process.env.ANIWATCH_DOMAIN ||= "hianime.to";

import express from "express";
import cors from "cors";
// Dynamic import: dijalankan SETELAH env di atas di-set, supaya library membaca
// ANIWATCH_DOMAIN yang benar (library baca env saat modul di-evaluasi).
const { HiAnime } = await import("aniwatch");

const app = express();
app.use(cors());
const hianime = new HiAnime.Scraper();
const PORT = process.env.PORT || 4000;

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, e) =>
  res.status(500).json({ success: false, error: String(e?.message || e) });

// Petakan output getEpisodeSources library → bentuk aniwatch-api lama:
// subtitles[]{url,lang} → tracks[]{file,label,kind}; sources[]{url,isM3U8} →
// {url,type}. Sisakan intro/outro/headers/anilistID apa adanya.
function mapSources(d) {
  const isThumb = (l) => /thumbnail/i.test(l || "");
  return {
    sources: (d.sources || []).map((v) => ({
      url: v.url,
      type: v.isM3U8 || /\.m3u8/i.test(v.url || "") ? "hls" : "mp4",
      quality: v.quality,
    })),
    tracks: (d.subtitles || []).map((s) => ({
      file: s.url,
      label: s.lang,
      kind: isThumb(s.lang) ? "thumbnails" : "captions",
      ...(isThumb(s.lang) ? {} : { default: /english/i.test(s.lang || "") }),
    })),
    intro: d.intro,
    outro: d.outro, // library kadang tak sediakan → undefined (client handle null)
    headers: d.headers || {},
    anilistID: d.anilistID ?? null,
    malID: d.malID ?? null,
  };
}

// Health / warmup — juga tampilkan domain aktif untuk diagnosa.
app.get("/", (_req, res) =>
  res.json({ ok: true, service: "aniwatch-shim", domain: process.env.ANIWATCH_DOMAIN })
);
app.get("/api/v2/hianime/home", async (_req, res) => {
  try {
    ok(res, await hianime.getHomePage());
  } catch (e) {
    fail(res, e);
  }
});

// 1. Search → { animes:[{id,name,...}], ... }
app.get("/api/v2/hianime/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    const page = Number(req.query.page || 1);
    ok(res, await hianime.search(q, page));
  } catch (e) {
    fail(res, e);
  }
});

// 2. Episodes → { episodes:[{episodeId,number,...}], totalEpisodes }
app.get("/api/v2/hianime/anime/:animeId/episodes", async (req, res) => {
  try {
    ok(res, await hianime.getEpisodes(req.params.animeId));
  } catch (e) {
    fail(res, e);
  }
});

// 3. Sources → { sources[], tracks[], intro, outro, headers }
app.get("/api/v2/hianime/episode/sources", async (req, res) => {
  try {
    const id = String(req.query.animeEpisodeId || "");
    const server = String(req.query.server || "hd-1");
    const category = String(req.query.category || "sub");
    const d = await hianime.getEpisodeSources(id, server, category);
    ok(res, mapSources(d));
  } catch (e) {
    fail(res, e);
  }
});

// Diagnostik: fetch MENTAH sebuah domain HiAnime dari sisi server (Render) →
// lihat status HTTP + apakah Cloudflare-challenge / halaman parkir / konten asli.
// Contoh: /diag?domain=hianime.to
app.get("/diag", async (req, res) => {
  const domain = String(req.query.domain || process.env.ANIWATCH_DOMAIN);
  const url = `https://${domain}/home`;
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    const text = await r.text();
    const title = (text.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
    res.json({
      domain,
      status: r.status,
      finalUrl: r.url,
      title,
      len: text.length,
      cloudflareChallenge: /just a moment|challenge-platform|cf-browser/i.test(text),
      hasFilmList: /flw-item|film_list|class="film/i.test(text),
    });
  } catch (e) {
    res.json({ domain, error: String(e?.message || e) });
  }
});

app.listen(PORT, () =>
  console.log(
    `aniwatch-shim listening on http://localhost:${PORT} (domain=${process.env.ANIWATCH_DOMAIN})`
  )
);
