# Namaz Vakti API

Namaz vakitleri, ülke/şehir/ilçe bilgileri için bir REST API.

## Özellikler

- Ülke, şehir ve ilçe bilgileri yönetimi
- Namaz vakitleri sorgulama
- Bayram namazı vakitleri
- Günlük dini içerikler
- Diyanet API entegrasyonu ile gerçek zamanlı veri
- Tüm konumlar için yıllık namaz vakitleri verisi

## Kurulum

### Gereksinimler

- Node.js (v14+)
- PostgreSQL veritabanı

### Adımlar

1. Repoyu klonlayın:
```
git clone https://github.com/yourusername/namazvaktimapi.git
cd namazvaktimapi
```

2. Bağımlılıkları yükleyin:
```
npm install
```

3. `.env` dosyasını düzenleyin:
```
PORT=3000
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=development
```

4. Veritabanı şemasını oluşturun:
```
npm run setup-db
```

5. Lokasyon verilerini (ülke, şehir, ilçe) yükleyin:
```
npm run fetch-countries
npm run fetch-states
npm run fetch-cities
```

6. Namaz vakitlerini yükleyin:
```
npm run fetch-prayer-times
```

7. Uygulamayı çalıştırın:
```
npm start
```

Geliştirme modu için:
```
npm run dev
```

## Veri Güncelleme Stratejisi

Namaz vakitleri verisi yılda bir kez toplu olarak güncellenir ve veritabanında saklanır. Bu sayede API istekleri hızlı yanıt verir ve API istek sınırlarına uyulur.

### Yıllık Güncelleme Planı

```
npm run schedule-updates
```

Bu komut çalıştırıldığında:

1. **Kasım 20 Kontrolü**: Her yıl 20 Kasım'da Diyanet API'si gelecek yıl verilerini içeriyor mu kontrol edilir.
   - Eğer gelecek yıl verisi mevcutsa, tüm konumlar için yıllık veriler indirilir.
   - Mevcut değilse, "beklemede" olarak işaretlenir.

2. **Üç Günlük Kontrol**: Eğer "beklemede" durumu varsa, her 3 günde bir gelecek yıl verisi kontrol edilir.
   - Veri mevcut olduğunda, tüm konumlar için veriler indirilir.

3. **Acil Durum Kontrolü**: Veritabanında kalan veri 30 günden az ise, acil güncelleme yapılır.

Bu strateji sayesinde:
- API istek limitlerine uyulur (her yer için günlük 5, aylık 10)
- Tüm veriler yıllık olarak bir kerede indirilir
- Sistem her zaman güncel veri sağlar

## API Endpoint'leri

### Lokasyonlar

- `GET /api/countries` - Tüm ülkeler
- `GET /api/countries/:id` - Belirli bir ülke
- `GET /api/states` - Tüm şehirler
- `GET /api/states?countryId=:countryId` - Belirli bir ülkedeki şehirler
- `GET /api/states/:id` - Belirli bir şehir
- `GET /api/cities` - Tüm ilçeler
- `GET /api/cities?stateId=:stateId` - Belirli bir şehirdeki ilçeler
- `GET /api/cities/:id` - Belirli bir ilçe

### Namaz Vakitleri

- `GET /api/prayer-times/:cityId/:date` - Belirli bir ilçe ve tarih için namaz vakitleri
- `GET /api/prayer-times/:cityId/range?startDate=:startDate&endDate=:endDate` - Belirli bir ilçe için tarih aralığında namaz vakitleri
- `GET /api/prayer-times/:cityId/eid` - Belirli bir ilçe için bayram namazı vakitleri

## Veritabanı Şeması

Ana veritabanı tabloları:

- `countries` - Ülke bilgileri
- `states` - Şehir bilgileri
- `cities` - İlçe bilgileri
- `prayer_times` - Namaz vakitleri
- `eid_times` - Bayram namazı vakitleri
- `daily_contents` - Günlük dini içerikler
- `update_logs` - Güncelleme işlemleri kayıtları

## Diyanet API Entegrasyonu

Uygulama, Diyanet İşleri Başkanlığı'nın awqatsalah.diyanet.gov.tr API'sini kullanarak:

- Ülke, şehir ve ilçe verilerini çeker
- Tüm konumlar için namaz vakitleri verisini toplar
- Verileri veritabanında saklar ve sunar

API istek limitlerine dikkat edilmiştir:
- Her yer için günlük 5 istek
- Her yer için aylık 10 tarih aralığı isteği

## Lisans

ISC 