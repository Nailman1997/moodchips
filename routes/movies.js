const express = require('express');
const router = express.Router();
const tmdb = require('../services/tmdb');

router.get('/mood/:mood', async (req, res) => {
  try {
    const { mood } = req.params;
    const { limit = 12 } = req.query;

    const movies = await tmdb.getMoviesByMood(mood, parseInt(limit));

    res.json({
      movies,
      total: movies.length,
      hasMore: false
    });
  } catch (error) {
    console.error('获取影视推荐错误:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

router.get('/random/:mood', async (req, res) => {
  try {
    const { mood } = req.params;
    const { limit = 12 } = req.query;

    let movies = await tmdb.getMoviesByMood(mood, parseInt(limit) * 2);
    movies = movies.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));

    res.json({ movies });
  } catch (error) {
    console.error('获取随机推荐错误:', error);
    res.status(500).json({ error: '获取随机推荐失败' });
  }
});

router.get('/random-all', async (req, res) => {
  try {
    const { limit = 1 } = req.query;
    const allMoods = ['happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'romantic', 'nostalgic'];
    const randomMood = allMoods[Math.floor(Math.random() * allMoods.length)];
    
    let movies = await tmdb.getMoviesByMood(randomMood, parseInt(limit) * 5);
    movies = movies.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));

    res.json({ movies });
  } catch (error) {
    console.error('获取随机推荐错误:', error);
    res.status(500).json({ error: '获取随机推荐失败' });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const { limit = 12 } = req.query;

    const movies = await tmdb.searchMovies(keyword);
    const limitedMovies = movies.slice(0, parseInt(limit));

    res.json({ movies: limitedMovies });
  } catch (error) {
    console.error('搜索影视错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

router.get('/popular', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const movies = await tmdb.getPopularMovies(parseInt(limit));

    res.json({ movies });
  } catch (error) {
    console.error('获取热门影视错误:', error);
    res.status(500).json({ error: '获取热门影视失败' });
  }
});

router.get('/top-rated', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const movies = await tmdb.getTopRatedMovies(parseInt(limit));

    res.json({ movies });
  } catch (error) {
    console.error('获取高分影视错误:', error);
    res.status(500).json({ error: '获取高分影视失败' });
  }
});

router.get('/details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    const movie = await tmdb.getMovieDetails(id, type);

    if (!movie) {
      return res.status(404).json({ error: '影视作品不存在' });
    }

    res.json({ movie });
  } catch (error) {
    console.error('获取影视详情错误:', error);
    res.status(500).json({ error: '获取详情失败' });
  }
});

module.exports = router;