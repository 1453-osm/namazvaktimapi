# Namaz Vakti API - Google Cloud Run Kurulum Kılavuzu

Bu doküman, Namaz Vakti API'sini Google Cloud Run'da çalıştırmak için gerekli adımları içerir.

## 1. Google Cloud Hesabı Oluşturma ve Proje Kurulumu

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin ve Google hesabınızla giriş yapın
2. Yeni bir proje oluşturun:
   - Sağ üst köşedeki proje seçiciye tıklayın
   - "Yeni Proje" butonuna tıklayın
   - Projeye isim verin (örn. "namazvakti-api")
   - "Oluştur" butonuna tıklayın

## 2. Cloud Run ve Gerekli API'leri Etkinleştirme

1. Cloud Console'da "API'ler ve Servisler" bölümüne gidin
2. "API ve Servisleri etkinleştir" butonuna tıklayın
3. Aşağıdaki API'leri etkinleştirin:
   - Cloud Run API
   - Cloud Build API
   - Container Registry API
   - Secret Manager API

## 3. Secret Manager Ayarları

Turso veritabanı kimlik bilgilerini güvenli bir şekilde saklamak için:

1. Cloud Console'da "Security" > "Secret Manager" bölümüne gidin
2. "Create Secret" butonuna tıklayın
3. İlk gizli değer için:
   - İsim: `turso-database-url`
   - Değer: `libsql://namazvaktimdb-1453-osm.aws-us-east-1.turso.io`
4. "Create Secret" butonuna tıklayın
5. İkinci gizli değer için:
   - İsim: `turso-auth-token`
   - Değer: `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...` (tam token değeriniz)
6. "Create Secret" butonuna tıklayın

## 4. GitHub Entegrasyonu için Servis Hesabı Oluşturma

1. Cloud Console'da "IAM & Admin" > "Service Accounts" bölümüne gidin
2. "Create Service Account" butonuna tıklayın
3. Hesap detayları:
   - İsim: `github-deploy` 
   - Açıklama: `GitHub Actions for Cloud Run deployments`
4. "Create and Continue" butonuna tıklayın
5. Aşağıdaki rolleri ekleyin:
   - Cloud Run Admin
   - Storage Admin
   - Cloud Build Editor
   - Secret Manager Secret Accessor
   - Artifact Registry Administrator
   - Service Account User
   - Service Usage Admin
6. "Continue" ve ardından "Done" butonuna tıklayın
7. Oluşturulan servis hesabını listeden bulun ve tıklayın
8. "Keys" sekmesine gidin
9. "Add Key" > "Create new key" seçeneğini tıklayın
10. JSON formatını seçin ve "Create" butonuna tıklayın
11. JSON anahtar dosyası otomatik olarak bilgisayarınıza indirilecektir

### Mevcut servis hesabına izin ekleme (eğer servis hesabınız zaten oluşturulmuşsa)

1. Cloud Console'da "IAM & Admin" > "IAM" bölümüne gidin
2. GitHub Actions için kullandığınız servis hesabını bulun
3. "Düzenle" (Kalem simgesi) butonuna tıklayın
4. "Rol ekle" butonuna tıklayın
5. Aşağıdaki rolleri ekleyin:
   - Artifact Registry Administrator
   - Service Account User
   - Service Usage Admin
6. "Kaydet" butonuna tıklayın

## 5. GitHub Repository Ayarları

1. GitHub'da repository'nizin "Settings" bölümüne gidin
2. "Secrets" > "Actions" bölümüne gidin
3. Aşağıdaki gizli değerleri ekleyin:
   - `GCP_PROJECT_ID`: Google Cloud proje ID'niz (örn. `namazvakti-api-12345`)
   - `GCP_SA_KEY`: İndirdiğiniz JSON dosyasının tüm içeriği

## 6. GitHub Actions Workflow Tetikleme

1. GitHub repository'nizde `.github/workflows/deploy-cloud-run.yml` dosyası oluşturuldu
2. Bu workflow, main branch'e yapılan her push'ta veya manuel olarak tetiklendiğinde çalışacak
3. Workflow'u manuel tetiklemek için:
   - GitHub repository'nizde "Actions" sekmesine gidin
   - "Deploy to Cloud Run" workflow'unu seçin
   - "Run workflow" butonuna tıklayın ve "main" branch'ini seçin

## 7. API Endpoint'ine Erişim

Deployment tamamlandıktan sonra, API endpoint'inize şu şekilde erişebilirsiniz:

1. Cloud Console'da "Cloud Run" bölümüne gidin
2. "namazvakti-api" servisine tıklayın
3. URL sütununda görünen bağlantı, API'nize erişim sağlar
4. Örnek API çağrısı: `https://namazvakti-api-xxx-xx.a.run.app/`

## 8. İsteğe Bağlı: Özel Domain Adı Ekleme

API'nizi özel bir domain adı ile kullanmak için:

1. Cloud Console'da "Cloud Run" > "namazvakti-api" servisine gidin
2. "Domain Mappings" sekmesine tıklayın
3. "Add Mapping" butonuna tıklayın
4. Domain adınızı girin ve yönergeleri takip edin 