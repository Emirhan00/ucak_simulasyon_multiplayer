# 3D Multiplayer Uçak Simülasyonu

Bu proje, Three.js, Cannon.js ve Socket.io kullanılarak geliştirilmiş 3D çok oyunculu bir uçak simülasyonudur. Oyuncular gerçek zamanlı olarak uçak kullanabilir, diğer oyuncularla etkileşime girebilir ve çeşitli görevleri tamamlayabilirler.

## Özellikler

- 3D uçak simülasyonu
- Gerçekçi fizik motoru
- Çok oyunculu mod
- Gerçek zamanlı sohbet
- Farklı oyun modları (Serbest Uçuş, Takım Savaşı, Balon Avı, Bayrak Kapmaca)
- Kalkış ve iniş kontrolleri
- Görev sistemi

## Teknolojiler

- **Frontend**: Three.js, Cannon.js
- **Backend**: Node.js, Express, Socket.io
- **Veritabanı**: MongoDB, SQLite

## Canlı Demo

[https://ucak-simulasyonu.vercel.app](https://ucak-simulasyonu.vercel.app)

## Kurulum

### Gereksinimler

- Node.js (v14 veya üzeri)
- MongoDB (isteğe bağlı)

### Yerel Geliştirme

1. Repoyu klonlayın:

```bash
git clone https://github.com/kullaniciadi/ucak-simulasyonu.git
cd ucak-simulasyonu
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. Sunucuyu başlatın:

```bash
npm run dev
```

4. Client tarafını başlatın:

```bash
cd client
python -m http.server 8000
```

5. Tarayıcıda [http://localhost:8000](http://localhost:8000) adresine gidin.

### Vercel'e Deployment

1. GitHub'a projeyi push edin:

```bash
git add .
git commit -m "Initial commit"
git push
```

2. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin ve GitHub reponuzu import edin.

3. Gerekli çevre değişkenlerini ayarlayın:
   - `MONGODB_URI`: MongoDB bağlantı URI'si
   - `NODE_ENV`: `production`

4. Deploy edin!

## Kontroller

- **W/S**: Burun yukarı/aşağı (pitch)
- **A/D**: Sola/sağa yatma (roll)
- **Q/E**: Sola/sağa dönme (yaw)
- **Yukarı/Aşağı Ok**: Gaz artırma/azaltma
- **Shift**: Hızlandırma (boost)
- **Space**: Ateş etme
- **R**: Motor açma/kapama
- **G**: İniş takımı açma/kapama
- **F**: Flap açma/kapama
- **B**: Fren
- **T**: Kalkış modu
- **L**: İniş modu
- **V**: Kamera görünümü değiştirme

## Lisans

MIT 