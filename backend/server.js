const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// --- ตั้งค่าการเชื่อมต่อ MySQL (ใช้ฐานข้อมูลเดิมของคุณ) ---
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',              // ค่าเริ่มต้น XAMPP
  password: '',              // รหัสผ่าน (ถ้ามี)
  database: 'ip_std6730202718', // ชื่อฐานข้อมูลเดิมของคุณ
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- 1. Authentication (Login) ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: "mock-jwt-token" });
  }
  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

// --- 2. CRUD Endpoints ---

// GET: ดึงข้อมูลพนักงานทั้งหมด
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees');
    const employees = rows.map(emp => ({ ...emp, id: String(emp.id) }));
    res.status(200).json(employees);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST: เพิ่มพนักงานใหม่
app.post('/api/employees', async (req, res) => {
  const { name, position, salary } = req.body;
  if (!name || !position || salary === undefined || salary === '') {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO employees (name, position, status, salary) VALUES (?, ?, ?, ?)',
      [name, position, 'Active', Number(salary)]
    );
    const newEmployee = {
      id: String(result.insertId),
      name,
      position,
      status: 'Active',
      salary: Number(salary)
    };
    res.status(201).json(newEmployee);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT: แก้ไขข้อมูลพนักงาน (Edit)
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, position, salary } = req.body;

  if (!name || !position || salary === undefined || salary === '') {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    const [result] = await pool.query(
      'UPDATE employees SET name = ?, position = ?, salary = ? WHERE id = ?',
      [name, position, Number(salary), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.status(200).json({ success: true, message: "Employee updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT: สลับสถานะพนักงาน (Active <-> On Leave)
app.put('/api/employees/:id/status', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const currentStatus = rows[0].status;
    const newStatus = currentStatus === "Active" ? "On Leave" : "Active";

    await pool.query('UPDATE employees SET status = ? WHERE id = ?', [newStatus, id]);
    res.status(200).json({ success: true, message: "Status updated", status: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE: ลบพนักงาน
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.status(200).json({ success: true, message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 3. Phase 2: K-Means Salary Clustering ---
function kMeans1D(salaries, k = 3, maxIterations = 100) {
  if (salaries.length === 0) return [];
  if (salaries.length <= k) {
    return salaries.map((s, idx) => ({ group: `Tier ${idx + 1}`, centroid: s, count: 1 }));
  }

  const sorted = [...salaries].sort((a, b) => a - b);
  let centroids = [
    sorted[0],
    sorted[Math.floor(sorted.length / 2)],
    sorted[sorted.length - 1]
  ];

  let clusters = [[], [], []];

  for (let iter = 0; iter < maxIterations; iter++) {
    clusters = [[], [], []];
    salaries.forEach(salary => {
      let minDist = Infinity;
      let clusterIdx = 0;
      centroids.forEach((c, idx) => {
        const dist = Math.abs(salary - c);
        if (dist < minDist) {
          minDist = dist;
          clusterIdx = idx;
        }
      });
      clusters[clusterIdx].push(salary);
    });

    let changed = false;
    centroids = centroids.map((c, idx) => {
      if (clusters[idx].length === 0) return c;
      const newCentroid = Math.round(clusters[idx].reduce((a, b) => a + b, 0) / clusters[idx].length);
      if (newCentroid !== c) changed = true;
      return newCentroid;
    });

    if (!changed) break;
  }

  return centroids.map((centroid, idx) => ({
    group: `Tier ${idx + 1}`,
    centroid,
    count: clusters[idx].length
  })).sort((a, b) => a.centroid - b.centroid)
    .map((item, idx) => ({ ...item, group: `Tier ${idx + 1}` }));
}

app.get('/api/employees/salary-clusters', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT salary FROM employees');
    const salaries = rows.map(e => Number(e.salary));
    const clusters = kMeans1D(salaries, 3);
    res.status(200).json({ success: true, clusters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server connected to MySQL database on http://localhost:${PORT}`);
});