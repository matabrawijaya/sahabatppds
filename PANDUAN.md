# Portal Sahabat PPDS — Panduan singkat

Portal ini mengikuti **KONTRAK_INTEGRASI.md versi 1.2** (bagian 5–8). Semua data (aplikasi, peran, pengumuman) diambil dari Hub, jadi file di sini jarang perlu diubah.

## File
| File | Isi |
|---|---|
| `config.js` | **Satu-satunya file yang perlu diisi**: alamat Hub, nama portal |
| `index.html`, `style.css`, `app.js` | Tampilan dan logika portal |
| `iklan.js` | Tampilan iklan, dipakai portal dan halaman pesan iklan |
| `pasang-iklan.html`, `pasang-iklan.js` | Halaman pemesanan iklan |
| `sw.js`, `manifest.webmanifest`, `*.png` | Supaya bisa dipasang di HP |

Repo ini publik. **Jangan menaruh kunci, PIN, atau rahasia apa pun di file mana pun.**

## Pemasangan
1. Buka `config.js`, isi `HUB_URL` dengan alamat web app Hub (dari Hub → Portal → Login & tiket).
2. Unggah semua file ke repo GitHub (Add file → Upload files), lalu aktifkan Settings → Pages.
3. Di Hub → Portal → Aplikasi: isi URL `/exec` tiap aplikasi, ikon (emoji, atau alamat gambar `https://…`), dan urutan.

## Yang terjadi di portal
- **Masuk:** nomor HP → PIN bila diminta → PIN baru bila PIN masih sementara. Hanya sesi yang disimpan di perangkat, PIN tidak pernah disimpan.
- **Membuka aplikasi:** setiap kali buka memakai tiket baru. Aplikasi yang sudah terbuka tidak dimuat ulang saat pindah aplikasi.
- **Hub Kontak:** selalu dibuka di tab baru, tanpa tiket. Pengguna login lagi di Hub.
- **Salin link:** menghasilkan link portal (`…/?app=<id>`), tanpa tiket.
- **Aplikasi yang belum mengizinkan tampil di dalam portal:** setelah ±15 detik (atau lebih cepat bila terdeteksi), muncul tombol "Buka di tab baru".
- **Pengumuman:** muncul sebagai pop-up saat portal dibuka. Yang sudah ditutup tidak muncul lagi di perangkat itu. Semua pengumuman aktif bisa dibaca ulang lewat tombol pengumuman.
- **Data dari Hub** dimuat ulang saat portal dibuka kembali dan tiap ±15 menit.
- **Aplikasi yang tetap hidup** dibatasi 3 yang terakhir dibuka, supaya HP tidak kehabisan memori. Aplikasi yang lebih lama dimuat ulang saat dibuka lagi. Batas ini bisa diubah dengan menambah `MAKS_APP_HIDUP: 3` di `config.js`.
- **Ajakan instal** muncul setelah login di perangkat yang belum menginstal. Muncul paling sering sekali tiap 2 jam, termasuk saat portal dibuka kembali (asal sedang di beranda). Tidak muncul bila portal dibuka sebagai aplikasi terinstal. Di iPhone, isinya petunjuk Bagikan → Tambahkan ke Layar Utama.

- **Lencana:** angka merah di ikon aplikasi (beranda dan sidebar), diambil dari Hub setelah beranda tampil. Di atas 9 tampil `9+`.
- **Iklan:** banner di beranda, tombol kecil mengambang, kartu di layar loading, dan pop-up. Semua berlabel "Iklan" dan berwarna ungu, berbeda dari pengumuman (🔔). Semua iklan yang sedang tayang bisa dilihat lewat tombol Iklan (ikon label).
- **Satu pop-up sekaligus:** pengumuman belum dibaca → ajakan instal → iklan pop-up. Ajakan instal dan iklan pop-up hanya muncul di beranda.
- **Halaman pesan iklan:** `pasang-iklan.html`. Isi alamat lengkapnya di Hub → Iklan → alamat halaman pesan.

## Mengubah portal
Edit file di GitHub (ikon pensil → Commit). Bila mengubah `index.html`, `style.css`, `app.js`, atau `config.js`, naikkan juga angka di `sw.js` (mis. `portal-v3` → `portal-v4`).
