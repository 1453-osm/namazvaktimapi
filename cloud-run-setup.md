# Namaz Vakti API - Cloud Run Kurulum Kılavuzu

Bu rehber, Namaz Vakti API'sini Google Cloud Run'da çalıştırmak ve GitHub Actions ile CI/CD pipeline'ını kurmak için adımları içerir.

## 1. Google Cloud Hesabı ve Proje Kurulumu

1. [Google Cloud Console](https://console.cloud.google.com)'a giriş yapın
2. Yeni bir proje oluşturun (veya mevcut `namazvaktimapi-1453` projesini kullanın)
3. Gerekli API'leri etkinleştirin:

### Gerekli API'ler
Şu API'leri etkinleştirmelisiniz:
- [Cloud Run API](https://console.cloud.google.com/apis/library/run.googleapis.com)
- [Cloud Build API](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com)
- [Container Registry API](https://console.cloud.google.com/apis/library/containerregistry.googleapis.com)
- [Secret Manager API](https://console.cloud.google.com/apis/library/secretmanager.googleapis.com)
- [Artifact Registry API](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com)
- [Cloud Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com) (IAM izinleri için)
- [IAM API](https://console.cloud.google.com/apis/library/iam.googleapis.com)

API'leri etkinleştirmek için:
1. Google Cloud Console'da "API'ler ve Servisler" > "Kütüphane" bölümüne gidin
2. Her bir API'yi arayın ve "Etkinleştir" butonuna tıklayın
3. API etkinleştikten sonra, etkinin sistemde yayılması için birkaç dakika bekleyin

Alternatif olarak, komut satırından tüm API'leri etkinleştirebilirsiniz:
```bash
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com
```

## 2. Secret Manager Kurulumu

Turso veritabanı kimlik bilgilerini saklayın:

1. Cloud Console'da "Security" > "Secret Manager" bölümüne gidin
2. İki secret oluşturun:
   - `turso-database-url`: `libsql://namazvaktimdb-1453-osm.aws-us-east-1.turso.io`
   - `turso-auth-token`: `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...` (token)

## 3. Servis Hesabı ve GitHub Entegrasyonu

1. Servis hesabı oluşturun:
   - IAM & Admin > Service Accounts > "Create Service Account"
   - İsim: `github-actions` (veya tercihinize göre)
   - Şu rolleri ekleyin:
     - Cloud Run Admin
     - Storage Admin
     - Cloud Build Editor
     - Secret Manager Secret Accessor
     - Artifact Registry Administrator
     - Service Account User
     - Service Usage Admin

2. Servis hesabı için anahtar oluşturun:
   - Servis hesabı detaylarında "Keys" sekmesine gidin
   - "Add Key" > "Create new key" > JSON formatını seçin
   - İndirilen JSON dosyasını saklayın

3. GitHub repository'de secrets ekleyin:
   - GitHub repo > Settings > Secrets > Actions
   - `GCP_PROJECT_ID`: `namazvaktimapi-1453`
   - `GCP_SA_KEY`: (JSON dosyasının tüm içeriğini yapıştırın)

## 4. Cloud Run Compute Service Account İzinleri

Cloud Run deployment'ı için gerekli IAM izinleri:

1. GitHub Actions servis hesabınız için şu rolleri ekleyin:
   - Cloud Run Admin (`roles/run.admin`)
   - Service Account User (`roles/iam.serviceAccountUser`)
   - Storage Admin (`roles/storage.admin`)
   - Cloud Build Editor (`roles/cloudbuild.builds.editor`)
   - Secret Manager Secret Accessor (`roles/secretmanager.secretAccessor`)

2. Cloud Run Compute servis hesabınız için şu rolleri ekleyin:
   - Secret Manager Secret Accessor (`roles/secretmanager.secretAccessor`)
   - Cloud Run Invoker (`roles/run.invoker`)

Bu izinleri Google Cloud Console üzerinden eklemek için:

1. IAM & Admin > IAM bölümüne gidin
2. Her bir servis hesabını bulun ve "Rol ekle" butonuna tıklayın
3. Yukarıdaki ilgili rolleri ekleyin

Alternatif olarak, komut satırından şu şekilde ekleyebilirsiniz:

```bash
# GitHub Actions servis hesabı için izinler 
# (servis_hesabi_email değişkenini kendi servis hesabınızla değiştirin)
SERVIS_HESABI_EMAIL="your-service-account@namazvaktimapi-1453.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding namazvaktimapi-1453 \
  --member="serviceAccount:$SERVIS_HESABI_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding namazvaktimapi-1453 \
  --member="serviceAccount:$SERVIS_HESABI_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# Compute servis hesabı için izinler
gcloud projects add-iam-policy-binding namazvaktimapi-1453 \
  --member="serviceAccount:namazvaktimapi-1453-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding namazvaktimapi-1453 \
  --member="serviceAccount:namazvaktimapi-1453-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

> **ÖNEMLİ:** IAM izinlerini çalıştırmak için **Cloud Resource Manager API** ve **IAM API** etkinleştirilmiş olmalıdır. Workflow'da artık otomatik IAM atamaları kaldırıldığı için, GitHub Actions deployment'ının sorunsuz çalışması için bu rol atamalarını **manuel olarak** Cloud Console üzerinden yapmanız **zorunludur**.

## 5. GitHub Workflows Kullanımı

Bu repo şu workflow'ları içerir:

### 5.1. Dağıtım Workflow (deploy-cloud-run.yml)

- Main branch'e push yapıldığında otomatik tetiklenir
- Manuel olarak da tetiklenebilir (üç farklı dağıtım türü seçilebilir):
  - `production`: Tam uygulama (Turso veritabanı bağlantılı)
  - `minimal`: Minimal test sürümü (`server.js`)
  - `starter`: Basit API sürümü (`starter.js`)

Manuel tetikleme:
  - GitHub repo > Actions > "Deploy to Cloud Run" > Run workflow
  - Dağıtım türünü seçin ve "Run workflow" butonuna tıklayın

### 5.2. Diğer Zamanlanmış Workflow'lar

- `fetch-daily-content.yml`: Günlük içerik güncellemesi
- `fetch-prayer-times.yml`: Namaz vakitlerini güncelleme 
- `schedule-prayer-time-updates.yml`: Namaz vakti güncellemelerini zamanlama
- `cleanup-old-prayer-times.yml`: Eski namaz vakitlerini temizleme

## 6. Önemli Notlar

- Deployment sonrası URL'ler:
  - Ana uygulama: `https://namazvaktimapi-xxx.a.run.app`
  - Minimal sürüm: `https://namazvaktimapi-minimal-xxx.a.run.app`
  - Starter sürüm: `https://namazvaktimapi-starter-xxx.a.run.app`

- Diyenet API istek sınırları:
  - Yer bazında günlük 5 istek
  - `daterange` endpoint'i için yer bazında aylık 10 istek

## 7. Kullanım ve Sorun Giderme

### Dağıtım Sonrası Kontrol

```bash
# Servis durumunu kontrol et
gcloud run services describe namazvaktimapi --region us-east1 --format 'yaml(status)'

# Log inceleme
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=namazvaktimapi" --limit=10
```

### Zamanlanmış Görevleri Kontrol Etme

```bash
# Job listesi
gcloud run jobs list --region us-east1

# Son execution detayları 
gcloud run jobs executions list --job namazvaktimapi-daily-content-update --region us-east1
```

### Yaygın Deployment Sorunları ve Çözümleri

#### Cloud Run Deployment Hataları

1. **IAM Yetkilendirme Hataları:**
   - Hata: `iam.serviceaccounts.actAs izni reddedildi`
   - Çözüm: GitHub Actions servis hesabına `roles/iam.serviceAccountUser` rolünü ekleyin

2. **API Etkinleştirme Hataları:**
   - Hata: `Cloud Resource Manager API kullanılmamış veya devre dışı bırakılmış`
   - Çözüm: Yukarıda listelenen tüm API'leri etkinleştirin

3. **Secret Manager Erişim Hataları:**
   - Hata: `Secret access denied`
   - Çözüm: Compute servis hesabına `roles/secretmanager.secretAccessor` rolünü ekleyin 