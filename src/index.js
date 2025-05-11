const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const prayerTimeRoutes = require('./routes/prayerTimes');
const countryRoutes = require('./routes/countries');
const stateRoutes = require('./routes/states');
const cityRoutes = require('./routes/cities');

// Scripts
const { scheduleMonthlyCleanup } = require('./scripts/cleanupOldPrayerTimes');

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route Middlewares
app.use('/api/prayer-times', prayerTimeRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);

// Sağlık kontrolü
app.get('/', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Namaz Vakti API çalışıyor',
    version: '1.0.0'
  });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  
  // Zamanlanmış görevleri başlat
  scheduleMonthlyCleanup();
  console.log('Aylık temizleme görevi zamanlandı');
}); 