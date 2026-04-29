const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/schema');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效' });
    }
    req.user = user;
    next();
  });
};

router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?').get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

router.post('/favorites/:movieId', authenticateToken, (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.user.userId;

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?').get(userId, movieId);
    if (existing) {
      return res.status(400).json({ error: '已收藏该影视作品' });
    }

    db.prepare('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)').run(userId, movieId);

    res.json({ message: '收藏成功' });
  } catch (error) {
    console.error('收藏错误:', error);
    res.status(500).json({ error: '收藏失败' });
  }
});

router.delete('/favorites/:movieId', authenticateToken, (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.user.userId;

    db.prepare('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?').run(userId, movieId);

    res.json({ message: '取消收藏成功' });
  } catch (error) {
    console.error('取消收藏错误:', error);
    res.status(500).json({ error: '取消收藏失败' });
  }
});

router.get('/favorites', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const favorites = db.prepare(`
      SELECT m.*, f.created_at as favorited_at
      FROM favorites f
      JOIN movies m ON f.movie_id = m.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(userId);

    res.json({ favorites });
  } catch (error) {
    console.error('获取收藏列表错误:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

router.post('/ratings/:movieId', authenticateToken, (req, res) => {
  try {
    const { movieId } = req.params;
    const { rating } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分必须在1-5之间' });
    }

    const existing = db.prepare('SELECT id FROM ratings WHERE user_id = ? AND movie_id = ?').get(userId, movieId);
    if (existing) {
      db.prepare('UPDATE ratings SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND movie_id = ?').run(rating, userId, movieId);
      res.json({ message: '评分已更新' });
    } else {
      db.prepare('INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)').run(userId, movieId, rating);
      res.json({ message: '评分成功' });
    }
  } catch (error) {
    console.error('评分错误:', error);
    res.status(500).json({ error: '评分失败' });
  }
});

router.get('/ratings/:movieId', authenticateToken, (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.user.userId;

    const rating = db.prepare('SELECT rating FROM ratings WHERE user_id = ? AND movie_id = ?').get(userId, movieId);

    res.json({ rating: rating ? rating.rating : null });
  } catch (error) {
    console.error('获取评分错误:', error);
    res.status(500).json({ error: '获取评分失败' });
  }
});

router.post('/watch-history/:movieId', authenticateToken, (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.user.userId;

    db.prepare('INSERT INTO watch_history (user_id, movie_id) VALUES (?, ?)').run(userId, movieId);

    res.json({ message: '观看记录已保存' });
  } catch (error) {
    console.error('保存观看记录错误:', error);
    res.status(500).json({ error: '保存观看记录失败' });
  }
});

router.get('/watch-history', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20 } = req.query;

    const history = db.prepare(`
      SELECT m.*, w.watched_at
      FROM watch_history w
      JOIN movies m ON w.movie_id = m.id
      WHERE w.user_id = ?
      ORDER BY w.watched_at DESC
      LIMIT ?
    `).all(userId, parseInt(limit));

    res.json({ history });
  } catch (error) {
    console.error('获取观看记录错误:', error);
    res.status(500).json({ error: '获取观看记录失败' });
  }
});

router.post('/mood-history', authenticateToken, (req, res) => {
  try {
    const { moodType } = req.body;
    const userId = req.user.userId;

    db.prepare('INSERT INTO mood_history (user_id, mood_type) VALUES (?, ?)').run(userId, moodType);

    res.json({ message: '心情记录已保存' });
  } catch (error) {
    console.error('保存心情记录错误:', error);
    res.status(500).json({ error: '保存心情记录失败' });
  }
});

router.get('/mood-history', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10 } = req.query;

    const history = db.prepare(`
      SELECT mood_type, created_at
      FROM mood_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, parseInt(limit));

    res.json({ history });
  } catch (error) {
    console.error('获取心情历史错误:', error);
    res.status(500).json({ error: '获取心情历史失败' });
  }
});

module.exports = router;
