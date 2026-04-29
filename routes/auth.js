const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/schema');

router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    ).run(username, email, hashedPassword);

    const token = jwt.sign(
      { userId: result.lastInsertRowid, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        email
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

module.exports = router;
