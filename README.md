# RecehLy

## MASALAH

Di era digital saat ini, sebagian besar UMKM masih mengandalkan pencatatan transaksi dan inventaris secara manual menggunakan buku catatan.

Metode konvensional ini menyimpan risiko besar. Pertama, sering terjadi lost sales atau kehilangan potensi penjualan karena stok barang habis tanpa disadari. Pelaku usaha baru tahu stok kosong saat pelanggan sudah datang untuk membeli.

Kedua, pengelolaan keuangan menjadi tidak terstruktur. Pemantauan cashflow menjadi kabur karena sulit membedakan antara modal usaha, keuntungan bersih, dan pengeluaran pribadi.

Ketiga, tingginya risiko human error atau kesalahan hitung, risiko catatan rusak dan hilang, serta boros waktu karena harus melakukan rekapitulasi data keuangan secara manual di akhir bulan.

## SOLUSI

RecehLy hadir sebagai solusi terintegrasi untuk memodernisasi manajemen operasional UMKM.

Aplikasi ini mengotomatisasi pencatatan keluar-masuk barang secara real-time, sehingga data inventaris selalu akurat di setiap transaksi.

RecehLy dilengkapi fitur Stock Alert yang memberikan peringatan dini sebelum stok barang benar-benar habis, meminimalisir risiko kehilangan pembeli dan mempercepat proses restock.

Selain itu, RecehLy menyajikan laporan cashflow secara real-time yang secara otomatis memisahkan modal dan keuntungan bersih. Bisnis menjadi lebih modern, akurat, dan efisien tanpa perlu rekap manual yang menyita waktu.

## Fitur utama

Fitur Utama:

1. Kasir
2. Dashboard
3. Stok Bahan
4. Menu dan Bahan
5. Keuangan
6. Sinkronisasi antar-perangkat

## Tech stack yang digunakan

1. Frontend: React, TypeScript, Vite, Tailwind CSS, Lucide React.
2. Backend: Node.js, Express, TypeScript.
3. Database: PostgreSQL di Supabase.
4. Deploy: Netlify untuk web dan serverless function.
5. API: REST API internal untuk stok, menu, resep, transaksi, checkout dan sinkronisasi antar-perangkat.
6. Library database: node-postgres (pg).
7. Lisensi: MIT License

## Jalanin

```bash
npm install
npm run dev
```

Untuk nyalakan API Node dan sinkronisasi online, buat `.env` dari `.env.example`, isi `DATABASE_URL`, lalu buka terminal kedua:

```bash
npm run dev:api
```

Pakai tombol status data di header untuk membuat atau memasukkan kode sinkronisasi yang sama di setiap perangkat. Tidak ada akun.

Build produksi:

```bash
npm run build
npm start
```

## Environment variable yang di butuhkan

DATABASE_URL
Port 3001

## Link

Web: [Recehly](https://recehly.netlify.app/)
Demo: [Demo](https://drive.google.com/drive/folders/17sXw96UKfUdiycRcyB_SW7M-_WKRaqc-?usp=sharing)
