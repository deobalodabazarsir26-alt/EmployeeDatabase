
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppData, User, UserType, Employee, Office, Bank, BankBranch, Department, Post, Payscale } from './types';
import { INITIAL_DATA } from './constants';
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
import FinalizationModule from './components/FinalizationModule';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Menu, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('ems_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.User_ID !== undefined) {
          parsed.User_ID = Math.floor(Number(parsed.User_ID));
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);

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

  // Close sidebar on mobile when tab changes
  useEffect(() => {
    if (window.innerWidth <= 992) {
      setIsSidebarOpen(false);
    }
  }, [activeTab]);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            const isId = k.endsWith('_id') || k === 'ac_no' || k === 'bank_id' || k === 'user_id' || k === 'post_id' || k === 'pay_id' || k === 'department_id' || k === 'office_id' || k === 'branch_id' || k === 'employee_id';
            if (isId && newItem[key] !== undefined && newItem[key] !== null && newItem[key] !== '') {
              newItem[key] = Math.floor(Number(newItem[key]));
            }
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
      sanitizedData.branches = sanitizeTable(remoteData.branches || (remoteData as any).bank_branchs || []);
      sanitizedData.posts = sanitizeTable(remoteData.posts || []);
      sanitizedData.payscales = sanitizeTable(remoteData.payscales || []);
      sanitizedData.employees = sanitizeTable(remoteData.employees || []);

      const rawSelections = (remoteData.userPostSelections || {}) as Record<string, any>;
      const sanitizedSelections: Record<number, number[]> = {};
      
      Object.keys(rawSelections).forEach(key => {
        const numericUserKey = Math.floor(Number(key));
        if (!isNaN(numericUserKey)) {
          const rawVal = rawSelections[key];
          let parsedIds: number[] = [];

          const processValue = (v: any) => {
            if (v === null || v === undefined) return;
            if (Array.isArray(v)) v.forEach(processValue);
            else if (typeof v === 'string') {
              v.replace(/[\[\]]/g, '').split(',').forEach(item => {
                const n = Math.floor(Number(item.trim()));
                if (!isNaN(n)) parsedIds.push(n);
              });
            } else if (typeof v === 'number' && !isNaN(v)) {
              parsedIds.push(Math.floor(v));
            }
          };

          processValue(rawVal);
          sanitizedSelections[numericUserKey] = Array.from(new Set(parsedIds));
        }
      });

      const mergedData = { 
        ...INITIAL_DATA, 
        ...sanitizedData,
        userPostSelections: sanitizedSelections
      };
      
      setData(mergedData);
      setLastSynced(new Date());
      try { localStorage.setItem('ems_data', JSON.stringify(mergedData)); } catch (e) {}
    } else {
      setSyncError("Cloud connection timeout. Check internet and script deployment.");
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
    const currentUserIdNum = Math.floor(Number(currentUser.User_ID));
    const userOfficeIds = (data.offices || [])
      .filter(o => Math.floor(Number(o.User_ID)) === currentUserIdNum)
      .map(o => Math.floor(Number(o.Office_ID)));
    return employees.filter(e => userOfficeIds.includes(Math.floor(Number(e.Office_ID))));
  }, [currentUser, data.employees, data.offices]);

  const performSync = async (action: string, payload: any, newState: AppData, listKey: keyof AppData, idKey: string) => {
    if (isSyncing) return { success: false, error: 'Sync in progress' };
    setIsSyncing(true);
    setSyncError(null);
    setData(newState);

    const result = await syncService.saveData(action, payload);
    
    if (!result.success) {
      setSyncError(`Sync error: ${result.error}`);
      await loadData(false);
    } else if (result.data) {
      const serverObjOrArray = result.data;
      const updatedData = { ...newState };
      const list = updatedData[listKey];
      
      if (Array.isArray(list)) {
        const isBatch = Array.isArray(serverObjOrArray);
        const serverItems = isBatch ? serverObjOrArray : [serverObjOrArray];
        
        const updatedList = list.map((item: any) => {
          const localId = Math.floor(Number(item[idKey]));
          const match = serverItems.find((si: any) => Math.floor(Number(si[idKey])) === localId);
          if (match) return match;
          if (localId === 0 && !isBatch && action.startsWith('upsert')) return serverObjOrArray;
          return item;
        });
        (updatedData as any)[listKey] = updatedList;
        setData(updatedData);
        try { localStorage.setItem('ems_data', JSON.stringify(updatedData)); } catch (e) {}
      }
      setLastSynced(new Date());
    }
    setIsSyncing(false);
    return result;
  };

  const upsertOffice = (office: Office) => {
    const isNew = !office.Office_ID || Number(office.Office_ID) === 0;
    const payload = { ...office, Office_ID: isNew ? 0 : office.Office_ID };
    const newOffices = isNew ? [...data.offices, payload] : data.offices.map(o => Math.floor(Number(o.Office_ID)) === Math.floor(Number(office.Office_ID)) ? office : o);
    return performSync('upsertOffice', payload, { ...data, offices: newOffices as Office[] }, 'offices', 'Office_ID');
  };

  const deleteOffice = (id: number) => {
    const newList = data.offices.filter(o => Math.floor(Number(o.Office_ID)) !== Math.floor(Number(id)));
    return performSync('deleteOffice', { Office_ID: id }, { ...data, offices: newList }, 'offices', 'Office_ID');
  };

  const upsertOffices = (offices: Office[]) => {
    const updatedOffices = data.offices.map(o => {
      const match = offices.find(u => Math.floor(Number(u.Office_ID)) === Math.floor(Number(o.Office_ID)));
      return match ? match : o;
    });
    return performSync('batchUpsertOffice', offices, { ...data, offices: updatedOffices }, 'offices', 'Office_ID');
  };

  const upsertUser = (user: User) => {
    const isNew = !user.User_ID || Number(user.User_ID) === 0;
    const payload = { ...user, User_ID: isNew ? 0 : user.User_ID };
    const newList = isNew ? [...data.users, payload] : data.users.map(u => Math.floor(Number(u.User_ID)) === Math.floor(Number(user.User_ID)) ? user : u);
    return performSync('upsertUser', payload, { ...data, users: newList as User[] }, 'users', 'User_ID');
  };

  const deleteUser = (id: number) => {
    const newList = data.users.filter(u => Math.floor(Number(u.User_ID)) !== Math.floor(Number(id)));
    return performSync('deleteUser', { User_ID: id }, { ...data, users: newList }, 'users', 'User_ID');
  };

  const upsertDepartment = (dept: Department) => {
    const isNew = !dept.Department_ID || Number(dept.Department_ID) === 0;
    const payload = { ...dept, Department_ID: isNew ? 0 : dept.Department_ID };
    const newList = isNew ? [...data.departments, payload] : data.departments.map(d => Math.floor(Number(d.Department_ID)) === Math.floor(Number(dept.Department_ID)) ? dept : d);
    return performSync('upsertDepartment', payload, { ...data, departments: newList as Department[] }, 'departments', 'Department_ID');
  };

  const deleteDepartment = (id: number) => {
    const newList = data.departments.filter(d => Math.floor(Number(d.Department_ID)) !== Math.floor(Number(id)));
    return performSync('deleteDepartment', { Department_ID: id }, { ...data, departments: newList }, 'departments', 'Department_ID');
  };

  const upsertBank = (bank: Bank) => {
    const isNew = !bank.Bank_ID || Number(bank.Bank_ID) === 0;
    const payload = { ...bank, Bank_ID: isNew ? 0 : bank.Bank_ID };
    const newList = isNew ? [...data.banks, payload] : data.banks.map(b => Math.floor(Number(b.Bank_ID)) === Math.floor(Number(bank.Bank_ID)) ? bank : b);
    return performSync('upsertBank', payload, { ...data, banks: newList as Bank[] }, 'banks', 'Bank_ID');
  };

  const deleteBank = (id: number) => {
    const newList = data.banks.filter(b => Math.floor(Number(b.Bank_ID)) !== Math.floor(Number(id)));
    return performSync('deleteBank', { Bank_ID: id }, { ...data, banks: newList }, 'banks', 'Bank_ID');
  };

  const upsertBranch = (branch: BankBranch) => {
    const isNew = !branch.Branch_ID || Number(branch.Branch_ID) === 0;
    const payload = { ...branch, Branch_ID: isNew ? 0 : branch.Branch_ID };
    const newList = isNew ? [...data.branches, payload] : data.branches.map(b => Math.floor(Number(b.Branch_ID)) === Math.floor(Number(branch.Branch_ID)) ? branch : b);
    return performSync('upsertBranch', payload, { ...data, branches: newList as BankBranch[] }, 'branches', 'Branch_ID');
  };

  const deleteBranch = (id: number) => {
    const newList = data.branches.filter(b => Math.floor(Number(b.Branch_ID)) !== Math.floor(Number(id)));
    return performSync('deleteBranch', { Branch_ID: id }, { ...data, branches: newList }, 'branches', 'Branch_ID');
  };

  const upsertPost = (post: Post) => {
    const isNew = !post.Post_ID || Number(post.Post_ID) === 0;
    const payload = { ...post, Post_ID: isNew ? 0 : post.Post_ID };
    const newList = isNew ? [...data.posts, payload] : data.posts.map(p => Math.floor(Number(p.Post_ID)) === Math.floor(Number(post.Post_ID)) ? post : p);
    return performSync('upsertPost', payload, { ...data, posts: newList as Post[] }, 'posts', 'Post_ID');
  };

  const deletePost = (id: number) => {
    const newList = data.posts.filter(p => Math.floor(Number(p.Post_ID)) !== Math.floor(Number(id)));
    return performSync('deletePost', { Post_ID: id }, { ...data, posts: newList }, 'posts', 'Post_ID');
  };

  const upsertPayscale = (pay: Payscale) => {
    const isNew = !pay.Pay_ID || Number(pay.Pay_ID) === 0;
    const payload = { ...pay, Pay_ID: isNew ? 0 : pay.Pay_ID };
    const newList = isNew ? [...data.payscales, payload] : data.payscales.map(p => Math.floor(Number(p.Pay_ID)) === Math.floor(Number(pay.Pay_ID)) ? pay : p);
    return performSync('upsertPayscale', payload, { ...data, payscales: newList as Payscale[] }, 'payscales', 'Pay_ID');
  };

  const deletePayscale = (id: number) => {
    const newList = data.payscales.filter(p => Math.floor(Number(p.Pay_ID)) !== Math.floor(Number(id)));
    return performSync('deletePayscale', { Pay_ID: id }, { ...data, payscales: newList }, 'payscales', 'Pay_ID');
  };

  const upsertEmployee = (emp: Employee) => {
    const isNew = !emp.Employee_ID || Number(emp.Employee_ID) === 0;
    const payload = { ...emp, Employee_ID: isNew ? 0 : emp.Employee_ID };
    const newList = isNew ? [...data.employees, payload] : data.employees.map(e => Math.floor(Number(e.Employee_ID)) === Math.floor(Number(emp.Employee_ID)) ? emp : e);
    return performSync('upsertEmployee', payload, { ...data, employees: newList as Employee[] }, 'employees', 'Employee_ID');
  };

  const deleteEmployee = (id: number) => {
    const newList = data.employees.filter(e => Math.floor(Number(e.Employee_ID)) !== Math.floor(Number(id)));
    return performSync('deleteEmployee', { Employee_ID: id }, { ...data, employees: newList }, 'employees', 'Employee_ID');
  };

  const togglePostSelection = async (postId: number) => {
    if (!currentUser) return;
    const userId = Math.floor(Number(currentUser.User_ID));
    const currentSelections = data.userPostSelections[userId] || [];
    const isSelected = currentSelections.includes(postId);
    const newSelections = isSelected 
      ? currentSelections.filter(id => id !== postId)
      : [...currentSelections, postId];
    
    const newState = {
      ...data,
      userPostSelections: {
        ...data.userPostSelections,
        [userId]: newSelections
      }
    };

    setIsSyncing(true);
    setSyncError(null);
    setData(newState);

    const result = await syncService.saveData('saveUserPostSelections', { userId, postIds: newSelections });
    
    if (!result.success) {
      setSyncError(`Sync error: ${result.error}`);
      await loadData(false);
    } else {
      setLastSynced(new Date());
      try { localStorage.setItem('ems_data', JSON.stringify(newState)); } catch (e) {}
    }
    setIsSyncing(false);
    return result;
  };

  const renderActiveTab = () => {
    if (activeTab === 'employeeForm' || editingEmployee) {
      return (
        <EmployeeForm 
          employee={editingEmployee}
          data={data}
          currentUser={currentUser!}
          onSave={upsertEmployee}
          onSaveBank={upsertBank}
          onSaveBranch={upsertBranch}
          onCancel={() => { setEditingEmployee(null); setActiveTab('employees'); }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard employees={filteredEmployees} data={data} />;
      case 'employees': return <EmployeeList employees={filteredEmployees} data={data} currentUser={currentUser!} onEdit={setEditingEmployee} onAddNew={() => setActiveTab('employeeForm')} onDelete={deleteEmployee} />;
      case 'finalization': return <FinalizationModule data={data} currentUser={currentUser!} onUpdateOffice={upsertOffice} onUpdateOffices={upsertOffices} onEditEmployee={(emp) => { setEditingEmployee(emp); setActiveTab('employeeForm'); }} />;
      case 'managePosts': return <UserPostSelection data={data} currentUser={currentUser!} onToggle={togglePostSelection} />;
      case 'users': return <UserManagement data={data} onSaveUser={upsertUser} onDeleteUser={deleteUser} />;
      case 'offices': return <OfficeManagement data={data} onSaveOffice={upsertOffice} onDeleteOffice={deleteOffice} />;
      case 'departments': return <DepartmentManagement data={data} onSaveDepartment={upsertDepartment} onDeleteDepartment={deleteDepartment} />;
      case 'banks': return <BankManagement data={data} onSaveBank={upsertBank} onDeleteBank={deleteBank} onSaveBranch={upsertBranch} onDeleteBranch={deleteBranch} />;
      case 'serviceMaster': return <ServiceMasterManagement data={data} onSavePost={upsertPost} onDeletePost={deletePost} onSavePayscale={upsertPayscale} onDeletePayscale={deletePayscale} />;
      default: return <Dashboard employees={filteredEmployees} data={data} />;
    }
  };

  if (isLoading && !isSyncing && data.users.length <= 2) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary mb-3" role="status"></div>
        <p className="text-muted fw-medium">Initializing Secure Environment...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login 
        users={data.users} 
        onLogin={(user) => { 
          setCurrentUser(user); 
          localStorage.setItem('ems_user', JSON.stringify(user)); 
        }} 
      />
    );
  }

  return (
    <div className="d-flex min-vh-100 bg-light" style={{ overflow: 'hidden' }}>
      {/* Sidebar - Overlay for mobile, Static for desktop */}
      <div 
        className={`sidebar-container ${isSidebarOpen ? 'show' : ''}`}
        style={{ zIndex: 1100 }}
      >
        <Sidebar 
          data={data} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          currentUser={currentUser} 
          onLogout={() => { setCurrentUser(null); localStorage.removeItem('ems_user'); }} 
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth <= 992 && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-grow-1 d-flex flex-column" style={{ overflowY: 'auto', height: '100vh', position: 'relative' }}>
        <header className="bg-white border-bottom py-2 py-md-3 px-3 px-md-4 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{ zIndex: 1000 }}>
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button 
              className="btn btn-light d-lg-none p-1 border shadow-xs" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <h6 className="mb-0 fw-bold text-dark d-none d-sm-block">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/([A-Z])/g, ' $1')}
            </h6>
            <div className="d-flex align-items-center gap-1">
              {isSyncing ? (
                <span className="badge bg-primary-subtle text-primary d-flex align-items-center gap-1 tiny"><RefreshCw size={10} className="animate-spin" /> Syncing</span>
              ) : syncError ? (
                <span className="badge bg-danger-subtle text-danger d-flex align-items-center gap-1 tiny"><AlertCircle size={10} /> Error</span>
              ) : (
                <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1 tiny d-none d-md-inline-flex"><CheckCircle size={10} /> Online</span>
              )}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <div className="tiny text-muted d-none d-lg-block"><Clock size={10} /> Last: {lastSynced.toLocaleTimeString()}</div>
            <button onClick={() => loadData()} disabled={isSyncing} className="btn btn-light btn-sm rounded-pill border shadow-sm px-2 px-md-3 d-flex align-items-center gap-2">
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> 
              <span className="d-none d-md-inline">Refresh</span>
            </button>
          </div>
        </header>

        <main className="p-2 p-md-4 flex-grow-1 position-relative">
          {syncError && (
            <div className="alert alert-warning border-0 shadow-sm mb-4 small py-2 d-flex align-items-center justify-content-between">
              <div>
                <AlertCircle size={14} className="me-2" />
                <strong>Sync Warning:</strong> {syncError}
              </div>
              <button className="btn btn-sm" onClick={() => setSyncError(null)}><X size={14} /></button>
            </div>
          )}
          {isLoading && !isSyncing ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 mt-5">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p className="text-muted fw-medium">Loading Records...</p>
            </div>
          ) : renderActiveTab()}
        </main>
      </div>

      <style>{`
        .sidebar-container {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 280px;
          background-color: #0f172a;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .sidebar-container.show {
          transform: translateX(0);
        }
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
          z-index: 1050;
        }
        @media (min-width: 992px) {
          .sidebar-container {
            position: relative;
            transform: translateX(0);
            flex-shrink: 0;
          }
          .sidebar-overlay {
            display: none;
          }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tiny { font-size: 0.65rem; }
      `}</style>
    </div>
  );
}