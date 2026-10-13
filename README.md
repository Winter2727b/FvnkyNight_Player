# FVNKY NIGHT — Music Player

Website music player statik bertema gelap, dengan paparan Library bergaya aplikasi Muzik dan skrin Now Playing penuh. Library dan player ialah dua scene berasingan. Projek ini boleh terus dihoskan menggunakan GitHub Pages.

## Kandungan

```text
fvnky-night-player/
├── index.html
├── styles.css
├── app.js
├── library.js          # senarai lagu yang dipaparkan dalam website
└── music/
    ├── demo-neon-drift.wav
    ├── demo-slow-motion.wav
    └── demo-after-hours-bounce.wav
```

Tiga fail WAV itu ialah demo instrumental sintetik ringkas supaya player boleh terus diuji. Padam entry demo daripada `library.js` apabila anda sudah bersedia menggantikannya dengan koleksi sendiri.

## Cara masukkan lagu sendiri

1. Buka folder projek dan salin fail lagu anda ke folder `music/`. Format lazim seperti `.mp3`, `.wav`, `.ogg` dan `.m4a` boleh disokong bergantung pada browser/peranti; **MP3** biasanya pilihan paling serasi.
2. Gunakan nama fail ringkas, contohnya `dj-body-back.mp3` (huruf kecil dan tanda sengkang, tanpa ruang).
3. Buka `library.js`. Tambah objek lagu di dalam `window.MUSIC_LIBRARY`, dipisahkan dengan koma. Contoh:

```js
{
  id: "dj-body-back",
  title: "DJ BODY BACK X ALAN WALKER",
  artist: "AudioLab",
  genre: "Fvnky",
  src: "music/dj-body-back.mp3",
  duration: "03:24",
  cover: "violet"
}
```

4. Pastikan nilai `src` sepadan tepat dengan lokasi dan nama fail dalam folder projek. `duration` hanya fallback untuk paparan; player akan baca durasi audio sebenar. Pilihan `cover`: `violet`, `orange`, `blue`, `pink` atau `green`.
5. Simpan, kemudian buka semula laman. Untuk uji secara lokal, klik dua kali `index.html` boleh berfungsi di sesetengah browser, tetapi lebih konsisten menggunakan local server (contohnya VS Code extension **Live Server**).

### Contoh senarai dengan satu lagu

```js
window.MUSIC_LIBRARY = [
  {
    id: "dj-body-back",
    title: "DJ BODY BACK X ALAN WALKER",
    artist: "AudioLab",
    genre: "Fvnky",
    src: "music/dj-body-back.mp3",
    duration: "03:24",
    cover: "violet"
  }
];
```

Bagi genre, `Fvnky` akan muncul dalam tapisan Fvnky, `Slow` dalam tapisan Slow. Genre lain masih muncul dalam All tracks. Setiap pengunjung mempunyai Favorites sendiri pada browser/peranti masing-masing.

## Deploy ke GitHub Pages

1. Log masuk GitHub dan buat repository baharu. Pilih **Public** jika anda mahu semua orang boleh melihat laman dan fail audio.
2. Upload semua kandungan dalam folder ini ke **root** repository (pastikan `index.html` berada di root, bukan di dalam satu lagi subfolder).
3. Buka **Settings → Pages** pada repository.
4. Dalam **Build and deployment**, pilih **Deploy from a branch**, pilih branch `main` dan folder `/(root)`, kemudian tekan **Save**.
5. Tunggu deployment selesai. GitHub akan tunjuk pautan laman dalam halaman Settings → Pages. Buka pautan itu pada telefon untuk uji library dan player.
6. Untuk kemas kini lagu, tambah fail audio ke folder `music/` dan edit `library.js`, kemudian commit/push perubahan. GitHub Pages akan publish semula secara automatik.

## Boleh simpan lagu di GitHub?

Boleh. Fail audio dalam repository awam boleh dimuat turun oleh pengunjung juga, bukan hanya distrim di player. Muat naik lagu yang anda miliki atau anda ada kebenaran untuk mengedarkannya. Untuk library kecil, menyimpan MP3 terus dalam repository adalah cara paling mudah.

GitHub Pages menetapkan had saiz laman yang diterbitkan sebanyak **1 GB**, dan had jalur lebar **100 GB sebulan** ialah had lembut. Repository Pages disyorkan kekal sekitar 1 GB. Jika koleksi anda besar atau ramai orang akan streaming lagu dengan kerap, simpan audio di object storage/CDN khusus dan biarkan website di GitHub Pages. Elakkan fail tunggal melebihi 100 MB kerana GitHub menguatkuasakan had saiz fail itu untuk repository biasa.

## Ciri player

- Dua scene berasingan: Library dan Now Playing penuh
- Paparan senarai lagu dengan tab Senarai, Lagu, Artis dan Album
- Carian lagu/artis/genre melalui ikon search
- Lompat ke huruf lagu menggunakan indeks A–Z
- Favorites disimpan secara lokal dalam browser
- Play/pause, previous/next, seek bar dan volume
- Shuffle, repeat semua / repeat satu / repeat off
- Queue “Up next”
- Mini-player pada paparan Library
- Shortcuts papan kekunci: `/` untuk carian, `Space` play/pause, `←` atau `→` untuk lompat 5 saat

Tiada backend atau database diperlukan. Library awam dikawal oleh fail `library.js` dan fail audio dalam repository.
