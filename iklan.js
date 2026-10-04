/* KOMPONEN TAMPILAN IKLAN — KONTRAK_INTEGRASI 1.2 bagian 8.
 * Dipakai portal (index.html) dan halaman pesan (pasang-iklan.html),
 * supaya pratinjau pesanan sama persis dengan tampilan aslinya.
 * Semua isi iklan ditampilkan sebagai teks polos, tidak pernah sebagai HTML.
 */
window.IklanUI = (() => {
  'use strict';

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

  const LABEL_JENIS = { loading: 'Layar loading', popup: 'Pop-up', banner: 'Banner', tombol: 'Tombol mengambang' };
  const RASIO_BAWAAN = { loading: '16 / 9', popup: '4 / 3', banner: '3 / 1', tombol: '4 / 3' };

  // Rasio gambar mengikuti ukuran anjuran slot ("1200x400"), supaya pratinjau = tampilan asli.
  function rasio(slot, jenis) {
    const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(String((slot && slot.ukuran) || '').trim());
    if (m && +m[1] > 0 && +m[2] > 0) return m[1] + ' / ' + m[2];
    return RASIO_BAWAAN[jenis] || '16 / 9';
  }

  function urlPesan(halamanPesan, slotId) {
    const dasar = String(halamanPesan || '').trim() || 'pasang-iklan.html';
    if (!slotId) return dasar;
    return dasar + (dasar.includes('?') ? '&' : '?') + 'slot=' + encodeURIComponent(slotId);
  }

  const tautanAman = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
  const gambarAman = (u) => {
    const s = String(u || '');
    return (/^https:\/\//i.test(s) || /^data:image\/(jpeg|png|webp);base64,/i.test(s)) ? s : '';
  };

  // Tautan iklan dan halaman pesan selalu dibuka di tab baru (bagian 8.4).
  function tautanLuar(href, teks, cls) {
    return el('a', { href, target: '_blank', rel: 'noopener noreferrer', class: cls, text: teks });
  }

  function pilihAcak(daftar) {
    return daftar && daftar.length ? daftar[Math.floor(Math.random() * daftar.length)] : null;
  }

  // jamTayang "JJ:MM-JJ:MM" dalam WIB; kosong = sepanjang hari.
  function dalamJamTayang(jam, kini) {
    const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(String(jam || '').trim());
    if (!m) return true;
    const t = kini instanceof Date ? kini : new Date();
    const wib = (t.getUTCHours() * 60 + t.getUTCMinutes() + 7 * 60) % 1440;
    const a = +m[1] * 60 + +m[2];
    const b = +m[3] * 60 + +m[4];
    if (a === b) return true;
    return a < b ? (wib >= a && wib < b) : (wib >= a || wib < b);
  }

  /**
   * Kartu iklan. jenis: 'banner' | 'loading' | 'popup'.
   * iklan = null → kartu "Space ini disewakan".
   */
  function kartu(o) {
    const jenis = o.jenis || 'popup';
    const iklan = o.iklan || null;
    const k = el('article', { class: 'iklan iklan-' + jenis + (iklan ? '' : ' iklan-kosong'), 'aria-label': 'Iklan' });
    const label = el('span', { class: 'iklan-label', text: 'Iklan' });

    if (iklan) {
      const src = gambarAman(iklan.gambar);
      if (src) {
        const g = el('div', { class: 'iklan-gambar' },
          el('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', decoding: 'async' }));
        g.style.aspectRatio = rasio(o.slot, jenis);
        k.append(g);
      }
      const t = tautanAman(iklan.tautan);
      k.append(el('div', { class: 'iklan-teks' },
        label,
        iklan.pengiklan ? el('p', { class: 'iklan-pengiklan', text: iklan.pengiklan }) : null,
        el('p', { class: 'iklan-judul', text: iklan.judul || '' }),
        iklan.teks ? el('p', { class: 'iklan-isi', text: iklan.teks }) : null,
        t ? tautanLuar(t, 'Kunjungi', 'iklan-tautan') : null
      ));
    } else {
      k.append(el('div', { class: 'iklan-teks' },
        label,
        el('p', { class: 'iklan-judul', text: 'Space ini disewakan' }),
        el('p', { class: 'iklan-isi', text: 'Pasang iklan usaha Anda di sini.' }),
        tautanLuar(urlPesan(o.halamanPesan, o.slot && o.slot.id), 'Pasang iklan', 'iklan-tautan')
      ));
    }
    if (o.onTutup) {
      k.append(el('button', { type: 'button', class: 'iklan-tutup', 'aria-label': 'Tutup iklan', onclick: o.onTutup }, '×'));
    }
    return k;
  }

  // Tombol kecil mengambang. Diketuk → kartu detail.
  function tombolMengambang(o) {
    const iklan = o.iklan || null;
    const src = iklan ? gambarAman(iklan.gambar) : '';
    const teks = iklan ? (iklan.pengiklan || iklan.judul || '') : 'Space ini disewakan';
    return el('button', {
      type: 'button', class: 'iklan-tombol' + (iklan ? '' : ' iklan-kosong'),
      'aria-label': 'Iklan: ' + teks, onclick: o.onKetuk
    },
      src ? el('img', { src, alt: '', referrerpolicy: 'no-referrer' }) : null,
      el('span', { class: 'iklan-label', text: 'Iklan' }),
      el('span', { class: 'iklan-tombol-teks', text: teks })
    );
  }

  return { el, kartu, tombolMengambang, pilihAcak, dalamJamTayang, rasio, urlPesan, tautanAman, LABEL_JENIS };
})();
