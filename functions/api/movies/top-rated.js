export async function onRequest(context) {
  const { env } = context;
  const TMDB_API_KEY = env.TMDB_API_KEY;
  const TMDB_ACCESS_TOKEN = env.TMDB_ACCESS_TOKEN;
  
  try {
    const headers = {
      'Authorization': TMDB_ACCESS_TOKEN ? `Bearer ${TMDB_ACCESS_TOKEN}` : undefined,
      'Accept': 'application/json'
    };

    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=zh-CN`, { headers }),
      fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_API_KEY}&language=zh-CN`, { headers })
    ]);

    const [movieData, tvData] = await Promise.all([movieResponse.json(), tvResponse.json()]);
    
    const movies = movieData.results.slice(0, 10).map(m => transformMovie(m, 'movie'));
    const tvShows = tvData.results.slice(0, 10).map(t => transformMovie(t, 'tv'));

    return new Response(JSON.stringify({ movies: [...movies, ...tvShows] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('TMDB API error:', error);
    return new Response(JSON.stringify({ error: '获取高分影视失败' }), {
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