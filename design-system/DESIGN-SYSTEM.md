# Pontada Modern — Sistem Desain Tetap v1.0.1

Status: acuan desain dikunci sesuai permintaan pengguna, 28 Oktober 2026. Paket ini menetapkan desain untuk implementasi berikutnya; web produksi belum diubah oleh pekerjaan ini.

## Acuan tunggal

Gunakan `assets/acuan-tampilan-modern.png` untuk arah visual dan `tokens.json` untuk nilai implementasi. Apabila ilustrasi konsep berbeda dengan angka dalam token, token menjadi acuan implementasi. Data pada ilustrasi adalah contoh, bukan hasil turnamen sebenarnya. Logo pada ilustrasi adalah versi sebelum penambahan subjudul; gunakan master logo v1.0.1 yang menyertakan PICKLEBALL CLUB sebagai acuan identitas terbaru.

## Logo resmi

Master tunggal: `assets/pontada-logo-master.png` — simbol P hijau dengan bola pickleball lime, disertai tulisan `pontada.` dan subjudul `PICKLEBALL CLUB` di bawahnya. Berkas ini berlatarkan transparan.

- Pakai berkas master yang sama pada seluruh halaman, perangkat, dan rancangan selanjutnya.
- Jangan menggambar atau membuat ulang logo dengan AI, mengetik ulang wordmark, mengubah warna, menghilangkan titik, menambah ikon lain, atau mengganti dengan emoji.
- Pertahankan rasio aslinya. Jangan diregangkan, diputar, dipotong, diberi bayangan atau efek tambahan.
- Tempatkan pada permukaan putih atau sangat terang. Versi logo terbalik untuk latar gelap belum ditetapkan; jangan dibuat otomatis.
- Sisakan ruang kosong di sekelilingnya, sekurang-kurangnya seperempat tinggi simbol. Hindari tulisan/tombol masuk ke ruang ini.
- Ukuran awal elemen gambar: lebar 240 px desktop, 180 px HP; tinggi otomatis. Ruang header menyesuaikan logo, bukan sebaliknya.
- Jika kelak memerlukan ikon aplikasi/favikon, turunkan dari simbol pada master yang sama; jangan menciptakan simbol baru. Turunan harus tercatat dan diperiksa sebelum dipakai.

## Palet tetap

| Peran | Warna | Penggunaan |
|---|---|---|
| Hijau utama | `#15392C` | Tombol utama dan kartu pertandingan aktif |
| Teks utama | `#142B24` | Judul, angka, teks utama |
| Aksen lime | `#D8F5A2` | Tombol pada kartu gelap dan navigasi terpilih |
| Latar halaman | `#F7F9F4` | Kanvas antarmuka |
| Permukaan | `#FFFFFF` | Kartu, header, formulir |
| Teks pendukung | `#4F6258` | Petunjuk dan keterangan yang tetap mudah dibaca |
| Garis | `#D5DFD6` | Pemisah dan batas kontrol |
| Kesalahan | `#A82E2E` | Pesan kesalahan, selalu dengan teks penjelas |
| Fokus | `#326B50` | Penanda keyboard/fokus pada permukaan terang |

Jangan menggunakan teks lime pada putih. Teks tombol lime memakai warna tinta gelap; teks tombol hijau memakai putih. Warna bukan satu-satunya pembeda status. Target kontras teks biasa minimal 4,5:1.

## Huruf dan keterbacaan usia 40+

Satu keluarga huruf: **Manrope**, termasuk judul dan isi. Font lokal dan lisensinya disertakan di `fonts/`. Gunakan berkas ini agar tampilan tidak bergantung pada pengambilan font eksternal.

| Unsur | Ukuran | Ketebalan |
|---|---|---|
| Isi utama | 20 px | 500 |
| Keterangan pendukung | 18 px | 500 |
| Navigasi | 20 px | 650 |
| Label tombol | 20 px | 700 |
| Judul halaman desktop | 40 px | 750 |
| Judul halaman HP | 32 px | 750 |
| Judul bagian | 26 px | 700 |
| Angka skor desktop / HP | 88 / 80 px | 800 |

Tidak ada tulisan antarmuka di bawah 18 px. Baris isi 1,5 kali ukuran huruf. Hindari teks huruf kapital panjang, teks tipis, dan keterangan abu-abu pucat. Konten tidak boleh terpotong pada pembesaran 200%; baris boleh turun agar tetap terbaca.

## Bentuk dan jarak

- Lebar konten maksimum 1280 px; tepi desktop 32 px, HP 20 px.
- Sistem jarak berbasis 8 px. Jarak antar kontrol minimal 12 px.
- Kartu: radius 20 px, ruang dalam 24 px desktop / 20 px HP, bayangan sangat halus.
- Tombol: radius 14 px, tinggi minimal 56 px. Target sentuh minimal 56 × 56 px.
- Ikon adalah pendamping tulisan, bukan pengganti nama tombol. Hanya panah dan tombol tutup yang boleh ringkas, tetap berlabel aksesibel.
- HP menggunakan susunan vertikal; lebar halaman tidak boleh bergeser horizontal. Klasemen utama berupa daftar sederhana.
- Tidak menambahkan deretan statistik kecil, grafik, dekorasi besar, atau menu samping padat.

## Susunan halaman tetap

### Beranda

Header logo dan tombol Masuk Pengelola. Tampilkan pertandingan aktif paling menonjol, lalu pintasan Jadwal Bermain, Daftar Pemain, serta Klasemen. Navigasi utama konsisten: Beranda, Jadwal, Klasemen.

### Jadwal

Pilih lapangan terlebih dahulu. Pisahkan Sedang bermain dan Berikutnya. Nama pemain ditulis lengkap dan boleh menjadi beberapa baris. Satu tindakan utama per kartu: Lihat Pertandingan, Mulai Pertandingan, atau Buka Pencatatan Skor sesuai hak akses dan status.

### Catat skor

Dua tim jelas dan angka skor dominan. Di HP, tim disusun vertikal. Tombol `+ 1 Poin` besar dan jelas untuk masing-masing tim. Koreksi utama: `Batalkan Poin Terakhir`. Tampilkan total poin, status simpan, dan konfirmasi hasil saat aturan selesai terpenuhi. Tidak boleh menampilkan `Skor sudah tersimpan` sebelum ada konfirmasi server.

### Klasemen

Tampilan utama: Peringkat, Nama, Poin. Statistik tambahan hanya melalui detail pemain. Jelaskan bahwa hasil yang sudah disahkan saja yang dihitung. Sediakan Lihat Semua Pemain dan Ekspor.

### Pengelola

Urutan kerja: 1. Siapkan Pemain → 2. Atur Lapangan & Poin → 3. Buat Jadwal. Cadangan, Arsip, dan Riwayat Perubahan diletakkan terpisah di bawah. Tindakan hapus tidak muncul sebagai tombol utama; butuh penjelasan serta konfirmasi.

## Rancangan akses

Penonton direncanakan dapat membuka jadwal, skor, dan klasemen tanpa login. Pengelola masuk untuk mengubah pemain, jadwal, dan skor. Seluruh pemeriksaan izin wajib dilakukan di server. Rancangan ini belum mengubah izin situs yang sekarang masih privat.

## Aturan konsistensi

1. Semua komponen membaca token pusat; hindari warna, radius, dan ukuran teks yang ditulis terpisah di halaman.
2. Gunakan satu komponen BrandLogo yang selalu merujuk master logo yang sama.
3. Jangan meminta pembuat gambar membuat logo baru ketika membuat layar lain. Tempelkan master final sebagai aset terpisah.
4. Perubahan fitur, isi turnamen, atau responsivitas tidak menjadi alasan mengganti identitas visual.
5. Logo, font, palet utama, ukuran dasar, dan struktur navigasi hanya diubah atas permintaan eksplisit pengguna; catat sebagai versi desain berikutnya.
6. Jalankan `python3 verify-assets.py` untuk memastikan master, font, dan token masih sama.

## Pemeriksaan sebelum implementasi dinyatakan selesai

Pastikan master logo sama di desktop dan HP; font lokal berhasil dimuat; teks ≥18 px; tombol ≥56 px; alur penonton/pengelola jelas; navigasi kembali mudah; fokus terlihat; status simpan benar; layar 390 px dan pembesaran 200% tetap terbaca. Gambar mockup adalah acuan, bukan bukti fitur sudah berjalan.
