const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function initializeDatabase() {
    try {
        // SQL şema dosyasını oku
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Tabloları oluştur
        await pool.query(schema);
        console.log('Veritabanı tabloları başarıyla oluşturuldu.');

        // Bağlantıyı kapat
        await pool.end();
    } catch (error) {
        console.error('Veritabanı tabloları oluşturulurken hata:', error);
        process.exit(1);
    }
}

// Scripti çalıştır
initializeDatabase(); 