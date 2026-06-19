const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const authMiddleware = require('./authMiddleware');

router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { taskId, code, isPassed, timeSpent } = req.body;
    const userId = req.user.userId;

    const newSubmission = new Submission({
      userId,
      taskId,
      code,
      isPassed,
      timeSpent
    });

    await newSubmission.save();
    res.status(201).json({ message: 'Результат сохранен в базу данных!', submission: newSubmission });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при сохранении прогресса', error: error.message });
  }
});

router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const submissions = await Submission.find({ userId }).sort({ timestamp: -1 });
    const progressMap = {};
    submissions.forEach(sub => {

      if (!progressMap[sub.taskId]) {
        progressMap[sub.taskId] = {
          code: sub.code,
          isPassed: sub.isPassed,
          timeSpent: sub.timeSpent
        };
      }
      else if (sub.isPassed && !progressMap[sub.taskId].isPassed) {
        progressMap[sub.taskId].isPassed = true;
        progressMap[sub.taskId].code = sub.code;
        if (sub.timeSpent) progressMap[sub.taskId].timeSpent = sub.timeSpent;
      }
    });

    res.json({
      progress: progressMap,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при получении прогресса', error: error.message });
  }
});

module.exports = router;