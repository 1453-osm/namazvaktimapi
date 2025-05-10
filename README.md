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

## Veri Güncelleme

Namaz vakitleri verisini düzenli olarak güncellemek için planlayıcıyı kullanabilirsiniz:

```
npm run schedule-updates
```

Bu komut:
- Her gün veri eksikliği kontrolü yapar ve gerekirse günceller
- Her ayın 1'inde tam bir güncelleme yapar
- API istek limitlerine uygun şekilde veri çeker

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