-- Mevcut prayer_times tablosunu güncelleyerek Diyanet API'den gelen tüm verileri saklayacak şekilde genişletme
ALTER TABLE prayer_times 
-- Mevcut sütunları koruyoruz (id, city_id, date, fajr, sunrise, dhuhr, asr, maghrib, isha, qibla, gregorian_date, hijri_date, created_at, updated_at)

-- Tarih ve zaman bilgileri için sütunlar
ADD COLUMN IF NOT EXISTS gregorian_date_short VARCHAR(20),
ADD COLUMN IF NOT EXISTS gregorian_date_long VARCHAR(50),
ADD COLUMN IF NOT EXISTS gregorian_date_iso8601 VARCHAR(50),
ADD COLUMN IF NOT EXISTS gregorian_date_short_iso8601 VARCHAR(20),
ADD COLUMN IF NOT EXISTS hijri_date_short VARCHAR(20),
ADD COLUMN IF NOT EXISTS hijri_date_long VARCHAR(50),
ADD COLUMN IF NOT EXISTS hijri_date_short_iso8601 VARCHAR(20),
ADD COLUMN IF NOT EXISTS hijri_date_long_iso8601 VARCHAR(50),

-- Astronomik bilgiler
ADD COLUMN IF NOT EXISTS astronomical_sunset VARCHAR(10),
ADD COLUMN IF NOT EXISTS astronomical_sunrise VARCHAR(10),
ADD COLUMN IF NOT EXISTS qibla_time VARCHAR(10),
ADD COLUMN IF NOT EXISTS greenwich_mean_timezone INTEGER,

-- Ay ve diğer bilgiler
ADD COLUMN IF NOT EXISTS shape_moon_url VARCHAR(255);

-- Sütun yorum eklemeleri
COMMENT ON COLUMN prayer_times.date IS 'API''den gelen verilere dayanarak oluşturulan tarih';
COMMENT ON COLUMN prayer_times.gregorian_date_short IS 'Kısa gregoryen tarih (DD.MM.YYYY)';
COMMENT ON COLUMN prayer_times.gregorian_date_long IS 'Uzun gregoryen tarih (Gün Ay Yıl Haftanın Günü)';
COMMENT ON COLUMN prayer_times.gregorian_date_iso8601 IS 'ISO 8601 formatında tam tarih ve saat';
COMMENT ON COLUMN prayer_times.gregorian_date_short_iso8601 IS 'ISO 8601 formatında kısa tarih';
COMMENT ON COLUMN prayer_times.hijri_date_short IS 'Kısa hicri tarih';
COMMENT ON COLUMN prayer_times.hijri_date_long IS 'Uzun hicri tarih';
COMMENT ON COLUMN prayer_times.qibla_time IS 'Kıble saati';
COMMENT ON COLUMN prayer_times.astronomical_sunset IS 'Astronomik gün batımı';
COMMENT ON COLUMN prayer_times.astronomical_sunrise IS 'Astronomik gün doğumu';
COMMENT ON COLUMN prayer_times.shape_moon_url IS 'Ay görüntüsü URL';
COMMENT ON COLUMN prayer_times.greenwich_mean_timezone IS 'Greenwich saat dilimi';

-- İndeksler ekleyelim (eğer yoksa)
CREATE INDEX IF NOT EXISTS idx_prayer_times_gregorian_date_short ON prayer_times(gregorian_date_short);
CREATE INDEX IF NOT EXISTS idx_prayer_times_gregorian_date_iso8601 ON prayer_times(gregorian_date_iso8601);
CREATE INDEX IF NOT EXISTS idx_prayer_times_hijri_date_short ON prayer_times(hijri_date_short); 