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
          
          // Burada Diyanet API'nin namaz vakitleri endpoint'i yok.
          // Gerçek entegrasyonda burada ilgili API çağrısı yapılacak
          
          // Örnek veri:
          const mockDiyanetData = {
            cityId: parseInt(cityId),
            date,
            fajr: '05:30',
            sunrise: '07:00',
            dhuhr: '12:30',
            asr: '15:45',
            maghrib: '18:30',
            isha: '20:00',
            qibla: '123.45',
            gregorianDate: date,
            hijriDate: '1444-09-15'
          };
          
          // Veritabanına kaydet
          prayerTime = await prayerTimeModel.createPrayerTime(
            mockDiyanetData.cityId,
            mockDiyanetData.date,
            mockDiyanetData.fajr,
            mockDiyanetData.sunrise,
            mockDiyanetData.dhuhr,
            mockDiyanetData.asr,
            mockDiyanetData.maghrib,
            mockDiyanetData.isha,
            mockDiyanetData.qibla,
            mockDiyanetData.gregorianDate,
            mockDiyanetData.hijriDate
          );
          
          // İlişkili bilgileri manuel ekle
          prayerTime = {
            ...prayerTime,
            city_name: 'Bilinmiyor',
            state_name: 'Bilinmiyor',
            country_name: 'Bilinmiyor'
          };
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
    
    // Veritabanından namaz vakitlerini al
    const prayerTimes = await prayerTimeModel.getPrayerTimesByDateRange(cityId, startDate, endDate);
    
    // TODO: Eğer veritabanında eksik günler varsa, Diyanet API'den tamamlanabilir
    
    res.status(200).json({
      status: 'success',
      data: prayerTimes
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