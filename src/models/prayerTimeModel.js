const db = require('../config/db');

// Namaz vakti kaydet
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
  hijriDate
) => {
  const query = `
    INSERT INTO prayer_times (
      city_id, date, fajr, sunrise, dhuhr, asr, maghrib, isha, qibla, gregorian_date, hijri_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
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
      hijri_date = $11
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
    hijriDate
  ];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
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
      cities c ON pt.city_id = c.city_id
    JOIN 
      states s ON c.state_id = s.state_id
    JOIN 
      countries co ON s.country_id = co.country_id
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
      cities c ON pt.city_id = c.city_id
    JOIN 
      states s ON c.state_id = s.state_id
    JOIN 
      countries co ON s.country_id = co.country_id
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
      cities c ON et.city_id = c.city_id
    JOIN 
      states s ON c.state_id = s.state_id
    JOIN 
      countries co ON s.country_id = co.country_id
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
  getPrayerTimeByDate,
  getPrayerTimesByDateRange,
  createEidTime,
  getEidTimes
}; 