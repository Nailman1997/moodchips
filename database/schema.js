const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'movies.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT 'https://via.placeholder.com/100',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    poster TEXT NOT NULL,
    rating REAL NOT NULL,
    year INTEGER NOT NULL,
    genre TEXT NOT NULL,
    director TEXT,
    actors TEXT,
    description TEXT,
    trailer TEXT,
    mood_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE(user_id, movie_id)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE(user_id, movie_id)
  );

  CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    movie_id INTEGER NOT NULL,
    watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mood_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    mood_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_movies_mood ON movies(mood_type);
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
  CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_mood_history_user ON mood_history(user_id);
`);

module.exports = db;
