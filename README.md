# Namaz Vakti API

Namaz vakitleri, ülke/şehir/ilçe bilgileri için bir REST API.

## Özellikler

- Ülke, şehir ve ilçe bilgileri yönetimi
- Namaz vakitleri sorgulama
- Bayram namazı vakitleri
- Günlük dini içerikler

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

5. Uygulamayı çalıştırın:
```
npm start
```

Geliştirme modu için:
```
npm run dev
```

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

## Lisans

ISC 

## Cloud Run Üzerinde İlçe Verilerini Çekme

İlçe verilerini çekmek için bir Cloud Run servisi kurulmuştur. Bu servis, veritabanındaki şehirlerin her biri için Diyanet API'sinden ilçe bilgilerini çeker ve veritabanına kaydeder.

### Servis Özellikleri

- **Kesintisiz Çalışma**: Script, bilgisayarınız kapalı olsa bile Google Cloud platformunda çalışmaya devam eder.
- **Hata Toleransı**: Herhangi bir hata durumunda, script kaldığı yerden devam edebilir.
- **İlerleme Takibi**: Veritabanında `app_settings` tablosunda ilerleme bilgisi tutulur.
- **API Limitlerine Uyum**: Diyanet API'nin istek sınırlarını aşmamak için gerekli beklemeler eklenmiştir.

### Nasıl Çalıştırılır

1. Google Cloud CLI'yı kurun ve `gcloud auth login` komutu ile oturum açın.
2. Google Cloud projenizi seçin: `gcloud config set project namazvaktimapi-1453`
3. Servisi çalıştırmak için:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

### Manuel Deploy İşlemi

Eğer Google Cloud Build kullanmak istemiyorsanız, aşağıdaki adımları manuel olarak da uygulayabilirsiniz:

1. Docker imajını oluşturun:
```bash
docker build -t gcr.io/namazvaktimapi-1453/namazvaktimapi-cities-fetcher:latest .
```

2. İmajı Container Registry'ye gönderin:
```bash
docker push gcr.io/namazvaktimapi-1453/namazvaktimapi-cities-fetcher:latest
```

3. Cloud Run'a deploy edin:
```bash
gcloud run deploy namazvaktimapi-cities-fetcher \
  --image=gcr.io/namazvaktimapi-1453/namazvaktimapi-cities-fetcher:latest \
  --platform=managed \
  --region=us-east1 \
  --memory=512Mi \
  --timeout=3600 \
  --no-allow-unauthenticated
```

### İlerlemeyi İzleme

Servisin ilerleme durumunu Cloud Run konsolundan log'ları inceleyerek takip edebilirsiniz.

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=namazvaktimapi-cities-fetcher" --limit=50
```

Ayrıca veritabanındaki `app_settings` tablosunda aşağıdaki bilgiler tutulur:
- `last_processed_state_id`: En son işlenen şehir ID'si (işlem devam ediyor)
- `cities_last_update`: Son başarılı güncelleme zamanı (işlem tamamlandı) 