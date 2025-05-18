const prayerTimeModel = require('../models/prayerTimeModel');
const diyanetApi = require('../utils/diyanetApi');

// Belirli bir ilçe ve tarih için namaz vakitlerini getir
const getPrayerTimeByDate = async (req, res) => {
  try {
    console.log('=== NAMAZ VAKTİ İSTEĞİ BAŞLADI ===');
    console.log(`URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    console.log(`METHOD: ${req.method}`);
    console.log(`PARAMS:`, req.params);
    console.log(`QUERY:`, req.query);
    
    const { cityId, date } = req.params;
    
    console.log(`API PATH: /api/prayers/${cityId}/${date}`);
    console.log(`İlçe ID: ${cityId}, Tarih: ${date}`);
    
    // Format kontrolü
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      console.log(`❌ Geçersiz tarih formatı: ${date}, beklenen format: YYYY-MM-DD`);
      return res.status(400).json({
        status: 'error',
        message: 'Geçersiz tarih formatı. YYYY-MM-DD formatında olmalı.'
      });
    }

    // 1. Veritabanından kontrol - Detaylı debug
    try {
      console.log(`🔍 Veritabanında namaz vakti aranıyor (cityId: ${cityId}, date: ${date})...`);
      console.log(`📊 SQL QUERY - İlk sorgu: city_id = ${cityId} AND date = ${date}`);
      
      const dbResult = await prayerTimeModel.getPrayerTimeByDate(cityId, date);
      
      console.log(`📊 SQL QUERY RESULT:`, dbResult ? 'Veri bulundu' : 'Veri bulunamadı');
      
      if (dbResult) {
        console.log(`✅ Veritabanında namaz vakti bulundu, ID: ${dbResult.id || 'ID YOK'}`);
        console.log(`✅ İlçe Adı: ${dbResult.city_name || 'Belirtilmemiş'}`);
        console.log(`✅ Tarih: ${dbResult.date || 'Belirtilmemiş'}`);
        
        // Veri döndürülmeden önce city_id değerini kontrol et
        console.log(`✅ İlçe ID (Veritabanı): ${dbResult.city_id || 'YOK'}`);
        console.log(`✅ İstek İlçe ID: ${cityId}`);
        
        // Response verisi
        console.log(`🔄 Response verisi (önizleme):`, JSON.stringify(dbResult).substring(0, 200) + "...");
        
        return res.status(200).json({
          status: 'success',
          source: 'database',
          data: dbResult
        });
      }
      
      console.log(`⚠️ Veritabanında namaz vakti bulunamadı, Diyanet API'den alınacak`);
    } catch (dbError) {
      console.error(`⚠️ Veritabanı sorgulama hatası:`, dbError);
      console.error('Hata türü:', dbError.name);
      console.error('Hata mesajı:', dbError.message);
      console.error('Hata detayları:', dbError.stack);
      console.log(`⚠️ Diyanet API'den veri alınmaya çalışılacak`);
    }
    
    // 2. Diyanet API'den al
    try {
      console.log(`⏳ Diyanet API'den namaz vakitleri çekiliyor (cityId: ${cityId}, date: ${date})...`);
      
      const prayerTimesResponse = await diyanetApi.getPrayerTimesByDateRangeAndCity(
        cityId, 
        date,
        date
      );
      
      console.log(`📡 API Yanıt Türü:`, typeof prayerTimesResponse);
      console.log(`📡 API Başarı Durumu:`, prayerTimesResponse?.success);
      console.log(`📡 API Veri Sayısı:`, prayerTimesResponse?.data?.length || 0);
      
      if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data && prayerTimesResponse.data.length > 0) {
        console.log(`✅ Diyanet API'den veri alındı, veri sayısı: ${prayerTimesResponse.data.length}`);
        
        const apiData = prayerTimesResponse.data[0];
        console.log("📊 API Veri Özeti:", JSON.stringify(apiData).substring(0, 100) + "...");
        console.log("📊 API Tarihi:", apiData.date || "Tarih bilgisi yok");
        console.log("📊 API İlçe Bilgisi:", apiData.cityId || apiData.city_id || "İlçe ID bilgisi yok");
        
        // Veritabanına kaydet (arka planda, kullanıcıyı bekletmeden)
        try {
          console.log(`💾 Namaz vakti veritabanına kaydediliyor...`);
          
          // API'den gelen verileri formatlayıp veritabanına kaydet
          const formattedData = prayerTimeModel.formatPrayerTimeFromAPI(apiData, cityId);
          console.log(`📊 Formatlanmış Veri (önizleme):`, JSON.stringify(formattedData).substring(0, 150) + "...");
          console.log(`📊 Formatlanmış Tarih:`, formattedData.date);
          console.log(`📊 Formatlanmış İlçe ID:`, formattedData.cityId);
          
          // Asenkron olarak kaydet (await yok, yanıtı beklemiyoruz)
          prayerTimeModel.createPrayerTime(
            formattedData.cityId,
            formattedData.date,
            formattedData.fajr,
            formattedData.sunrise,
            formattedData.dhuhr,
            formattedData.asr,
            formattedData.maghrib,
            formattedData.isha,
            formattedData.qibla,
            formattedData.gregorianDate,
            formattedData.hijriDate,
            formattedData.gregorianDateShort,
            formattedData.gregorianDateLong,
            formattedData.gregorianDateIso8601,
            formattedData.gregorianDateShortIso8601,
            formattedData.hijriDateShort,
            formattedData.hijriDateLong,
            formattedData.hijriDateShortIso8601,
            formattedData.hijriDateLongIso8601,
            formattedData.astronomicalSunset,
            formattedData.astronomicalSunrise,
            formattedData.qiblaTime,
            formattedData.greenwichMeanTimezone,
            formattedData.shapeMoonUrl
          ).then((savedData) => {
            console.log(`✅ Namaz vakti veritabanına kaydedildi`, savedData ? `ID: ${savedData.id}` : '');
          }).catch(saveError => {
            console.error(`❌ Namaz vakti veritabanına kaydedilemedi:`, saveError.message);
          });
        } catch (saveError) {
          console.error(`❌ Veritabanına kayıt hazırlama hatası:`, saveError.message);
        }
        
        // API verilerini doğrudan döndür
        return res.status(200).json({
          status: 'success',
          source: 'diyanet_api',
          data: apiData
        });
      } else {
        console.log(`❌ Diyanet API'den veri alınamadı veya veri boş`);
        console.log('API Yanıtı:', JSON.stringify(prayerTimesResponse).substring(0, 200) + "...");
        
        return res.status(404).json({
          status: 'error',
          message: 'Belirtilen tarih için namaz vakti verisi bulunamadı',
          date: date,
          cityId: cityId
        });
      }
    } catch (apiError) {
      console.error(`❌ Diyanet API'den veri alırken hata oluştu:`, apiError);
      console.error('Hata Detayları:', apiError.message);
      console.error('Hata Yığını:', apiError.stack);
      
      return res.status(500).json({
        status: 'error',
        message: 'Diyanet API sorgu hatası: ' + apiError.message
      });
    }
  } catch (error) {
    console.error('❌ GENEL HATA:', error);
    console.error('Hata Detayı:', error.message);
    console.error('Hata Yığını:', error.stack);
    
    res.status(500).json({
      status: 'error',
      message: 'Namaz vakitleri getirilirken bir hata oluştu: ' + error.message
    });
  } finally {
    console.log('=== NAMAZ VAKTİ İSTEĞİ TAMAMLANDI ===');
  }
};

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
const getPrayerTimesByDateRange = async (req, res) => {
  try {
    console.log('=== NAMAZ VAKİTLERİ TARİH ARALIĞI İSTEĞİ BAŞLADI ===');
    console.log(`URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    console.log(`METHOD: ${req.method}`);
    console.log(`PARAMS:`, req.params);
    console.log(`QUERY:`, req.query);
    
    const { cityId } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`İlçe ID: ${cityId}, Başlangıç: ${startDate}, Bitiş: ${endDate}`);
    
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
    
    // Doğrudan Diyanet API'den al
    try {
      console.log(`⏳ Diyanet API'den namaz vakitleri çekiliyor...`);
      
      const prayerTimesResponse = await diyanetApi.getPrayerTimesByDateRangeAndCity(
        cityId, 
        startDate,
        endDate
      );
      
      if (prayerTimesResponse && prayerTimesResponse.success && prayerTimesResponse.data && prayerTimesResponse.data.length > 0) {
        console.log(`✅ Diyanet API'den veri alındı, veri sayısı: ${prayerTimesResponse.data.length}`);
        
        // Veritabanına kaydetme işlemini arka planda yap
        try {
          console.log(`💾 Namaz vakitleri veritabanına kaydediliyor...`);
          prayerTimeModel.createPrayerTimesInBulk(cityId, prayerTimesResponse.data)
            .then(() => {
              console.log(`✅ Namaz vakitleri veritabanına kaydedildi`);
            })
            .catch(bulkSaveError => {
              console.error(`❌ Namaz vakitlerinin toplu kaydında hata:`, bulkSaveError.message);
            });
        } catch (saveError) {
          console.error(`❌ Toplu kayıt hazırlık hatası:`, saveError.message);
        }
        
        // API verilerini doğrudan döndür
        return res.status(200).json({
          status: 'success',
          source: 'diyanet_api',
          data: prayerTimesResponse.data
        });
      } else {
        console.log(`❌ Diyanet API'den veri alınamadı veya veri boş`);
        
        // Veritabanından kontrol et
        try {
          console.log(`🔍 Veritabanında tarih aralığındaki namaz vakitleri aranıyor...`);
          const dbPrayerTimes = await prayerTimeModel.getPrayerTimesByDateRange(cityId, startDate, endDate);
          
          if (dbPrayerTimes && dbPrayerTimes.length > 0) {
            console.log(`✅ Veritabanında ${dbPrayerTimes.length} adet namaz vakti bulundu`);
            return res.status(200).json({
              status: 'success',
              source: 'database',
              data: dbPrayerTimes
            });
          } else {
            console.log(`❌ Veritabanında da namaz vakti bulunamadı`);
          }
        } catch (dbError) {
          console.error(`❌ Veritabanı sorgulama hatası:`, dbError.message);
        }
        
        return res.status(404).json({
          status: 'error',
          message: 'Belirtilen tarih aralığında namaz vakti verisi bulunamadı'
        });
      }
    } catch (apiError) {
      console.error(`❌ Diyanet API'den veri alırken hata oluştu:`, apiError);
      
      // API hatası durumunda veritabanını kontrol et
      try {
        console.log(`🔍 API hatası nedeniyle veritabanında tarih aralığındaki namaz vakitleri aranıyor...`);
        const dbPrayerTimes = await prayerTimeModel.getPrayerTimesByDateRange(cityId, startDate, endDate);
        
        if (dbPrayerTimes && dbPrayerTimes.length > 0) {
          console.log(`✅ Veritabanında ${dbPrayerTimes.length} adet namaz vakti bulundu`);
          return res.status(200).json({
            status: 'success',
            source: 'database_fallback',
            data: dbPrayerTimes
          });
        }
      } catch (dbError) {
        console.error(`❌ Veritabanı sorgulama hatası:`, dbError.message);
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Namaz vakitleri alınırken API hatası oluştu: ' + apiError.message
      });
    }
  } catch (error) {
    console.error('❌ GENEL HATA:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Namaz vakitleri getirilirken bir hata oluştu: ' + error.message
    });
  } finally {
    console.log('=== NAMAZ VAKİTLERİ TARİH ARALIĞI İSTEĞİ TAMAMLANDI ===');
  }
};

// Belirli bir ilçe için bayram namazı vakitlerini getir
const getEidTimes = async (req, res) => {
  try {
    console.log('=== BAYRAM NAMAZI VAKİTLERİ İSTEĞİ BAŞLADI ===');
    const { cityId } = req.params;
    
    if (!cityId) {
      return res.status(400).json({
        status: 'error',
        message: 'İlçe ID parametresi gerekli'
      });
    }
    
    // Doğrudan Diyanet API'den al
    try {
      console.log(`⏳ Diyanet API'den bayram namazı vakitleri çekiliyor...`);
      const eidResponse = await diyanetApi.getEid(cityId);
      
      if (eidResponse && eidResponse.success && eidResponse.data && eidResponse.data.length > 0) {
        console.log(`✅ Diyanet API'den veri alındı, veri sayısı: ${eidResponse.data.length}`);
        
        // Veritabanına kaydet (arka planda)
        try {
          const savePromises = eidResponse.data.map(eid => 
            prayerTimeModel.createEidTime(
              parseInt(cityId),
              eid.date,
              eid.time,
              eid.type
            )
          );
          
          Promise.all(savePromises)
            .then(() => console.log(`✅ Bayram namazı vakitleri veritabanına kaydedildi`))
            .catch(saveError => console.error(`❌ Bayram namazı vakitlerini kaydetme hatası:`, saveError.message));
        } catch (saveError) {
          console.error(`❌ Veritabanına kayıt hazırlama hatası:`, saveError.message);
        }
        
        // API verilerini doğrudan döndür
        return res.status(200).json({
          status: 'success',
          source: 'diyanet_api',
          data: eidResponse.data
        });
      } else {
        console.log(`❌ Diyanet API'den bayram namazı verileri alınamadı veya veri boş`);
        
        // Veritabanından kontrol et
        try {
          console.log(`🔍 Veritabanında bayram namazı vakitleri aranıyor...`);
          const eidTimes = await prayerTimeModel.getEidTimes(cityId);
          
          if (eidTimes && eidTimes.length > 0) {
            console.log(`✅ Veritabanında ${eidTimes.length} adet bayram namazı vakti bulundu`);
            return res.status(200).json({
              status: 'success',
              source: 'database',
              data: eidTimes
            });
          }
        } catch (dbError) {
          console.error(`❌ Veritabanı bayram namazı vakti sorgulama hatası:`, dbError.message);
        }
        
        return res.status(404).json({
          status: 'error',
          message: 'Bayram namazı vakti verisi bulunamadı'
        });
      }
    } catch (apiError) {
      console.error(`❌ Diyanet API'den bayram namazı vakitleri alınırken hata:`, apiError.message);
      
      // API hatası durumunda veritabanını kontrol et
      try {
        console.log(`🔍 API hatası nedeniyle veritabanında bayram namazı vakitleri aranıyor...`);
        const eidTimes = await prayerTimeModel.getEidTimes(cityId);
        
        if (eidTimes && eidTimes.length > 0) {
          console.log(`✅ Veritabanında ${eidTimes.length} adet bayram namazı vakti bulundu`);
          return res.status(200).json({
            status: 'success',
            source: 'database_fallback',
            data: eidTimes
          });
        }
      } catch (dbError) {
        console.error(`❌ Veritabanı bayram namazı vakti sorgulama hatası:`, dbError.message);
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Bayram namazı vakitleri alınırken API hatası oluştu: ' + apiError.message
      });
    }
  } catch (error) {
    console.error('❌ GENEL HATA:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Bayram namazı vakitleri getirilirken bir hata oluştu: ' + error.message
    });
  } finally {
    console.log('=== BAYRAM NAMAZI VAKİTLERİ İSTEĞİ TAMAMLANDI ===');
  }
};

module.exports = {
  getPrayerTimeByDate,
  getPrayerTimesByDateRange,
  getEidTimes
}; 