-- Mevcut daily_contents tablosunu yedekle
CREATE TABLE IF NOT EXISTS daily_contents_backup AS SELECT * FROM daily_contents;

-- Mevcut daily_contents tablosunu sil
DROP TABLE IF EXISTS daily_contents;

-- Güncellenmiş daily_contents tablosunu oluştur
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

-- Yedekten verileri geri yükle (title sütunu hariç)
INSERT INTO daily_contents (id, content_date, content_type, content, source, day_of_year, created_at, updated_at)
SELECT id, content_date, content_type, content, source, day_of_year, created_at, updated_at
FROM daily_contents_backup;

-- Yedek tabloyu sil
DROP TABLE IF EXISTS daily_contents_backup; 