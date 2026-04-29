export async function onRequest(context) {
  const { params, env } = context;
  const { mood } = params;
  
  const TMDB_API_KEY = env.TMDB_API_KEY;
  const TMDB_ACCESS_TOKEN = env.TMDB_ACCESS_TOKEN;
  
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

  const genres = moodToGenres[mood] || ['drama'];
  const genreIdsList = genres.map(g => genreIds[g] || 18);
  
  try {
    const headers = {
      'Authorization': TMDB_ACCESS_TOKEN ? `Bearer ${TMDB_ACCESS_TOKEN}` : undefined,
      'Accept': 'application/json'
    };

    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=zh-CN&with_genres=${genreIdsList.join(',')}&sort_by=vote_average.desc&page=1&include_adult=false&vote_count_gte=100`, { headers }),
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=zh-CN&with_genres=${genreIdsList.join(',')}&sort_by=vote_average.desc&page=1&include_adult=false&vote_count_gte=100`, { headers })
    ]);

    const [movieData, tvData] = await Promise.all([movieResponse.json(), tvResponse.json()]);
    
    let allMovies = [
      ...movieData.results.map(m => transformMovie(m, 'movie')),
      ...tvData.results.map(t => transformMovie(t, 'tv'))
    ];
    
    allMovies = allMovies.sort(() => Math.random() - 0.5).slice(0, 12);

    return new Response(JSON.stringify({ movies: allMovies }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('TMDB API error:', error);
    return new Response(JSON.stringify({ error: '获取随机推荐失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
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
    director: '未知导演',
    actors: '未知演员',
    description: item.overview || '暂无简介',
    trailer: '#',
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