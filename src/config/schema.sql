-- Ülkeler tablosu
CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Şehirler tablosu
CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY,
  country_id INTEGER NOT NULL,
  code VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);

-- İlçeler tablosu
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY,
  state_id INTEGER NOT NULL,
  code VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE
);

-- Namaz vakitleri tablosu
CREATE TABLE IF NOT EXISTS prayer_times (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL,
  prayer_date DATE NOT NULL,
  fajr VARCHAR(10) NOT NULL,
  sunrise VARCHAR(10) NOT NULL,
  dhuhr VARCHAR(10) NOT NULL,
  asr VARCHAR(10) NOT NULL,
  maghrib VARCHAR(10) NOT NULL,
  isha VARCHAR(10) NOT NULL,
  qibla VARCHAR(20),
  gregorian_date VARCHAR(20),
  hijri_date VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  UNIQUE (city_id, prayer_date)
);

-- Bayram namazı vakitleri tablosu
CREATE TABLE IF NOT EXISTS eid_times (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL,
  eid_date DATE NOT NULL,
  eid_time VARCHAR(10) NOT NULL,
  eid_type VARCHAR(50) NOT NULL, -- 'RAMADAN', 'SACRIFICE' gibi
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  UNIQUE (city_id, eid_date, eid_type)
);

-- Günlük içerik tablosu (ayetler, hadisler vb.)
CREATE TABLE IF NOT EXISTS daily_contents (
  id SERIAL PRIMARY KEY,
  content_date DATE NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'VERSE', 'HADITH', 'PRAYER' gibi
  title VARCHAR(255),
  content TEXT NOT NULL,
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (content_date, content_type)
);

-- Güncelleme işlemlerini tetiklemek için trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Her tablo için update trigger'ları
CREATE TRIGGER update_countries_timestamp
BEFORE UPDATE ON countries
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_states_timestamp
BEFORE UPDATE ON states
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_cities_timestamp
BEFORE UPDATE ON cities
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_prayer_times_timestamp
BEFORE UPDATE ON prayer_times
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_eid_times_timestamp
BEFORE UPDATE ON eid_times
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_daily_contents_timestamp
BEFORE UPDATE ON daily_contents
FOR EACH ROW EXECUTE PROCEDURE update_timestamp(); 