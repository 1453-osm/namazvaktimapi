const db = require('../config/db');

// Ülke işlemleri
const createCountry = async (countryId, name) => {
  const query = 'INSERT INTO countries (country_id, name) VALUES ($1, $2) RETURNING *';
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
  const query = 'SELECT * FROM countries WHERE country_id = $1';
  
  try {
    const result = await db.query(query, [countryId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateCountry = async (countryId, name) => {
  const query = 'UPDATE countries SET name = $1 WHERE country_id = $2 RETURNING *';
  
  try {
    const result = await db.query(query, [name, countryId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteCountry = async (countryId) => {
  const query = 'DELETE FROM countries WHERE country_id = $1 RETURNING *';
  
  try {
    const result = await db.query(query, [countryId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Şehir işlemleri
const createState = async (stateId, countryId, name) => {
  const query = 'INSERT INTO states (state_id, country_id, name) VALUES ($1, $2, $3) RETURNING *';
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
    JOIN countries c ON s.country_id = c.country_id
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
    JOIN countries c ON s.country_id = c.country_id
    WHERE s.country_id = $1
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
    JOIN countries c ON s.country_id = c.country_id
    WHERE s.state_id = $1
  `;
  
  try {
    const result = await db.query(query, [stateId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateState = async (stateId, countryId, name) => {
  const query = 'UPDATE states SET country_id = $1, name = $2 WHERE state_id = $3 RETURNING *';
  
  try {
    const result = await db.query(query, [countryId, name, stateId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteState = async (stateId) => {
  const query = 'DELETE FROM states WHERE state_id = $1 RETURNING *';
  
  try {
    const result = await db.query(query, [stateId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// İlçe işlemleri
const createCity = async (cityId, stateId, name) => {
  const query = 'INSERT INTO cities (city_id, state_id, name) VALUES ($1, $2, $3) RETURNING *';
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
    JOIN states s ON c.state_id = s.state_id
    JOIN countries co ON s.country_id = co.country_id
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
    JOIN states s ON c.state_id = s.state_id
    JOIN countries co ON s.country_id = co.country_id
    WHERE c.state_id = $1
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
    JOIN states s ON c.state_id = s.state_id
    JOIN countries co ON s.country_id = co.country_id
    WHERE c.city_id = $1
  `;
  
  try {
    const result = await db.query(query, [cityId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateCity = async (cityId, stateId, name) => {
  const query = 'UPDATE cities SET state_id = $1, name = $2 WHERE city_id = $3 RETURNING *';
  
  try {
    const result = await db.query(query, [stateId, name, cityId]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteCity = async (cityId) => {
  const query = 'DELETE FROM cities WHERE city_id = $1 RETURNING *';
  
  try {
    const result = await db.query(query, [cityId]);
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