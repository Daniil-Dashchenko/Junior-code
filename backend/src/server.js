const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/junior_code_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('🚀 Успешное подключение к MongoDB'))
  .catch(err => console.error('❌ Ошибка подключения к базе:', err));

app.get('/api/status', (req,res) => {
    res.json({ status: 'working', message: 'Бекенд Junior Code успешно запущен!' });
});

app.listen(PORT, () => {
  console.log(`📡 Сервер запущен и слушает порт ${PORT}`);
});