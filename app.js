/* PORTAL — mengikuti KONTRAK_INTEGRASI.md versi 1 (bagian 5 Portal, bagian 6 Pengumuman).
 * Tidak ada rahasia di file ini. Alamat Hub ada di config.js.
 */
(() => {
  'use strict';

  const K = Object.assign(
    { HUB_URL: '', NAMA: 'Portal', VERSI: '', MUAT_ULANG_MENIT: 15, BATAS_TAMPIL_DETIK: 15, MAKS_APP_HIDUP: 3 },
    window.PORTAL_KONFIG || {}
  );
  const KUNCI = {
    sesi: 'portal.sesi',                 // { sesi, sesiBerakhir } — PIN tidak pernah disimpan
    paket: 'portal.paket',               // salinan tampilan terakhir (tanpa tiket, tanpa sesi)
    ditutup: 'portal.pengumumanDitutup', // id pengumuman yang sudah ditutup
    instalTerakhir: 'portal.instalTerakhir', // waktu (ms) ajakan instal terakhir tampil
    terinstal: 'portal.terinstal',       // tanda portal pernah diinstal dari browser ini
    iklanPopup: 'portal.iklanPopup'      // { idSlot: waktu (ms) pop-up iklan terakhir tampil }
  };
  const ID_HUB = 'hub';
  const VERSI_KODE = '2.2.0';

  /* ===================== Utilitas ===================== */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const sekarang = () => Math.floor(Date.now() / 1000);

  function el(tag, attrs, ...anak) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    anak.flat().forEach((a) => { if (a != null) e.append(a); });
    return e;
  }
  function svgPakai(id, cls) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    if (cls) s.setAttribute('class', cls);
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(ns, 'use');
    u.setAttribute('href', '#' + id);
    s.append(u);
    return s;
  }

  const simpan = {
    ambil(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    taruh(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penyimpanan penuh/diblokir */ } },
    hapus(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };

  let timerToast = null;
  function toast(pesan) {
    if (!pesan) return;
    const t = $('#toast');
    t.textContent = pesan;
    t.hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => { t.hidden = true; }, 4200);
  }

  function inisial(nama) {
    const kata = String(nama || '').replace(/^(dr|drg|prof)\.?\s+/i, '').split(/[\s,]+/).filter(Boolean);
    return (kata.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
  }
  const WARNA = ['#1F7A8C', '#7A5A16', '#3D5A80', '#4F5C30', '#6B4E8C', '#8C3D4E', '#2E6B4F', '#5A4A7A'];
  function warnaDari(id) {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return WARNA[h % WARNA.length];
  }
  function sapaan() {
    const j = new Date().getHours();
    if (j < 11) return 'Selamat pagi';
    if (j < 15) return 'Selamat siang';
    if (j < 18) return 'Selamat sore';
    return 'Selamat malam';
  }
  const layarLebar = () => window.matchMedia('(min-width: 900px)').matches;

  /* ===================== Mode diagnosa (buka portal dengan ?diagnosa=1) ===================== */
  // Menampilkan catatan kecil di pojok layar: ke mana ketukan mendarat. Tidak mengirim apa pun ke mana pun.
  const DIAG = (() => {
    try {
      if (/[?&]diagnosa=1/.test(location.search)) sessionStorage.setItem('portal.diagnosa', '1');
      if (/[?&]diagnosa=0/.test(location.search)) sessionStorage.removeItem('portal.diagnosa');
      return sessionStorage.getItem('portal.diagnosa') === '1';
    } catch (e) { return false; }
  })();
  const catatanDiag = [];
  function diagnosa(teks) {
    if (!DIAG) return;
    const d = new Date();
    catatanDiag.push(String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0') + ' ' + teks);
    while (catatanDiag.length > 9) catatanDiag.shift();
    let k = document.getElementById('kotak-diagnosa');
    if (!k) { k = document.createElement('pre'); k.id = 'kotak-diagnosa'; document.body.append(k); }
    k.textContent = catatanDiag.join('\n');
  }
  if (DIAG) {
    const nama = (t) => {
      if (!t || !t.tagName) return '?';
      if (t.tagName === 'IFRAME') return 'BINGKAI ' + (t.title || '');
      const b = t.closest('button, a');
      if (b) return 'tombol ' + (b.id || b.getAttribute('aria-label') || b.textContent.trim().slice(0, 18));
      return t.tagName.toLowerCase() + (t.id ? '#' + t.id : '') + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : '');
    };
    document.addEventListener('pointerdown', (e) => diagnosa('ketuk portal: ' + nama(e.target)), true);
    window.addEventListener('blur', () => setTimeout(() => {
      const a = document.activeElement;
      diagnosa(a && a.tagName === 'IFRAME' ? 'ketuk masuk ke ' + a.title : 'portal kehilangan fokus');
    }, 0));
    window.addEventListener('focus', () => diagnosa('fokus kembali ke portal'));
    window.addEventListener('popstate', () => diagnosa('popstate'));
    document.addEventListener('visibilitychange', () => diagnosa('layar: ' + document.visibilityState));
    window.addEventListener('resize', () => diagnosa('ukuran: ' + innerWidth + '×' + innerHeight));
  }

  /* ===================== Komunikasi dengan Hub (kontrak 5.2) ===================== */
  async function hub(aksi, data) {
    if (!K.HUB_URL || /GANTI_/.test(K.HUB_URL)) {
      return { ok: false, kode: 'KONFIG', pesan: 'Alamat Hub belum diisi di config.js.' };
    }
    try {
      const r = await fetch(K.HUB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // tanpa preflight CORS
        body: JSON.stringify(Object.assign({ aksi }, data || {}))
      });
      const j = await r.json();
      if (j && typeof j === 'object' && typeof j.ok === 'boolean') return j;
      return { ok: false, kode: 'GALAT', pesan: 'Balasan Hub tidak dikenali. Coba lagi sebentar lagi.' };
    } catch (e) {
      return {
        ok: false, kode: 'JARINGAN',
        pesan: navigator.onLine === false
          ? 'Tidak ada koneksi internet. Sambungkan, lalu coba lagi.'
          : 'Hub tidak bisa dihubungi. Coba lagi sebentar lagi.'
      };
    }
  }

  /* ===================== Keadaan ===================== */
  const S = {
    sesi: null, sesiBerakhir: 0,
    pengguna: null, aplikasi: [], pengumuman: [],
    tiket: {}, tiketBerakhir: 0, selisihJam: 0,
    terpakai: new Set(),
    aktif: null,
    bingkai: {},
    hidup: [],          // id aplikasi yang tetap hidup, terlama di depan
    terakhirMuat: 0,
    sedangMuat: null,
    tautanAwal: null,
    lanjut: null,       // halaman yang dituju setelah login (mis. pasang-iklan.html)
    lencana: {},        // { idAplikasi: angka } (bagian 7)
    iklan: { halamanPesan: '', slot: [], iklan: [] },   // bagian 8.3, tempat = portal
    bannerDitutup: new Set(),
    login: { hp: '', pin: '' }
  };
  const IklanUI = window.IklanUI;
  const detikServer = () => sekarang() + S.selisihJam;
  const cariApp = (id) => S.aplikasi.find((a) => a && a.id === id) || null;
  const diTabBaru = (app) => app.id === ID_HUB;   // Hub selalu tab baru, tanpa tiket

  /* ===================== Layar ===================== */
  function tampilLayar(nama) {
    $('#layar-awal').hidden = nama !== 'awal';
    $('#layar-login').hidden = nama !== 'login';
    $('#layar-portal').hidden = nama !== 'portal';
  }
  function tampilAwal(teks, gagal) {
    tampilLayar('awal');
    $('#awal-teks').textContent = teks;
    $('#awal-putar').hidden = !!gagal;
    $('#awal-aksi').hidden = !gagal;
  }

  /* ===================== Login (kontrak 5.4) ===================== */
  function pesanLogin(teks, jenis) {
    const p = $('#login-pesan');
    p.textContent = teks || '';
    p.className = 'pesan ' + (jenis || 'galat');
    p.hidden = !teks;
  }
  function langkahLogin(langkah, pesan, jenis) {
    tampilLayar('login');
    $('#form-hp').hidden = langkah !== 'hp';
    $('#form-pin').hidden = langkah !== 'pin';
    $('#form-ganti').hidden = langkah !== 'ganti';
    $('#pin-hp').textContent = S.login.hp;
    $('#ganti-hp').textContent = S.login.hp;
    pesanLogin(pesan, jenis);
    const fokus = { hp: '#in-hp', pin: '#in-pin', ganti: '#in-pin-baru' }[langkah];
    setTimeout(() => { const f = $(fokus); if (f) f.focus(); }, 30);
  }
  function tampilLogin(pesan, jenis) {
    S.login = { hp: '', pin: '' };
    $$('#layar-login input').forEach((i) => { i.value = ''; });
    langkahLogin('hp', pesan, jenis);
  }
  function sibuk(form, ya) {
    const b = form.querySelector('button[type="submit"]');
    if (!b) return;
    if (ya) { b.dataset.teks = b.textContent; b.textContent = 'Memeriksa…'; b.disabled = true; }
    else { b.textContent = b.dataset.teks || b.textContent; b.disabled = false; }
  }
  function ambilIsian(sel) { const i = $(sel); const v = i.value; i.value = ''; return v; }

  function prosesBalasanMasuk(r, hp, pin) {
    if (r.ok) { berhasilMasuk(r); return; }
    S.login.hp = hp;
    if (r.kode === 'PERLU_PIN') { langkahLogin('pin', pin ? r.pesan : '', pin ? 'galat' : 'info'); return; }
    if (r.kode === 'GANTI_PIN') {
      if (pin) { S.login.pin = pin; langkahLogin('ganti', r.pesan, 'info'); }
      else langkahLogin('pin', r.pesan, 'info');
      return;
    }
    if (pin && (r.kode === 'PIN_SALAH' || r.kode === 'TERKUNCI')) { langkahLogin('pin', r.pesan); return; }
    langkahLogin(pin ? 'pin' : 'hp', r.pesan);
    if (!pin) $('#in-hp').value = hp;
  }

  $('#form-hp').addEventListener('submit', async (e) => {
    e.preventDefault();
    const hp = $('#in-hp').value.replace(/[\s.\-()]/g, '');
    if (!hp) { pesanLogin('Isi nomor HP terlebih dahulu.'); return; }
    sibuk(e.target, true);
    const r = await hub('masuk', { hp });
    sibuk(e.target, false);
    prosesBalasanMasuk(r, hp, '');
  });

  $('#form-pin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = ambilIsian('#in-pin');
    if (!pin) { pesanLogin('Isi PIN terlebih dahulu.'); return; }
    sibuk(e.target, true);
    const r = await hub('masuk', { hp: S.login.hp, pin });
    sibuk(e.target, false);
    prosesBalasanMasuk(r, S.login.hp, pin);
  });

  $('#form-ganti').addEventListener('submit', async (e) => {
    e.preventDefault();
    const baru = ambilIsian('#in-pin-baru');
    const ulang = ambilIsian('#in-pin-ulang');
    if (!baru) { pesanLogin('Isi PIN baru terlebih dahulu.'); return; }
    if (baru !== ulang) { pesanLogin('PIN baru dan ulangannya tidak sama. Ketik ulang keduanya.'); return; }
    sibuk(e.target, true);
    const r = await hub('gantiPin', { hp: S.login.hp, pin: S.login.pin, pinBaru: baru });
    sibuk(e.target, false);
    if (r.ok) { berhasilMasuk(r); return; }
    if (r.kode === 'PIN_SALAH' || r.kode === 'TERKUNCI') { S.login.pin = ''; langkahLogin('pin', r.pesan); return; }
    langkahLogin('ganti', r.pesan);
  });

  $$('[data-ganti-nomor]').forEach((b) => b.addEventListener('click', () => {
    const hp = S.login.hp;
    tampilLogin();
    $('#in-hp').value = hp;
  }));

  function berhasilMasuk(paket) {
    S.login = { hp: '', pin: '' };
    $$('#layar-login input').forEach((i) => { i.value = ''; });
    pesanLogin('');
    terapkanPaket(paket);
    if (S.lanjut) { location.href = S.lanjut; return; }   // kembali ke halaman pasang iklan
    tampilPortal();
    bukaTautanAwal();
    jadwalkanPopup();
    muatLencana(true);
  }

  /* ===================== Paket portal ===================== */
  function terapkanPaket(p) {
    if (p.sesi) S.sesi = p.sesi;
    if (p.sesiBerakhir) S.sesiBerakhir = p.sesiBerakhir;
    if (S.sesi) simpan.taruh(KUNCI.sesi, { sesi: S.sesi, sesiBerakhir: S.sesiBerakhir });
    if (typeof p.waktuServer === 'number') S.selisihJam = p.waktuServer - sekarang();
    if (p.pengguna) S.pengguna = p.pengguna;
    S.aplikasi = Array.isArray(p.aplikasi) ? p.aplikasi.filter((a) => a && a.id && a.url) : [];
    S.pengumuman = Array.isArray(p.pengumuman) ? p.pengumuman.filter((x) => x && x.id) : [];
    S.tiket = (p.tiket && typeof p.tiket === 'object') ? Object.assign({}, p.tiket) : {};
    S.tiketBerakhir = p.tiketBerakhir || 0;
    S.iklan = rapikanIklan(p.iklan);
    S.terakhirMuat = Date.now();
    simpan.taruh(KUNCI.paket, { pengguna: S.pengguna, aplikasi: S.aplikasi, pengumuman: S.pengumuman, iklan: S.iklan });
    rapikanBingkai();
    render();
  }

  function bersihkanLokal() {
    simpan.hapus(KUNCI.sesi);
    simpan.hapus(KUNCI.paket);
    Object.keys(S.bingkai).forEach(tutupBingkai);
    Object.assign(S, {
      sesi: null, sesiBerakhir: 0, pengguna: null, aplikasi: [], pengumuman: [],
      tiket: {}, tiketBerakhir: 0, aktif: null, bingkai: {}, hidup: [], terakhirMuat: 0,
      lencana: {}, iklan: { halamanPesan: '', slot: [], iklan: [] }
    });
    S.bannerDitutup.clear();
    $('#iklan-banner').replaceChildren();
    $('#iklan-tombol').replaceChildren();
    S.terpakai.clear();
    antrean = [];
    $$('dialog[open]').forEach((d) => d.close());
    $('#pemuat').hidden = true;
    aturMode(false);
    $('#layar-portal').classList.remove('ringkas', 'sisi-buka');
  }

  function sesiHabis(pesan) {
    bersihkanLokal();
    tampilLogin(pesan || 'Sesi sudah berakhir. Silakan masuk lagi.', 'info');
  }

  /* ===================== Tampilan beranda & sidebar ===================== */
  function ikonApp(app) {
    const w = el('span', { class: 'ikon', 'aria-hidden': 'true' });
    w.style.setProperty('--warna', warnaDari(app.id));
    const ik = String(app.ikon || '').trim();
    const pakaiInisial = () => { w.className = 'ikon teks'; w.textContent = inisial(app.nama); };
    if (/^https:\/\//i.test(ik)) {
      w.classList.add('gambar');
      const img = el('img', { src: ik, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
      img.addEventListener('error', pakaiInisial, { once: true });
      w.append(img);
    } else if (ik) {
      w.classList.add('emoji');
      w.textContent = ik;
    } else {
      pakaiInisial();
    }
    return w;
  }
  function labelPeran(app) {
    if (diTabBaru(app)) return 'Dibuka di tab baru';
    if (app.peran === 'superadmin') return 'Superadmin';
    if (app.peran === 'admin') return 'Admin';
    return '';
  }

  function render() {
    const u = S.pengguna || {};
    const nama = u.nama || 'Pengguna';
    const sub = [u.jenis, u.divisi].filter(Boolean).join(', ');
    $$('[data-nama]').forEach((x) => { x.textContent = nama; });
    $$('[data-sub]').forEach((x) => { x.textContent = sub; x.hidden = !sub; });
    $$('[data-avatar]').forEach((x) => { x.textContent = inisial(nama); });
    $('#sapaan').textContent = sapaan();

    // Beranda
    const rak = $('#rak');
    rak.replaceChildren();
    S.aplikasi.forEach((app) => {
      const peran = labelPeran(app);
      const ikonW = el('span', { class: 'ikon-wadah' }, ikonApp(app), el('span', { class: 'lencana-app', hidden: true }));
      if (diTabBaru(app)) ikonW.append(el('span', { class: 'tanda-luar' }, svgPakai('i-tab')));
      rak.append(el('li', null,
        el('button', {
          type: 'button', class: 'ubin', 'data-app': app.id,
          'aria-label': app.nama + (diTabBaru(app) ? ' (dibuka di tab baru)' : ''),
          onclick: () => bukaApp(app.id)
        },
          ikonW,
          el('span', { class: 'ubin-teks' },
            el('span', { class: 'ubin-nama', text: app.nama }),
            peran ? el('span', { class: 'ubin-sub', text: peran }) : null
          )
        )
      ));
    });
    $('#rak-kosong').hidden = S.aplikasi.length > 0;

    // Sidebar
    const sisi = $('#sisi-app');
    sisi.replaceChildren();
    S.aplikasi.forEach((app) => {
      sisi.append(el('button', {
        type: 'button', class: 'menu-item', title: app.nama, 'data-app': app.id,
        'aria-current': S.aktif === app.id ? 'page' : null,
        onclick: () => bukaApp(app.id)
      },
        el('span', { class: 'ikon-wadah' }, ikonApp(app), el('span', { class: 'lencana-app', hidden: true })),
        el('span', { class: 'label-sisi', text: app.nama }),
        diTabBaru(app) ? svgPakai('i-tab', 'tanda-luar-kecil') : null
      ));
    });
    $('#menu-beranda').setAttribute('aria-current', S.aktif ? 'false' : 'page');

    renderPengumumanRingkas();
    renderLencana();
    renderIklan();
  }

  function tandaiAktif() {
    $$('#sisi-app .menu-item').forEach((b) => {
      if (b.dataset.app === S.aktif) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $('#menu-beranda').setAttribute('aria-current', S.aktif ? 'false' : 'page');
  }

  // Layar aplikasi tidak pernah di-display:none. Disembunyikan dengan visibility + inert,
  // supaya aplikasi yang sedang dimuat tetap punya ukuran dan tidak ada lapisan tak terlihat yang menangkap sentuhan.
  // Bingkai aplikasi TIDAK PERNAH disembunyikan (tanpa display:none, visibility, pointer-events, atau inert).
  // Beranda dan aplikasi hanya bertukar urutan tumpukan: yang aktif berada paling atas dan menutupi yang lain.
  // Ini menghindari area sentuh bingkai yang "tersangkut" di Chrome Android.
  function aturMode(modeApp) {
    $('#layar-portal').classList.toggle('mode-app', modeApp);
    $('#beranda').inert = modeApp;                 // beranda tidak berisi bingkai, aman dibuat inert
    $('#beranda').setAttribute('aria-hidden', String(modeApp));
    $('#app-bilah').inert = !modeApp;              // hanya bilah atas, bukan bingkai
    $('#wadah').setAttribute('aria-hidden', String(!modeApp));
    diagnosa(modeApp ? 'mode: aplikasi' : 'mode: beranda');
  }

  function tampilkanBingkai(aktif) {
    Object.values(S.bingkai).forEach((x) => {
      const ya = x === aktif;
      x.f.classList.toggle('aktif', ya);
      x.f.tabIndex = ya ? 0 : -1;
      x.f.setAttribute('aria-hidden', String(!ya));
    });
  }

  function tutupBingkai(id) {
    const b = S.bingkai[id];
    if (!b) return;
    clearTimeout(b.timer); clearTimeout(b.cek);
    b.f.src = 'about:blank';   // hentikan skripnya dulu agar memori segera lepas
    b.f.remove();
    delete S.bingkai[id];
    S.hidup = S.hidup.filter((x) => x !== id);
  }

  // Ukur ulang otomatis: meniru yang terjadi saat layar diputar.
  // Seluruh area aplikasi diperkecil sesaat lalu dikembalikan, beberapa kali setelah perpindahan,
  // supaya browser menghitung ulang area sentuh setiap aplikasi.
  let timerUkur = [];
  function ukurSekali() {
    const w = $('#wadah');
    if (!w || !Object.keys(S.bingkai).length) return;
    requestAnimationFrame(() => {
      w.classList.add('ukur-ulang');
      void w.offsetWidth;   // paksa tata letak dihitung dengan ukuran kecil
      requestAnimationFrame(() => requestAnimationFrame(() => {
        w.classList.remove('ukur-ulang');
        void w.offsetWidth;
      }));
    });
  }
  function ukurUlangBingkai() {
    timerUkur.forEach(clearTimeout);
    ukurSekali();
    timerUkur = [350, 1200, 3000].map((ms) => setTimeout(ukurSekali, ms));
  }

  // Simpan hanya beberapa aplikasi terakhir agar HP tidak kehabisan memori.
  function catatHidup(id) {
    S.hidup = S.hidup.filter((x) => x !== id).concat(id);
    const maks = Math.max(1, Number(K.MAKS_APP_HIDUP) || 3);
    while (S.hidup.length > maks) tutupBingkai(S.hidup[0]);
  }

  function tampilPortal() {
    tampilLayar('portal');
    if (!S.aktif) tampilBeranda({ tanpaRiwayat: true });
  }

  /* ===================== Tiket (kontrak 5.4) ===================== */
  async function ambilTiket(id) {
    const t = S.tiket[id];
    delete S.tiket[id];
    if (t && !S.terpakai.has(t) && S.tiketBerakhir - detikServer() > 30) {
      S.terpakai.add(t);
      return { ok: true, tiket: t };
    }
    const r = await hub('tiket', { sesi: S.sesi, aplikasi: id });
    if (r.ok && r.tiket) {
      S.terpakai.add(r.tiket);
      if (S.terpakai.size > 300) S.terpakai.delete(S.terpakai.values().next().value);
      return { ok: true, tiket: r.tiket };
    }
    if (r.kode === 'SESI_HABIS') { sesiHabis(r.pesan); return { ok: false, kode: r.kode, pesan: '' }; }
    return { ok: false, kode: r.kode, pesan: r.pesan || 'Akses ke aplikasi belum bisa disiapkan.' };
  }

  function tambahParam(url, qs) {
    if (!qs) return url;
    const [dasar, ...h] = String(url).split('#');
    const hash = h.length ? '#' + h.join('#') : '';
    return dasar + (dasar.includes('?') ? '&' : '?') + qs + hash;
  }

  // Alamat untuk SATU kali buka. Tiap panggilan memakai tiket baru.
  async function alamatSekali(app, extra) {
    const url = tambahParam(app.url, extra || '');
    if (!app.pakaiTiket) return { ok: true, url };
    const t = await ambilTiket(app.id);
    if (!t.ok) return t;
    return { ok: true, url: tambahParam(url, 'tiket=' + encodeURIComponent(t.tiket)) };
  }

  /* ===================== Membuka aplikasi ===================== */
  function bukaApp(id, opsi) {
    opsi = opsi || {};
    const app = cariApp(id);
    if (!app) { toast('Aplikasi itu tidak tersedia untuk akun Anda.'); return; }

    if (diTabBaru(app)) {
      if (opsi.otomatis) { toast(app.nama + ' selalu dibuka di tab baru. Ketuk ikonnya di beranda.'); return; }
      bukaTautanLuar(app.url);   // tanpa tiket
      return;
    }

    S.aktif = id;
    $('#app-judul').textContent = app.nama;
    document.title = app.nama + ' – ' + K.NAMA;
    aturMode(true);
    const portal = $('#layar-portal');
    portal.classList.add('ringkas');
    portal.classList.remove('sisi-buka');
    $('#sisi-lipat').setAttribute('aria-expanded', 'false');
    $('#sisi-lipat').setAttribute('aria-label', 'Buka menu');
    tandaiAktif();

    if (!opsi.tanpaRiwayat) {
      // Pindah antar-aplikasi mengganti entri riwayat, supaya "kembali" selalu ke beranda.
      const st = { app: id }, alamat = '#' + encodeURIComponent(id);
      if (history.state && history.state.app) history.replaceState(st, '', alamat);
      else history.pushState(st, '', alamat);
    }

    let b = S.bingkai[id];
    catatHidup(id);
    if (b) { tampilkanBingkai(b); segarkanPemuat(); ukurUlangBingkai(); return; }   // sudah terbuka: tampilkan saja, tanpa memuat ulang

    const f = el('iframe', {
      title: app.nama,
      allow: 'clipboard-read; clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture; geolocation',
      allowfullscreen: true
    });
    b = { id, f, status: 'tiket', pesan: '', timer: null, cek: null };
    f.addEventListener('load', () => saatTermuat(b));
    S.bingkai[id] = b;
    $('#wadah').append(f);
    tampilkanBingkai(b);
    ukurUlangBingkai();
    muatBingkai(b, opsi.extra);
  }

  async function muatBingkai(b, extra) {
    const app = cariApp(b.id);
    if (!app) return;
    clearTimeout(b.timer); clearTimeout(b.cek);
    b.status = 'tiket'; b.pesan = '';
    b.iklanLoading = undefined;   // dipilih ulang secara acak setiap kali memuat
    segarkanPemuat();
    const r = await alamatSekali(app, extra);
    if (S.bingkai[b.id] !== b) return;               // sudah ditutup/keluar
    if (!r.ok) {
      if (r.kode === 'SESI_HABIS') return;
      b.status = 'gagal'; b.pesan = r.pesan; segarkanPemuat(); return;
    }
    b.status = 'muat';
    segarkanPemuat();
    b.timer = setTimeout(() => {
      if (b.status === 'muat') { b.status = 'lambat'; segarkanPemuat(); }
    }, (Number(K.BATAS_TAMPIL_DETIK) || 15) * 1000);
    b.f.src = r.url;
  }

  function saatTermuat(b) {
    if (b.status !== 'muat' && b.status !== 'lambat') return;
    clearTimeout(b.timer);
    b.status = 'siap';
    segarkanPemuat();
    diagnosa('termuat: ' + b.id);
    ukurUlangBingkai();
    // Bila halaman menolak tampil di dalam bingkai, browser memuat halaman galat kosong.
    const kosong = () => {
      try { if (b.f.contentDocument) return false; } catch (e) { /* beda asal: lanjut periksa */ }
      try { return b.f.contentWindow.length === 0; } catch (e) { return false; }
    };
    b.cek = setTimeout(() => {
      if (b.status !== 'siap' || !kosong()) return;
      b.cek = setTimeout(() => {
        if (b.status === 'siap' && kosong()) { b.status = 'tolak'; segarkanPemuat(); }
      }, 4000);
    }, 3000);
  }

  function segarkanPemuat() {
    const b = S.aktif && S.bingkai[S.aktif];
    const p = $('#pemuat');
    if (!b || b.status === 'siap') { p.hidden = true; return; }
    const app = cariApp(b.id) || { nama: 'Aplikasi' };
    const aksi = $('#pemuat-aksi');
    aksi.replaceChildren();
    const tTab = () => el('button', { type: 'button', class: 'tombol utama', onclick: () => bukaTabBaru(b.id) }, svgPakai('i-tab'), 'Buka di tab baru');
    let teks = '';
    let putar = true;
    if (b.status === 'tiket') teks = 'Menyiapkan akses ke ' + app.nama + '…';
    else if (b.status === 'muat') teks = 'Memuat ' + app.nama + '…';
    else if (b.status === 'lambat') {
      teks = app.nama + ' belum tampil. Bila tetap kosong, buka di tab baru: ada aplikasi yang belum mengizinkan tampil di dalam portal.';
      aksi.append(tTab(), el('button', { type: 'button', class: 'tombol', onclick: () => muatBingkai(b), text: 'Muat ulang' }));
    } else if (b.status === 'tolak') {
      putar = false;
      teks = app.nama + ' belum mengizinkan tampil di dalam portal. Buka di tab baru untuk memakainya.';
      aksi.append(tTab(), el('button', { type: 'button', class: 'tombol', text: 'Tutup pesan', onclick: () => { b.status = 'siap'; segarkanPemuat(); } }));
    } else if (b.status === 'gagal') {
      putar = false;
      teks = b.pesan || 'Aplikasi belum bisa dibuka.';
      aksi.append(
        el('button', { type: 'button', class: 'tombol utama', text: 'Coba lagi', onclick: () => muatBingkai(b) }),
        el('button', { type: 'button', class: 'tombol', text: 'Kembali ke beranda', onclick: () => keBeranda() })
      );
    }
    $('#pemuat-teks').textContent = teks;
    $('#pemuat-putar').hidden = !putar;
    // Iklan "loading": kartu kecil di bawah indikator berputar, hilang bersama layar loading (bagian 8.2).
    const wadahIklan = $('#pemuat-iklan');
    if (putar) {
      if (b.iklanLoading === undefined) b.iklanLoading = pilihIklan('loading');
      const pilih = b.iklanLoading;
      if (pilih && wadahIklan.dataset.untuk !== b.id + '|' + (pilih.iklan ? pilih.iklan.id : pilih.slot.id)) {
        wadahIklan.replaceChildren(IklanUI.kartu({ jenis: 'loading', iklan: pilih.iklan, slot: pilih.slot, halamanPesan: S.iklan.halamanPesan }));
        wadahIklan.dataset.untuk = b.id + '|' + (pilih.iklan ? pilih.iklan.id : pilih.slot.id);
      } else if (!pilih) { wadahIklan.replaceChildren(); wadahIklan.dataset.untuk = ''; }
    } else { wadahIklan.replaceChildren(); wadahIklan.dataset.untuk = ''; }
    p.hidden = false;
  }

  function bukaTautanLuar(url) {
    const a = el('a', { href: url, target: '_blank', rel: 'noopener' });
    document.body.append(a);
    a.click();
    a.remove();
  }

  async function bukaTabBaru(id) {
    const app = cariApp(id);
    if (!app) return;
    if (!app.pakaiTiket) { bukaTautanLuar(app.url); return; }
    // Buka tab lebih dulu (supaya tidak diblokir), lalu isi alamatnya setelah tiket baru siap.
    const w = window.open('', '_blank');
    if (!w) { toast('Browser memblokir tab baru. Izinkan pop-up untuk portal ini.'); return; }
    try { w.opener = null; w.document.title = app.nama; w.document.body.textContent = 'Membuka ' + app.nama + '…'; } catch (e) { /* abaikan */ }
    const r = await alamatSekali(app);
    if (!r.ok) { w.close(); if (r.pesan) toast(r.pesan); return; }
    w.location.replace(r.url);
  }

  function muatUlangAktif() {
    const b = S.aktif && S.bingkai[S.aktif];
    if (b) muatBingkai(b);   // selalu tiket baru
  }

  async function salinLink(id) {
    const tautan = location.origin + location.pathname + '?app=' + encodeURIComponent(id);   // tanpa tiket
    let ok = false;
    try { await navigator.clipboard.writeText(tautan); ok = true; } catch (e) {
      const t = el('textarea', { readonly: true, style: 'position:fixed;opacity:0' });
      t.value = tautan; document.body.append(t); t.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      t.remove();
    }
    toast(ok ? 'Link disalin.' : 'Link: ' + tautan);
  }

  function tampilBeranda(opsi) {
    opsi = opsi || {};
    S.aktif = null;
    $('#pemuat').hidden = true;
    aturMode(false);
    tampilkanBingkai(null);
    $('#layar-portal').classList.remove('ringkas', 'sisi-buka');
    $('#sisi-lipat').setAttribute('aria-expanded', 'true');
    $('#sisi-lipat').setAttribute('aria-label', 'Lipat menu');
    document.title = K.NAMA;
    $('#sapaan').textContent = sapaan();
    tandaiAktif();
    ukurUlangBingkai();
    renderIklan();            // banner/tombol: iklan dipilih acak lagi setiap kali tampil
    muatLencana(false);       // paling sering sekali per menit
    jadwalkanPopup();
  }
  function keBeranda() {
    if (history.state && history.state.app) history.back();
    else tampilBeranda();
  }

  function rapikanBingkai() {
    Object.keys(S.bingkai).forEach((id) => {
      if (cariApp(id)) return;
      tutupBingkai(id);
      if (S.aktif === id) { tampilBeranda(); toast('Akses ke aplikasi itu sudah tidak tersedia.'); }
    });
  }

  /* ===================== Pengumuman (kontrak bagian 6) ===================== */
  const fmtWaktu = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
  });
  function waktu(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? '' : fmtWaktu.format(d) + ' WIB';
  }
  function rentang(p) {
    const m = waktu(p.mulai), s = waktu(p.selesai);
    if (m && s) return m + ' sampai ' + s;
    if (m) return 'Sejak ' + m;
    if (s) return 'Sampai ' + s;
    return '';
  }
  function idDitutup() { return new Set(simpan.ambil(KUNCI.ditutup) || []); }
  function tandaiDitutup(id) {
    const a = simpan.ambil(KUNCI.ditutup) || [];
    if (a.includes(id)) return;
    a.push(id);
    while (a.length > 300) a.shift();
    simpan.taruh(KUNCI.ditutup, a);
  }
  const belumDitutup = () => { const d = idDitutup(); return S.pengumuman.filter((p) => !d.has(p.id)); };

  let antrean = [];
  let totalAntrean = 0;
  function mulaiAntreanPengumuman(daftar) {
    antrean = daftar.slice();
    totalAntrean = antrean.length;
    tampilBerikut();
  }
  function tampilBerikut() {
    const dlg = $('#dlg-umum');
    if (!antrean.length) { totalAntrean = 0; renderPengumumanRingkas(); if (dlg.open) dlg.close(); return; }
    const p = antrean[0];
    const ke = totalAntrean - antrean.length + 1;
    $('#umum-urutan').textContent = totalAntrean > 1 ? 'Pengumuman ' + ke + ' dari ' + totalAntrean : 'Pengumuman';
    $('#umum-judul').textContent = p.judul || '';
    const r = rentang(p);
    $('#umum-waktu').textContent = r;
    $('#umum-waktu').hidden = !r;
    $('#umum-isi').textContent = p.isi || '';
    $('#umum-tutup').textContent = antrean.length > 1 ? 'Tutup dan lanjut' : 'Tutup';
    if (!dlg.open) dlg.showModal();
    $('#umum-tutup').focus();
  }
  function tutupPopup() {
    const p = antrean.shift();
    if (p) tandaiDitutup(p.id);
    tampilBerikut();
  }
  $('#umum-tutup').addEventListener('click', tutupPopup);
  $('#dlg-umum').addEventListener('cancel', (e) => { e.preventDefault(); tutupPopup(); });

  // Tombol 🔔 menampilkan jumlah pengumuman aktif yang BELUM DIBACA (bagian 6).
  function renderPengumumanRingkas() {
    const belum = belumDitutup().length;
    const n = S.pengumuman.length;
    $$('[data-lencana]').forEach((x) => { x.textContent = belum > 9 ? '9+' : String(belum); x.hidden = belum === 0; });
    $('#kepala-umum').setAttribute('aria-label', belum ? 'Pengumuman, ' + belum + ' belum dibaca' : 'Pengumuman');
    const k = $('#kartu-umum');
    if (!n) { k.hidden = true; return; }
    const p = S.pengumuman[0];
    k.replaceChildren(
      svgPakai('i-umum'),
      el('span', null,
        el('strong', { text: belum ? belum + ' pengumuman belum dibaca' : (n > 1 ? n + ' pengumuman aktif' : 'Pengumuman') }),
        el('span', { text: p.judul || '' })
      )
    );
    k.hidden = false;
  }

  function bukaSemuaPengumuman() {
    const isi = $('#semua-isi');
    isi.replaceChildren();
    if (!S.pengumuman.length) {
      isi.append(el('p', { class: 'dialog-teks', text: 'Tidak ada pengumuman yang sedang tayang.' }));
    } else {
      isi.append(el('ul', { class: 'daftar-umum' }, S.pengumuman.map((p) => {
        const r = rentang(p);
        return el('li', null,
          el('h3', { text: p.judul || '' }),
          r ? el('p', { class: 'umum-waktu', text: r }) : null,
          el('div', { class: 'umum-teks', text: p.isi || '' })
        );
      })));
    }
    $('#dlg-semua').showModal();
    S.pengumuman.forEach((p) => tandaiDitutup(p.id));   // sudah dibaca semua
    renderPengumumanRingkas();
  }
  $('#semua-tutup').addEventListener('click', () => $('#dlg-semua').close());
  ['#sisi-umum', '#kepala-umum', '#kartu-umum'].forEach((s) => $(s).addEventListener('click', bukaSemuaPengumuman));

  /* ===================== Keluar ===================== */
  function bukaKeluar() {
    const u = S.pengguna || {};
    $('#keluar-siapa').textContent = (u.nama || '') + (u.hp ? ' (' + u.hp + ')' : '');
    $('#dlg-keluar').showModal();
  }
  ['#sisi-keluar', '#kepala-akun'].forEach((s) => $(s).addEventListener('click', bukaKeluar));
  $$('[data-keluar]').forEach((b) => b.addEventListener('click', async () => {
    const pilih = b.dataset.keluar;
    if (pilih === 'batal') { $('#dlg-keluar').close(); return; }
    $$('[data-keluar]').forEach((x) => { x.disabled = true; });
    const sesi = S.sesi;
    const r = sesi ? await hub('keluar', pilih === 'semua' ? { sesi, semua: true } : { sesi }) : { ok: true };
    $$('[data-keluar]').forEach((x) => { x.disabled = false; });
    bersihkanLokal();
    tampilLogin();
    if (!r.ok && r.kode !== 'SESI_HABIS') toast(r.pesan);
    else if (pilih === 'semua') toast('Anda sudah keluar dari semua perangkat.');
  }));

  /* ===================== Muat ulang data (kontrak 5.4) ===================== */
  async function muatData(alasan) {
    if (!S.sesi) return false;
    if (S.sedangMuat) return S.sedangMuat;
    S.sedangMuat = (async () => {
      const r = await hub('portal', { sesi: S.sesi });
      if (r.ok) {
        terapkanPaket(r);
        jadwalkanPopup();
        if (alasan !== 'awal') muatLencana(alasan === 'berkala');
        return true;
      }
      if (r.kode === 'SESI_HABIS') { sesiHabis(r.pesan); return false; }
      if (alasan === 'awal' && !S.pengguna) tampilAwal(r.pesan, true);
      else if (alasan !== 'berkala') toast(r.pesan);
      return false;
    })();
    try { return await S.sedangMuat; } finally { S.sedangMuat = null; }
  }

  setInterval(() => {
    if (document.visibilityState === 'visible') muatData('berkala');
  }, Math.max(1, Number(K.MUAT_ULANG_MENIT) || 15) * 60000);

  function saatKembali() {
    if (document.visibilityState !== 'visible' || !S.sesi) return;
    ukurUlangBingkai();
    if (Date.now() - S.terakhirMuat > 30000) muatData('kembali');
    jadwalkanPopup();
  }
  document.addEventListener('visibilitychange', saatKembali);
  window.addEventListener('pageshow', (e) => { if (e.persisted) saatKembali(); });
  window.addEventListener('online', () => { if (S.sesi && Date.now() - S.terakhirMuat > 30000) muatData('kembali'); });

  /* ===================== Navigasi ===================== */
  $('#menu-beranda').addEventListener('click', keBeranda);
  $('#app-kembali').addEventListener('click', (e) => {
    e.currentTarget.blur();
    setTimeout(keBeranda, 150);
  });
  $('#app-muat').addEventListener('click', muatUlangAktif);
  $('#app-tab').addEventListener('click', () => { if (S.aktif) bukaTabBaru(S.aktif); });
  $('#app-salin').addEventListener('click', () => { if (S.aktif) salinLink(S.aktif); });
  $('#sisi-lipat').addEventListener('click', () => {
    const p = $('#layar-portal');
    let terbuka;
    if (p.classList.contains('ringkas')) { p.classList.toggle('sisi-buka'); terbuka = p.classList.contains('sisi-buka'); }
    else { p.classList.add('ringkas'); terbuka = false; }
    $('#sisi-lipat').setAttribute('aria-expanded', String(terbuka));
    $('#sisi-lipat').setAttribute('aria-label', terbuka ? 'Lipat menu' : 'Buka menu');
  });
  window.addEventListener('popstate', (e) => {
    if (!S.sesi) return;
    const id = e.state && e.state.app;
    if (id && cariApp(id)) bukaApp(id, { tanpaRiwayat: true });
    else tampilBeranda();
  });

  // Tautan langsung: ?app=<id>[&param lain] atau #<id>
  function bacaTautanAwal() {
    const q = new URLSearchParams(location.search);
    let id = q.get('app');
    if (q.get('lanjut') === 'pasang') {   // hanya halaman milik portal sendiri
      const slot = q.get('slot');
      S.lanjut = 'pasang-iklan.html' + (slot ? '?slot=' + encodeURIComponent(slot) : '');
    }
    q.delete('lanjut');
    q.delete('slot');
    q.delete('app');
    q.delete('tiket');
    q.delete('diagnosa');
    if (!id && location.hash.length > 1) { try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { id = null; } }
    if (id) S.tautanAwal = { id, extra: q.toString() };
    if (location.search || location.hash) history.replaceState(null, '', location.pathname);
  }
  function bukaTautanAwal() {
    const t = S.tautanAwal;
    S.tautanAwal = null;
    if (!t) return;
    if (!cariApp(t.id)) { toast('Aplikasi pada link itu tidak tersedia untuk akun Anda.'); return; }
    bukaApp(t.id, { extra: t.extra, otomatis: true });
  }

  /* ===================== Lencana (bagian 7) ===================== */
  let terakhirLencana = 0;
  let sedangLencana = false;
  async function muatLencana(paksa) {
    if (!S.sesi) return;
    if (!S.aplikasi.some((a) => a.lencana === true)) { S.lencana = {}; renderLencana(); return; }
    if (sedangLencana || (!paksa && Date.now() - terakhirLencana < 60000)) return;
    sedangLencana = true;
    terakhirLencana = Date.now();
    const r = await hub('lencana', { sesi: S.sesi });
    sedangLencana = false;
    if (r.ok && r.lencana && typeof r.lencana === 'object') { S.lencana = r.lencana; renderLencana(); }
    else if (r.kode === 'SESI_HABIS') sesiHabis(r.pesan);
    // galat lain: diam saja, lencana lama tetap (bagian 7.1)
  }
  function renderLencana() {
    $$('[data-app]').forEach((tombol) => {
      const badge = tombol.querySelector('.lencana-app');
      if (!badge) return;
      const app = cariApp(tombol.dataset.app);
      const n = app && app.lencana === true ? Math.floor(Number(S.lencana[app.id]) || 0) : 0;
      badge.textContent = n > 9 ? '9+' : (n > 0 ? String(n) : '');
      badge.hidden = n <= 0;
      if (tombol.classList.contains('ubin') && app) {
        tombol.setAttribute('aria-label', app.nama + (diTabBaru(app) ? ' (dibuka di tab baru)' : '') + (n > 0 ? ', ' + n + ' perlu ditindaklanjuti' : ''));
      }
    });
  }

  /* ===================== Iklan (bagian 8) ===================== */
  function rapikanIklan(x) {
    const d = (x && typeof x === 'object') ? x : {};
    const slot = (Array.isArray(d.slot) ? d.slot : []).filter((s) => s && s.id && (!s.tempat || s.tempat === 'portal'));
    const ids = new Set(slot.map((s) => s.id));
    const iklan = (Array.isArray(d.iklan) ? d.iklan : []).filter((i) => i && i.id && ids.has(i.slot));
    return { halamanPesan: typeof d.halamanPesan === 'string' ? d.halamanPesan : '', slot, iklan };
  }
  // Untuk satu slot: iklan acak, atau kartu "Space ini disewakan" bila kosong dan diizinkan, atau null.
  function isiSlot(slot) {
    const daftar = S.iklan.iklan.filter((i) => i.slot === slot.id);
    if (daftar.length) return { slot, iklan: IklanUI.pilihAcak(daftar) };
    return slot.tampilkanSaatKosong ? { slot, iklan: null } : null;
  }
  function pilihIklan(jenis) {
    const pilihan = S.iklan.slot.filter((s) => s.jenis === jenis).map(isiSlot).filter(Boolean);
    return IklanUI.pilihAcak(pilihan);
  }

  function renderIklan() {
    // Banner di beranda (bisa ditutup)
    const wb = $('#iklan-banner');
    wb.replaceChildren();
    S.iklan.slot.filter((s) => s.jenis === 'banner' && !S.bannerDitutup.has(s.id)).forEach((slot) => {
      const p = isiSlot(slot);
      if (!p) return;
      wb.append(IklanUI.kartu({
        jenis: 'banner', iklan: p.iklan, slot, halamanPesan: S.iklan.halamanPesan,
        onTutup: () => { S.bannerDitutup.add(slot.id); renderIklan(); }
      }));
    });
    // Tombol kecil mengambang
    const wt = $('#iklan-tombol');
    wt.replaceChildren();
    S.iklan.slot.filter((s) => s.jenis === 'tombol').forEach((slot) => {
      const p = isiSlot(slot);
      if (!p) return;
      wt.append(IklanUI.tombolMengambang({ iklan: p.iklan, onKetuk: () => bukaKartuIklan(p, false) }));
    });
    $('#beranda').classList.toggle('ada-tombol-iklan', wt.childElementCount > 0);
  }

  // Satu kartu iklan di jendela (dipakai pop-up dan detail tombol).
  function bukaKartuIklan(p, catatPopup) {
    if (catatPopup) catatIklanPopup(p.slot.id);
    $('#dlg-iklan-isi').replaceChildren(IklanUI.kartu({ jenis: 'popup', iklan: p.iklan, slot: p.slot, halamanPesan: S.iklan.halamanPesan }));
    $('#dlg-iklan').showModal();
  }
  $('#iklan-tutup').addEventListener('click', () => $('#dlg-iklan').close());
  $('#iklan-silang').addEventListener('click', () => $('#dlg-iklan').close());

  // Catatan waktu pop-up per slot di localStorage; bila tidak tersedia, paling banyak sekali per pembukaan halaman.
  const penyimpananAda = (() => { try { localStorage.setItem('portal.uji', '1'); localStorage.removeItem('portal.uji'); return true; } catch (e) { return false; } })();
  let popupIklanHalamanIni = false;
  function catatIklanPopup(idSlot) {
    popupIklanHalamanIni = true;
    if (!penyimpananAda) return;
    const m = simpan.ambil(KUNCI.iklanPopup) || {};
    m[idSlot] = Date.now();
    simpan.taruh(KUNCI.iklanPopup, m);
  }
  function iklanPopupSiap() {
    if (!penyimpananAda && popupIklanHalamanIni) return null;
    const m = (penyimpananAda && simpan.ambil(KUNCI.iklanPopup)) || {};
    const siap = S.iklan.slot.filter((s) => {
      if (s.jenis !== 'popup' || !IklanUI.dalamJamTayang(s.jamTayang)) return false;
      const selang = Math.max(30, Number(s.selangMenit) || 120) * 60000;
      return Date.now() - (Number(m[s.id]) || 0) >= selang;
    }).map(isiSlot).filter(Boolean);
    return IklanUI.pilihAcak(siap);
  }

  function bukaDaftarIklan() {
    const isi = $('#daftar-iklan-isi');
    isi.replaceChildren();
    const daftar = S.iklan.iklan;
    if (!daftar.length) isi.append(el('p', { class: 'dialog-teks', text: 'Belum ada iklan yang sedang tayang.' }));
    daftar.forEach((i) => {
      const slot = S.iklan.slot.find((s) => s.id === i.slot);
      isi.append(IklanUI.kartu({ jenis: 'popup', iklan: i, slot, halamanPesan: S.iklan.halamanPesan }));
    });
    isi.append(el('p', { class: 'daftar-iklan-pasang' },
      'Punya usaha? ',
      el('a', { href: IklanUI.urlPesan(S.iklan.halamanPesan), target: '_blank', rel: 'noopener noreferrer', text: 'Pasang iklan di sini' })));
    $('#dlg-daftar-iklan').showModal();
  }
  $('#daftar-iklan-tutup').addEventListener('click', () => $('#dlg-daftar-iklan').close());
  ['#kepala-iklan', '#sisi-iklan'].forEach((x) => $(x).addEventListener('click', bukaDaftarIklan));

  /* ===================== Satu pop-up sekaligus (bagian 5.4) =====================
   * Urutan: pengumuman belum dibaca → ajakan instal → iklan pop-up.
   * Pop-up berikutnya baru tampil setelah jendela sebelumnya ditutup.
   * Ajakan instal dan iklan pop-up hanya muncul di beranda, tidak menyela aplikasi yang sedang dipakai.
   */
  let timerPopup = null;
  function jadwalkanPopup(jeda) {
    clearTimeout(timerPopup);
    timerPopup = setTimeout(jalankanPopup, jeda == null ? 250 : jeda);
  }
  function jalankanPopup() {
    if (!S.sesi || $('#layar-portal').hidden || document.querySelector('dialog[open]')) return;
    const belum = belumDitutup();
    if (belum.length) { mulaiAntreanPengumuman(belum); return; }
    if (S.aktif) return;
    if (bolehAjak()) { tampilAjakan(); return; }
    const iklan = iklanPopupSiap();
    if (iklan) bukaKartuIklan(iklan, true);
  }
  // Setiap jendela ditutup → periksa pop-up berikutnya.
  $$('dialog').forEach((d) => d.addEventListener('close', () => jadwalkanPopup()));

  /* ===================== Instal ke perangkat ===================== */
  const JEDA_AJAKAN = 2 * 3600 * 1000;   // ajakan instal paling sering sekali tiap 2 jam
  let promptPasang = null;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ponsel = iOS || /android|mobile/i.test(navigator.userAgent);
  function sudahTerpasang() {
    return ['standalone', 'fullscreen', 'window-controls-overlay'].some((m) => window.matchMedia('(display-mode: ' + m + ')').matches) ||
      window.navigator.standalone === true || document.referrer.indexOf('android-app://') === 0;
  }
  function isiAjakan() {
    const mode = iOS ? 'ios' : (promptPasang ? 'tombol' : 'manual');
    $('#instal-ios').hidden = mode !== 'ios';
    $('#instal-manual').hidden = mode !== 'manual';
    $('#instal-ya').hidden = mode !== 'tombol';
  }
  function perbaruiTombolInstal() {
    $('#pasang').hidden = !promptPasang || sudahTerpasang();
    if ($('#dlg-instal').open) isiAjakan();
  }
  function bolehAjak() {
    if (!S.sesi || sudahTerpasang() || simpan.ambil(KUNCI.terinstal)) return false;
    if (Date.now() - (Number(simpan.ambil(KUNCI.instalTerakhir)) || 0) < JEDA_AJAKAN) return false;
    return ponsel || !!promptPasang;   // di laptop hanya bila browser bisa menginstal
  }
  function tampilAjakan() {
    simpan.taruh(KUNCI.instalTerakhir, Date.now());
    simpan.hapus('portal.instalNanti');   // sisa versi lama
    simpan.hapus('portal.instalHari');
    isiAjakan();
    $('#dlg-instal').showModal();
  }
  function nantiSaja() {
    if ($('#dlg-instal').open) $('#dlg-instal').close();
  }
  async function jalankanInstal() {
    if (!promptPasang) { isiAjakan(); return; }
    const p = promptPasang;
    promptPasang = null;
    p.prompt();
    let hasil = null;
    try { hasil = await p.userChoice; } catch (e) { /* abaikan */ }
    if ($('#dlg-instal').open) $('#dlg-instal').close();
    perbaruiTombolInstal();
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptPasang = e;
    simpan.hapus(KUNCI.terinstal);   // browser hanya menawarkan instal bila belum terinstal
    perbaruiTombolInstal();
    jadwalkanPopup();
  });
  window.addEventListener('appinstalled', () => {
    simpan.taruh(KUNCI.terinstal, true);
    promptPasang = null;
    if ($('#dlg-instal').open) $('#dlg-instal').close();
    perbaruiTombolInstal();
    toast('Aplikasi terinstal. Buka dari layar utama.');
  });
  $('#pasang').addEventListener('click', jalankanInstal);
  $('#instal-ya').addEventListener('click', jalankanInstal);
  $('#instal-nanti').addEventListener('click', nantiSaja);
  $('#dlg-instal').addEventListener('cancel', (e) => { e.preventDefault(); nantiSaja(); });
  if (iOS && !sudahTerpasang()) $('#petunjuk-ios').hidden = false;

  /* ===================== Mulai ===================== */
  function mulai() {
    document.title = K.NAMA;
    $$('.nama-portal').forEach((x) => { x.textContent = K.NAMA; });
    $('#merek-alamat').textContent = location.host;
    $('#versi').textContent = 'Versi ' + VERSI_KODE;
    bacaTautanAwal();

    const s = simpan.ambil(KUNCI.sesi);
    if (!s || !s.sesi) { tampilLogin(S.lanjut ? 'Masuk dulu untuk memesan iklan.' : '', 'info'); return; }
    if (S.lanjut) { location.href = S.lanjut; return; }
    S.sesi = s.sesi;
    S.sesiBerakhir = s.sesiBerakhir || 0;
    if (S.sesiBerakhir && S.sesiBerakhir + 300 < sekarang()) { sesiHabis(); return; }

    const c = simpan.ambil(KUNCI.paket);
    if (c && c.pengguna) {
      S.pengguna = c.pengguna;
      S.aplikasi = Array.isArray(c.aplikasi) ? c.aplikasi : [];
      S.pengumuman = Array.isArray(c.pengumuman) ? c.pengumuman : [];
      S.iklan = rapikanIklan(c.iklan);
      render();
      tampilPortal();
    } else {
      tampilAwal('Memuat portal…');
    }
    muatData('awal').then((ok) => {
      if (!ok) return;
      tampilPortal();
      bukaTautanAwal();
      jadwalkanPopup();
      muatLencana(true);   // setelah beranda tampil, tanpa menahan beranda
    });
  }

  $('#awal-coba').addEventListener('click', () => { tampilAwal('Memuat portal…'); muatData('awal').then((ok) => { if (ok) { tampilPortal(); bukaTautanAwal(); muatLencana(true); } }); });
  $('#awal-lain').addEventListener('click', () => { bersihkanLokal(); tampilLogin(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  mulai();
})();
