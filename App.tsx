
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
export const generateUniqueId = () => Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);

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
      const sanitizeTable = (table: any[], isUserTable = false) => {
        if (!Array.isArray(table)) return [];
        return table.map(item => {
          const newItem = { ...item };
          Object.keys(newItem).forEach(key => {
            const k = key.toLowerCase();
            
            // Handle Numeric IDs
            if (k.endsWith('_id') || k === 'ac_no' || k === 'bank_id' || k === 'user_id' || k === 'post_id' || k === 'pay_id' || k === 'department_id' || k === 'office_id' || k === 'branch_id' || k === 'employee_id') {
              if (newItem[key] !== undefined && newItem[key] !== null && newItem[key] !== '') {
                newItem[key] = Math.floor(Number(newItem[key]));
              }
            }

            // Normalize User_Type specifically
            if (isUserTable && (k === 'user_type' || key === 'User_Type')) {
              const val = newItem[key]?.toString().trim().toLowerCase();
              if (val === 'admin') newItem[key] = UserType.ADMIN;
              else if (val === 'normal') newItem[key] = UserType.NORMAL;
            }
          });
          return newItem;
        });
      };

      const sanitizedData: any = { ...remoteData };
      sanitizedData.users = sanitizeTable(remoteData.users || [], true);
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
        // Parse the key carefully to handle floating point strings like "1.0"
        const numericKey = Math.floor(Number(key));
        if (!isNaN(numericKey)) {
          const val = rawSelections[key];
          sanitizedSelections[numericKey] = Array.isArray(val) 
            ? val.map(v => Math.floor(Number(v))).filter(v => !isNaN(v)) 
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
      setSyncError("Cloud connection timed out or failed. Check your internet or Google Sheet settings.");
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
      .filter(o => Math.floor(Number(o.User_ID)) === Math.floor(Number(currentUser.User_ID)))
      .map(o => Math.floor(Number(o.Office_ID)));
    return employees.filter(e => userOfficeIds.includes(Math.floor(Number(e.Office_ID))));
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
      setSyncError(`Update failed: ${result.error || 'Connection error'}`);
      await loadData(false);
    } else {
      setLastSynced(new Date());
    }
    setIsSyncing(false);
  };

  // --- Master Data Handlers ---

  const upsertUser = (user: User) => {
    const now = new Date().toLocaleString();
    const users = data.users || [];
    const exists = users.find(u => Math.floor(Number(u.User_ID)) === Math.floor(Number(user.User_ID)));
    const finalUser = exists 
      ? { ...user, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...user, User_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newUsers = exists 
      ? users.map(u => Math.floor(Number(u.User_ID)) === Math.floor(Number(user.User_ID)) ? finalUser : u)
      : [...users, finalUser];
    performSync('upsertUser', finalUser, { ...data, users: newUsers });
  };

  const deleteUser = (userId: number) => {
    const id = Math.floor(Number(userId));
    const hasOffices = data.offices.some(o => Math.floor(Number(o.User_ID)) === id);
    if (hasOffices) return alert("User is active custodian for offices.");
    const newUsers = data.users.filter(u => Math.floor(Number(u.User_ID)) !== id);
    performSync('deleteUser', { User_ID: id }, { ...data, users: newUsers });
  };

  const upsertDepartment = (dept: Department) => {
    const now = new Date().toLocaleString();
    const exists = data.departments.find(d => Math.floor(Number(d.Department_ID)) === Math.floor(Number(dept.Department_ID)));
    const finalDept = exists
      ? { ...dept, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...dept, Department_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newDepts = exists
      ? data.departments.map(d => Math.floor(Number(d.Department_ID)) === Math.floor(Number(dept.Department_ID)) ? finalDept : d)
      : [...data.departments, finalDept];
    performSync('upsertDepartment', finalDept, { ...data, departments: newDepts });
  };

  const deleteDepartment = (deptId: number) => {
    const id = Math.floor(Number(deptId));
    const newDepts = data.departments.filter(d => Math.floor(Number(d.Department_ID)) !== id);
    performSync('deleteDepartment', { Department_ID: id }, { ...data, departments: newDepts });
  };

  const upsertOffice = (office: Office) => {
    const now = new Date().toLocaleString();
    const exists = data.offices.find(o => Math.floor(Number(o.Office_ID)) === Math.floor(Number(office.Office_ID)));
    const finalOffice = exists
      ? { ...office, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...office, Office_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newOffices = exists
      ? data.offices.map(o => Math.floor(Number(o.Office_ID)) === Math.floor(Number(office.Office_ID)) ? finalOffice : o)
      : [...data.offices, finalOffice];
    performSync('upsertOffice', finalOffice, { ...data, offices: newOffices });
  };

  const deleteOffice = (officeId: number) => {
    const id = Math.floor(Number(officeId));
    const newOffices = data.offices.filter(o => Math.floor(Number(o.Office_ID)) !== id);
    performSync('deleteOffice', { Office_ID: id }, { ...data, offices: newOffices });
  };

  const upsertBank = (bank: Bank) => {
    const now = new Date().toLocaleString();
    const exists = data.banks.find(b => Math.floor(Number(b.Bank_ID)) === Math.floor(Number(bank.Bank_ID)));
    const finalBank = exists
      ? { ...bank, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...bank, Bank_ID: bank.Bank_ID || generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newBanks = exists
      ? data.banks.map(b => Math.floor(Number(b.Bank_ID)) === Math.floor(Number(bank.Bank_ID)) ? finalBank : b)
      : [...data.banks, finalBank];
    performSync('upsertBank', finalBank, { ...data, banks: newBanks });
  };

  const deleteBank = (bankId: number) => {
    const id = Math.floor(Number(bankId));
    const hasBranches = (data.branches || []).some(b => Math.floor(Number(b.Bank_ID)) === id);
    const hasEmployees = (data.employees || []).some(e => Math.floor(Number(e.Bank_ID)) === id);
    if (hasBranches || hasEmployees) {
      return alert("Cannot delete bank: It has registered branches or assigned employees.");
    }
    const newBanks = data.banks.filter(b => Math.floor(Number(b.Bank_ID)) !== id);
    performSync('deleteBank', { Bank_ID: id }, { ...data, banks: newBanks });
  };

  const upsertBranch = (branch: BankBranch) => {
    const now = new Date().toLocaleString();
    const exists = data.branches.find(b => Math.floor(Number(b.Branch_ID)) === Math.floor(Number(branch.Branch_ID)));
    const finalBranch = exists
      ? { ...branch, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...branch, Branch_ID: branch.Branch_ID || generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newBranches = exists
      ? data.branches.map(b => Math.floor(Number(b.Branch_ID)) === Math.floor(Number(branch.Branch_ID)) ? finalBranch : b)
      : [...data.branches, finalBranch];
    performSync('upsertBranch', finalBranch, { ...data, branches: newBranches });
  };

  const batchUpsertBranches = (branches: BankBranch[]) => {
    const now = new Date().toLocaleString();
    const newBranches = [...data.branches];
    
    branches.forEach(branch => {
      const idx = newBranches.findIndex(b => Math.floor(Number(b.Branch_ID)) === Math.floor(Number(branch.Branch_ID)));
      if (idx !== -1) {
        newBranches[idx] = { ...branch, T_STMP_UPD: now };
      }
    });

    performSync('batchUpsertBranches', branches, { ...data, branches: newBranches });
  };

  const deleteBranch = (branchId: number) => {
    const id = Math.floor(Number(branchId));
    const hasEmployees = (data.employees || []).some(e => Math.floor(Number(e.Branch_ID)) === id);
    if (hasEmployees) {
      return alert("Cannot delete branch: It is currently assigned to one or more employees.");
    }
    const newBranches = data.branches.filter(b => Math.floor(Number(b.Branch_ID)) !== id);
    performSync('deleteBranch', { Branch_ID: id }, { ...data, branches: newBranches });
  };

  const upsertPost = (post: Post) => {
    const now = new Date().toLocaleString();
    const exists = data.posts.find(p => Math.floor(Number(p.Post_ID)) === Math.floor(Number(post.Post_ID)));
    const finalPost = exists
      ? { ...post, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...post, Post_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newPosts = exists
      ? data.posts.map(p => Math.floor(Number(p.Post_ID)) === Math.floor(Number(post.Post_ID)) ? finalPost : p)
      : [...data.posts, finalPost];
    performSync('upsertPost', finalPost, { ...data, posts: newPosts });
  };

  const deletePost = (postId: number) => {
    const id = Math.floor(Number(postId));
    const newPosts = data.posts.filter(p => Math.floor(Number(p.Post_ID)) !== id);
    performSync('deletePost', { Post_ID: id }, { ...data, posts: newPosts });
  };

  const upsertPayscale = (pay: Payscale) => {
    const now = new Date().toLocaleString();
    const exists = data.payscales.find(p => Math.floor(Number(p.Pay_ID)) === Math.floor(Number(pay.Pay_ID)));
    const finalPay = exists
      ? { ...pay, T_STMP_ADD: exists.T_STMP_ADD, T_STMP_UPD: now }
      : { ...pay, Pay_ID: generateUniqueId(), T_STMP_ADD: now, T_STMP_UPD: now };
    const newPays = exists
      ? data.payscales.map(p => Math.floor(Number(p.Pay_ID)) === Math.floor(Number(pay.Pay_ID)) ? finalPay : p)
      : [...data.payscales, finalPay];
    performSync('upsertPayscale', finalPay, { ...data, payscales: newPays });
  };

  const deletePayscale = (payId: number) => {
    const id = Math.floor(Number(payId));
    const newPays = data.payscales.filter(p => Math.floor(Number(p.Pay_ID)) !== id);
    performSync('deletePayscale', { Pay_ID: id }, { ...data, payscales: newPays });
  };

  const upsertEmployee = (employee: Employee) => {
    const now = new Date().toLocaleString();
    const exists = data.employees.find(e => Math.floor(Number(e.Employee_ID)) === Math.floor(Number(employee.Employee_ID)));
    const finalEmployee = {
      ...employee,
      T_STMP_ADD: exists ? exists.T_STMP_ADD : now,
      T_STMP_UPD: now
    };
    const newEmployees = exists
      ? data.employees.map(e => Math.floor(Number(e.Employee_ID)) === Math.floor(Number(employee.Employee_ID)) ? finalEmployee : e)
      : [...data.employees, finalEmployee];
    
    performSync('upsertEmployee', finalEmployee, { ...data, employees: newEmployees });
    setEditingEmployee(null);
    setActiveTab('employees');
  };

  const deleteEmployee = (empId: number) => {
    const id = Math.floor(Number(empId));
    const newEmployees = data.employees.filter(e => Math.floor(Number(e.Employee_ID)) !== id);
    performSync('deleteEmployee', { Employee_ID: id }, { ...data, employees: newEmployees });
  };

  const toggleEmployeeStatus = (empId: number) => {
    const employee = data.employees.find(e => Math.floor(Number(e.Employee_ID)) === Math.floor(Number(empId)));
    if (!employee) return;
    
    const newStatus = employee.Active === 'Yes' ? 'No' : 'Yes';
    const updatedEmployee: Employee = {
      ...employee,
      Active: newStatus,
      DA_Reason: newStatus === 'No' ? 'Transfer' : '',
    };
    upsertEmployee(updatedEmployee);
  };

  const togglePostSelection = (postId: number) => {
    if (!currentUser) return;
    const userId = Math.floor(Number(currentUser.User_ID));
    const currentSelections = data.userPostSelections[userId] || [];
    const newSelections = currentSelections.includes(postId)
      ? currentSelections.filter(id => id !== postId)
      : [...currentSelections, postId];
    
    const newMap = { ...data.userPostSelections, [userId]: newSelections };
    performSync('updateUserPostSelections', { User_ID: userId, Post_IDs: newSelections }, { ...data, userPostSelections: newMap });
  };

  if (!currentUser) {
    return <Login users={data.users || []} onLogin={(user) => {
      setCurrentUser(user);
      localStorage.setItem('ems_user', JSON.stringify(user));
    }} />;
  }

  const renderContent = () => {
    if (activeTab === 'employeeForm' || editingEmployee) {
      return (
        <EmployeeForm 
          employee={editingEmployee}
          data={data}
          currentUser={currentUser}
          onSave={upsertEmployee}
          onSaveBank={upsertBank}
          onSaveBranch={upsertBranch}
          onCancel={() => { setEditingEmployee(null); setActiveTab('employees'); }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard employees={filteredEmployees} data={data} />;
      case 'employees':
        return (
          <EmployeeList 
            employees={filteredEmployees} 
            data={data} 
            currentUser={currentUser}
            onEdit={setEditingEmployee}
            onAddNew={() => setActiveTab('employeeForm')}
            onDelete={deleteEmployee}
            onToggleStatus={toggleEmployeeStatus}
          />
        );
      case 'managePosts':
        return <UserPostSelection data={data} currentUser={currentUser} onToggle={togglePostSelection} />;
      case 'users':
        return <UserManagement data={data} onSaveUser={upsertUser} onDeleteUser={deleteUser} />;
      case 'offices':
        return <OfficeManagement data={data} onSaveOffice={upsertOffice} onDeleteOffice={deleteOffice} />;
      case 'departments':
        return <DepartmentManagement data={data} onSaveDepartment={upsertDepartment} onDeleteDepartment={deleteDepartment} />;
      case 'banks':
        return (
          <BankManagement 
            data={data} 
            onSaveBank={upsertBank} 
            onDeleteBank={deleteBank} 
            onSaveBranch={upsertBranch} 
            onDeleteBranch={deleteBranch} 
            onBatchUpdateBranches={batchUpsertBranches}
          />
        );
      case 'serviceMaster':
        return <ServiceMasterManagement data={data} onSavePost={upsertPost} onDeletePost={deletePost} onSavePayscale={upsertPayscale} onDeletePayscale={deletePayscale} />;
      default:
        return <Dashboard employees={filteredEmployees} data={data} />;
    }
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar 
        data={data} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={() => {
          setCurrentUser(null);
          localStorage.removeItem('ems_user');
        }} 
      />
      <div className="flex-grow-1" style={{ overflowY: 'auto', height: '100vh' }}>
        <header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{zIndex: 1000}}>
          <div className="d-flex align-items-center gap-3">
            <h5 className="mb-0 fw-bold text-dark">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/([A-Z])/g, ' $1')}
            </h5>
            {isSyncing ? (
              <span className="badge bg-primary-subtle text-primary d-flex align-items-center gap-1 animate-pulse">
                <RefreshCw size={12} className="animate-spin" /> Syncing...
              </span>
            ) : syncError ? (
              <span className="badge bg-danger-subtle text-danger d-flex align-items-center gap-1">
                <AlertCircle size={12} /> Sync Error
              </span>
            ) : (
              <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1">
                <CheckCircle size={12} /> Connected
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end d-none d-md-block">
              <div className="small text-muted d-flex align-items-center gap-1">
                <Clock size={12} /> Last sync: {lastSynced.toLocaleTimeString()}
              </div>
            </div>
            <button 
              onClick={() => loadData()} 
              disabled={isSyncing} 
              className="btn btn-light btn-sm rounded-pill border shadow-sm px-3 d-flex align-items-center gap-2"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> 
              {isSyncing ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </header>

        <main className="p-4">
          {syncError && (
            <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center gap-2 mb-4">
              <AlertCircle size={18} />
              <div>
                <div className="fw-bold">Synchronization Notice</div>
                <div className="small">{syncError}</div>
              </div>
            </div>
          )}
          {isLoading && !isSyncing ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 mt-5">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p className="text-muted fw-medium">Initializing workspace data...</p>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
      
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
}
