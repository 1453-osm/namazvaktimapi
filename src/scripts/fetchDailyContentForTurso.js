/**
 * Diyanet API'den günlük içerikleri çekip Turso veritabanına kaydeden script
 */

const diyanetService = require('../services/diyanetService');
const { client } = require('../config/turso');

async function fetchAndSaveDailyContent() {
    try {
        console.log('Günlük içerikler çekiliyor...');
        
        // Diyanet API'den günlük içerikleri al
        const dailyContent = await diyanetService.getDailyContent();
        
        if (!dailyContent) {
            console.error('Günlük içerik alınamadı!');
            return;
        }
        
        console.log('Günlük içerikler başarıyla alındı:', JSON.stringify(dailyContent).substring(0, 200) + '...');
        
        // Bugünün tarihini al (YYYY-MM-DD formatında)
        const today = new Date().toISOString().split('T')[0];
        
        // Veritabanına kaydet
        await saveDailyContentToDb(dailyContent, today);
        
        console.log('İşlem başarıyla tamamlandı.');
    } catch (error) {
        console.error('Günlük içerik çekme ve kaydetme hatası:', error.message);
        process.exit(1);
    }
}

async function saveDailyContentToDb(dailyContent, date) {
    try {
        // Veritabanı bağlantısını kontrol et
        console.log('Veritabanı bağlantısı kontrol ediliyor...');
        
        // İçerik tiplerini belirle
        const contentTypes = {
            VERSE: 'VERSE',      // Ayet
            HADITH: 'HADITH',    // Hadis
            PRAYER: 'PRAYER'     // Dua
        };
        
        // Günün yılın kaçıncı günü olduğu bilgisi
        const dayOfYear = dailyContent.dayOfYear || null;
        
        // Ayet bilgisini kaydet
        if (dailyContent.verse) {
            const verseContent = {
                content: dailyContent.verse,
                source: dailyContent.verseSource || '',
                dayOfYear: dayOfYear
            };
            await saveContentItem(verseContent, contentTypes.VERSE, date);
        }
        
        // Hadis bilgisini kaydet
        if (dailyContent.hadith) {
            const hadithContent = {
                content: dailyContent.hadith,
                source: '',
                dayOfYear: dayOfYear
            };
            await saveContentItem(hadithContent, contentTypes.HADITH, date);
        }
        
        // Dua bilgisini kaydet
        if (dailyContent.pray) {
            const prayerContent = {
                content: dailyContent.pray,
                source: dailyContent.praySource || '',
                dayOfYear: dayOfYear
            };
            await saveContentItem(prayerContent, contentTypes.PRAYER, date);
        }
        
        console.log('Tüm günlük içerikler veritabanına kaydedildi.');
    } catch (error) {
        console.error('Veritabanına kaydetme hatası:', error.message);
        throw error;
    }
}

async function saveContentItem(contentItem, contentType, date) {
    try {
        console.log(`${contentType} içeriği kaydediliyor:`, JSON.stringify(contentItem).substring(0, 100) + '...');
        
        // Önce bu tarih ve içerik tipine sahip kayıt var mı kontrol et
        const existingContent = await client.execute({
            sql: 'SELECT id FROM daily_contents WHERE content_date = ? AND content_type = ?',
            args: [date, contentType]
        });
        
        if (existingContent.rows.length > 0) {
            // Kayıt varsa güncelle
            console.log(`${contentType} içeriği zaten var, güncelleniyor...`);
            
            await client.execute({
                sql: `UPDATE daily_contents 
                     SET content = ?, source = ?, day_of_year = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE content_date = ? AND content_type = ?`,
                args: [contentItem.content, contentItem.source, contentItem.dayOfYear, date, contentType]
            });
            
            console.log(`${contentType} içeriği güncellendi.`);
        } else {
            // Kayıt yoksa ekle
            console.log(`${contentType} içeriği ekleniyor...`);
            
            await client.execute({
                sql: `INSERT INTO daily_contents 
                     (content_date, content_type, content, source, day_of_year, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                args: [date, contentType, contentItem.content, contentItem.source, contentItem.dayOfYear]
            });
            
            console.log(`${contentType} içeriği eklendi.`);
        }
    } catch (error) {
        console.error(`${contentType} içeriği kaydedilirken hata:`, error.message);
        throw error;
    }
}

// Script'i çalıştır
fetchAndSaveDailyContent().catch(err => {
    console.error('Script çalıştırma hatası:', err.message);
    process.exit(1);
}); 