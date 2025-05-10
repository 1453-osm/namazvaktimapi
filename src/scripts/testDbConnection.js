const { pool } = require('../config/db');

async function testDbConnection() {
    try {
        console.log('Veritabanı bağlantısı test ediliyor...');
        console.log('Bağlantı URL:', process.env.DATABASE_URL || 'Çevresel değişken tanımlanmamış, varsayılan bağlantı kullanılıyor');
        
        // Basit bir sorgu çalıştır
        const result = await pool.query('SELECT NOW() as current_time');
        console.log('Veritabanı bağlantısı başarılı!');
        console.log('Sunucu zamanı:', result.rows[0].current_time);
        
        // Tabloları listele
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('\nVeritabanındaki tablolar:');
        if (tablesResult.rows.length === 0) {
            console.log('Hiç tablo bulunamadı');
        } else {
            tablesResult.rows.forEach(row => {
                console.log(`- ${row.table_name}`);
            });
        }
        
        // cities tablosunu kontrol et
        try {
            console.log('\ncities tablosundaki kayıt sayısı:');
            const citiesCount = await pool.query('SELECT COUNT(*) FROM cities');
            console.log(`Toplam ${citiesCount.rows[0].count} ilçe kaydı bulundu`);
        } catch (error) {
            console.log('cities tablosu bulunamadı veya erişim hatası:', error.message);
        }
        
    } catch (error) {
        console.error('Veritabanı bağlantı hatası:', error.message);
        console.error('Hata detayları:', error);
    } finally {
        // Bağlantıyı kapat
        await pool.end();
        console.log('Veritabanı bağlantısı kapatıldı');
    }
}

// Scripti çalıştır
testDbConnection(); 