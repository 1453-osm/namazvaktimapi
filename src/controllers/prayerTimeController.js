const prayerTimeModel = require('../models/prayerTimeModel');
const diyanetApi = require('../utils/diyanetApi');

// Belirli bir ilçe ve tarih için namaz vakitlerini getir
const getPrayerTimeByDate = async (req, res) => {
  try {
    const { cityId, date } = req.params;
    
    if (!cityId || !date) {
      return res.status(400).json({
        status: 'error',
        message: 'İlçe ID ve tarih parametreleri gerekli'
      });
    }
    
    // Tarih formatı kontrolü
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı'
      });
    }
    
    // Veritabanından namaz vakitlerini kontrol et
    let prayerTime = await prayerTimeModel.getPrayerTimeByDate(cityId, date);
    
    // Veritabanında yoksa Diyanet API'den çek
    if (!prayerTime) {
      try {
        // API'den tarih aralığını al
        const dateRangeResponse = await diyanetApi.getPrayerTimeDateRange();
        
        if (dateRangeResponse && dateRangeResponse.isSuccess && dateRangeResponse.data) {
          const { startDate, endDate } = dateRangeResponse.data;
          
          // Diyanet API'den namaz vakitlerini çek
          const prayerTimesResponse = await diyanetApi.getPrayerTimesByDateRangeAndCity(
            cityId, 
            date, // Tek günlük veri için aynı tarih
            date
          );
          
          if (prayerTimesResponse && prayerTimesResponse.isSuccess && prayerTimesResponse.data && prayerTimesResponse.data.length > 0) {
            // API'den gelen veriyi işle
            const prayerTimeData = prayerTimesResponse.data[0];
            
            // Veritabanına kaydet
            prayerTime = await prayerTimeModel.createPrayerTime(
              parseInt(cityId),
              date,
              prayerTimeData.fajr,
              prayerTimeData.sunrise,
              prayerTimeData.dhuhr,
              prayerTimeData.asr,
              prayerTimeData.maghrib,
              prayerTimeData.isha,
              prayerTimeData.qibla,
              prayerTimeData.gregorianDate,
              prayerTimeData.hijriDate
            );
          }
        }
      } catch (apiError) {
        console.error('Diyanet API namaz vakitleri hatası:', apiError);
      }
    }
    
    if (!prayerTime) {
      return res.status(404).json({
        status: 'error',
        message: 'Belirtilen tarih ve ilçe için namaz vakitleri bulunamadı'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: prayerTime
    });
  } catch (error) {
    console.error('Namaz vakitlerini getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Namaz vakitlerini getirirken bir hata oluştu'
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
    
    // Tarih formatı kontrolü
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı'
      });
    }
    
    // Eksik günleri belirle
    const dbPrayerTimes = await prayerTimeModel.getPrayerTimesByDateRange(cityId, startDate, endDate);
    
    // Veritabanında bulunan tarihleri set olarak tut
    const existingDates = new Set(dbPrayerTimes.map(pt => pt.date));
    
    // Tüm tarih aralığı oluştur
    const allDates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    while (currentDate <= lastDate) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Eksik tarihleri bul
    const missingDates = allDates.filter(date => !existingDates.has(date));
    
    // Eksik tarihler varsa, API'den çek ve veritabanına ekle
    if (missingDates.length > 0) {
      try {
        // İstek yükünü azaltmak için aylık dilimlere bölelim
        const monthGroups = {};
        
        missingDates.forEach(date => {
          const month = date.substring(0, 7); // YYYY-MM formatı
          if (!monthGroups[month]) {
            monthGroups[month] = [];
          }
          monthGroups[month].push(date);
        });
        
        // Her ay için ayrı istek yap
        for (const month in monthGroups) {
          const monthDates = monthGroups[month];
          const monthStartDate = monthDates[0];
          const monthEndDate = monthDates[monthDates.length - 1];
          
          // Diyanet API'den bu tarih aralığı için namaz vakitlerini çek
          const prayerTimesResponse = await diyanetApi.getPrayerTimesByDateRangeAndCity(
            cityId, 
            monthStartDate,
            monthEndDate
          );
          
          if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data) {
            // Her günü veritabanına kaydet
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
        
        // Güncel verileri tekrar çek
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
    
    // Veritabanından bayram vakitlerini kontrol et
    let eidTimes = await prayerTimeModel.getEidTimes(cityId);
    
    // Veritabanında yoksa veya az ise Diyanet API'den çek
    if (eidTimes.length === 0) {
      try {
        // Diyanet API'den bayram vakitlerini al
        const eidResponse = await diyanetApi.getEid(cityId);
        
        if (eidResponse && eidResponse.isSuccess && eidResponse.data) {
          // Her bayram vakti için veritabanına kaydet
          const savePromises = eidResponse.data.map(async (eid) => {
            return await prayerTimeModel.createEidTime(
              parseInt(cityId),
              eid.date,
              eid.time,
              eid.type
            );
          });
          
          await Promise.all(savePromises);
          
          // Güncel verileri tekrar çek
          eidTimes = await prayerTimeModel.getEidTimes(cityId);
        }
      } catch (apiError) {
        console.error('Diyanet API bayram vakitleri hatası:', apiError);
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: eidTimes
    });
  } catch (error) {
    console.error('Bayram vakitlerini getirirken hata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Bayram vakitlerini getirirken bir hata oluştu'
    });
  }
};

module.exports = {
  getPrayerTimeByDate,
  getPrayerTimesByDateRange,
  getEidTimes
}; 