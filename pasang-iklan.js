/* HALAMAN PASANG IKLAN — KONTRAK_INTEGRASI 1.2 bagian 8.6.
 * Memakai sesi portal yang sama (localStorage). Tidak ada rahasia di file ini.
 */
(() => {
  'use strict';

  const K = window.PORTAL_KONFIG || {};
  const U = window.IklanUI;
  const el = U.el;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const JENIS_WAJIB_GAMBAR = ['loading', 'popup', 'banner'];
  const BATAS = { pengiklan: 40, judul: 60, teks: 300, tautan: 300 };
  const MAKS_BYTE = 1000000;     // gambar setelah didekode maks. 1 MB
  const SISI_MAKS = 1600;        // sisi terpanjang maks. 1600 px

  let sesi = null;
  let data = { slot: [], penuh: {}, ketentuan: '' };
  let slotDipilih = null;
  let gambar = '';
  let pratinjauTimer = null;

  /* ---------- Utilitas ---------- */
  function ambilSesi() {
    try { const v = JSON.parse(localStorage.getItem('portal.sesi') || 'null'); return v && v.sesi ? v.sesi : null; } catch (e) { return null; }
  }
  function hapusSesi() {
    try { localStorage.removeItem('portal.sesi'); localStorage.removeItem('portal.paket'); } catch (e) { /* abaikan */ }
  }
  async function hub(aksi, isi) {
    if (!K.HUB_URL || /GANTI_/.test(K.HUB_URL)) return { ok: false, kode: 'KONFIG', pesan: 'Alamat Hub belum diisi di config.js.' };
    try {
      const r = await fetch(K.HUB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ aksi }, isi || {}))
      });
      const j = await r.json();
      if (j && typeof j === 'object' && typeof j.ok === 'boolean') return j;
      return { ok: false, kode: 'GALAT', pesan: 'Balasan Hub tidak dikenali. Coba lagi sebentar lagi.' };
    } catch (e) {
      return { ok: false, kode: 'JARINGAN', pesan: navigator.onLine === false ? 'Tidak ada koneksi internet. Sambungkan, lalu coba lagi.' : 'Hub tidak bisa dihubungi. Coba lagi sebentar lagi.' };
    }
  }
  let timerToast = null;
  function toast(p) {
    const t = $('#toast'); t.textContent = p; t.hidden = false;
    clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; }, 4000);
  }
  const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const hariWIB = (geser) => new Date(Date.now() + 7 * 3600e3 + (geser || 0) * 86400e3).toISOString().slice(0, 10);
  function tambahHari(ymd, n) { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const fmtTgl = (ymd) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return '';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(ymd + 'T00:00:00Z'));
  };

  function tampil(bagian) {
    $('#pi-memuat').hidden = bagian !== 'memuat';
    $('#pi-masuk').hidden = bagian !== 'masuk';
    $('#pi-utama').hidden = bagian !== 'utama';
  }
  function perluMasuk(pesan) {
    hapusSesi();   // supaya portal tidak langsung mengembalikan ke sini dengan sesi yang sudah habis
    const slot = new URLSearchParams(location.search).get('slot');
    $('#pi-tautan-masuk').href = './?lanjut=pasang' + (slot ? '&slot=' + encodeURIComponent(slot) : '');
    if (pesan) $('#pi-masuk-pesan').textContent = pesan;
    tampil('masuk');
  }

  /* ---------- Muat slot ---------- */
  async function muat() {
    sesi = ambilSesi();
    if (!sesi) { perluMasuk(); return; }
    tampil('memuat');
    $('#pi-memuat-teks').textContent = 'Memuat tempat iklan…';
    $('#pi-coba').hidden = true;
    const r = await hub('iklanSlot', { sesi });
    if (!r.ok) {
      if (r.kode === 'SESI_HABIS') { perluMasuk(r.pesan); return; }
      $('#pi-memuat-teks').textContent = r.pesan;
      $('#pi-coba').hidden = false;
      document.querySelector('#pi-memuat .putar').hidden = true;
      return;
    }
    document.querySelector('#pi-memuat .putar').hidden = false;
    data = {
      slot: Array.isArray(r.slot) ? r.slot.filter((s) => s && s.id) : [],
      penuh: (r.penuh && typeof r.penuh === 'object') ? r.penuh : {},
      ketentuan: typeof r.ketentuan === 'string' ? r.ketentuan : ''
    };
    renderSlot();
    tampil('utama');
  }
  $('#pi-coba').addEventListener('click', muat);

  function keteranganSlot(s) {
    const baris = [U.LABEL_JENIS[s.jenis] + ' di ' + (s.tempatNama || s.tempat || 'Portal')];
    const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(String(s.ukuran || '').trim());
    if (m) baris.push('Gambar anjuran ' + m[1] + ' × ' + m[2] + ' piksel');
    if (s.jenis === 'popup') {
      const jam = String(s.jamTayang || '').trim();
      baris.push('Muncul paling sering tiap ' + Math.max(30, Number(s.selangMenit) || 120) + ' menit' + (jam ? ', pukul ' + jam.replace(/:/g, '.') + ' WIB' : ''));
    }
    return baris;
  }

  function renderSlot() {
    const w = $('#pi-slot');
    w.replaceChildren();
    if (!data.slot.length) {
      w.append(el('p', { class: 'bantu', text: 'Belum ada tempat iklan yang dibuka. Coba lagi nanti.' }));
      $('#pi-kirim').disabled = true;
      return;
    }
    $('#pi-kirim').disabled = false;
    const awal = new URLSearchParams(location.search).get('slot');
    data.slot.forEach((s) => {
      const r = el('input', { type: 'radio', name: 'slot', value: s.id, class: 'pi-radio' });
      r.addEventListener('change', () => pilihSlot(s.id));
      w.append(el('label', { class: 'pi-slot-item' },
        r,
        el('span', { class: 'pi-slot-teks' },
          el('span', { class: 'pi-slot-nama', text: s.nama || s.id }),
          keteranganSlot(s).map((t) => el('span', { class: 'pi-slot-ket', text: t })),
          el('span', { class: 'pi-slot-harga', text: rupiah(s.hargaPerHari) + ' per hari' })
        )
      ));
    });
    if (awal) {
      if (data.slot.some((s) => s.id === awal)) pilihSlot(awal, true);
      else galatIsian('slot', 'Tempat iklan pada link sudah tidak tersedia. Pilih tempat lain.');
    }
  }

  function pilihSlot(id, setelRadio) {
    slotDipilih = data.slot.find((s) => s.id === id) || null;
    if (setelRadio) $$('input[name="slot"]').forEach((r) => { r.checked = r.value === id; });
    galatIsian('slot', '');
    const wajib = slotDipilih && JENIS_WAJIB_GAMBAR.includes(slotDipilih.jenis);
    $('#o-gambar').textContent = slotDipilih ? (wajib ? '(wajib)' : '(boleh kosong)') : '';
    perbarui();
  }

  /* ---------- Gambar: diperkecil di browser, isi berkas pasti sesuai jenisnya ---------- */
  function bacaGambar(file) {
    return new Promise((ok, gagal) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error('Gambar tidak bisa dibaca. Pilih berkas gambar lain.')); };
      img.src = url;
    });
  }
  async function olahGambar(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Pilih gambar JPG, PNG, atau WebP.');
    const img = await bacaGambar(file);
    let skala = Math.min(1, SISI_MAKS / Math.max(img.naturalWidth, img.naturalHeight));
    for (let ulang = 0; ulang < 8; ulang++) {
      const w = Math.max(1, Math.round(img.naturalWidth * skala));
      const h = Math.max(1, Math.round(img.naturalHeight * skala));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#FFFFFF';   // latar putih untuk gambar transparan
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      for (const q of [0.86, 0.78, 0.7, 0.6]) {
        const d = c.toDataURL('image/jpeg', q);
        const byte = Math.floor((d.length - d.indexOf(',') - 1) * 3 / 4);
        if (d.startsWith('data:image/jpeg;base64,') && byte <= MAKS_BYTE) return { data: d, w, h, byte };
      }
      skala *= 0.8;
    }
    throw new Error('Gambar terlalu besar. Pilih gambar lain.');
  }
  $('#f-gambar').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    galatIsian('gambar', '');
    $('#pi-gambar-ket').textContent = 'Menyiapkan gambar…';
    $('#pi-gambar-info').hidden = false;
    try {
      const g = await olahGambar(f);
      gambar = g.data;
      $('#pi-gambar-ket').textContent = 'Gambar siap: ' + g.w + ' × ' + g.h + ' piksel, ' + Math.ceil(g.byte / 1024) + ' KB.';
    } catch (err) {
      gambar = '';
      $('#pi-gambar-info').hidden = true;
      galatIsian('gambar', err.message);
    }
    e.target.value = '';
    perbarui();
  });
  $('#pi-hapus-gambar').addEventListener('click', () => { gambar = ''; $('#pi-gambar-info').hidden = true; perbarui(); });

  /* ---------- Isian & pemeriksaan (batas di bagian 8.6) ---------- */
  const nilai = (id) => $('#f-' + id).value.trim();
  function galatIsian(nama, pesan) {
    const g = $('#g-' + nama);
    if (!g) return;
    g.textContent = pesan || '';
    g.hidden = !pesan;
    const f = $('#f-' + nama);
    if (f) { if (pesan) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); }
  }
  function tanggalPenuh(mulai, hari) {
    if (!slotDipilih) return [];
    const penuh = new Set(Array.isArray(data.penuh[slotDipilih.id]) ? data.penuh[slotDipilih.id] : []);
    const hasil = [];
    for (let i = 0; i < hari && i < 90; i++) { const t = tambahHari(mulai, i); if (penuh.has(t)) hasil.push(t); }
    return hasil;
  }
  function periksa() {
    const g = {};
    if (!slotDipilih) g.slot = 'Pilih tempat iklan.';
    const pengiklan = nilai('pengiklan'), judul = nilai('judul'), teks = nilai('teks'), tautan = nilai('tautan');
    if (!pengiklan) g.pengiklan = 'Nama usaha wajib diisi.';
    else if (pengiklan.length > BATAS.pengiklan) g.pengiklan = 'Nama usaha maks. 40 karakter.';
    if (!judul) g.judul = 'Judul wajib diisi.';
    else if (judul.length > BATAS.judul) g.judul = 'Judul maks. 60 karakter.';
    if (teks.length > BATAS.teks) g.teks = 'Keterangan maks. 300 karakter.';
    if (tautan) {
      if (!/^https:\/\//i.test(tautan)) g.tautan = 'Tautan harus diawali https://';
      else if (tautan.length > BATAS.tautan) g.tautan = 'Tautan maks. 300 karakter.';
    }
    if (slotDipilih && JENIS_WAJIB_GAMBAR.includes(slotDipilih.jenis) && !gambar) g.gambar = 'Gambar wajib untuk ' + U.LABEL_JENIS[slotDipilih.jenis].toLowerCase() + '.';
    const mulai = $('#f-mulai').value;
    const besok = hariWIB(1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai)) g.mulai = 'Pilih tanggal mulai.';
    else if (mulai < besok) g.mulai = 'Tanggal mulai paling cepat besok (' + fmtTgl(besok) + ').';
    const hariTeks = $('#f-hari').value.trim();
    const hari = Number(hariTeks);
    if (!/^\d+$/.test(hariTeks) || hari < 1 || hari > 90) g.hari = 'Lama tayang 1–90 hari.';
    if (!g.mulai && !g.hari && slotDipilih) {
      const p = tanggalPenuh(mulai, hari);
      if (p.length) g.mulai = 'Tempat ini sudah penuh pada ' + p.slice(0, 5).map(fmtTgl).join(', ') + (p.length > 5 ? ' dan ' + (p.length - 5) + ' tanggal lain' : '') + '. Pilih tanggal lain.';
    }
    return { g, isi: { pengiklan, judul, teks, tautan, mulai, hari } };
  }

  function perbarui() {
    ['pengiklan', 'judul', 'teks'].forEach((n) => { $('#h-' + n).textContent = $('#f-' + n).value.length + '/' + BATAS[n]; });
    const mulai = $('#f-mulai').value;
    const hari = Number($('#f-hari').value);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(mulai) && Number.isInteger(hari) && hari >= 1 && hari <= 90;
    $('#pi-rentang').textContent = valid ? 'Tayang ' + fmtTgl(mulai) + ' sampai ' + fmtTgl(tambahHari(mulai, hari - 1)) + '.' : '';
    if (slotDipilih && valid) {
      $('#pi-harga').textContent = rupiah((Number(slotDipilih.hargaPerHari) || 0) * hari);
      $('#pi-harga-ket').textContent = rupiah(slotDipilih.hargaPerHari) + ' × ' + hari + ' hari. Harga final ditentukan admin iklan.';
    } else {
      $('#pi-harga').textContent = '–';
      $('#pi-harga-ket').textContent = 'Harga final ditentukan admin iklan.';
    }
    // Peringatan tanggal penuh langsung terlihat
    if (valid && slotDipilih) {
      const p = tanggalPenuh(mulai, hari);
      galatIsian('mulai', p.length ? 'Tempat ini sudah penuh pada ' + p.slice(0, 5).map(fmtTgl).join(', ') + (p.length > 5 ? ' dan ' + (p.length - 5) + ' tanggal lain' : '') + '. Pilih tanggal lain.' : '');
    }
    clearTimeout(pratinjauTimer);
    pratinjauTimer = setTimeout(renderPratinjau, 120);
  }
  ['pengiklan', 'judul', 'teks', 'tautan', 'mulai', 'hari'].forEach((n) => {
    $('#f-' + n).addEventListener('input', () => { if (n !== 'mulai') galatIsian(n, ''); perbarui(); });
  });

  /* ---------- Pratinjau: komponen yang sama dengan tampilan asli ---------- */
  function renderPratinjau() {
    const w = $('#pi-pratinjau');
    w.replaceChildren();
    if (!slotDipilih) { $('#pi-pratinjau-ket').textContent = 'Pilih tempat iklan untuk melihat pratinjau.'; return; }
    const s = slotDipilih;
    const tautan = nilai('tautan');
    const draf = {
      id: 'pratinjau',
      pengiklan: nilai('pengiklan') || 'Nama usaha',
      judul: nilai('judul') || 'Judul iklan Anda',
      teks: nilai('teks'),
      tautan: /^https:\/\//i.test(tautan) ? tautan : '',
      gambar
    };
    const ket = {
      banner: 'Tampil sebagai pita di beranda ' + (s.tempatNama || 'Portal') + ', dan bisa ditutup pengguna.',
      loading: 'Tampil di bawah tanda memuat, saat aplikasi sedang dibuka.',
      popup: 'Tampil sebagai jendela di tengah layar, dengan tombol tutup.',
      tombol: 'Tampil sebagai tombol kecil mengambang. Saat diketuk, kartu di bawahnya muncul.'
    };
    $('#pi-pratinjau-ket').textContent = ket[s.jenis] || '';
    const kartu = (jenis, opsi) => U.kartu(Object.assign({ jenis, iklan: draf, slot: s, halamanPesan: '' }, opsi || {}));
    if (s.jenis === 'banner') {
      w.append(el('div', { class: 'pi-mock pi-mock-beranda' }, kartu('banner', { onTutup: () => {} })));
    } else if (s.jenis === 'loading') {
      w.append(el('div', { class: 'pi-mock pi-mock-pemuat' },
        el('div', { class: 'putar', 'aria-hidden': 'true' }),
        el('p', { text: 'Memuat aplikasi…' }),
        el('div', { class: 'pemuat-iklan' }, kartu('loading'))));
    } else if (s.jenis === 'popup') {
      w.append(el('div', { class: 'pi-mock pi-mock-latar' }, jendela(kartu('popup'))));
    } else if (s.jenis === 'tombol') {
      w.append(el('div', { class: 'pi-mock pi-mock-tombol' }, U.tombolMengambang({ iklan: draf, onKetuk: () => {} })));
      w.append(el('div', { class: 'pi-mock pi-mock-latar' }, jendela(kartu('popup'))));
    }
    $$('#pi-pratinjau a').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
  }
  function jendela(isi) {
    return el('div', { class: 'dialog dialog-iklan jendela-iklan pi-mock-jendela' },
      el('span', { class: 'tombol-ikon dialog-silang', 'aria-hidden': 'true', text: '×' }),
      el('div', { class: 'dialog-isi' }, isi),
      el('div', { class: 'dialog-aksi' }, el('span', { class: 'tombol', text: 'Tutup' })));
  }

  /* ---------- Kirim ---------- */
  $('#pi-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#pi-galat').hidden = true;
    const { g, isi } = periksa();
    ['slot', 'pengiklan', 'judul', 'teks', 'tautan', 'gambar', 'mulai', 'hari'].forEach((n) => galatIsian(n, g[n] || ''));
    const pertama = Object.keys(g)[0];
    if (pertama) {
      const target = $('#f-' + pertama) || $('#pi-slot');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target.focus) target.focus({ preventScroll: true });
      return;
    }
    const kirim = { sesi, slot: slotDipilih.id, pengiklan: isi.pengiklan, judul: isi.judul, teks: isi.teks, gambar: gambar || '', mulai: isi.mulai, hari: isi.hari };
    if (isi.tautan) kirim.tautan = isi.tautan;
    const b = $('#pi-kirim');
    b.disabled = true; b.textContent = 'Mengirim…';
    const r = await hub('iklanPesan', kirim);
    b.disabled = false; b.textContent = 'Kirim pesanan';
    if (r.ok) { selesai(r.pesanan); return; }
    if (r.kode === 'SESI_HABIS') { perluMasuk(r.pesan); return; }
    $('#pi-galat').textContent = r.pesan;   // pesan Hub apa adanya (MATERI_TIDAK_SAH menyebut bagian yang salah)
    $('#pi-galat').hidden = false;
    $('#pi-galat').scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (r.kode === 'SLOT_PENUH') {   // perbarui daftar tanggal penuh
      const s = await hub('iklanSlot', { sesi });
      if (s.ok && s.penuh) { data.penuh = s.penuh; perbarui(); }
    }
  });

  function selesai(pesanan) {
    $('#pi-form').hidden = true;
    $('#pi-selesai').hidden = false;
    $('#pi-selesai-pesanan').replaceChildren(pesanan ? kartuPesanan(pesanan) : el('span'));
    $('#pi-ketentuan-selesai').textContent = data.ketentuan || 'Admin iklan akan menghubungi Anda untuk pembayaran.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function kosongkanForm() {
    ['pengiklan', 'judul', 'teks', 'tautan'].forEach((n) => { $('#f-' + n).value = ''; galatIsian(n, ''); });
    gambar = '';
    $('#pi-gambar-info').hidden = true;
    $('#f-mulai').value = hariWIB(1);
    $('#f-hari').value = '7';
    perbarui();
  }
  $('#pi-pesan-lagi').addEventListener('click', () => { kosongkanForm(); $('#pi-selesai').hidden = true; $('#pi-form').hidden = false; window.scrollTo({ top: 0 }); });
  $('#pi-lihat-saya').addEventListener('click', () => { kosongkanForm(); $('#pi-selesai').hidden = true; $('#pi-form').hidden = false; pilihTab('saya'); });

  /* ---------- Pesanan saya ---------- */
  const STATUS = {
    menunggu: 'Menunggu persetujuan', ditolak: 'Ditolak', dijadwalkan: 'Dijadwalkan',
    tayang: 'Sedang tayang', selesai: 'Selesai', dibatalkan: 'Dibatalkan'
  };
  function kartuPesanan(p) {
    const tgl = fmtTgl(p.mulai) + (p.selesai ? ' sampai ' + fmtTgl(p.selesai) : '');
    const g = /^https:\/\//i.test(String(p.gambar || '')) ? p.gambar : '';
    return el('article', { class: 'pi-pesanan' },
      g ? el('img', { class: 'pi-pesanan-gambar', src: g, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' }) : null,
      el('div', { class: 'pi-pesanan-teks' },
        el('span', { class: 'pi-status pi-status-' + (p.status || 'menunggu'), text: STATUS[p.status] || p.status || '' }),
        el('h3', { text: p.judul || '' }),
        el('p', { class: 'pi-pesanan-ket', text: (p.pengiklan || '') + (p.slotNama ? ', ' + p.slotNama : '') }),
        el('p', { class: 'pi-pesanan-ket', text: tgl + (p.hari ? ' (' + p.hari + ' hari)' : '') }),
        el('p', { class: 'pi-pesanan-harga', text: (p.status === 'menunggu' ? 'Estimasi ' : 'Harga ') + rupiah(p.harga) }),
        p.catatan ? el('p', { class: 'pi-pesanan-catatan', text: 'Catatan admin: ' + p.catatan }) : null
      )
    );
  }
  async function muatPesananSaya() {
    const w = $('#pi-daftar-saya');
    w.replaceChildren(el('div', { class: 'pi-memuat' }, el('div', { class: 'putar', 'aria-hidden': 'true' }), el('p', { role: 'status', text: 'Memuat pesanan…' })));
    const r = await hub('iklanSaya', { sesi });
    if (!r.ok) {
      if (r.kode === 'SESI_HABIS') { perluMasuk(r.pesan); return; }
      w.replaceChildren(el('p', { class: 'pesan galat', text: r.pesan }));
      return;
    }
    const daftar = Array.isArray(r.pesanan) ? r.pesanan : [];
    w.replaceChildren(daftar.length ? el('div', { class: 'pi-daftar' }, daftar.map(kartuPesanan))
      : el('p', { class: 'bantu', text: 'Anda belum pernah memesan iklan.' }));
    $('#pi-ketentuan-saya').textContent = data.ketentuan;
    $('#pi-ketentuan-saya-wadah').hidden = !data.ketentuan;
  }

  function pilihTab(t) {
    $('#tab-pesan').setAttribute('aria-selected', String(t === 'pesan'));
    $('#tab-saya').setAttribute('aria-selected', String(t === 'saya'));
    $('#panel-pesan').hidden = t !== 'pesan';
    $('#panel-saya').hidden = t !== 'saya';
    if (t === 'saya') muatPesananSaya();
  }
  $('#tab-pesan').addEventListener('click', () => pilihTab('pesan'));
  $('#tab-saya').addEventListener('click', () => pilihTab('saya'));

  /* ---------- Mulai ---------- */
  $('#f-mulai').min = hariWIB(1);
  $('#f-mulai').value = hariWIB(1);
  perbarui();
  muat();
})();
