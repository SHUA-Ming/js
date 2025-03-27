const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 根路由处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 数据库连接
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1807184925m',
    database: 'js',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
    
    // 创建用户表
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('coach', 'trainee') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('创建用户表失败:', err);
            return;
        }
        console.log('用户表创建成功或已存在');
    });
});

// 注册接口
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;
    
    // 验证输入
    if (!username || !password || !role) {
        return res.status(400).json({ error: '所有字段都是必填的' });
    }
    
    try {
        // 检查用户名是否已存在
        const [existingUsers] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: '用户名已存在' });
        }
        
        // 密码加密
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 保存用户
        await db.promise().query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );
        
        res.status(201).json({ message: '注册成功' });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 登录接口
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // 查找用户
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        const user = users[0];
        
        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 生成JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            'your_jwt_secret',
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            role: user.role,
            message: '登录成功'
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 处理所有其他路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 