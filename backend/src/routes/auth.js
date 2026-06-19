const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req,res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Пожалуйста, заполните все поля'});
        } 

        const candidate = await User.findOne({ username });
        if (candidate) {
            return res.status(400).json({ message: 'Пользователь с таким логином уже существует' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован!' });
    }
    catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при регистрации', error: error.message });
    }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Пожалуйста, заполните все поля' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Неверный логин или пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role }, 
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });

  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при авторизации', error: error.message });
  }
});

module.exports = router;