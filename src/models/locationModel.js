const db = require('../config/db');

// Ülke işlemleri
const createCountry = async (countryId, name) => {
  const query = 'INSERT INTO countries (code, name) VALUES (?, ?) RETURNING *';
  const values = [countryId, name];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const getCountries = async () => {
  const query = 'SELECT * FROM countries ORDER BY name ASC';
  
  try {
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getCountryById = async (countryId) => {
  const query = 'SELECT * FROM countries WHERE id = ? OR code = ?';
  
  try {
    const result = await db.query(query, [countryId, countryId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateCountry = async (countryId, name) => {
  const query = 'UPDATE countries SET name = ? WHERE code = ? OR id = ? RETURNING *';
  
  try {
    const result = await db.query(query, [name, countryId, countryId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteCountry = async (countryId) => {
  const query = 'DELETE FROM countries WHERE code = ? OR id = ? RETURNING *';
  
  try {
    const result = await db.query(query, [countryId, countryId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Şehir işlemleri
const createState = async (stateId, countryId, name) => {
  const query = 'INSERT INTO states (code, country_id, name) VALUES (?, ?, ?) RETURNING *';
  const values = [stateId, countryId, name];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const getStates = async () => {
  const query = `
    SELECT s.*, c.name as country_name 
    FROM states s
    JOIN countries c ON s.country_id = c.id
    ORDER BY s.name ASC
  `;
  
  try {
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getStatesByCountryId = async (countryId) => {
  const query = `
    SELECT s.*, c.name as country_name 
    FROM states s
    JOIN countries c ON s.country_id = c.id
    WHERE s.country_id = ?
    ORDER BY s.name ASC
  `;
  
  try {
    const result = await db.query(query, [countryId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getStateById = async (stateId) => {
  const query = `
    SELECT s.*, c.name as country_name 
    FROM states s
    JOIN countries c ON s.country_id = c.id
    WHERE s.id = ? OR s.code = ?
  `;
  
  try {
    const result = await db.query(query, [stateId, stateId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateState = async (stateId, countryId, name) => {
  const query = 'UPDATE states SET country_id = ?, name = ? WHERE code = ? OR id = ? RETURNING *';
  
  try {
    const result = await db.query(query, [countryId, name, stateId, stateId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteState = async (stateId) => {
  const query = 'DELETE FROM states WHERE code = ? OR id = ? RETURNING *';
  
  try {
    const result = await db.query(query, [stateId, stateId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// İlçe işlemleri
const createCity = async (cityId, stateId, name) => {
  const query = 'INSERT INTO cities (code, state_id, name) VALUES (?, ?, ?) RETURNING *';
  const values = [cityId, stateId, name];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const getCities = async () => {
  const query = `
    SELECT c.*, s.name as state_name, co.name as country_name
    FROM cities c
    JOIN states s ON c.state_id = s.id
    JOIN countries co ON s.country_id = co.id
    ORDER BY c.name ASC
  `;
  
  try {
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getCitiesByStateId = async (stateId) => {
  const query = `
    SELECT c.*, s.name as state_name, co.name as country_name
    FROM cities c
    JOIN states s ON c.state_id = s.id
    JOIN countries co ON s.country_id = co.id
    WHERE c.state_id = ?
    ORDER BY c.name ASC
  `;
  
  try {
    const result = await db.query(query, [stateId]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getCityById = async (cityId) => {
  const query = `
    SELECT c.*, s.name as state_name, co.name as country_name
    FROM cities c
    JOIN states s ON c.state_id = s.id
    JOIN countries co ON s.country_id = co.id
    WHERE c.id = ? OR c.code = ?
  `;
  
  try {
    const result = await db.query(query, [cityId, cityId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateCity = async (cityId, stateId, name) => {
  const query = 'UPDATE cities SET state_id = ?, name = ? WHERE code = ? OR id = ? RETURNING *';
  
  try {
    const result = await db.query(query, [stateId, name, cityId, cityId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteCity = async (cityId) => {
  const query = 'DELETE FROM cities WHERE code = ? OR id = ? RETURNING *';
  
  try {
    const result = await db.query(query, [cityId, cityId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

module.exports = {
  // Ülke
  createCountry,
  getCountries,
  getCountryById,
  updateCountry,
  deleteCountry,
  
  // Şehir
  createState,
  getStates,
  getStatesByCountryId,
  getStateById,
  updateState,
  deleteState,
  
  // İlçe
  createCity,
  getCities,
  getCitiesByStateId,
  getCityById,
  updateCity,
  deleteCity
}; 