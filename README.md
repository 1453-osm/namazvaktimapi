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

## Google Cloud Run Deployment Rehberi

Namaz Vakti API'yi Google Cloud Run'a deploy etmek için şu adımları izleyin:

### Ön Koşullar

1. Google Cloud hesabı
2. Google Cloud konsolunda aktif bir proje
3. GitHub hesabı ve bu repo'nun bir fork'u
4. Gerekli API'lerin etkinleştirilmiş olması:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API
   - Secret Manager API

### Kurulum Adımları

1. `cloud-run-setup.md` dosyasındaki adımları takip edin
2. Gerekli secret'ları Google Cloud Secret Manager'da oluşturun:
   - `turso-database-url`
   - `turso-auth-token`
3. GitHub repository'nizde şu secret'ları ayarlayın:
   - `GCP_PROJECT_ID`
   - `GCP_SA_KEY`
4. Servis hesabınızın tüm gerekli rollere sahip olduğundan emin olun:
   - Cloud Run Admin
   - Storage Admin
   - Cloud Build Editor
   - Secret Manager Secret Accessor
   - Artifact Registry Administrator
   - Service Account User

### Deploy Etme

API'yi Cloud Run'a deploy etmek için:

1. Değişikliklerinizi `main` branch'ine push edin veya
2. GitHub Actions'da `Deploy to Cloud Run` workflow'unu manuel olarak tetikleyin

### Hatalar ve Çözümleri

1. **"artifactregistry.repositories.uploadArtifacts permission denied" hatası:**
   - Servis hesabınıza "Artifact Registry Administrator" rolünü ekleyin
   - Projenizde Artifact Registry API'yi etkinleştirin

2. **"Deployment failed" hatası:**
   - Cloud Run servis hesabınızın doğru izinlere sahip olduğundan emin olun
   - Log'ları kontrol edin

3. **"Secret not found" hatası:**
   - Secret Manager'da gerekli gizli değerleri oluşturduğunuzdan emin olun
   - Secret'ların doğru projeye eklediğinden emin olun

### Kaynaklar ve Bağlantılar

- [Google Cloud Run Dokümantasyonu](https://cloud.google.com/run/docs)
- [GitHub Actions ile Cloud Run Deployment](https://github.com/google-github-actions/deploy-cloudrun)
- [Artifact Registry Kullanımı](https://cloud.google.com/artifact-registry/docs)

## Lisans

ISC 