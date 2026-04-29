export async function onRequest(context) {
  const { params, env } = context;
  const { type, id } = params;
  
  const TMDB_API_KEY = env.TMDB_API_KEY;
  const TMDB_ACCESS_TOKEN = env.TMDB_ACCESS_TOKEN;
  
  try {
    const headers = {
      'Authorization': TMDB_ACCESS_TOKEN ? `Bearer ${TMDB_ACCESS_TOKEN}` : undefined,
      'Accept': 'application/json'
    };

    const response = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=zh-CN&append_to_response=credits,videos`, { headers });
    const data = await response.json();
    
    if (!data.id) {
      return new Response(JSON.stringify({ error: '影视作品不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const movie = transformMovie(data, type);
    return new Response(JSON.stringify({ movie }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('TMDB API error:', error);
    return new Response(JSON.stringify({ error: '获取详情失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750',
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
    backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null
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