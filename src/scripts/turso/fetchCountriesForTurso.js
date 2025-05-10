const diyanetService = require('../../services/diyanetService');
const { client } = require('../../config/turso');

async function fetchAndSaveCountries() {
    try {
        console.log('Diyanet API\'den ülke verileri çekiliyor...');
        
        // Diyanet API'den ülke verilerini çek
        const response = await diyanetService.getCountries();
        const countries = response.data;
        console.log(`${countries.length} ülke verisi çekildi.`);

        // Veritabanına kaydet
        for (const country of countries) {
            const query = `
                INSERT OR REPLACE INTO countries (id, code, name, updated_at) 
                VALUES (?, ?, ?, datetime('now'))
            `;
            
            await client.execute({
                sql: query,
                args: [country.id, country.code, country.name]
            });
        }

        console.log('Ülke verileri Turso veritabanına başarıyla kaydedildi.');
    } catch (error) {
        console.error('Hata:', error.message);
    }
}

// Scripti çalıştır
if (require.main === module) {
    fetchAndSaveCountries()
        .then(() => {
            console.log('İşlem tamamlandı.');
            process.exit(0);
        })
        .catch(err => {
            console.error('İşlem sırasında hata oluştu:', err);
            process.exit(1);
        });
}

module.exports = fetchAndSaveCountries; 