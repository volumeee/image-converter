# 🖼️ Universal Image Converter

Aplikasi web *self-hosted* gratis untuk mengonversi, memampatkan, dan mengecilkan ukuran gambar secara massal. Dibuat dengan antarmuka yang modern, sangat cepat, dan 100% menjaga privasi karena semuanya diproses di server Anda sendiri.

## ✨ Fitur Utama

- **Konversi Multi-Format**:
  Mendukung format gambar modern dan standar: **WebP, AVIF, JPEG, PNG, GIF**, dan **TIFF**.
- **Super Cepat**:
  Didukung oleh mesin `sharp` (berbasis libvips) yang mengkonversi ratusan gambar dalam hitungan detik.
- **Pemrosesan Massal (Bulk)**:
  Tarik & lepas (*drag and drop*) hingga 100 gambar sekaligus, dan unduh semua hasil optimasi sekaligus dalam file **ZIP**.
- **Custom Resolusi & Kompresi**:
  Atur kualitas output (1-100%) dan sesuaikan ukuran lebar/tinggi gambar (*smart aspect-ratio resize*).
- **Pertahankan Data EXIF**:
  Pilihan untuk membuang metadata demi ukuran super kecil, atau mempertahankan data penting (seperti GPS Kamera, Tanggal Foto).
- **Watermark Teks Masal**:
  Proteksi aset foto produk Anda dengan menambahkan *Watermark* teks sekaligus! Pilih letak posisi bebas (Kanan Bawah, Tengah, dll) beserta warna bayangannya.
- **Tampilan UI/UX Premium**:
  Desain elegan dengan tema gelap (*dark mode*), *glassmorphism*, dan transisi memukau berbasis Tailwind CSS tanpa kerumitan instalasi frontend.

## 🐳 Menggunakan Docker

Aplikasi ini tersedia di **Docker Hub** dan **GitHub Container Registry (GHCR)**. Anda bisa menjalankan aplikasi ini dengan sangat mudah menggunakan perintah Docker berikut:

**Melalui Docker Hub (Direkomendasikan):**
```bash
docker run -d -p 3456:3456 --name image-converter bagose/image-converter:latest
```

**Atau melalui GitHub Container Registry:**
```bash
docker run -d -p 3456:3456 --name image-converter ghcr.io/volumeee/image-converter:latest
```

Buka browser Anda dan arahkan ke `http://localhost:3456`

---
*Dibuat untuk keperluan internal, sistem perkasiran (POSIN), atau manajemen katalog e-commerce skala besar.*  
**License:** MIT
