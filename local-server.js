require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

app.use(express.static(path.join(__dirname)));

const moodToGenres = {
  happy: ['comedy', 'animation', 'family', 'musical', 'adventure', 'fantasy'],
  sad: ['drama', 'romance', 'biography', 'history'],
  angry: ['action', 'thriller', 'crime', 'war', 'mystery'],
  anxious: ['sci-fi', 'horror', 'thriller', 'mystery'],
  excited: ['adventure', 'sci-fi', 'action', 'fantasy', 'war'],
  calm: ['documentary', 'drama', 'music', 'family'],
  romantic: ['romance', 'comedy', 'drama'],
  nostalgic: ['drama', 'history', 'romance']
};

const genreIds = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  'sci-fi': 878, thriller: 53, war: 10752
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function transformMovie(item, type) {
  const isMovie = type === 'movie';
  return {
    id: item.id,
    title: item.title || item.name || '未知标题',
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750',
    rating: item.vote_average || 0,
    year: isMovie 
      ? (item.release_date ? new Date(item.release_date).getFullYear() : new Date().getFullYear())
      : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : new Date().getFullYear()),
    genre: item.genre_ids ? item.genre_ids.map(id => getGenreName(id)).join(', ') : '未知类型',
    director: item.credits?.crew?.find(c => c.job === 'Director')?.name || '未知导演',
    actors: item.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || '未知演员',
    description: item.overview || '暂无简介',
    trailer: item.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key 
      ? `https://www.youtube.com/watch?v=${item.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube').key}` : '#',
    type: type
  };
}

function getGenreName(id) {
  const genreMap = {
    28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
    99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
    27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情',
    878: '科幻', 53: '惊悚', 10752: '战争'
  };
  return genreMap[id] || '其他';
}

app.get('/api/movies/mood/:mood', async (req, res) => {
  try {
    const { mood } = req.params;
    const genres = moodToGenres[mood] || ['drama'];
    const genreIdsList = genres.map(g => genreIds[g] || 18);

    const [movieData, tvData] = await Promise.all([
      makeRequest(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=zh-CN&with_genres=${genreIdsList.join(',')}&sort_by=vote_average.desc&page=1&include_adult=false&vote_count_gte=100`),
      makeRequest(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=zh-CN&with_genres=${genreIdsList.join(',')}&sort_by=vote_average.desc&page=1&include_adult=false&vote_count_gte=100`)
    ]);

    const movies = movieData.results.slice(0, 12).map(m => ({...m, type: 'movie'}));
    const tvShows = tvData.results.slice(0, 12).map(t => ({...t, type: 'tv'}));

    res.json({
      movies: [...movies, ...tvShows],
      total: movies.length + tvShows.length,
      hasMore: false
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

app.get('/api/movies/details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const data = await makeRequest(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=zh-CN&append_to_response=credits,videos`);
    
    res.json({ movie: transformMovie(data, type) });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: '获取详情失败' });
  }
});

app.get('/api/movies/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const [movieData, tvData] = await Promise.all([
      makeRequest(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=zh-CN&query=${encodeURIComponent(keyword)}`),
      makeRequest(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&language=zh-CN&query=${encodeURIComponent(keyword)}`)
    ]);

    const movies = movieData.results.slice(0, 12).map(m => ({...m, type: 'movie'}));
    const tvShows = tvData.results.slice(0, 12).map(t => ({...t, type: 'tv'}));

    res.json({ movies: [...movies, ...tvShows] });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

app.get('/api/movies/popular', async (req, res) => {
  try {
    const [movieData, tvData] = await Promise.all([
      makeRequest(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=zh-CN`),
      makeRequest(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&language=zh-CN`)
    ]);

    const movies = movieData.results.slice(0, 10).map(m => ({...m, type: 'movie'}));
    const tvShows = tvData.results.slice(0, 10).map(t => ({...t, type: 'tv'}));

    res.json({ movies: [...movies, ...tvShows] });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: '获取热门失败' });
  }
});

app.get('/api/movies/random-all', async (req, res) => {
  try {
    const allMoods = ['happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'romantic', 'nostalgic'];
    const randomMood = allMoods[Math.floor(Math.random() * allMoods.length)];
    const genres = moodToGenres[randomMood] || ['drama'];
    const genreIdsList = genres.map(g => genreIds[g] || 18);

    const [movieData, tvData] = await Promise.all([
      makeRequest(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=zh-CN&with_genres=${genreIdsList.join(',')}&sort_by=vote_average.desc&page=1&include_adult=false&vote_count_gte=100`),
      makeRequest(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=zh-CN&with_genres=${genreIdsList.join(',')}&sort_by=vote_average.desc&page=1&include_adult=false&vote_count_gte=100`)
    ]);

    const allMovies = [
      ...movieData.results.map(m => ({...m, type: 'movie'})),
      ...tvData.results.map(t => ({...t, type: 'tv'}))
    ];

    const randomMovie = allMovies[Math.floor(Math.random() * allMovies.length)];
    res.json({ movie: randomMovie });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: '获取随机推荐失败' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎬 本地服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 正在从 TMDB API 获取真实影视剧数据...`);
  console.log(`🔑 API Key: ${TMDB_API_KEY ? '已配置' : '未配置'}`);
});