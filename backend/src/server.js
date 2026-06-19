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

// ВРЕМЕННЫЙ КОД ДЛЯ ВЫДАЧИ АДМИНКИ
const User = require('./models/User');
mongoose.connection.once('open', async () => {
  try {
    // ВПИШИ СЮДА СВОЙ ЛОГИН, под которым ты регистрировался на сайте
    const myLogin = 'user1'; 
    
    const updatedUser = await User.findOneAndUpdate(
      { username: myLogin },
      { role: 'admin' },
      { new: true }
    );
    
    if (updatedUser) {
      console.log(`👑 УСПЕХ: Пользователь ${myLogin} теперь имеет роль: ${updatedUser.role}`);
    } else {
      console.log(`❌ ОШИБКА: Пользователь с логином "${myLogin}" не найден в базе данных!`);
    }
  } catch (err) {
    console.error('Ошибка при обновлении роли:', err);
  }
});

app.listen(PORT, () => {
  console.log(`📡 Сервер запущен и слушает порт ${PORT}`);
});