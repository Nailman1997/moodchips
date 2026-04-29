require('dotenv').config();
const https = require('https');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';
const TMDB_IMAGE_URL = process.env.TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p';

function makeRequest(path, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'zh-CN',
      ...params
    }).toString();
    
    const url = `${TMDB_API_URL}${path}?${queryString}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

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
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  musical: 10402,
  mystery: 9648,
  romance: 10749,
  'sci-fi': 878,
  thriller: 53,
  war: 10752,
  biography: 10751
};

async function getMoviesByMood(mood, limit = 20) {
  const genres = moodToGenres[mood] || ['drama'];
  const genreIdsList = genres.map(g => genreIds[g] || 18);
  
  try {
    const [movieResponse, tvResponse] = await Promise.all([
      makeRequest('/discover/movie', {
        with_genres: genreIdsList.join(','),
        sort_by: 'vote_average.desc',
        page: 1,
        include_adult: false,
        vote_count_gte: 100
      }),
      makeRequest('/discover/tv', {
        with_genres: genreIdsList.join(','),
        sort_by: 'vote_average.desc',
        page: 1,
        include_adult: false,
        vote_count_gte: 100
      })
    ]);

    const movies = movieResponse.results.slice(0, Math.floor(limit / 2));
    const tvShows = tvResponse.results.slice(0, Math.ceil(limit / 2));

    return [...movies.map(m => transformMovie(m, 'movie')), ...tvShows.map(t => transformMovie(t, 'tv'))];
  } catch (error) {
    console.error('TMDB API error:', error.message);
    return [];
  }
}

async function getMovieDetails(id, type = 'movie') {
  try {
    const response = await makeRequest(`/${type}/${id}`, {
      append_to_response: 'credits,videos'
    });
    
    return transformMovie(response, type);
  } catch (error) {
    console.error('TMDB API error:', error.message);
    return null;
  }
}

async function searchMovies(keyword) {
  try {
    const [movieResponse, tvResponse] = await Promise.all([
      makeRequest('/search/movie', { query: keyword }),
      makeRequest('/search/tv', { query: keyword })
    ]);

    const movies = movieResponse.results.slice(0, 6).map(m => transformMovie(m, 'movie'));
    const tvShows = tvResponse.results.slice(0, 6).map(t => transformMovie(t, 'tv'));

    return [...movies, ...tvShows];
  } catch (error) {
    console.error('TMDB API error:', error.message);
    return [];
  }
}

async function getPopularMovies(limit = 20) {
  try {
    const [movieResponse, tvResponse] = await Promise.all([
      makeRequest('/movie/popular'),
      makeRequest('/tv/popular')
    ]);

    const movies = movieResponse.results.slice(0, Math.floor(limit / 2)).map(m => transformMovie(m, 'movie'));
    const tvShows = tvResponse.results.slice(0, Math.ceil(limit / 2)).map(t => transformMovie(t, 'tv'));

    return [...movies, ...tvShows];
  } catch (error) {
    console.error('TMDB API error:', error.message);
    return [];
  }
}

async function getTopRatedMovies(limit = 20) {
  try {
    const [movieResponse, tvResponse] = await Promise.all([
      makeRequest('/movie/top_rated'),
      makeRequest('/tv/top_rated')
    ]);

    const movies = movieResponse.results.slice(0, Math.floor(limit / 2)).map(m => transformMovie(m, 'movie'));
    const tvShows = tvResponse.results.slice(0, Math.ceil(limit / 2)).map(t => transformMovie(t, 'tv'));

    return [...movies, ...tvShows];
  } catch (error) {
    console.error('TMDB API error:', error.message);
    return [];
  }
}

function transformMovie(item, type) {
  const isMovie = type === 'movie';
  
  const cast = item.credits?.cast || [];
  const crew = item.credits?.crew || [];
  const director = crew.find(c => c.job === 'Director')?.name || '';
  const actors = cast.slice(0, 5).map(c => c.name).join(', ');
  
  const trailer = item.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key || '';

  return {
    id: item.id,
    title: item.title || item.name || '未知标题',
    poster: item.poster_path ? `${TMDB_IMAGE_URL}/w500${item.poster_path}` : 'https://via.placeholder.com/500x750',
    rating: item.vote_average || 0,
    year: isMovie 
      ? (item.release_date ? new Date(item.release_date).getFullYear() : new Date().getFullYear())
      : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : new Date().getFullYear()),
    genre: item.genre_ids 
      ? item.genre_ids.map(id => getGenreName(id)).join(', ')
      : (item.genres ? item.genres.map(g => g.name).join(', ') : '未知类型'),
    director: director || '未知导演',
    actors: actors || '未知演员',
    description: item.overview || '暂无简介',
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer}` : '#',
    type: type,
    backdrop: item.backdrop_path ? `${TMDB_IMAGE_URL}/w1280${item.backdrop_path}` : null
  };
}

function getGenreName(id) {
  const genreMap = {
    28: '动作',
    12: '冒险',
    16: '动画',
    35: '喜剧',
    80: '犯罪',
    99: '纪录片',
    18: '剧情',
    10751: '家庭',
    14: '奇幻',
    36: '历史',
    27: '恐怖',
    10402: '音乐',
    9648: '悬疑',
    10749: '爱情',
    878: '科幻',
    53: '惊悚',
    10752: '战争',
    10763: '新闻',
    10764: '真人秀',
    10765: '科幻',
    10766: '肥皂剧',
    10767: '脱口秀',
    10768: '战争与政治'
  };
  return genreMap[id] || '其他';
}

module.exports = {
  getMoviesByMood,
  getMovieDetails,
  searchMovies,
  getPopularMovies,
  getTopRatedMovies,
  moodToGenres,
  transformMovie
};