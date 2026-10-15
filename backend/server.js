const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3065;

app.use(cors());
app.use(express.json());

// การเชื่อมต่อฐานข้อมูล MySQL บนเซิร์ฟเวอร์
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // ใส่รหัสผ่านหากฐานข้อมูลบนเซิร์ฟเวอร์กำหนดไว้
  database: 'ip_std6730202718',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 1. Login API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password123') {
    res.json({ success: true, token: 'mock-jwt-token-std6730202718' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// 2. Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Add new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name, position, salary } = req.body;
    if (!name || !position || salary === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const [result] = await pool.query(
      'INSERT INTO employees (name, position, status, salary) VALUES (?, ?, ?, ?)',
      [name, position, 'Active', salary]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, salary } = req.body;
    await pool.query(
      'UPDATE employees SET name = ?, position = ?, salary = ? WHERE id = ?',
      [name, position, salary, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Toggle employee status
app.put('/api/employees/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT status FROM employees WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
    
    const newStatus = rows[0].status === 'Active' ? 'On Leave' : 'Active';
    await pool.query('UPDATE employees SET status = ? WHERE id = ?', [newStatus, id]);
    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Salary Clustering (1D K-Means, k=3)
app.get('/api/employees/salary-clusters', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT salary FROM employees');
    if (rows.length === 0) {
      return res.json({ success: true, clusters: [] });
    }
    const salaries = rows.map(r => Number(r.salary));
    salaries.sort((a, b) => a - b);

    let c1 = salaries[0];
    let c2 = salaries[Math.floor(salaries.length / 2)];
    let c3 = salaries[salaries.length - 1];

    let clusters = [[], [], []];
    for (let iter = 0; iter < 10; iter++) {
      clusters = [[], [], []];
      for (let s of salaries) {
        let d1 = Math.abs(s - c1);
        let d2 = Math.abs(s - c2);
        let d3 = Math.abs(s - c3);
        if (d1 <= d2 && d1 <= d3) clusters[0].push(s);
        else if (d2 <= d1 && d2 <= d3) clusters[1].push(s);
        else clusters[2].push(s);
      }
      if (clusters[0].length > 0) c1 = clusters[0].reduce((a, b) => a + b, 0) / clusters[0].length;
      if (clusters[1].length > 0) c2 = clusters[1].reduce((a, b) => a + b, 0) / clusters[1].length;
      if (clusters[2].length > 0) c3 = clusters[2].reduce((a, b) => a + b, 0) / clusters[2].length;
    }

    const result = [
      { group: 'Tier 1 (Low Salary)', count: clusters[0].length, centroid: Math.round(c1) },
      { group: 'Tier 2 (Medium Salary)', count: clusters[1].length, centroid: Math.round(c2) },
      { group: 'Tier 3 (High Salary)', count: clusters[2].length, centroid: Math.round(c3) }
    ].filter(c => c.count > 0);

    res.json({ success: true, clusters: result });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});