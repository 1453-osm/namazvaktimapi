@echo off
setlocal

REM Zaman damgası oluştur
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set TIMESTAMP=%datetime:~0,14%

echo 🚀 Namaz Vakti API dağıtım işlemi başlatılıyor - %TIMESTAMP%

REM Cloud Run bölgesi
set REGION=us-central1
set SERVICE_NAME=namazvaktimapi
set PROJECT_ID=namazvaktimapi-1453

REM Docker imajı oluştur ve gönder
echo 🔨 Docker imajı oluşturuluyor...
docker build -t gcr.io/%PROJECT_ID%/%SERVICE_NAME%:latest .
docker build -t gcr.io/%PROJECT_ID%/%SERVICE_NAME%:%TIMESTAMP% .

echo ☁️ Docker imajı Google Container Registry'ye gönderiliyor...
docker push gcr.io/%PROJECT_ID%/%SERVICE_NAME%:latest
docker push gcr.io/%PROJECT_ID%/%SERVICE_NAME%:%TIMESTAMP%

REM Cloud Run servisini güncelle
echo 🔄 Cloud Run servisi güncelleniyor...
gcloud run deploy %SERVICE_NAME% ^
  --image gcr.io/%PROJECT_ID%/%SERVICE_NAME%:%TIMESTAMP% ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory=512Mi ^
  --cpu=1 ^
  --min-instances=0 ^
  --max-instances=3 ^
  --project %PROJECT_ID% ^
  --port 8080

REM Başarılı mesajı
echo ✅ Dağıtım tamamlandı! %TIMESTAMP%

REM Servisi kontrol et
gcloud run services describe %SERVICE_NAME% --region %REGION% --format="value(status.url)" --project %PROJECT_ID%

endlocal 