# GitHub Actions ile Veri Çekme İşlemleri

Bu projede, GitHub Actions kullanarak Diyanet API'den otomatik olarak veri çekme işlemleri gerçekleştirilmektedir. Bu işlemler şunları içerir:

- İlçe verilerinin otomatik olarak çekilmesi ve veritabanına kaydedilmesi
- Belirli aralıklarla (her Pazar günü) veya manuel olarak çalıştırılabilir

## GitHub Secrets Ayarları

GitHub Actions workflow'unun doğru çalışabilmesi için GitHub deposunda aşağıdaki secret'ların tanımlanması gereklidir:

1. `DATABASE_URL`: Veritabanı bağlantı URL'si

Bu secret'ı eklemek için:

1. GitHub'da projenizin sayfasına gidin
2. "Settings" sekmesine tıklayın
3. Sol menüden "Secrets and variables" > "Actions" seçeneğini seçin
4. "New repository secret" butonuna tıklayın
5. İsim olarak `DATABASE_URL` girin
6. Değer olarak veritabanı bağlantı URL'nizi girin: 
   `postgresql://namazvaktimdb_owner:npg_7iuFLUEXv6Cs@ep-proud-lab-a4dbdbma-pooler.us-east-1.aws.neon.tech/namazvaktimdb?sslmode=require`
7. "Add secret" butonuna tıklayın

## Workflow'ları Manuel Çalıştırma

Veri çekme workflow'larını manuel olarak çalıştırmak için:

1. GitHub'da projenizin sayfasına gidin
2. "Actions" sekmesine tıklayın
3. Sol taraftan "Fetch Cities" workflow'unu seçin
4. "Run workflow" butonuna tıklayın
5. "Run workflow" onay butonuna tıklayarak işlemi başlatın

## Otomatik Çalışma Zamanlaması

Workflow dosyalarında tanımlanan cron ifadeleri sayesinde veri çekme işlemleri belirli zamanlarda otomatik olarak çalışacaktır:

- İlçe verileri her Pazar günü UTC zaman diliminde gece yarısı (00:00) otomatik olarak çekilecektir.

## Workflow Durumunu Kontrol Etme

Workflow'ların çalışma durumunu ve sonuçlarını kontrol etmek için:

1. GitHub'da projenizin sayfasına gidin
2. "Actions" sekmesine tıklayın
3. Çalışan veya tamamlanan workflow'ların listesini göreceksiniz
4. Herhangi bir workflow'a tıklayarak detayları görüntüleyebilirsiniz

## Hata Ayıklama

Eğer workflow'lar düzgün çalışmıyorsa:

1. "Actions" sekmesinde ilgili workflow çalışmasına tıklayın
2. Log çıktılarını inceleyerek hatanın kaynağını tespit edin
3. Gerekirse GitHub Secrets ayarlarınızı kontrol edin
4. Kod değişiklikleri gerektiren durumlarda workflow dosyalarını güncelleyin 