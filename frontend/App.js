import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';

const API_BASE_URL = 'http://119.59.102.161:3065/api';

export default function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  
  const [editingId, setEditingId] = useState(null);

  const [loadingCluster, setLoadingCluster] = useState(false);
  const [clusters, setClusters] = useState([]);

  // โหลด Token อัตโนมัติเมื่อเปิดเว็บหรือรีเฟรช (ไม่ต้องล็อกอินใหม่)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
      }
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch employees');
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEmployees();
    }
  }, [token]);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        if (Platform.OS === 'web') {
          localStorage.setItem('token', data.token); // บันทึก Token ไว้
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (err) {
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  const handleLogout = () => {
    setToken(null);
    if (Platform.OS === 'web') {
      localStorage.removeItem('token'); // ลบ Token ออกเมื่อออกจากระบบ
    }
  };

  const handleSaveEmployee = async () => {
    if (!name.trim() || !position.trim() || !salary.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields (Name, Position, Salary)');
      return;
    }

    try {
      let url = `${API_BASE_URL}/employees`;
      let method = 'POST';

      if (editingId) {
        url = `${API_BASE_URL}/employees/${editingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, position, salary: Number(salary) })
      });

      if (res.ok) {
        setName('');
        setPosition('');
        setSalary('');
        setEditingId(null);
        fetchEmployees();
      } else {
        Alert.alert('Error', editingId ? 'Failed to update employee' : 'Failed to add employee');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setPosition(item.position);
    setSalary(String(item.salary));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPosition('');
    setSalary('');
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${id}/status`, { method: 'PUT' });
      if (res.ok) fetchEmployees();
    } catch (err) {
      Alert.alert('Error', 'Could not update status');
    }
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Do you really want to delete this employee record?')) {
        executeDelete(id);
      }
    } else {
      Alert.alert('Are you sure?', 'Do you really want to delete this employee record?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => executeDelete(id)
        }
      ]);
    }
  };

  const executeDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingId === id) handleCancelEdit();
        fetchEmployees();
      } else {
        Alert.alert('Error', 'Could not delete employee');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleAnalyzeSalary = async () => {
    setLoadingCluster(true);
    setClusters([]);
    try {
      const res = await fetch(`${API_BASE_URL}/employees/salary-clusters`);
      const data = await res.json();
      if (res.ok && data.success) {
        setClusters(data.clusters);
      } else {
        Alert.alert('Error', 'Failed to analyze salary clusters');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error during analytics');
    } finally {
      setLoadingCluster(false);
    }
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.brandTitle}>GLOBAL HR PORTAL</Text>
          <Text style={styles.loginSubtitle}>ระบบบริหารจัดการบุคลากรและวิเคราะห์เงินเดือน</Text>
          
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="admin"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="password123"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.btnLogin} onPress={handleLogin}>
            <Text style={styles.btnLoginText}>Login to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>🌐 GLOBAL HR PORTAL</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>👤 Admin</Text>
          </View>
          <TouchableOpacity 
            onPress={handleLogout} 
            style={{ backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainGrid}>
          
          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editingId ? '✏️ Edit Employee' : '➕ Add New Employee'}
              </Text>
              <Text style={styles.subLabel}>
                {editingId ? 'แก้ไขข้อมูล (ID: ' + editingId + ')' : 'เพิ่มพนักงานใหม่'}
              </Text>
              
              <TextInput style={styles.input} placeholder="Name (ชื่อพนักงาน)" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Position (ตำแหน่ง)" value={position} onChangeText={setPosition} />
              <TextInput style={styles.input} placeholder="Salary (เงินเดือน)" keyboardType="numeric" value={salary} onChangeText={setSalary} />
              
              <View style={styles.formActionRow}>
                <TouchableOpacity 
                  style={[styles.btnAdd, { backgroundColor: editingId ? '#d97706' : '#2563eb', flex: 1 }]} 
                  onPress={handleSaveEmployee}
                >
                  <Text style={styles.btnAddText}>{editingId ? 'Update' : 'Add Employee'}</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.btnCancel} onPress={handleCancelEdit}>
                    <Text style={styles.btnActionText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 Employee List</Text>
              <Text style={styles.subLabel}>รายชื่อพนักงานทั้งหมด</Text>
              
              <View style={styles.employeeList}>
                {Array.isArray(employees) && employees.map((item) => (
                  <View key={item.id} style={styles.empCardItem}>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empSub}>Position: {item.position}</Text>
                    <Text style={styles.empSub}>Salary: ฿{Number(item.salary).toLocaleString()}</Text>
                    
                    <View style={styles.statusRow}>
                      <View style={[styles.dot, { backgroundColor: item.status === 'Active' ? '#2ecc71' : '#f39c12' }]} />
                      <Text style={styles.statusText}>Status: {item.status}</Text>
                    </View>

                    <View style={styles.empActionRow}>
                      <TouchableOpacity style={styles.btnEdit} onPress={() => handleStartEdit(item)}>
                        <Text style={styles.btnActionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnToggle} onPress={() => handleToggleStatus(item.id)}>
                        <Text style={styles.btnActionText}>Toggle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item.id)}>
                        <Text style={styles.btnActionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.analyticsCard}>
          <TouchableOpacity style={styles.btnAnalyze} onPress={handleAnalyzeSalary}>
            <Text style={styles.btnAnalyzeText}>📊 Analyze Salary Structure (K-Means)</Text>
          </TouchableOpacity>

          {loadingCluster && <ActivityIndicator size="large" color="#2980b9" style={{ marginTop: 15 }} />}

          {clusters.length > 0 && (
            <View style={styles.clusterResultRow}>
              {clusters.map((c, idx) => (
                <View key={idx} style={styles.clusterTierBox}>
                  <Text style={styles.clusterTierTitle}>{c.group}</Text>
                  <Text style={styles.clusterText}>Count: {c.count} คน</Text>
                  <Text style={styles.clusterText}>Avg: ฿{c.centroid.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f3f6' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2f7', padding: 20 },
  loginCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', padding: 30, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  brandTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', marginBottom: 5 },
  loginSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 25 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#f8fafc', fontSize: 14 },
  btnLogin: { backgroundColor: '#1e3a8a', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnLoginText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  headerBar: { backgroundColor: '#1e3a8a', paddingVertical: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  userBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  userBadgeText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  scrollContent: { padding: 15 },
  mainGrid: { flexDirection: 'column', gap: 15 },
  column: { width: '100%' },

  card: { backgroundColor: '#fff', padding: 18, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  subLabel: { fontSize: 12, color: '#64748b', marginBottom: 15 },

  employeeList: { flexDirection: 'column', gap: 12, marginTop: 5 },
  empCardItem: { width: '100%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 14, borderRadius: 10 },
  empName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  empSub: { fontSize: 13, color: '#475569', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  
  empActionRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  btnEdit: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnToggle: { flex: 1, backgroundColor: '#f59e0b', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnDelete: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnActionText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  formActionRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  btnAdd: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnAddText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnCancel: { backgroundColor: '#64748b', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  analyticsCard: { backgroundColor: '#fff', padding: 18, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginTop: 5 },
  btnAnalyze: { backgroundColor: '#16a34a', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnAnalyzeText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  clusterResultRow: { flexDirection: 'column', gap: 12, marginTop: 15 },
  clusterTierBox: { width: '100%', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', padding: 14, borderRadius: 10 },
  clusterTierTitle: { fontSize: 16, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 6 },
  clusterText: { fontSize: 13, color: '#334155', marginBottom: 2 }
});