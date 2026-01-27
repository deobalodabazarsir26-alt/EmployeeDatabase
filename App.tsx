
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppData, User, UserType, Employee, Office, Bank, BankBranch, Department, Post, Payscale } from './types';
import { INITIAL_DATA, GSHEET_API_URL } from './constants';
import { syncService } from './services/googleSheetService';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import EmployeeList from './components/EmployeeList';
import EmployeeForm from './components/EmployeeForm';
import OfficeManagement from './components/OfficeManagement';
import BankManagement from './components/BankManagement';
import UserPostSelection from './components/UserPostSelection';
import UserManagement from './components/UserManagement';
import DepartmentManagement from './components/DepartmentManagement';
import ServiceMasterManagement from './components/ServiceMasterManagement';
import { LogOut, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// Robust ID generation for multi-user environments
const generateUniqueId = () => Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('ems_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.User_ID !== undefined) {
          parsed.User_ID = Number(parsed.User_ID);
        }
        return parsed;
      }
    } catch (e) {}
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [syncError, setSyncError] = useState<string | null>(null);

  const [data, setData] = useState<AppData>(() => {
    try {
      const savedData = localStorage.getItem('ems_data');
      if (savedData) {
        return { ...INITIAL_DATA, ...JSON.parse(savedData) };
      }
    } catch (e) {}
    return INITIAL_DATA;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsLoading(true);
    setSyncError(null);
    
    const remoteData = await syncService.fetchAllData();
    if (remoteData) {
      const sanitizeTable = (table: any[]) => {
        if (!Array.isArray(table)) return [];
        return table.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            const k = key.toLowerCase();
            if (k.endsWith('_id') || k === 'ac_no' || k === 'bank_id' || k === 'user_id' || k === 'post_id' || k === 'pay_id' || k === 'department_id' || k === 'office_id' || k === 'branch_id' || k === 'employee_id') {
              if (newItem[key] !== undefined && newItem[key] !== null && newItem[key] !== '') {
                newItem[key] = Number(newItem[key]);
              }
            }
          });
          return newItem;
        });
      };

      const sanitizedData: any = { ...remoteData };
      sanitizedData.users = sanitizeTable(remoteData.users || []);
      sanitizedData.departments = sanitizeTable(remoteData.departments || []);
      sanitizedData.offices = sanitizeTable(remoteData.offices || []);
      sanitizedData.banks = sanitizeTable(remoteData.banks || []);
      const rawBranches = remoteData.branches || (remoteData as any).bank_branchs || [];
      sanitizedData.branches = sanitizeTable(rawBranches);
      sanitizedData.posts = sanitizeTable(remoteData.posts || []);
      sanitizedData.payscales = sanitizeTable(remoteData.payscales || []);
      sanitizedData.employees = sanitizeTable(remoteData.employees || []);

      const rawSelections = (remoteData.userPostSelections || {}) as Record<string, any>;
      const sanitizedSelections: Record<number, number[]> = {};
      
      Object.keys(rawSelections).forEach(key => {
        const numericKey = Number(key);
        if (!isNaN(numericKey)) {
          const val = rawSelections[key];
          sanitizedSelections[numericKey] = Array.isArray(val) 
            ? val.map(v => Number(v)).filter(v => !isNaN(v)) 
            : [];
        }
      });

      const mergedData = { 
        ...INITIAL_DATA, 
        ...sanitizedData,
        userPostSelections: sanitizedSelections
      };
      
      setData(mergedData);
      setLastSynced(new Date());
      try {
        localStorage.setItem('ems_data', JSON.stringify(mergedData));
      } catch (e) {}
    } else {
      setSyncError("Cloud connection failed. Working in local mode.");
    }
    
    if (showIndicator) setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 300000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredEmployees = useMemo(() => {
    if (!currentUser) return [];
    const employees = data.employees || [];
    if (currentUser.User_Type === UserType.ADMIN) return employees;
    const userOfficeIds = (data.offices || [])
      .filter(o => Number(o.User_ID) === Number(currentUser.User_ID))
      .map(o => Number(o.Office_ID));
    return employees.filter(e => userOfficeIds.includes(Number(e.Office_ID)));
  }, [currentUser, data.employees, data.offices]);

  const performSync = async (action: string, payload: any, newState: AppData) => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncError(null);
    setData(newState);

    try {
      localStorage.setItem('ems_data', JSON.stringify(newState));
    } catch (e) {}

    const result = await syncService.saveData(action, payload);
    if (!result.success) {
      setSyncError(`Update failed: ${result.error || 'Write conflict'}`);
      await loadData(false);
    } else {
      setLastSynced(new Date());
    }
    setIsSyncing(false);
  };

  const upsertUser = (user: User) => {
    const now = new Date().toLocaleString();
    const users = data.users || [];
    const exists = users.find(u => Number(u.User_ID) === Number(user.User_ID));
    const finalUser = exists 
      ? { ...user, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...user, User_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newUsers = exists 
      ? users.map(u => Number(u.User_ID) === Number(user.User_ID) ? finalUser : u)
      : [...users, finalUser];
    performSync('upsertUser', finalUser, { ...data, users: newUsers });
  };

  const deleteUser = (userId: number) => {
    const hasOffices = data.offices.some(o => Number(o.User_ID) === userId);
    if (hasOffices) return alert("User is active custodian for offices.");
    const newUsers = data.users.filter(u => Number(u.User_ID) !== userId);
    performSync('deleteUser', { User_ID: userId }, { ...data, users: newUsers });
  };

  const upsertDepartment = (dept: Department) => {
    const now = new Date().toLocaleString();
    const depts = data.departments || [];
    const exists = depts.find(d => Number(d.Department_ID) === Number(dept.Department_ID));
    const finalDept = exists
      ? { ...dept, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...dept, Department_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newDepts = exists
      ? depts.map(d => Number(d.Department_ID) === Number(dept.Department_ID) ? finalDept : d)
      : [...depts, finalDept];
    performSync('upsertDepartment', finalDept, { ...data, departments: newDepts });
  };

  const deleteDepartment = (deptId: number) => {
    const hasLinked = data.offices.some(o => Number(o.Department_ID) === deptId) || data.employees.some(e => Number(e.Department_ID) === deptId);
    if (hasLinked) return alert("Department has linked offices or employees.");
    const newDepts = data.departments.filter(d => Number(d.Department_ID) !== deptId);
    performSync('deleteDepartment', { Department_ID: deptId }, { ...data, departments: newDepts });
  };

  const upsertEmployee = (employee: Employee) => {
    const now = new Date().toLocaleString();
    const employees = data.employees || [];
    const exists = employees.find(e => Number(e.Employee_ID) === Number(employee.Employee_ID));
    const finalEmp = exists
      ? { ...employee, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...employee, Employee_ID: Number(employee.Employee_ID), T_STMP_ADD: now, T_STMP_UPD: now };
    const newEmployees = exists
      ? employees.map(e => Number(e.Employee_ID) === Number(employee.Employee_ID) ? finalEmp : e)
      : [...employees, finalEmp];
    performSync('upsertEmployee', finalEmp, { ...data, employees: newEmployees });
    setActiveTab('employees');
    setEditingEmployee(null);
  };

  const deleteEmployee = (empId: number) => {
    const newEmployees = data.employees.filter(e => Number(e.Employee_ID) !== empId);
    performSync('deleteEmployee', { Employee_ID: empId }, { ...data, employees: newEmployees });
  };

  const upsertOffice = (office: Office) => {
    const now = new Date().toLocaleString();
    const offices = data.offices || [];
    const exists = offices.find(o => Number(o.Office_ID) === Number(office.Office_ID));
    const finalOff = exists
      ? { ...office, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...office, Office_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newOffices = exists
      ? offices.map(o => Number(o.Office_ID) === Number(office.Office_ID) ? finalOff : o)
      : [...offices, finalOff];
    performSync('upsertOffice', finalOff, { ...data, offices: newOffices });
  };

  const deleteOffice = (officeId: number) => {
    if (data.employees.some(e => Number(e.Office_ID) === officeId)) return alert("Office has active employees.");
    const newOffices = data.offices.filter(o => Number(o.Office_ID) !== officeId);
    performSync('deleteOffice', { Office_ID: officeId }, { ...data, offices: newOffices });
  };

  const upsertBank = (bank: Bank) => {
    const now = new Date().toLocaleString();
    const exists = data.banks.find(b => Number(b.Bank_ID) === Number(bank.Bank_ID));
    const finalBk = exists
      ? { ...bank, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...bank, Bank_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newBanks = exists
      ? data.banks.map(b => Number(b.Bank_ID) === Number(bank.Bank_ID) ? finalBk : b)
      : [...data.banks, finalBk];
    performSync('upsertBank', finalBk, { ...data, banks: newBanks });
  };

  const deleteBank = (bankId: number) => {
    if (data.branches.some(b => Number(b.Bank_ID) === bankId)) return alert("Bank has active branches.");
    const newBanks = data.banks.filter(b => Number(b.Bank_ID) !== bankId);
    performSync('deleteBank', { Bank_ID: bankId }, { ...data, banks: newBanks });
  };

  const upsertBranch = (branch: BankBranch) => {
    const now = new Date().toLocaleString();
    const exists = data.branches.find(b => Number(b.Branch_ID) === Number(branch.Branch_ID));
    const finalBr = exists
      ? { ...branch, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...branch, Branch_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newBranches = exists
      ? data.branches.map(b => Number(b.Branch_ID) === Number(branch.Branch_ID) ? finalBr : b)
      : [...data.branches, finalBr];
    performSync('upsertBranch', finalBr, { ...data, branches: newBranches });
  };

  const deleteBranch = (branchId: number) => {
    if (data.employees.some(e => Number(e.Branch_ID) === branchId)) return alert("Branch is assigned to employees.");
    const newBranches = data.branches.filter(b => Number(b.Branch_ID) !== branchId);
    performSync('deleteBranch', { Branch_ID: branchId }, { ...data, branches: newBranches });
  };

  const upsertPost = (post: Post) => {
    const now = new Date().toLocaleString();
    const exists = data.posts.find(p => Number(p.Post_ID) === Number(post.Post_ID));
    const finalPost = exists
      ? { ...post, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...post, Post_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newPosts = exists
      ? data.posts.map(p => Number(p.Post_ID) === Number(post.Post_ID) ? finalPost : p)
      : [...data.posts, finalPost];
    performSync('upsertPost', finalPost, { ...data, posts: newPosts });
  };

  const deletePost = (postId: number) => {
    if (data.employees.some(e => Number(e.Post_ID) === postId)) return alert("Post is assigned to employees.");
    const newPosts = data.posts.filter(p => Number(p.Post_ID) !== postId);
    performSync('deletePost', { Post_ID: postId }, { ...data, posts: newPosts });
  };

  const upsertPayscale = (payscale: Payscale) => {
    const now = new Date().toLocaleString();
    const exists = data.payscales.find(s => Number(s.Pay_ID) === Number(payscale.Pay_ID));
    const finalScale = exists
      ? { ...payscale, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...payscale, Pay_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newScales = exists
      ? data.payscales.map(s => Number(s.Pay_ID) === Number(payscale.Pay_ID) ? finalScale : s)
      : [...data.payscales, finalScale];
    performSync('upsertPayscale', finalScale, { ...data, payscales: newScales });
  };

  const deletePayscale = (payId: number) => {
    if (data.employees.some(e => Number(e.Pay_ID) === payId)) return alert("Scale is assigned to employees.");
    const newScales = data.payscales.filter(s => Number(s.Pay_ID) !== payId);
    performSync('deletePayscale', { Pay_ID: payId }, { ...data, payscales: newScales });
  };

  const handleTogglePostSelection = (postId: number) => {
    if (!currentUser) return;
    const userId = Number(currentUser.User_ID);
    const current = Array.isArray(data.userPostSelections[userId]) ? data.userPostSelections[userId] : [];
    const isSelected = current.includes(Number(postId));
    const next = isSelected ? current.filter(id => Number(id) !== Number(postId)) : [...current, Number(postId)];
    const newState = { ...data, userPostSelections: { ...data.userPostSelections, [userId]: next } };
    performSync('updatePostSelections', { User_ID: userId, Post_IDs: next }, newState);
  };

  const handleLogin = (user: User) => {
    setCurrentUser({ ...user, User_ID: Number(user.User_ID) });
    setActiveTab('dashboard');
    loadData(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!currentUser) return <Login users={data.users || []} onLogin={handleLogin} />;

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <RefreshCw size={48} className="text-primary mb-3 spin-animate" />
        <h5 className="fw-bold">Establishing Cloud Session...</h5>
        <p className="text-muted small">Synchronizing Relational Database V4.1</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard employees={filteredEmployees} data={data} />;
      case 'employees': return <EmployeeList employees={filteredEmployees} data={data} currentUser={currentUser} onEdit={(emp) => { setEditingEmployee(emp); setActiveTab('employeeForm'); }} onAddNew={() => { setEditingEmployee(null); setActiveTab('employeeForm'); }} onDelete={deleteEmployee} />;
      case 'employeeForm': return <EmployeeForm employee={editingEmployee} data={data} currentUser={currentUser} onSave={upsertEmployee} onCancel={() => setActiveTab('employees')} />;
      case 'users': return <UserManagement data={data} onSaveUser={upsertUser} onDeleteUser={deleteUser} />;
      case 'offices': return <OfficeManagement data={data} onSaveOffice={upsertOffice} onDeleteOffice={deleteOffice} />;
      case 'departments': return <DepartmentManagement data={data} onSaveDepartment={upsertDepartment} onDeleteDepartment={deleteDepartment} />;
      case 'banks': return <BankManagement data={data} onSaveBank={upsertBank} onDeleteBank={deleteBank} onSaveBranch={upsertBranch} onDeleteBranch={deleteBranch} />;
      case 'serviceMaster': return <ServiceMasterManagement data={data} onSavePost={upsertPost} onDeletePost={deletePost} onSavePayscale={upsertPayscale} onDeletePayscale={deletePayscale} />;
      case 'managePosts': return <UserPostSelection data={data} currentUser={currentUser} onToggle={handleTogglePostSelection} />;
      default: return <Dashboard employees={filteredEmployees} data={data} />;
    }
  };

  return (
    <div className="container-fluid p-0 d-flex flex-column flex-md-row min-vh-100">
      <Sidebar data={data} activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-grow-1 bg-light p-3 p-md-5 overflow-auto position-relative">
        <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div>
              <h1 className="h3 fw-bold mb-1 text-capitalize">{activeTab === 'managePosts' ? 'Configuration' : activeTab.replace(/([A-Z])/g, ' $1')}</h1>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary rounded-pill d-inline-flex align-items-center gap-1" style={{fontSize: '0.65rem'}}>Cloud Active</span>
              </div>
            </div>
            <button onClick={() => loadData(false)} className={`btn btn-light btn-sm rounded-pill border shadow-sm px-3 d-flex align-items-center gap-2 ${isSyncing ? 'disabled' : ''}`}>
              <RefreshCw size={14} className={isSyncing ? 'spin-animate text-primary' : ''} />
              <span className="d-none d-lg-inline">Refresh Data</span>
            </button>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex flex-column align-items-end me-2 text-end">
              <div className={`d-flex align-items-center gap-1 px-2 py-1 bg-white rounded-pill border small ${syncError ? 'text-danger border-danger' : 'text-success border-success'}`}>
                {isSyncing ? <RefreshCw size={12} className="spin-animate" /> : syncError ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                <span className="fw-bold" style={{fontSize: '0.65rem'}}>{isSyncing ? 'Syncing...' : syncError ? 'Error' : 'Synced'}</span>
              </div>
              <div className="text-muted d-flex align-items-center gap-1 mt-1 justify-content-end" style={{fontSize: '0.6rem'}}>
                <Clock size={10} /> {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="d-none d-md-block text-end">
              <div className="fw-bold small text-dark">{currentUser.User_Name}</div>
              <span className="badge bg-primary rounded-pill" style={{fontSize: '0.65rem'}}>{currentUser.User_Type}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-outline-danger btn-sm rounded-circle p-2 shadow-sm border-2"><LogOut size={18} /></button>
          </div>
        </header>
        {syncError && (
          <div className="alert alert-warning border-0 shadow-sm rounded-3 py-2 d-flex align-items-center gap-2 small mb-4 animate-fade-in">
            <AlertCircle size={16} />
            <span className="fw-medium">{syncError}</span>
            <button className="btn btn-sm btn-outline-warning border-0 ms-auto py-0" onClick={() => setSyncError(null)}>Dismiss</button>
          </div>
        )}
        <div className={`container-xl px-0 ${isSyncing ? 'opacity-75' : ''}`} style={{ transition: 'opacity 0.2s', pointerEvents: isSyncing ? 'none' : 'auto' }}>
          {renderContent()}
        </div>
        {isSyncing && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.4)' }}>
            <div className="bg-white p-3 rounded-pill shadow-lg border d-flex align-items-center gap-3 animate-fade-in">
              <RefreshCw size={20} className="text-primary spin-animate" />
              <span className="fw-bold text-dark small">Committing Changes to Cloud...</span>
            </div>
          </div>
        )}
      </main>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-animate { animation: spin 1s linear infinite; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
