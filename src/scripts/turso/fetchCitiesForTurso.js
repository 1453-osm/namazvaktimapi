const diyanetService = require('../../services/diyanetService');
const { client } = require('../../config/turso');

async function fetchAndSaveCities() {
    try {
        console.log('Turso veritabanından şehir verileri alınıyor...');
        
        // Turso'dan şehir verilerini çek
        const statesResult = await client.execute('SELECT id, name FROM states');
        const states = statesResult.rows;
        
        if (!states.length) {
            console.log('Veritabanında şehir verisi bulunamadı. Önce şehir verilerini ekleyin!');
            return;
        }
        
        console.log(`${states.length} şehir bulundu, ilçe verileri çekiliyor...`);
        let totalCities = 0;

        // Her şehir için ilçeleri çek ve kaydet
        for (const state of states) {
            console.log(`${state.name} (ID: ${state.id}) için ilçeler çekiliyor...`);
            
            try {
                const response = await diyanetService.getCities(state.id);
                const cities = response.data;
                
                if (!cities || !cities.length) {
                    console.log(`${state.name} için ilçe verisi bulunamadı.`);
                    continue;
                }
                
                console.log(`${state.name} için ${cities.length} ilçe bulundu, kaydediliyor...`);
                totalCities += cities.length;
                
                // İlçeleri veritabanına kaydet
                for (const city of cities) {
                    const query = `
                        INSERT OR REPLACE INTO cities (id, state_id, code, name, updated_at)
                        VALUES (?, ?, ?, ?, datetime('now'))
                    `;
                    
                    await client.execute({
                        sql: query,
                        args: [city.id, state.id, city.code, city.name]
                    });
                }
                
                console.log(`${state.name} için ilçe verileri kaydedildi.`);
            } catch (error) {
                console.error(`${state.name} için ilçe verileri alınırken hata oluştu:`, error.message);
            }
        }

        console.log(`Toplam ${totalCities} ilçe verisi Turso veritabanına başarıyla kaydedildi.`);
    } catch (error) {
        console.error('Hata:', error.message);
    }
}

// Scripti çalıştır
if (require.main === module) {
    fetchAndSaveCities()
        .then(() => {
            console.log('İşlem tamamlandı.');
            process.exit(0);
        })
        .catch(err => {
            console.error('İşlem sırasında hata oluştu:', err);
            process.exit(1);
        });
}

module.exports = fetchAndSaveCities; 