/**
 * Günlük içerik tablosunu güncelleyen script
 */

const fs = require('fs');
const path = require('path');
const { client } = require('./turso');

async function updateDailyContentSchema() {
    try {
        console.log('Günlük içerik tablosu güncelleniyor...');
        
        // SQL dosyasını oku
        const sqlFilePath = path.join(__dirname, 'update_daily_content_schema.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        // SQL komutlarını ayır
        const sqlCommands = sql.split(';').filter(cmd => cmd.trim() !== '');
        
        // Her bir SQL komutunu çalıştır
        for (const cmd of sqlCommands) {
            console.log(`SQL komutu çalıştırılıyor: ${cmd.substring(0, 50)}...`);
            await client.execute(cmd);
        }
        
        console.log('Günlük içerik tablosu başarıyla güncellendi.');
    } catch (error) {
        console.error('Günlük içerik tablosu güncellenirken hata:', error.message);
        process.exit(1);
    }
}

// Script'i çalıştır
updateDailyContentSchema().catch(err => {
    console.error('Script çalıştırma hatası:', err.message);
    process.exit(1);
}); 