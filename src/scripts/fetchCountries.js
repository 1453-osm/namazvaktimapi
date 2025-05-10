const diyanetService = require('../services/diyanetService');
const { pool } = require('../config/db');

async function fetchAndSaveCountries() {
    try {
        // Diyanet API'den ülke verilerini çek
        const response = await diyanetService.getCountries();
        const countries = response.data;
        console.log('Çekilen ülke verileri:', countries);
        console.log(`${countries.length} ülke verisi çekildi.`);

        // Veritabanına kaydet
        for (const country of countries) {
            await pool.query(
                'INSERT INTO countries (id, code, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET code = $2, name = $3',
                [country.id, country.code, country.name]
            );
        }

        console.log('Ülke verileri başarıyla kaydedildi.');
    } catch (error) {
        console.error('Hata:', error.message);
    } finally {
        await pool.end();
    }
}

// Scripti çalıştır
fetchAndSaveCountries(); 