-- Ülkeler tablosu
CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Şehirler tablosu
CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY,
  country_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);

-- İlçeler tablosu
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY,
  state_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE
);

-- Namaz vakitleri tablosu
CREATE TABLE IF NOT EXISTS prayer_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id INTEGER NOT NULL,
  date DATE NOT NULL,
  fajr TEXT NOT NULL,
  sunrise TEXT NOT NULL,
  dhuhr TEXT NOT NULL,
  asr TEXT NOT NULL,
  maghrib TEXT NOT NULL,
  isha TEXT NOT NULL,
  qibla TEXT,
  gregorian_date TEXT,
  hijri_date TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  UNIQUE (city_id, date)
);

-- Bayram namazı vakitleri tablosu
CREATE TABLE IF NOT EXISTS eid_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id INTEGER NOT NULL,
  eid_date DATE NOT NULL,
  eid_time TEXT NOT NULL,
  eid_type TEXT NOT NULL, -- 'RAMADAN', 'SACRIFICE' gibi
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  UNIQUE (city_id, eid_date, eid_type)
);

-- Günlük içerik tablosu (ayetler, hadisler vb.)
CREATE TABLE IF NOT EXISTS daily_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_date DATE NOT NULL,
  content_type TEXT NOT NULL, -- 'VERSE', 'HADITH', 'PRAYER' gibi
  content TEXT NOT NULL,
  source TEXT,
  day_of_year INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (content_date, content_type)
);

-- Güncelleme kayıtları tablosu
CREATE TABLE IF NOT EXISTS update_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_type TEXT NOT NULL, -- 'yearly', 'emergency', etc.
  update_year INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'completed', 'pending', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(update_type, update_year)
); 