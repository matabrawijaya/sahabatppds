/* PEMANDANGAN HEADER — gunung, bukit, pinus, danau. Semua digambar dengan kode (canvas), tanpa berkas gambar.
 * Satu pemandangan, suasananya mengikuti jam perangkat: pagi, siang, sore, malam (warna berganti halus).
 * Ringan: berhenti saat tidak terlihat atau aplikasi dibuka, partikel dibatasi,
 * kualitas turun otomatis bila perangkat lambat, dan mengikuti pengaturan "kurangi animasi".
 */
window.Pemandangan = (() => {
  'use strict';

  /* ---------- Waktu & suasana ---------- */
  function suasana(d) {
    const h = (d || new Date()).getHours();
    if (h >= 5 && h < 11) return 'pagi';
    if (h >= 11 && h < 15) return 'siang';
    if (h >= 15 && h < 18) return 'sore';
    return 'malam';
  }

  /* ---------- Warna ---------- */
  const PALET = {
    malam: { langit1: '#0B1530', langit2: '#2A3A6B', surya: '#F4F1DE', sinar: 0.32, gunung1: '#2E3B6B', gunung2: '#212C55', danau1: '#24315E', danau2: '#141C3A', bukit: '#141B36', pinus1: '#10172E', pinus2: '#0A0F22', kabut: 0, bintang: 1, bulan: 1 },
    fajar: { langit1: '#33427A', langit2: '#EFA9A0', surya: '#FFD9B8', sinar: 0.5, gunung1: '#76709E', gunung2: '#56547F', danau1: '#B49AB8', danau2: '#5A5884', bukit: '#3A3E68', pinus1: '#2C3058', pinus2: '#1F2244', kabut: 0.55, bintang: 0.25, bulan: 0 },
    pagi: { langit1: '#86BFE6', langit2: '#FBE3C6', surya: '#FFF3D1', sinar: 0.55, gunung1: '#AEBFDC', gunung2: '#8399C2', danau1: '#C4DAEC', danau2: '#8DA8CB', bukit: '#53708F', pinus1: '#3E5A7A', pinus2: '#2C4462', kabut: 0.6, bintang: 0, bulan: 0 },
    siang: { langit1: '#4FAAE0', langit2: '#CBEAF6', surya: '#FFFBEA', sinar: 0.45, gunung1: '#A3CCE0', gunung2: '#73A9C6', danau1: '#86C8E2', danau2: '#4A90B5', bukit: '#3D7C7A', pinus1: '#2C6464', pinus2: '#1C4A4E', kabut: 0.08, bintang: 0, bulan: 0 },
    sore: { langit1: '#6A5A94', langit2: '#F5B06A', surya: '#FFD8A0', sinar: 0.6, gunung1: '#C98E8E', gunung2: '#9C6C88', danau1: '#EAA57E', danau2: '#8B5E7C', bukit: '#5B4060', pinus1: '#46304D', pinus2: '#33233D', kabut: 0.1, bintang: 0.05, bulan: 0 },
    senja: { langit1: '#2A2C5A', langit2: '#C2627C', surya: '#FFC9A0', sinar: 0.45, gunung1: '#6C4E7A', gunung2: '#4B3B67', danau1: '#7C5076', danau2: '#3B3056', bukit: '#2B2447', pinus1: '#221C3B', pinus2: '#18142D', kabut: 0.05, bintang: 0.6, bulan: 0.7 }
  };
  // Jangkar waktu (menit sejak 00.00). Di antara dua jangkar, warna dicampur perlahan.
  const JANGKAR = [[0, 'malam'], [270, 'malam'], [345, 'fajar'], [420, 'pagi'], [600, 'pagi'], [690, 'siang'], [870, 'siang'],
    [960, 'sore'], [1050, 'sore'], [1110, 'senja'], [1170, 'malam'], [1440, 'malam']];

  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const warna = (c, a) => (a == null ? 'rgb(' : 'rgba(') + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + (a == null ? ')' : ',' + a + ')');
  const campur = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const halus = (t) => t * t * (3 - 2 * t);
  const PALET_RGB = {};
  Object.keys(PALET).forEach((k) => {
    PALET_RGB[k] = {};
    Object.keys(PALET[k]).forEach((j) => { const v = PALET[k][j]; PALET_RGB[k][j] = typeof v === 'string' ? hexRgb(v) : v; });
  });
  function paletPada(menit) {
    let i = 0;
    while (i < JANGKAR.length - 2 && menit >= JANGKAR[i + 1][0]) i++;
    const [m0, a] = JANGKAR[i], [m1, b] = JANGKAR[i + 1];
    const t = halus(Math.min(1, Math.max(0, (menit - m0) / (m1 - m0))));
    const A = PALET_RGB[a], B = PALET_RGB[b], hasil = {};
    Object.keys(A).forEach((k) => { hasil[k] = Array.isArray(A[k]) ? campur(A[k], B[k], t) : A[k] + (B[k] - A[k]) * t; });
    return hasil;
  }
  const menitKini = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };

  // Bilangan acak yang selalu sama untuk benih yang sama (pemandangan tidak berubah tiap dibuka).
  function acak(benih) {
    let s = benih >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Keadaan ---------- */
  let kepala = null, kanvas = null, ctx = null;
  let W = 0, H = 0, dpr = 1, M = 40;     // M = lebihan kiri-kanan untuk geseran paralaks
  let lapisan = null;                     // kanvas siap pakai per lapisan
  let palet = paletPada(menitKini());
  let menitDibangun = -99;
  let geo = null;                         // titik gunung, bukit, pohon
  let kabutKanvas = null, kabutCtx = null, sinarKunang = null, spriteAwan = [];
  let suasanaKini = suasana(), saatGantiSuasana = null;
  const intensitas = { pagi: 0, siang: 0, sore: 0, malam: 0 };
  const P = { daun: [], kilau: [], riak: [], kunang: [], lubang: [] };
  let awan = [], bintang = [], bintangJatuh = null, jedaBintangJatuh = 6;
  let angin = 0, kecAngin = 0;
  let px = 0, py = 0, pxT = 0, pyT = 0;
  const ptr = { x: 0, y: 0, ada: false, vx: 0, vy: 0, terakhir: 0, sentuhSelesai: 0, jenis: 'mouse' };
  let tAkhirLubang = 0, tAkhirDaun = 0, tAkhirKilau = 0;
  let rafId = 0, tLalu = 0, waktu = 0, cekWaktu = 0;
  let diBeranda = true, terlihat = true, dokTerlihat = !document.hidden;
  let kualitas = 1, rataFrame = 16, jumlahFrame = 0;
  const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)');
  const kasar = window.matchMedia('(pointer: coarse)').matches;
  let timerStatis = 0;
  const batas = (n) => Math.max(2, Math.round(n * kualitas));

  /* ---------- Geometri pemandangan ---------- */
  function bangunGeometri() {
    const r = acak(20261005);
    const dasar = H * 0.64;                 // garis danau / kaki gunung
    const x0 = 0, x1 = W + 2 * M;
    const punggung = (tinggi, min, maks) => {
      const t = [];
      let x = x0, naik = r() < 0.5;
      t.push([x, dasar - tinggi * (0.25 + r() * 0.3)]);
      while (x < x1) {
        x += min + r() * (maks - min);
        naik = !naik;
        t.push([Math.min(x, x1 + 40), naik ? dasar - tinggi * (0.62 + r() * 0.38) : dasar - tinggi * (0.12 + r() * 0.3)]);
      }
      return t;
    };
    const skala = Math.max(0.8, Math.min(1.6, W / 400));
    const jauh = punggung(H * 0.36, 50 * skala, 95 * skala);
    const tengah = punggung(H * 0.22, 38 * skala, 70 * skala);
    // Pohon belakang di punggung bukit, pohon depan membingkai sisi kiri dan kanan
    const belakang = [];
    for (let i = 0; i < Math.round(W / 14); i++) {
      const x = r() * (W + 2 * M);
      const yB = yBukit(x - M) + 2;
      if (yB > H * 0.95) continue;
      belakang.push({ x, y: yB, h: H * (0.07 + r() * 0.06), w: H * (0.035 + r() * 0.02) });
    }
    const depan = [];
    const tambahDepan = (dari, ke, n) => {
      for (let i = 0; i < n; i++) {
        const x = dari + (ke - dari) * (i + r() * 0.8) / n;
        const h = H * (0.32 + r() * 0.24);
        depan.push({ x: x + M, y: H * (0.985 + r() * 0.02), h, w: h * (0.26 + r() * 0.06), k: 0.7 + r() * 0.6, fase: r() * 6.28 });
      }
    };
    tambahDepan(-W * 0.04, W * 0.3, Math.max(4, Math.round(W / 70)));
    tambahDepan(W * 0.76, W * 1.04, Math.max(3, Math.round(W / 90)));
    depan.sort((a, b) => b.h - a.h);   // yang tinggi di belakang
    geo = { dasar, jauh, tengah, belakang, depan, danauAtas: dasar, danauBawah: H * 0.88 };

    bintang = [];
    const rb = acak(77);
    for (let i = 0; i < Math.round(W * H / 2600); i++) {
      bintang.push({ x: rb() * W, y: rb() * H * 0.55, r: rb() < 0.15 ? 1.4 : 0.8, k: 0.6 + rb() * 2.2, f: rb() * 6.28 });
    }
    awan = [];
    const ra = acak(31);
    for (let i = 0; i < 4; i++) {
      awan.push({ x: ra() * W, y: H * (0.08 + ra() * 0.24), s: 0.7 + ra() * 0.6, v: 0, laju: 4 + ra() * 5, sprite: i % spriteAwan.length });
    }
  }
  // Tinggi permukaan bukit pada x (koordinat layar)
  function yBukit(x) {
    const kiri = H * 0.66 + Math.pow(Math.abs(x - W * 0.18) / (W * 0.34), 2) * H * 0.22;
    const kanan = H * 0.69 + Math.pow(Math.abs(x - W * 0.88) / (W * 0.28), 2) * H * 0.2;
    return Math.min(kiri, kanan, H * 0.93);
  }

  /* ---------- Kanvas siap pakai ---------- */
  function kanvasBaru(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  function posisiSurya() {
    const m = menitKini();
    if (palet.bulan > 0.5) {
      let s = m >= 1110 ? (m - 1110) / 660 : (m + 330) / 660;
      s = Math.min(1, Math.max(0, s));
      return [W * (0.15 + 0.7 * s), H * 0.5 - Math.sin(Math.PI * s) * H * 0.36];
    }
    const s = Math.min(1, Math.max(0, (m - 330) / 780));
    return [W * (0.12 + 0.76 * s), H * 0.56 - Math.sin(Math.PI * s) * H * 0.42];
  }

  function gambarPunggung(c, titik, isi) {
    c.fillStyle = isi;
    c.beginPath();
    c.moveTo(titik[0][0], H);
    titik.forEach(([x, y]) => c.lineTo(x, y));
    c.lineTo(titik[titik.length - 1][0], H);
    c.closePath();
    c.fill();
  }

  function pinus(c, x, y, h, w) {
    c.fillRect(x - w * 0.06, y - h * 0.16, w * 0.12, h * 0.16);
    for (let k = 0; k < 3; k++) {
      const yb = y - h * (0.12 + k * 0.25);
      const lw = w * (1 - k * 0.24);
      const yt = yb - h * (0.44 - k * 0.05);
      c.beginPath();
      c.moveTo(x - lw / 2, yb);
      c.lineTo(x, yt);
      c.lineTo(x + lw / 2, yb);
      c.closePath();
      c.fill();
    }
  }

  function bangunLapisan() {
    if (!W || !H) return;
    const lw = (W + 2 * M) * dpr, lh = H * dpr;
    const buat = () => { const k = kanvasBaru(lw, lh); const c = k.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return [k, c]; };
    const putih = [255, 255, 255];

    // Langit + matahari/bulan
    const [kL, cL] = buat();
    const g = cL.createLinearGradient(0, 0, 0, geo.dasar);
    g.addColorStop(0, warna(palet.langit1));
    g.addColorStop(1, warna(palet.langit2));
    cL.fillStyle = g;
    cL.fillRect(0, 0, W + 2 * M, H);
    const [sx, sy] = posisiSurya();
    const rS = Math.max(14, H * 0.07);
    const sinar = cL.createRadialGradient(sx + M, sy, rS * 0.6, sx + M, sy, rS * 5);
    sinar.addColorStop(0, warna(palet.surya, palet.sinar));
    sinar.addColorStop(1, warna(palet.surya, 0));
    cL.fillStyle = sinar;
    cL.fillRect(0, 0, W + 2 * M, H);
    cL.fillStyle = warna(palet.surya, 0.95);
    cL.beginPath(); cL.arc(sx + M, sy, rS, 0, Math.PI * 2); cL.fill();

    // Gunung jauh (berkabut) dan puncak bersalju lembut
    const [kJ, cJ] = buat();
    const gj = cJ.createLinearGradient(0, H * 0.25, 0, geo.dasar);
    gj.addColorStop(0, warna(campur(palet.gunung1, palet.langit2, 0.25)));
    gj.addColorStop(1, warna(palet.gunung1));
    gambarPunggung(cJ, geo.jauh, gj);
    const salju = warna(campur(palet.gunung1, putih, 0.45), 0.55 * (1 - palet.bintang * 0.6));
    cJ.fillStyle = salju;
    for (let i = 1; i < geo.jauh.length - 1; i++) {
      const [x, y] = geo.jauh[i], a = geo.jauh[i - 1], b = geo.jauh[i + 1];
      if (y < a[1] && y < b[1] && geo.dasar - y > H * 0.24) {
        const t = 0.2;
        cJ.beginPath();
        cJ.moveTo(x, y);
        cJ.lineTo(x + (b[0] - x) * t, y + (b[1] - y) * t);
        cJ.lineTo(x + (b[0] - x) * t * 0.45, y + (b[1] - y) * t * 0.8);
        cJ.lineTo(x, y + (geo.dasar - y) * 0.1);
        cJ.lineTo(x + (a[0] - x) * t * 0.5, y + (a[1] - y) * t * 0.85);
        cJ.lineTo(x + (a[0] - x) * t, y + (a[1] - y) * t);
        cJ.closePath();
        cJ.fill();
      }
    }

    // Gunung tengah
    const [kT, cT] = buat();
    gambarPunggung(cT, geo.tengah, warna(palet.gunung2));

    // Danau + bayangan gunung + kilau air
    const [kD, cD] = buat();
    const gd = cD.createLinearGradient(0, geo.danauAtas, 0, H);
    gd.addColorStop(0, warna(palet.danau1));
    gd.addColorStop(1, warna(palet.danau2));
    cD.fillStyle = gd;
    cD.fillRect(0, geo.danauAtas, W + 2 * M, H - geo.danauAtas);
    cD.save();
    cD.globalAlpha = 0.3;
    cD.translate(0, geo.danauAtas * 2);
    cD.scale(1, -1);
    cD.beginPath();
    cD.rect(0, geo.danauAtas - (H - geo.danauAtas), W + 2 * M, H - geo.danauAtas);
    cD.clip();
    gambarPunggung(cD, geo.tengah, warna(campur(palet.gunung2, palet.danau2, 0.35)));
    cD.restore();
    cD.fillStyle = warna(palet.surya, 0.28);
    const rr = acak(9);
    for (let i = 0; i < 9; i++) {
      const y = geo.danauAtas + 4 + rr() * (geo.danauBawah - geo.danauAtas - 8);
      const x = sx + M + (rr() - 0.5) * W * 0.25;
      cD.fillRect(x - 12 - rr() * 22, y, 24 + rr() * 44, 1);
    }

    // Bukit + pohon belakang
    const [kB, cB] = buat();
    cB.fillStyle = warna(palet.bukit);
    cB.beginPath();
    cB.moveTo(0, H);
    for (let x = -M; x <= W + M; x += 6) cB.lineTo(x + M, yBukit(x));
    cB.lineTo(W + 2 * M, H);
    cB.closePath();
    cB.fill();
    cB.fillRect(0, H * 0.93, W + 2 * M, H * 0.07);
    cB.fillStyle = warna(palet.pinus1);
    geo.belakang.forEach((p) => pinus(cB, p.x, p.y, p.h, p.w));

    lapisan = { langit: kL, jauh: kJ, tengah: kT, danau: kD, bukit: kB };
  }

  function bangunSprite() {
    // Cahaya kunang-kunang (titik cahaya saja)
    sinarKunang = kanvasBaru(32, 32);
    const c = sinarKunang.getContext('2d');
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,252,200,1)');
    g.addColorStop(0.25, 'rgba(232,255,150,0.75)');
    g.addColorStop(1, 'rgba(200,255,120,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    // Awan lembut
    spriteAwan = [];
    const r = acak(5);
    for (let i = 0; i < 3; i++) {
      const k = kanvasBaru(180, 70), a = k.getContext('2d');
      a.fillStyle = 'rgba(255,255,255,0.9)';
      for (let j = 0; j < 7; j++) {
        const x = 30 + j * 20 + r() * 10, y = 44 - Math.sin((j / 6) * Math.PI) * 16 - r() * 6, rad = 14 + Math.sin((j / 6) * Math.PI) * 12 + r() * 4;
        a.beginPath(); a.arc(x, y, rad, 0, Math.PI * 2); a.fill();
      }
      a.fillRect(26, 44, 128, 14);
      spriteAwan.push(k);
    }
  }

  /* ---------- Ukuran ---------- */
  function ubahUkuran() {
    if (!kepala) return;
    const r = kepala.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return;
    W = w; H = h;
    M = Math.round(Math.max(30, W * 0.08));
    const maks = kualitas < 1 ? 1 : (kasar ? 1.5 : 2);
    dpr = Math.min(window.devicePixelRatio || 1, maks);
    kanvas.width = Math.round(W * dpr);
    kanvas.height = Math.round(H * dpr);
    const fw = Math.max(1, Math.round(W / 3)), fh = Math.max(1, Math.round(H / 3));
    kabutKanvas.width = fw; kabutKanvas.height = fh;
    bangunGeometri();
    palet = paletPada(menitKini());
    menitDibangun = Math.floor(menitKini());
    bangunLapisan();
    gambar(waktu, true);
  }

  /* ---------- Interaksi ---------- */
  function posisi(e) {
    const r = kepala.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function saatGerak(e) {
    if (!rafId) return;
    const [x, y] = posisi(e);
    const kini = performance.now();
    const dt = Math.max(8, kini - (ptr.terakhir || kini - 16));
    if (ptr.ada) {
      ptr.vx = ptr.vx * 0.6 + ((x - ptr.x) / dt * 1000) * 0.4;
      ptr.vy = ptr.vy * 0.6 + ((y - ptr.y) / dt * 1000) * 0.4;
    } else { ptr.vx = 0; ptr.vy = 0; }
    ptr.x = x; ptr.y = y; ptr.ada = true; ptr.terakhir = kini; ptr.jenis = e.pointerType || 'mouse';
    pxT = Math.max(-1, Math.min(1, (x / W - 0.5) * 2));
    pyT = Math.max(-1, Math.min(1, (y / H - 0.5) * 2));
    const laju = Math.hypot(ptr.vx, ptr.vy);
    if (suasanaKini === 'pagi') {
      if (kini - tAkhirLubang > 35) { tAkhirLubang = kini; tambah(P.lubang, { x, y, r: 46 + Math.min(40, laju * 0.03), hidup: 1 }, batas(24)); }
      if (laju > 220 && kini - tAkhirKilau > 90) { tAkhirKilau = kini; kilau(x, y, 1); }
    } else if (suasanaKini === 'siang') {
      kecAngin += Math.max(-2.5, Math.min(2.5, ptr.vx * 0.0016));
      awan.forEach((a) => { const jarak = Math.abs(a.y - y) / H; a.v += ptr.vx * 0.02 * Math.max(0.2, 1 - jarak); a.v = Math.max(-140, Math.min(140, a.v)); });
    } else if (suasanaKini === 'sore') {
      if (laju > 80 && kini - tAkhirDaun > 45) { tAkhirDaun = kini; daun(x, y, 1 + (laju > 600 ? 1 : 0)); }
    }
  }
  function saatTekan(e) {
    if (!rafId) return;
    ptr.ada = false;          // jangan hitung kecepatan dari posisi lama
    saatGerak(e);
    const [x, y] = posisi(e);
    if (suasanaKini === 'pagi') {
      kilau(x, y, 10);
      tambah(P.lubang, { x, y, r: 80, hidup: 1 }, batas(24));
    } else if (suasanaKini === 'siang') {
      kecAngin += (x < W / 2 ? 1 : -1) * 0.9;
    } else if (suasanaKini === 'sore') {
      if (y > geo.danauAtas + 3 && y < geo.danauBawah && y < yBukit(x) - 2) {
        tambah(P.riak, { x, y, r: 2, hidup: 1 }, batas(6));
      } else {
        daun(x, y, 6);
      }
    } else if (P.kunang.length) {
      P.kunang.forEach((k) => { k.sebar = 0.6; k.ox = (Math.random() - 0.5) * 120; k.oy = (Math.random() - 0.5) * 80; });
    }
  }
  function saatLepas(e) {
    ptr.sentuhSelesai = performance.now();
    if ((e.pointerType || 'mouse') === 'mouse' && e.type === 'pointerleave') { ptr.ada = false; pxT = 0; pyT = 0; }
  }
  function tambah(daftar, item, maks) {
    daftar.push(item);
    while (daftar.length > maks) daftar.shift();
  }
  function kilau(x, y, n) {
    for (let i = 0; i < n; i++) {
      const s = Math.random() * 6.28, d = Math.random() * 26;
      tambah(P.kilau, { x: x + Math.cos(s) * d, y: y + Math.sin(s) * d * 0.7, u: 1.6 + Math.random() * 3, hidup: 1, laju: 0.9 + Math.random() * 0.8 }, batas(30));
    }
  }
  const WARNA_DAUN = ['#E8A45C', '#C9733E', '#F2C57C', '#A8613E', '#D98B4A'];
  function daun(x, y, n) {
    for (let i = 0; i < n; i++) {
      tambah(P.daun, {
        x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 12,
        vx: ptr.vx * 0.35 + (Math.random() - 0.5) * 60, vy: ptr.vy * 0.25 - 20 - Math.random() * 30,
        rot: Math.random() * 6.28, putar: (Math.random() - 0.5) * 6, u: 3 + Math.random() * 3,
        warna: WARNA_DAUN[(Math.random() * WARNA_DAUN.length) | 0], fase: Math.random() * 6.28, hidup: 1
      }, batas(40));
    }
  }

  /* ---------- Pembaruan per bingkai ---------- */
  function perbarui(dt) {
    // Peralihan halus efek antar-suasana
    Object.keys(intensitas).forEach((k) => {
      const target = k === suasanaKini ? 1 : 0;
      intensitas[k] += (target - intensitas[k]) * Math.min(1, dt * 0.8);
    });
    // Sentuhan di HP: setelah jari diangkat, perlahan kembali ke tengah
    if (ptr.jenis !== 'mouse' && ptr.sentuhSelesai && performance.now() - ptr.sentuhSelesai > 1400) { ptr.ada = false; pxT = 0; pyT = 0; ptr.sentuhSelesai = 0; }
    px += (pxT - px) * Math.min(1, dt * 2.5);
    py += (pyT - py) * Math.min(1, dt * 2.5);
    ptr.vx *= Math.exp(-dt * 4); ptr.vy *= Math.exp(-dt * 4);

    // Angin & pinus (pegas teredam)
    const sepoi = Math.sin(waktu * 0.7) * 0.015 + Math.sin(waktu * 1.9) * 0.006;
    kecAngin += (-14 * (angin - sepoi) - 3.2 * kecAngin) * dt;
    angin += kecAngin * dt;
    angin = Math.max(-0.32, Math.min(0.32, angin));

    awan.forEach((a) => {
      a.x += (a.laju + a.v) * dt;
      a.v *= Math.exp(-dt * 0.7);
      const lebar = 180 * a.s;
      if (a.x > W + lebar) a.x = -lebar; else if (a.x < -lebar * 1.2) a.x = W + lebar * 0.5;
    });
    P.lubang.forEach((l) => { l.hidup -= dt / 2.4; });
    P.lubang = P.lubang.filter((l) => l.hidup > 0);
    P.kilau.forEach((k) => { k.hidup -= dt * k.laju; });
    P.kilau = P.kilau.filter((k) => k.hidup > 0);
    P.riak.forEach((r) => { r.r += 34 * dt; r.hidup -= dt / 1.8; });
    P.riak = P.riak.filter((r) => r.hidup > 0);
    P.daun.forEach((d) => {
      d.vx *= Math.exp(-dt * 0.9);
      d.vy = d.vy * Math.exp(-dt * 0.6) + 26 * dt;
      d.x += (d.vx + Math.sin(waktu * 2.6 + d.fase) * 22) * dt;
      d.y += d.vy * dt;
      d.rot += d.putar * dt;
      d.hidup -= dt / 3.6;
    });
    P.daun = P.daun.filter((d) => d.hidup > 0 && d.y < H + 12);

    // Kunang-kunang: hanya ada saat malam
    const nKunang = intensitas.malam > 0.05 ? batas(10) : 0;
    while (P.kunang.length < nKunang) {
      P.kunang.push({ x: Math.random() * W, y: H * (0.55 + Math.random() * 0.35), tx: 0, ty: 0, ganti: 0, k: 1 + Math.random() * 1.8,
        sudut: Math.random() * 6.28, jari: 16 + Math.random() * 30, w: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 1.2),
        fase: Math.random() * 6.28, sebar: 0, ox: 0, oy: 0 });
    }
    if (P.kunang.length > nKunang) P.kunang.length = nKunang;
    P.kunang.forEach((k) => {
      k.sudut += k.w * dt;
      let tx, ty;
      if (ptr.ada) {
        tx = ptr.x + Math.cos(k.sudut) * k.jari + k.ox * k.sebar;
        ty = ptr.y + Math.sin(k.sudut) * k.jari * 0.7 + k.oy * k.sebar;
      } else {
        k.ganti -= dt;
        if (k.ganti <= 0) { k.tx = Math.random() * W; k.ty = H * (0.5 + Math.random() * 0.4); k.ganti = 2 + Math.random() * 3; }
        tx = k.tx + Math.cos(k.sudut) * 10; ty = k.ty + Math.sin(k.sudut) * 8;
      }
      k.sebar = Math.max(0, k.sebar - dt * 0.5);
      k.x += (tx - k.x) * Math.min(1, dt * k.k);
      k.y += (ty - k.y) * Math.min(1, dt * k.k);
    });

    // Bintang jatuh, sesekali
    if (intensitas.malam > 0.6) {
      jedaBintangJatuh -= dt;
      if (jedaBintangJatuh <= 0 && !bintangJatuh) {
        bintangJatuh = { x: W * (0.45 + Math.random() * 0.5), y: H * (0.05 + Math.random() * 0.2), umur: 0, durasi: 0.9 };
        jedaBintangJatuh = 7 + Math.random() * 9;
      }
    }
    if (bintangJatuh) { bintangJatuh.umur += dt; if (bintangJatuh.umur > bintangJatuh.durasi) bintangJatuh = null; }
  }

  /* ---------- Menggambar ---------- */
  function gambarLapisan(k, geser, geserY) {
    ctx.drawImage(k, Math.round((-M + geser) * dpr), Math.round((geserY || 0) * dpr));
  }

  function gambar(t, statis) {
    if (!lapisan || !ctx) return;
    const skala = Math.max(0.8, Math.min(1.8, W / 400));
    const gx = (n) => (statis ? 0 : -px * n * skala);
    const gy = (n) => (statis ? 0 : -py * n * 0.35);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    gambarLapisan(lapisan.langit, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Bintang berkelip
    if (palet.bintang > 0.03) {
      ctx.fillStyle = '#FFFFFF';
      bintang.forEach((b) => {
        ctx.globalAlpha = palet.bintang * (statis ? 0.8 : 0.55 + 0.45 * Math.sin(t * b.k + b.f));
        ctx.fillRect(b.x + gx(2), b.y, b.r, b.r);
      });
      ctx.globalAlpha = 1;
    }
    // Bintang jatuh
    if (bintangJatuh && !statis) {
      const p = bintangJatuh.umur / bintangJatuh.durasi;
      const x = bintangJatuh.x - p * W * 0.35, y = bintangJatuh.y + p * H * 0.18;
      const g = ctx.createLinearGradient(x, y, x + 60, y - 30);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * (1 - p)) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y - 30); ctx.stroke();
    }
    // Awan
    const aAwan = intensitas.siang * 0.85 + intensitas.pagi * 0.35 + intensitas.sore * 0.25;
    if (aAwan > 0.02 && spriteAwan.length) {
      ctx.globalAlpha = aAwan;
      awan.forEach((a) => ctx.drawImage(spriteAwan[a.sprite], a.x + gx(3), a.y, 180 * a.s, 70 * a.s));
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    gambarLapisan(lapisan.jauh, gx(5), gy(3));
    gambarLapisan(lapisan.tengah, gx(10), gy(5));
    gambarLapisan(lapisan.danau, gx(14), gy(6));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Riak air
    if (P.riak.length) {
      ctx.lineWidth = 1.2;
      P.riak.forEach((r) => {
        for (let j = 0; j < 3; j++) {
          const rad = r.r - j * 9;
          if (rad <= 0) continue;
          ctx.strokeStyle = 'rgba(255,240,225,' + (0.55 * r.hidup * (1 - j * 0.28)) + ')';
          ctx.beginPath(); ctx.ellipse(r.x + gx(14), r.y, rad, rad * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
        }
      });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    gambarLapisan(lapisan.bukit, gx(20), gy(8));

    // Pinus depan (bergoyang)
    ctx.fillStyle = warna(palet.pinus2);
    const offDepan = gx(28) - M, offY = gy(10);
    geo.depan.forEach((p) => {
      const lentur = statis ? 0 : angin * p.k + Math.sin(t * 1.4 + p.fase) * 0.012;
      ctx.setTransform(dpr, 0, -lentur * dpr, dpr, (lentur * p.y + offDepan) * dpr, offY * dpr);
      pinus(ctx, p.x, p.y, p.h, p.w);
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Kabut pagi, tersibak di sekitar jari/kursor
    const aKabut = palet.kabut * Math.max(intensitas.pagi, statis && suasanaKini === 'pagi' ? 1 : 0);
    if (aKabut > 0.02) {
      const fw = kabutKanvas.width, fh = kabutKanvas.height, s = fw / W;
      kabutCtx.globalCompositeOperation = 'source-over';
      kabutCtx.clearRect(0, 0, fw, fh);
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 0.31 + 0.1) * W + Math.sin(t * 0.07 + i) * W * 0.08 + t * 3 * (i % 2 ? 1 : -1)) % (W * 1.2);
        const cy = H * (0.5 + i * 0.09);
        const g = kabutCtx.createRadialGradient(cx * s, cy * s, 0, cx * s, cy * s, W * 0.45 * s);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        kabutCtx.fillStyle = g;
        kabutCtx.fillRect(0, (cy - H * 0.2) * s, fw, H * 0.4 * s);
      }
      kabutCtx.globalCompositeOperation = 'destination-out';
      P.lubang.forEach((l) => {
        const g = kabutCtx.createRadialGradient(l.x * s, l.y * s, 0, l.x * s, l.y * s, l.r * s);
        g.addColorStop(0, 'rgba(0,0,0,' + l.hidup + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        kabutCtx.fillStyle = g;
        kabutCtx.fillRect((l.x - l.r) * s, (l.y - l.r) * s, l.r * 2 * s, l.r * 2 * s);
      });
      ctx.globalAlpha = aKabut;
      ctx.drawImage(kabutKanvas, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (statis) return;

    // Embun berkilau
    if (P.kilau.length) {
      ctx.fillStyle = '#FFFFFF';
      P.kilau.forEach((k) => {
        const u = k.u * Math.sin(Math.PI * k.hidup);
        ctx.globalAlpha = Math.min(1, k.hidup * 1.4);
        ctx.fillRect(k.x - u, k.y - 0.5, u * 2, 1);
        ctx.fillRect(k.x - 0.5, k.y - u, 1, u * 2);
        ctx.fillRect(k.x - 1, k.y - 1, 2, 2);
      });
      ctx.globalAlpha = 1;
    }
    // Daun kering
    P.daun.forEach((d) => {
      ctx.globalAlpha = Math.min(1, d.hidup * 2);
      ctx.fillStyle = d.warna;
      ctx.setTransform(dpr * Math.cos(d.rot), dpr * Math.sin(d.rot), -dpr * Math.sin(d.rot), dpr * Math.cos(d.rot), d.x * dpr, d.y * dpr);
      ctx.beginPath(); ctx.ellipse(0, 0, d.u, d.u * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    // Kunang-kunang (titik cahaya)
    if (P.kunang.length && intensitas.malam > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      P.kunang.forEach((k) => {
        ctx.globalAlpha = intensitas.malam * (0.45 + 0.55 * Math.abs(Math.sin(t * 2.2 + k.fase)));
        ctx.drawImage(sinarKunang, k.x - 9, k.y - 9, 18, 18);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* ---------- Putaran animasi ---------- */
  function putaran(tMs) {
    rafId = requestAnimationFrame(putaran);
    const dtMentah = (tMs - tLalu) / 1000;
    if (kualitas < 1 && dtMentah < 1 / 34) return;   // mode ringan: ±30 fps
    tLalu = tMs;
    const dt = Math.min(0.05, Math.max(0, dtMentah));
    waktu += dt;
    // Kualitas turun otomatis bila perangkat kewalahan
    if (jumlahFrame++ > 20) rataFrame = rataFrame * 0.95 + dtMentah * 1000 * 0.05;
    if (kualitas === 1 && jumlahFrame > 150 && rataFrame > 26) {
      kualitas = 0.5;
      ['daun', 'kilau', 'riak', 'lubang', 'kunang'].forEach((k) => { P[k].length = Math.min(P[k].length, batas(40)); });
      ubahUkuran();
    }
    cekWaktu -= dt;
    if (cekWaktu <= 0) { cekWaktu = 20; periksaWaktu(); }
    perbarui(dt);
    gambar(waktu, false);
  }

  function periksaWaktu() {
    const s = suasana();
    if (s !== suasanaKini) { suasanaKini = s; if (saatGantiSuasana) saatGantiSuasana(s); }
    const m = menitKini();
    if (Math.abs(m - menitDibangun) >= 1) {
      palet = paletPada(m);
      menitDibangun = Math.floor(m);
      bangunLapisan();
    }
  }

  function aturJalan() {
    const boleh = diBeranda && terlihat && dokTerlihat && W > 0;
    const statis = kurangiGerak.matches;
    if (boleh && !statis) {
      clearInterval(timerStatis); timerStatis = 0;
      if (!rafId) { periksaWaktu(); tLalu = performance.now(); rafId = requestAnimationFrame(putaran); }
    } else {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (boleh && statis) {
        periksaWaktu(); gambar(0, true);
        if (!timerStatis) timerStatis = setInterval(() => { periksaWaktu(); gambar(0, true); }, 60000);
      } else { clearInterval(timerStatis); timerStatis = 0; }
    }
  }

  /* ---------- API ---------- */
  function pasang(el, opsi) {
    kepala = el;
    saatGantiSuasana = opsi && opsi.saatGantiSuasana;
    suasanaKini = suasana();
    intensitas[suasanaKini] = 1;      // efek suasana sekarang langsung tampil, tanpa memudar dulu
    kanvas = document.createElement('canvas');
    kanvas.className = 'kepala-kanvas';
    kanvas.setAttribute('aria-hidden', 'true');
    el.prepend(kanvas);
    ctx = kanvas.getContext('2d');
    kabutKanvas = document.createElement('canvas');
    kabutCtx = kabutKanvas.getContext('2d');
    bangunSprite();
    el.addEventListener('pointermove', saatGerak, { passive: true });
    el.addEventListener('pointerdown', saatTekan, { passive: true });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => el.addEventListener(n, saatLepas, { passive: true }));
    if ('ResizeObserver' in window) new ResizeObserver(() => { ubahUkuran(); aturJalan(); }).observe(el);
    else window.addEventListener('resize', () => { ubahUkuran(); aturJalan(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { terlihat = e[0].isIntersecting; aturJalan(); }, { threshold: 0.02 }).observe(el);
    }
    document.addEventListener('visibilitychange', () => { dokTerlihat = !document.hidden; aturJalan(); });
    const ganti = () => aturJalan();
    if (kurangiGerak.addEventListener) kurangiGerak.addEventListener('change', ganti); else if (kurangiGerak.addListener) kurangiGerak.addListener(ganti);
    ubahUkuran();
    aturJalan();
  }

  // Dipanggil portal: true saat beranda tampil, false saat aplikasi dibuka.
  function aktif(ya) { diBeranda = !!ya; aturJalan(); }

  return { pasang, aktif, suasana, _status: () => ({ jalan: !!rafId, kualitas, dpr, rataFrame: Math.round(rataFrame * 10) / 10, partikel: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.length])), suasana: suasanaKini }) };
})();
