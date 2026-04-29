const db = require('./schema');
const moviesData = require('./movies-data');

function initializeDatabase() {
  console.log('开始初始化数据库...');
  
  const insertMovie = db.prepare(`
    INSERT OR IGNORE INTO movies 
    (title, poster, rating, year, genre, director, actors, description, trailer, mood_type)
    VALUES (@title, @poster, @rating, @year, @genre, @director, @actors, @description, @trailer, @mood_type)
  `);

  const insertMany = db.transaction((movies) => {
    for (const movie of movies) {
      insertMovie.run(movie);
    }
  });

  let totalMovies = 0;
  
  for (const [moodType, data] of Object.entries(moviesData)) {
    const movies = data.movies.map(movie => ({
      ...movie,
      mood_type: moodType
    }));
    
    insertMany(movies);
    totalMovies += movies.length;
    console.log(`已插入 ${moodType} 类型的 ${movies.length} 部影视作品`);
  }

  console.log(`\n数据库初始化完成！`);
  console.log(`总共插入了 ${totalMovies} 部影视作品`);
  
  const count = db.prepare('SELECT COUNT(*) as count FROM movies').get();
  console.log(`数据库中共有 ${count.count} 部影视作品`);
  
  db.close();
}

initializeDatabase();
