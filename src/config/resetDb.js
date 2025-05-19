const { pool } = require('./db');

async function resetDatabase() {
    try {
        // Mevcut tabloları sil
        await pool.query(`
            DROP TABLE IF EXISTS prayer_times CASCADE;
            DROP TABLE IF EXISTS cities CASCADE;
            DROP TABLE IF EXISTS states CASCADE;
            DROP TABLE IF EXISTS countries CASCADE;
        `);
        console.log('Mevcut tablolar silindi.');

        // Şema dosyasını oku ve tabloları oluştur
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('Tablolar yeniden oluşturuldu.');
    } catch (error) {
        console.error('Hata:', error.message);
    } finally {
        await pool.end();
    }
}

// Scripti çalıştır
resetDatabase(); 