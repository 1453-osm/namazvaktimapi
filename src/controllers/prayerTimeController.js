const prayerTimeModel = require('../models/prayerTimeModel');
const diyanetApi = require('../utils/diyanetApi');

// Belirli bir ilçe ve tarih için namaz vakitlerini getir
const getPrayerTimeByDate = async (req, res) => {
  try {
    const { cityId, date } = req.params;
    
    console.log(`Basitleştirilmiş namaz vakti sorgusu: İlçe ID: ${cityId}, Tarih: ${date}`);
    
    // SQL sorguları için doğrudan db bağlantısı
    const db = require('../config/db');
    const turso = require('../config/turso');
    
    try {
      // 1. Mevcut tabloları kontrol et
      console.log("⏳ Veritabanı tabloları kontrol ediliyor...");
      const tableCheckQuery = "SELECT name FROM sqlite_master WHERE type='table'";
      const tableCheckResult = await turso.execute(tableCheckQuery);
      console.log("✅ Tablo Listesi:", JSON.stringify(tableCheckResult.rows));
      
      // 2. Diyanet API ile ilgili verileri kaydet
      console.log("⏳ Diyanet API'den veri çekiliyor...");
      try {
        const diyanetApi = require('../utils/diyanetApi');
        
        // API'den namaz vakitlerini çek
        const prayerTimesResponse = await diyanetApi.getPrayerTimesByDateRangeAndCity(
          cityId, 
          date,
          date
        );
        
        if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data && prayerTimesResponse.data.length > 0) {
          console.log("✅ Diyanet API'den veriler başarıyla alındı:", prayerTimesResponse.data.length);
          
          // API'den gelen veriyi doğrudan yanıt olarak döndür
          const apiData = prayerTimesResponse.data[0];
          return res.status(200).json({
            status: 'success',
            source: 'diyanet_api',
            data: apiData
          });
        } else {
          console.log("❌ Diyanet API'den veri alınamadı veya veri boş");
          return res.status(404).json({
            status: 'error',
            message: 'Belirtilen tarih için namaz vakti bulunamadı (API yanıtı boş)'
          });
        }
      } catch (apiError) {
        console.error("❌ Diyanet API hatası:", apiError);
        return res.status(500).json({
          status: 'error',
          message: 'Diyanet API\'den veri alırken hata: ' + apiError.message
        });
      }
      
    } catch (dbError) {
      console.error("❌ Veritabanı hatası:", dbError);
      return res.status(500).json({
        status: 'error',
        message: 'Veritabanı sorgusu hatası: ' + dbError.message
      });
    }
  } catch (error) {
    console.error("❌ Genel hata:", error);
    res.status(500).json({
      status: 'error',
      message: 'Namaz vakitlerini getirirken bir hata oluştu: ' + error.message
    });
  }
};

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
const getPrayerTimesByDateRange = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!cityId || !startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'İlçe ID, başlangıç tarihi ve bitiş tarihi parametreleri gerekli'
      });
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı'
      });
    }
    
    const dbPrayerTimes = await prayerTimeModel.getPrayerTimesByDateRange(cityId, startDate, endDate);
    
    const existingDates = new Set(dbPrayerTimes.map(pt => pt.date));
    
    const allDates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    while (currentDate <= lastDate) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const missingDates = allDates.filter(date => !existingDates.has(date));
    
    if (missingDates.length > 0) {
      try {
        const monthGroups = {};
        
        missingDates.forEach(date => {
          const month = date.substring(0, 7);
          if (!monthGroups[month]) {
            monthGroups[month] = [];
          }
          monthGroups[month].push(date);
        });
        
        for (const month in monthGroups) {
          const monthDates = monthGroups[month];
          const monthStartDate = monthDates[0];
          const monthEndDate = monthDates[monthDates.length - 1];
          
          const prayerTimesResponse = await diyanetApi.getPrayerTimesByDateRangeAndCity(
            cityId, 
            monthStartDate,
            monthEndDate
          );
          
          if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data) {
            const savePromises = prayerTimesResponse.data.map(async (pt) => {
              return await prayerTimeModel.createPrayerTime(
                parseInt(cityId),
                pt.date,
                pt.fajr,
                pt.sunrise,
                pt.dhuhr,
                pt.asr,
                pt.maghrib,
                pt.isha,
                pt.qibla,
                pt.gregorianDate,
                pt.hijriDate
              );
            });
            
            await Promise.all(savePromises);
          }
        }
        
        const updatedPrayerTimes = await prayerTimeModel.getPrayerTimesByDateRange(cityId, startDate, endDate);
        dbPrayerTimes.push(...updatedPrayerTimes.filter(pt => !existingDates.has(pt.date)));
      } catch (apiError) {
        console.error('Diyanet API namaz vakitleri hatası:', apiError);
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: dbPrayerTimes
    });
  } catch (error) {
    console.error('Namaz vakitlerini getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Namaz vakitlerini getirirken bir hata oluştu'
    });
  }
};

// Belirli bir ilçe için bayram namazı vakitlerini getir
const getEidTimes = async (req, res) => {
  try {
    const { cityId } = req.params;
    
    if (!cityId) {
      return res.status(400).json({
        status: 'error',
        message: 'İlçe ID parametresi gerekli'
      });
    }
    
    let eidTimes = await prayerTimeModel.getEidTimes(cityId);
    
    // Eğer veritabanında kayıt yoksa Diyanet API'den çekelim
    if (eidTimes.length === 0) {
      try {
        const eidResponse = await diyanetApi.getEid(cityId);
        
        if (eidResponse && eidResponse.success && eidResponse.data) {
          // Bayram namazı verilerini kaydedelim
          const savePromises = eidResponse.data.map(async (eid) => {
            return await prayerTimeModel.createEidTime(
              parseInt(cityId),
              eid.date,
              eid.time,
              eid.type
            );
          });
          
          await Promise.all(savePromises);
          
          // Güncel listeyi tekrar çekelim
          eidTimes = await prayerTimeModel.getEidTimes(cityId);
        }
      } catch (apiError) {
        console.error('Bayram namazı vakti API hatası:', apiError);
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: eidTimes
    });
  } catch (error) {
    console.error('Bayram namazı vakitlerini getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Bayram namazı vakitlerini getirirken bir hata oluştu'
    });
  }
};

module.exports = {
  getPrayerTimeByDate,
  getPrayerTimesByDateRange,
  getEidTimes
}; 