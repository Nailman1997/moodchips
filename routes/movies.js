const express = require('express');
const router = express.Router();
const db = require('../database/schema');

router.get('/mood/:mood', (req, res) => {
  try {
    const { mood } = req.params;
    const { limit = 12, offset = 0, sort = 'rating' } = req.query;

    let orderBy = 'rating DESC';
    if (sort === 'year') orderBy = 'year DESC';
    else if (sort === 'title') orderBy = 'title ASC';

    const movies = db.prepare(`
      SELECT * FROM movies 
      WHERE mood_type = ?
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(mood, parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM movies WHERE mood_type = ?').get(mood);

    res.json({
      movies,
      total: total.count,
      hasMore: parseInt(offset) + movies.length < total.count
    });
  } catch (error) {
    console.error('获取影视推荐错误:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

router.get('/random/:mood', (req, res) => {
  try {
    const { mood } = req.params;
    const { limit = 12 } = req.query;

    const movies = db.prepare(`
      SELECT * FROM movies 
      WHERE mood_type = ?
      ORDER BY RANDOM()
      LIMIT ?
    `).all(mood, parseInt(limit));

    res.json({ movies });
  } catch (error) {
    console.error('获取随机推荐错误:', error);
    res.status(500).json({ error: '获取随机推荐失败' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);

    if (!movie) {
      return res.status(404).json({ error: '影视作品不存在' });
    }

    res.json({ movie });
  } catch (error) {
    console.error('获取影视详情错误:', error);
    res.status(500).json({ error: '获取详情失败' });
  }
});

router.get('/search/:keyword', (req, res) => {
  try {
    const { keyword } = req.params;
    const { limit = 12, offset = 0 } = req.query;

    const movies = db.prepare(`
      SELECT * FROM movies 
      WHERE title LIKE ? OR genre LIKE ? OR actors LIKE ?
      LIMIT ? OFFSET ?
    `).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, parseInt(limit), parseInt(offset));

    res.json({ movies });
  } catch (error) {
    console.error('搜索影视错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

module.exports = router;
