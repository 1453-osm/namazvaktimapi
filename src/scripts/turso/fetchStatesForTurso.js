const diyanetService = require('../../services/diyanetService');
const { client } = require('../../config/turso');

async function fetchAndSaveStates() {
    try {
        console.log('Turso veritabanından ülke verileri alınıyor...');
        
        // Turso'dan ülke verilerini çek
        const countriesResult = await client.execute('SELECT id, name FROM countries');
        const countries = countriesResult.rows;
        
        if (!countries.length) {
            console.log('Veritabanında ülke verisi bulunamadı. Önce ülke verilerini ekleyin!');
            return;
        }
        
        console.log(`${countries.length} ülke bulundu, şehir verileri çekiliyor...`);

        // Her ülke için şehirleri çek ve kaydet
        for (const country of countries) {
            console.log(`${country.name} (ID: ${country.id}) için şehirler çekiliyor...`);
            
            try {
                const response = await diyanetService.getStates(country.id);
                const states = response.data;
                
                if (!states || !states.length) {
                    console.log(`${country.name} için şehir verisi bulunamadı.`);
                    continue;
                }
                
                console.log(`${country.name} için ${states.length} şehir bulundu, kaydediliyor...`);
                
                // Şehirleri veritabanına kaydet
                for (const state of states) {
                    const query = `
                        INSERT OR REPLACE INTO states (id, country_id, code, name, updated_at)
                        VALUES (?, ?, ?, ?, datetime('now'))
                    `;
                    
                    await client.execute({
                        sql: query,
                        args: [state.id, country.id, state.code, state.name]
                    });
                }
                
                console.log(`${country.name} için şehir verileri kaydedildi.`);
            } catch (error) {
                console.error(`${country.name} için şehir verileri alınırken hata oluştu:`, error.message);
            }
        }

        console.log('Tüm şehir verileri Turso veritabanına başarıyla kaydedildi.');
    } catch (error) {
        console.error('Hata:', error.message);
    }
}

// Scripti çalıştır
if (require.main === module) {
    fetchAndSaveStates()
        .then(() => {
            console.log('İşlem tamamlandı.');
            process.exit(0);
        })
        .catch(err => {
            console.error('İşlem sırasında hata oluştu:', err);
            process.exit(1);
        });
}

module.exports = fetchAndSaveStates; 