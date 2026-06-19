const User = require('../models/User');

module.exports = async function (req, res, next) {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
    }

    next();
  } 
  catch (error) {
    res.status(500).json({ message: 'Ошибка при проверке прав доступа', error: error.message });
  }
};