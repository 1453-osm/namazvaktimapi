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
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tarih formatı geçersiz. YYYY-MM-DD formatında olmalı'
      });
    }
    
    let prayerTime = await prayerTimeModel.getPrayerTimeByDate(cityId, date);
    
    if (!prayerTime) {
      try {
        const dateRangeResponse = await diyanetApi.getPrayerTimeDateRange();
        
        if (dateRangeResponse && dateRangeResponse.success && dateRangeResponse.data) {
          const prayerTimesResponse = await diyanetApi.getPrayerTimesByDateRangeAndCity(
            cityId, 
            date,
            date
          );
          
          if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data && prayerTimesResponse.data.length > 0) {
            const prayerTimeData = prayerTimesResponse.data[0];
            
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
              prayerTimeData.hijriDate,
              prayerTimeData.gregorianDateShort,
              prayerTimeData.gregorianDateLong,
              prayerTimeData.gregorianDateIso8601,
              prayerTimeData.gregorianDateShortIso8601,
              prayerTimeData.hijriDateShort,
              prayerTimeData.hijriDateLong,
              prayerTimeData.hijriDateShortIso8601,
              prayerTimeData.hijriDateLongIso8601,
              prayerTimeData.astronomicalSunset,
              prayerTimeData.astronomicalSunrise,
              prayerTimeData.qiblaTime,
              prayerTimeData.greenwichMeanTimeZone,
              prayerTimeData.shapeMoonUrl
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