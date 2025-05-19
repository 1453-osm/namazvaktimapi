const db = require('../config/db');

// Namaz vakti kaydet (tüm Diyanet API alanlarıyla)
const createPrayerTime = async (
  cityId,
  date,
  fajr,
  sunrise,
  dhuhr,
  asr,
  maghrib,
  isha,
  qibla,
  gregorianDate,
  hijriDate,
  gregorianDateShort = null,
  gregorianDateLong = null,
  gregorianDateIso8601 = null,
  gregorianDateShortIso8601 = null,
  hijriDateShort = null,
  hijriDateLong = null,
  hijriDateShortIso8601 = null,
  hijriDateLongIso8601 = null,
  astronomicalSunset = null,
  astronomicalSunrise = null,
  qiblaTime = null,
  greenwichMeanTimezone = null,
  shapeMoonUrl = null
) => {
  const query = `
    INSERT INTO prayer_times (
      city_id, prayer_date, fajr, sunrise, dhuhr, asr, maghrib, isha, 
      qibla, gregorian_date, hijri_date,
      gregorian_date_short, gregorian_date_long, gregorian_date_iso8601, gregorian_date_short_iso8601,
      hijri_date_short, hijri_date_long, hijri_date_short_iso8601, hijri_date_long_iso8601,
      astronomical_sunset, astronomical_sunrise, qibla_time, greenwich_mean_timezone, shape_moon_url
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    ) 
    ON CONFLICT (city_id, prayer_date) 
    DO UPDATE SET 
      fajr = ?, 
      sunrise = ?, 
      dhuhr = ?, 
      asr = ?, 
      maghrib = ?, 
      isha = ?, 
      qibla = ?, 
      gregorian_date = ?, 
      hijri_date = ?,
      gregorian_date_short = ?, 
      gregorian_date_long = ?, 
      gregorian_date_iso8601 = ?, 
      gregorian_date_short_iso8601 = ?,
      hijri_date_short = ?, 
      hijri_date_long = ?, 
      hijri_date_short_iso8601 = ?, 
      hijri_date_long_iso8601 = ?,
      astronomical_sunset = ?, 
      astronomical_sunrise = ?, 
      qibla_time = ?, 
      greenwich_mean_timezone = ?, 
      shape_moon_url = ?
    RETURNING *
  `;
  
  const values = [
    cityId,
    date,
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    qibla,
    gregorianDate,
    hijriDate,
    gregorianDateShort,
    gregorianDateLong,
    gregorianDateIso8601,
    gregorianDateShortIso8601,
    hijriDateShort,
    hijriDateLong,
    hijriDateShortIso8601,
    hijriDateLongIso8601,
    astronomicalSunset,
    astronomicalSunrise,
    qiblaTime,
    greenwichMeanTimezone,
    shapeMoonUrl,
    // ON CONFLICT değerleri için tekrar
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    qibla,
    gregorianDate,
    hijriDate,
    gregorianDateShort,
    gregorianDateLong,
    gregorianDateIso8601,
    gregorianDateShortIso8601,
    hijriDateShort,
    hijriDateLong,
    hijriDateShortIso8601,
    hijriDateLongIso8601,
    astronomicalSunset,
    astronomicalSunrise,
    qiblaTime,
    greenwichMeanTimezone,
    shapeMoonUrl
  ];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Namaz vakti kaydı hatası:', error);
    throw error;
  }
};

// Diyanet API'den gelen verileri veritabanı formatına dönüştür
const formatPrayerTimeFromAPI = (apiData, cityId) => {
  const dateStr = apiData.gregorianDateShortIso8601 || apiData.gregorianDateShort;
  const dateParts = dateStr.split('.');
  const formattedDate = dateParts.length === 3 
    ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
    : null;

  return {
    cityId: cityId,
    prayer_date: formattedDate,
    fajr: apiData.fajr,
    sunrise: apiData.sunrise,
    dhuhr: apiData.dhuhr,
    asr: apiData.asr,
    maghrib: apiData.maghrib,
    isha: apiData.isha,
    qibla: null,
    qiblaTime: apiData.qiblaTime,
    gregorianDate: apiData.gregorianDateShort,
    hijriDate: apiData.hijriDateShort,
    gregorianDateShort: apiData.gregorianDateShort,
    gregorianDateLong: apiData.gregorianDateLong,
    gregorianDateIso8601: apiData.gregorianDateLongIso8601,
    gregorianDateShortIso8601: apiData.gregorianDateShortIso8601,
    hijriDateShort: apiData.hijriDateShort,
    hijriDateLong: apiData.hijriDateLong,
    hijriDateShortIso8601: apiData.hijriDateShortIso8601,
    hijriDateLongIso8601: apiData.hijriDateLongIso8601,
    astronomicalSunset: apiData.astronomicalSunset,
    astronomicalSunrise: apiData.astronomicalSunrise,
    greenwichMeanTimezone: apiData.greenwichMeanTimeZone,
    shapeMoonUrl: apiData.shapeMoonUrl
  };
};

// Toplu namaz vakti kaydetme işlemi
const createPrayerTimesInBulk = async (cityId, apiDataList) => {
  try {
    const results = [];
    for (const apiItem of apiDataList) {
      const formattedData = formatPrayerTimeFromAPI(apiItem, cityId);
      const savedData = await createPrayerTime(
        formattedData.cityId,
        formattedData.prayer_date,
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
      );
      results.push(savedData);
    }
    return results;
  } catch (error) {
    console.error('Toplu namaz vakti kaydı hatası:', error);
    throw error;
  }
};

// Belirli bir ilçe ve tarih için namaz vakitlerini getir
const getPrayerTimeByDate = async (cityId, date) => {
  try {
    // cityId'nin sayı mı yoksa kod mu olduğunu kontrol et
    const isNumeric = /^\d+$/.test(cityId.toString());
    console.log(`DEBUG - getPrayerTimeByDate - cityId: ${cityId}, isNumeric: ${isNumeric}`);
    
    // İlk sorgu: Eğer sayısal bir değerse doğrudan id eşleştirmesi yap
    if (isNumeric) {
      console.log(`DEBUG - Sayısal ilçe ID ile sorgu yapılıyor: ${cityId}`);
      
      // İlk durumda direkt prayer_times.city_id = ? sorgusu
      let query = `
        SELECT 
          pt.*,
          c.name as city_name,
          s.name as state_name,
          co.name as country_name
        FROM 
          prayer_times pt
        LEFT JOIN 
          cities c ON pt.city_id = c.id
        LEFT JOIN 
          states s ON c.state_id = s.id
        LEFT JOIN 
          countries co ON s.country_id = co.id
        WHERE 
          pt.city_id = ? AND pt.prayer_date = ?
      `;
      
      console.log(`DEBUG - İlk sorgu: ${query.replace(/\s+/g, ' ')}`);
      let result = await db.query(query, [parseInt(cityId), date]);
      console.log(`DEBUG - İlk sorgu sonuç satır sayısı: ${result.rows.length}`);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // Sayısal ID ile bulunamadıysa, cities.id = ? ile dene
      console.log(`DEBUG - Şehir ID ile ikinci sorgu deneniyor`);
      query = `
        SELECT 
          pt.*,
          c.name as city_name,
          s.name as state_name,
          co.name as country_name
        FROM 
          prayer_times pt
        LEFT JOIN 
          cities c ON pt.city_id = c.id
        LEFT JOIN 
          states s ON c.state_id = s.id
        LEFT JOIN 
          countries co ON s.country_id = co.id
        WHERE 
          c.id = ? AND pt.prayer_date = ?
      `;
      
      console.log(`DEBUG - İkinci sorgu: ${query.replace(/\s+/g, ' ')}`);
      result = await db.query(query, [parseInt(cityId), date]);
      console.log(`DEBUG - İkinci sorgu sonuç satır sayısı: ${result.rows.length}`);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    } else {
      // İlçe kodu ile sorgulama (sayısal olmayan değer)
      console.log(`DEBUG - İlçe kodu ile sorgu yapılıyor: ${cityId}`);
      const query = `
        SELECT 
          pt.*,
          c.name as city_name,
          s.name as state_name,
          co.name as country_name
        FROM 
          prayer_times pt
        LEFT JOIN 
          cities c ON pt.city_id = c.id
        LEFT JOIN 
          states s ON c.state_id = s.id
        LEFT JOIN 
          countries co ON s.country_id = co.id
        WHERE 
          c.code = ? AND pt.prayer_date = ?
      `;
      
      console.log(`DEBUG - İlçe kodu sorgusu: ${query.replace(/\s+/g, ' ')}`);
      const result = await db.query(query, [cityId.toString(), date]);
      console.log(`DEBUG - İlçe kodu sorgusu sonuç satır sayısı: ${result.rows.length}`);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }
    
    // Veri bulunamadı
    return null;
  } catch (error) {
    console.error(`Namaz vakitleri sorgulama hatası (ilçe: ${cityId}, tarih: ${date}):`, error);
    throw error;
  }
};

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
const getPrayerTimesByDateRange = async (cityId, startDate, endDate) => {
  try {
    // cityId'nin sayı mı yoksa kod mu olduğunu kontrol et
    const isNumeric = /^\d+$/.test(cityId.toString());
    console.log(`DEBUG - getPrayerTimesByDateRange - cityId: ${cityId}, isNumeric: ${isNumeric}`);
    
    let query;
    let params;
    
    if (isNumeric) {
      // Sayısal ID ile sorgu
      query = `
        SELECT 
          pt.*,
          c.name as city_name,
          s.name as state_name,
          co.name as country_name
        FROM 
          prayer_times pt
        LEFT JOIN 
          cities c ON pt.city_id = c.id
        LEFT JOIN 
          states s ON c.state_id = s.id
        LEFT JOIN 
          countries co ON s.country_id = co.id
        WHERE 
          (pt.city_id = ? OR c.id = ?) AND 
          pt.prayer_date BETWEEN ? AND ?
        ORDER BY 
          pt.prayer_date ASC
      `;
      
      params = [parseInt(cityId), parseInt(cityId), startDate, endDate];
    } else {
      // Kod ile sorgu
      query = `
        SELECT 
          pt.*,
          c.name as city_name,
          s.name as state_name,
          co.name as country_name
        FROM 
          prayer_times pt
        LEFT JOIN 
          cities c ON pt.city_id = c.id
        LEFT JOIN 
          states s ON c.state_id = s.id
        LEFT JOIN 
          countries co ON s.country_id = co.id
        WHERE 
          c.code = ? AND 
          pt.prayer_date BETWEEN ? AND ?
        ORDER BY 
          pt.prayer_date ASC
      `;
      
      params = [cityId.toString(), startDate, endDate];
    }
    
    console.log(`DEBUG - Tarih aralığı sorgusu: ${query.replace(/\s+/g, ' ')}`);
    console.log(`DEBUG - Parametreler:`, params);
    
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error(`Tarih aralığında namaz vakitleri sorgulama hatası (ilçe: ${cityId}, başlangıç: ${startDate}, bitiş: ${endDate}):`, error);
    throw error;
  }
};

// Belirli bir tarihteki namaz vakitlerini sil
const deletePrayerTimeByDate = async (cityId, date) => {
  const query = 'DELETE FROM prayer_times WHERE city_id = ? AND prayer_date = ? RETURNING *';
  
  try {
    const result = await db.query(query, [cityId, date]);
    return result.rows[0];
  } catch (error) {
    console.error(`Namaz vakti silme hatası (ilçe: ${cityId}, tarih: ${date}):`, error);
    throw error;
  }
};

// Belirli bir tarihten önce kaydedilmiş namaz vakitlerini sil
const deletePrayerTimesBeforeDate = async (date) => {
  const query = 'DELETE FROM prayer_times WHERE prayer_date < ? RETURNING prayer_date';
  
  try {
    const result = await db.query(query, [date]);
    return result.rows;
  } catch (error) {
    console.error(`Eski namaz vakitlerini silme hatası (tarih: ${date}):`, error);
    throw error;
  }
};

// [Bayram namazı vakitleri fonksiyonları kaldırıldı]

module.exports = {
  createPrayerTime,
  getPrayerTimeByDate,
  getPrayerTimesByDateRange,
  deletePrayerTimeByDate,
  deletePrayerTimesBeforeDate,
  formatPrayerTimeFromAPI,
  createPrayerTimesInBulk
}; 