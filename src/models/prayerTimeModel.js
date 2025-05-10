const db = require('../config/db');

// Namaz vakti kaydet (tüm Diyanet API alanlarıyla)
const createPrayerTime = async (prayerTimeData) => {
  const {
    cityId,
    date,
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    qibla,
    qiblaTime,
    gregorianDate,
    hijriDate,
    // Yeni alanlar
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
    greenwichMeanTimezone,
    shapeMoonUrl
  } = prayerTimeData;

  const query = `
    INSERT INTO prayer_times (
      city_id, date, fajr, sunrise, dhuhr, asr, maghrib, isha, 
      qibla, gregorian_date, hijri_date,
      gregorian_date_short, gregorian_date_long, gregorian_date_iso8601, gregorian_date_short_iso8601,
      hijri_date_short, hijri_date_long, hijri_date_short_iso8601, hijri_date_long_iso8601,
      astronomical_sunset, astronomical_sunrise, qibla_time, greenwich_mean_timezone, shape_moon_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
      $16, $17, $18, $19, $20, $21, $22, $23, $24
    ) 
    ON CONFLICT (city_id, date) 
    DO UPDATE SET 
      fajr = $3, 
      sunrise = $4, 
      dhuhr = $5, 
      asr = $6, 
      maghrib = $7, 
      isha = $8, 
      qibla = $9, 
      gregorian_date = $10, 
      hijri_date = $11,
      gregorian_date_short = $12, 
      gregorian_date_long = $13, 
      gregorian_date_iso8601 = $14, 
      gregorian_date_short_iso8601 = $15,
      hijri_date_short = $16, 
      hijri_date_long = $17, 
      hijri_date_short_iso8601 = $18, 
      hijri_date_long_iso8601 = $19,
      astronomical_sunset = $20, 
      astronomical_sunrise = $21, 
      qibla_time = $22, 
      greenwich_mean_timezone = $23, 
      shape_moon_url = $24
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
  // API'den gelen veriyi ISO tarih formatına dönüştür
  const dateStr = apiData.gregorianDateShortIso8601 || apiData.gregorianDateShort;
  const dateParts = dateStr.split('.');
  const formattedDate = dateParts.length === 3 
    ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` // DD.MM.YYYY -> YYYY-MM-DD
    : null;

  return {
    cityId: cityId,
    date: formattedDate,
    fajr: apiData.fajr,
    sunrise: apiData.sunrise,
    dhuhr: apiData.dhuhr,
    asr: apiData.asr,
    maghrib: apiData.maghrib,
    isha: apiData.isha,
    qibla: null, // API'den doğrudan bu formatta veri gelmiyor
    qiblaTime: apiData.qiblaTime,
    gregorianDate: apiData.gregorianDateShort, // Eski format için
    hijriDate: apiData.hijriDateShort,  // Eski format için
    
    // Yeni alanlar
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
      const prayerTimeData = formatPrayerTimeFromAPI(apiItem, cityId);
      const savedData = await createPrayerTime(prayerTimeData);
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
  const query = `
    SELECT 
      pt.*,
      c.name as city_name,
      s.name as state_name,
      co.name as country_name
    FROM 
      prayer_times pt
    JOIN 
      cities c ON pt.city_id = c.id
    JOIN 
      states s ON c.state_id = s.id
    JOIN 
      countries co ON s.country_id = co.id
    WHERE 
      pt.city_id = $1 AND pt.date = $2
  `;
  
  try {
    const result = await db.query(query, [cityId, date]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Belirli bir ilçe için tarih aralığında namaz vakitlerini getir
const getPrayerTimesByDateRange = async (cityId, startDate, endDate) => {
  const query = `
    SELECT 
      pt.*,
      c.name as city_name,
      s.name as state_name,
      co.name as country_name
    FROM 
      prayer_times pt
    JOIN 
      cities c ON pt.city_id = c.id
    JOIN 
      states s ON c.state_id = s.id
    JOIN 
      countries co ON s.country_id = co.id
    WHERE 
      pt.city_id = $1 AND pt.date BETWEEN $2 AND $3
    ORDER BY
      pt.date ASC
  `;
  
  try {
    const result = await db.query(query, [cityId, startDate, endDate]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Bayram namazı vakitlerini kaydet
const createEidTime = async (cityId, eidDate, eidTime, eidType) => {
  const query = `
    INSERT INTO eid_times (
      city_id, eid_date, eid_time, eid_type
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (city_id, eid_date, eid_type)
    DO UPDATE SET
      eid_time = $3
    RETURNING *
  `;
  
  try {
    const result = await db.query(query, [cityId, eidDate, eidTime, eidType]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Belirli bir ilçe için bayram namazı vakitlerini getir
const getEidTimes = async (cityId) => {
  const query = `
    SELECT 
      et.*,
      c.name as city_name,
      s.name as state_name,
      co.name as country_name
    FROM 
      eid_times et
    JOIN 
      cities c ON et.city_id = c.id
    JOIN 
      states s ON c.state_id = s.id
    JOIN 
      countries co ON s.country_id = co.id
    WHERE 
      et.city_id = $1
    ORDER BY
      et.eid_date DESC
  `;
  
  try {
    const result = await db.query(query, [cityId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createPrayerTime,
  formatPrayerTimeFromAPI,
  createPrayerTimesInBulk,
  getPrayerTimeByDate,
  getPrayerTimesByDateRange,
  createEidTime,
  getEidTimes
}; 