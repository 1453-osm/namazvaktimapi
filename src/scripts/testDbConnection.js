const { pool, testConnection } = require('../config/db');

async function testDbConnection() {
    let client = null;
    try {
        console.log('=========================================');
        console.log('   VERİTABANI BAĞLANTI TEST RAPORU');
        console.log('=========================================');
        
        // Çevre değişkenlerini kontrol et
        console.log('\n1. ÇEVRE DEĞİŞKENLERİ:');
        
        // DATABASE_URL
        const dbUrlExists = !!process.env.DATABASE_URL;
        console.log(`- DATABASE_URL: ${dbUrlExists ? '✅ TANIMLANMIŞ' : '❌ TANIMLANMAMIŞ'}`);
        
        // GitHub Actions durumu
        const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
        console.log(`- GitHub Actions: ${isGithubActions ? '✅ EVET' : '❌ HAYIR'}`);
        
        // Neon.tech veritabanı ortamı 
        console.log(`- Neon.tech URL: ${process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') ? '✅ EVET' : '❌ HAYIR'}`);
        
        // Tek bağlantı testi
        console.log('\n2. BAĞLANTI TESTİ:');
        const connected = await testConnection();
        console.log(`- Bağlantı durumu: ${connected ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}`);
        
        if (!connected) {
            console.error('Bağlantı kurulamadı! Veritabanı erişim bilgilerini kontrol edin.');
            return false;
        }
        
        // Bağlantı havuzunu ve bağlantıları test et
        console.log('\n3. VERİTABANI DURUMU:');
        client = await pool.connect();
        
        try {
            // Sunucu bilgisi
            const versionResult = await client.query('SELECT version()');
            console.log(`- PostgreSQL versiyonu: ${versionResult.rows[0].version.split(',')[0]}`);
            
            // Tabloları listele
            const tablesResult = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `);
            
            console.log(`- Tablo sayısı: ${tablesResult.rows.length}`);
            console.log('\n4. TABLOLAR:');
            if (tablesResult.rows.length === 0) {
                console.log('   Hiç tablo bulunamadı!');
                console.log('   Veritabanı şeması oluşturulması gerekiyor: npm run setup-db');
            } else {
                tablesResult.rows.forEach(row => {
                    console.log(`   - ${row.table_name}`);
                });
            }
            
            // Veritabanı içeriğini kontrol et
            console.log('\n5. VERİ DURUMU:');
            
            const tables = ['countries', 'states', 'cities', 'prayer_times', 'eid_times', 'daily_contents', 'update_logs'];
            
            for (const table of tables) {
                try {
                    const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
                    const count = parseInt(countResult.rows[0].count);
                    console.log(`   - ${table}: ${count} kayıt ${count > 0 ? '✅' : '❌'}`);
                } catch (err) {
                    console.log(`   - ${table}: Tablo bulunamadı ❌`);
                }
            }
        } catch (queryError) {
            console.error('Veritabanı sorgulama hatası:', queryError.message);
        }
        
        console.log('\n=========================================');
        console.log('   TEST RAPORU TAMAMLANDI');
        console.log('=========================================\n');
        
        return connected;
    } catch (error) {
        console.error('Veritabanı bağlantı testi hatası:', error.message);
        console.error('Hata detayları:', error);
        return false;
    } finally {
        if (client) {
            client.release();
            console.log('Test bağlantısı serbest bırakıldı.');
        }
        
        try {
            console.log('Bağlantı havuzu kapatılıyor...');
            await pool.end();
            console.log('Bağlantı havuzu başarıyla kapatıldı.');
        } catch (poolError) {
            console.error('Bağlantı havuzu kapatma hatası:', poolError.message);
        }
    }
}

// Eğer doğrudan çalıştırılıyorsa
if (require.main === module) {
    testDbConnection()
        .then(success => {
            if (!success) {
                console.error('Veritabanı bağlantı testi başarısız oldu!');
                process.exit(1);
            }
            console.log('Veritabanı bağlantı testi başarılı!');
        })
        .catch(err => {
            console.error('Test sırasında beklenmeyen hata:', err);
            process.exit(1);
        });
} else {
    // Modül olarak export et
    module.exports = { testDbConnection };
} 