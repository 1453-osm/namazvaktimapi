/**
 * Yardımcı fonksiyonlar
 */

/**
 * Belirtilen milisaniye kadar bekletir
 * @param {number} ms Bekletilecek milisaniye
 * @returns {Promise} Bekleme tamamlandığında çözülen Promise
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mevcut yılı döndürür
 * @returns {number} Mevcut yıl
 */
const getCurrentYear = () => {
  return new Date().getFullYear();
};

/**
 * Gelecek yılı döndürür
 * @returns {number} Gelecek yıl
 */
const getNextYear = () => {
  return new Date().getFullYear() + 1;
};

/**
 * Tarih aralığındaki tüm tarihleri döndürür
 * @param {string} startDate Başlangıç tarihi (YYYY-MM-DD)
 * @param {string} endDate Bitiş tarihi (YYYY-MM-DD)
 * @returns {Array<string>} Tarih aralığındaki tüm tarihler (YYYY-MM-DD)
 */
const getDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateArray = [];
  
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    dateArray.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dateArray;
};

/**
 * Date nesnesini YYYY-MM-DD formatına dönüştürür
 * @param {Date} date Dönüştürülecek tarih
 * @returns {string} YYYY-MM-DD formatında tarih
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Bir yıl artık yıl mı kontrol eder
 * @param {number} year Kontrol edilecek yıl
 * @returns {boolean} Artık yıl ise true, değilse false
 */
const isLeapYear = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Belirtilen yılda kaç gün olduğunu döndürür
 * @param {number} year Yıl
 * @returns {number} Gün sayısı (365 veya 366)
 */
const getDaysInYear = (year) => {
  return isLeapYear(year) ? 366 : 365;
};

module.exports = {
  sleep,
  getCurrentYear,
  getNextYear,
  getDateRange,
  formatDate,
  isLeapYear,
  getDaysInYear
}; 