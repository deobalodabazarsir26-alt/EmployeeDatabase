
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
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// Using 0 as a placeholder to signal the Apps Script to generate a sequential ID
export const generatePlaceholderId = () => 0;

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
            
            if (Array.isArray(v)) {
              v.forEach(processValue);
            } else if (typeof v === 'string') {
              const trimmed = v.trim();
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                  const arr = JSON.parse(trimmed);
                  if (Array.isArray(arr)) arr.forEach(processValue);
                } catch (e) {
                  // Handle malformed brackets like [1, 2] that aren't strict JSON
                  const stripped = trimmed.replace(/[\[\]]/g, '');
                  stripped.split(',').forEach(item => {
                    const n = Math.floor(Number(item.trim()));
                    if (!isNaN(n)) parsedIds.push(n);
                  });
                }
              } else if (trimmed.includes(',')) {
                // Handle comma separated without brackets
                trimmed.split(',').forEach(item => {
                  const n = Math.floor(Number(item.trim()));
                  if (!isNaN(n)) parsedIds.push(n);
                });
              } else {
                const n = Math.floor(Number(trimmed));
                if (!isNaN(n)) parsedIds.push(n);
              }
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
      setSyncError("Cloud connection timeout. Please verify internet and script deployment.");
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

  const performSync = async (action: string, payload: any, newState: AppData, listKey: keyof AppData, idKey: string) => {
    if (isSyncing) return { success: false, error: 'Sync already in progress' };
    setIsSyncing(true);
    setSyncError(null);
    setData(newState);

    const result = await syncService.saveData(action, payload);
    
    if (!result.success) {
      setSyncError(`Sync error: ${result.error}`);
      await loadData(false);
    } else if (result.data) {
      const serverObj = result.data;
      const updatedData = { ...newState };
      const list = updatedData[listKey];
      
      if (Array.isArray(list)) {
        const updatedList = list.map((item: any) => {
          if (item[idKey] === serverObj[idKey] || (Number(item[idKey]) === 0 && action.startsWith('upsert'))) {
            return serverObj;
          }
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

  const upsertUser = (user: User) => {
    const isNew = !user.User_ID || Number(user.User_ID) === 0;
    const payload = { ...user, User_ID: isNew ? 0 : user.User_ID };
    const newUsers = isNew ? [...data.users, payload] : data.users.map(u => u.User_ID === user.User_ID ? user : u);
    performSync('upsertUser', payload, { ...data, users: newUsers as User[] }, 'users', 'User_ID');
  };

  const deleteUser = (userId: number) => {
    const id = Math.floor(Number(userId));
    if (data.offices.some(o => Math.floor(Number(o.User_ID)) === id)) return alert("User is active custodian for offices.");
    const newUsers = data.users.filter(u => Math.floor(Number(u.User_ID)) !== id);
    performSync('deleteUser', { User_ID: id }, { ...data, users: newUsers }, 'users', 'User_ID');
  };

  const upsertDepartment = (dept: Department) => {
    const isNew = !dept.Department_ID || Number(dept.Department_ID) === 0;
    const payload = { ...dept, Department_ID: isNew ? 0 : dept.Department_ID };
    const newDepts = isNew ? [...data.departments, payload] : data.departments.map(d => d.Department_ID === dept.Department_ID ? dept : d);
    performSync('upsertDepartment', payload, { ...data, departments: newDepts as Department[] }, 'departments', 'Department_ID');
  };

  const deleteDepartment = (deptId: number) => {
    const id = Math.floor(Number(deptId));
    const newDepts = data.departments.filter(d => Math.floor(Number(d.Department_ID)) !== id);
    performSync('deleteDepartment', { Department_ID: id }, { ...data, departments: newDepts }, 'departments', 'Department_ID');
  };

  const upsertOffice = (office: Office) => {
    const isNew = !office.Office_ID || Number(office.Office_ID) === 0;
    const payload = { ...office, Office_ID: isNew ? 0 : office.Office_ID };
    const newOffices = isNew ? [...data.offices, payload] : data.offices.map(o => o.Office_ID === office.Office_ID ? office : o);
    performSync('upsertOffice', payload, { ...data, offices: newOffices as Office[] }, 'offices', 'Office_ID');
  };

  const deleteOffice = (officeId: number) => {
    const id = Math.floor(Number(officeId));
    const newOffices = data.offices.filter(o => Math.floor(Number(o.Office_ID)) !== id);
    performSync('deleteOffice', { Office_ID: id }, { ...data, offices: newOffices }, 'offices', 'Office_ID');
  };

  const upsertBank = async (bank: Bank) => {
    const isNew = !bank.Bank_ID || Number(bank.Bank_ID) === 0;
    const payload = { ...bank, Bank_ID: isNew ? 0 : bank.Bank_ID };
    const newBanks = isNew ? [...data.banks, payload] : data.banks.map(b => b.Bank_ID === bank.Bank_ID ? bank : b);
    return await performSync('upsertBank', payload, { ...data, banks: newBanks as Bank[] }, 'banks', 'Bank_ID');
  };

  const deleteBank = (bankId: number) => {
    const id = Math.floor(Number(bankId));
    const newBanks = data.banks.filter(b => Math.floor(Number(b.Bank_ID)) !== id);
    performSync('deleteBank', { Bank_ID: id }, { ...data, banks: newBanks }, 'banks', 'Bank_ID');
  };

  const upsertBranch = async (branch: BankBranch) => {
    const isNew = !branch.Branch_ID || Number(branch.Branch_ID) === 0;
    const payload = { ...branch, Branch_ID: isNew ? 0 : branch.Branch_ID };
    const newBranches = isNew ? [...data.branches, payload] : data.branches.map(b => b.Branch_ID === branch.Branch_ID ? branch : b);
    return await performSync('upsertBranch', payload, { ...data, branches: newBranches as BankBranch[] }, 'branches', 'Branch_ID');
  };

  const deleteBranch = (branchId: number) => {
    const id = Math.floor(Number(branchId));
    const newBranches = data.branches.filter(b => Math.floor(Number(b.Branch_ID)) !== id);
    performSync('deleteBranch', { Branch_ID: id }, { ...data, branches: newBranches }, 'branches', 'Branch_ID');
  };

  const upsertPost = (post: Post) => {
    const isNew = !post.Post_ID || Number(post.Post_ID) === 0;
    const payload = { ...post, Post_ID: isNew ? 0 : post.Post_ID };
    const newPosts = isNew ? [...data.posts, payload] : data.posts.map(p => p.Post_ID === post.Post_ID ? post : p);
    performSync('upsertPost', payload, { ...data, posts: newPosts as Post[] }, 'posts', 'Post_ID');
  };

  const deletePost = (postId: number) => {
    const id = Math.floor(Number(postId));
    const newPosts = data.posts.filter(p => Math.floor(Number(p.Post_ID)) !== id);
    performSync('deletePost', { Post_ID: id }, { ...data, posts: newPosts }, 'posts', 'Post_ID');
  };

  const upsertPayscale = (pay: Payscale) => {
    const isNew = !pay.Pay_ID || Number(pay.Pay_ID) === 0;
    const payload = { ...pay, Pay_ID: isNew ? 0 : pay.Pay_ID };
    const newPays = isNew ? [...data.payscales, payload] : data.payscales.map(p => p.Pay_ID === pay.Pay_ID ? pay : p);
    performSync('upsertPayscale', payload, { ...data, payscales: newPays as Payscale[] }, 'payscales', 'Pay_ID');
  };

  const deletePayscale = (payId: number) => {
    const id = Math.floor(Number(payId));
    const newPays = data.payscales.filter(p => Math.floor(Number(p.Pay_ID)) !== id);
    performSync('deletePayscale', { Pay_ID: id }, { ...data, payscales: newPays }, 'payscales', 'Pay_ID');
  };

  const upsertEmployee = (employee: Employee) => {
    const isNew = !employee.Employee_ID || Number(employee.Employee_ID) === 0;
    const payload = { ...employee, Employee_ID: isNew ? 0 : employee.Employee_ID };
    const newEmployees = isNew ? [...data.employees, payload] : data.employees.map(e => e.Employee_ID === employee.Employee_ID ? employee : e);
    
    performSync('upsertEmployee', payload, { ...data, employees: newEmployees as Employee[] }, 'employees', 'Employee_ID');
    setEditingEmployee(null);
    setActiveTab('employees');
  };

  const deleteEmployee = (empId: number) => {
    const id = Math.floor(Number(empId));
    const newEmployees = data.employees.filter(e => Math.floor(Number(e.Employee_ID)) !== id);
    performSync('deleteEmployee', { Employee_ID: id }, { ...data, employees: newEmployees }, 'employees', 'Employee_ID');
  };

  const toggleEmployeeStatus = (empId: number) => {
    const employee = data.employees.find(e => Math.floor(Number(e.Employee_ID)) === Math.floor(Number(empId)));
    if (!employee) return;
    const newStatus = employee.Active === 'Yes' ? 'No' : 'Yes';
    const updatedEmployee = { ...employee, Active: newStatus };
    
    // Explicitly clear deactivation details when switching from Inactive to Active
    if (newStatus === 'Yes') {
      updatedEmployee.DA_Reason = '';
      updatedEmployee.DA_Doc = '';
    }
    
    upsertEmployee(updatedEmployee as Employee);
  };

  const togglePostSelection = (postId: number) => {
    if (!currentUser) return;
    const userId = Math.floor(Number(currentUser.User_ID));
    const currentSelections = data.userPostSelections[userId] || [];
    const newSelections = currentSelections.includes(postId)
      ? currentSelections.filter(id => id !== postId)
      : [...currentSelections, postId];
    const newMap = { ...data.userPostSelections, [userId]: newSelections };
    
    setIsSyncing(true);
    syncService.saveData('updateUserPostSelections', { User_ID: userId, Post_IDs: newSelections }).then(res => {
      if (res.success) {
        setData(prev => ({ ...prev, userPostSelections: newMap }));
        setLastSynced(new Date());
      }
      setIsSyncing(false);
    });
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
      case 'dashboard': return <Dashboard employees={filteredEmployees} data={data} />;
      case 'employees': return (
        <EmployeeList 
          employees={filteredEmployees} 
          data={data} 
          currentUser={currentUser}
          onEdit={setEditingEmployee}
          onAddNew={() => setActiveTab('employeeForm')}
          onDelete={deleteEmployee}
        />
      );
      case 'managePosts': return <UserPostSelection data={data} currentUser={currentUser} onToggle={togglePostSelection} />;
      case 'users': return <UserManagement data={data} onSaveUser={upsertUser} onDeleteUser={deleteUser} />;
      case 'offices': return <OfficeManagement data={data} onSaveOffice={upsertOffice} onDeleteOffice={deleteOffice} />;
      case 'departments': return <DepartmentManagement data={data} onSaveDepartment={upsertDepartment} onDeleteDepartment={deleteDepartment} />;
      case 'banks': return <BankManagement data={data} onSaveBank={upsertBank} onDeleteBank={deleteBank} onSaveBranch={upsertBranch} onDeleteBranch={deleteBranch} />;
      case 'serviceMaster': return <ServiceMasterManagement data={data} onSavePost={upsertPost} onDeletePost={deletePost} onSavePayscale={upsertPayscale} onDeletePayscale={deletePayscale} />;
      default: return <Dashboard employees={filteredEmployees} data={data} />;
    }
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar data={data} activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={() => { setCurrentUser(null); localStorage.removeItem('ems_user'); }} />
      <div className="flex-grow-1" style={{ overflowY: 'auto', height: '100vh' }}>
        <header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{zIndex: 1000}}>
          <div className="d-flex align-items-center gap-3">
            <h5 className="mb-0 fw-bold text-dark">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/([A-Z])/g, ' $1')}</h5>
            {isSyncing ? (
              <span className="badge bg-primary-subtle text-primary d-flex align-items-center gap-1 animate-pulse"><RefreshCw size={12} className="animate-spin" /> Syncing...</span>
            ) : syncError ? (
              <span className="badge bg-danger-subtle text-danger d-flex align-items-center gap-1"><AlertCircle size={12} /> Sync Notice</span>
            ) : (
              <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1"><CheckCircle size={12} /> Connected</span>
            )}
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end d-none d-md-block">
              <div className="small text-muted d-flex align-items-center gap-1"><Clock size={12} /> Last: {lastSynced.toLocaleTimeString()}</div>
            </div>
            <button onClick={() => loadData()} disabled={isSyncing} className="btn btn-light btn-sm rounded-pill border shadow-sm px-3 d-flex align-items-center gap-2">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing' : 'Refresh'}
            </button>
          </div>
        </header>
        <main className="p-4">
          {syncError && <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center gap-2 mb-4"><AlertCircle size={18} /><div><div className="fw-bold">Sync Warning</div><div className="small">{syncError}</div></div></div>}
          {isLoading && !isSyncing ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 mt-5">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p className="text-muted fw-medium">Loading Workspace...</p>
            </div>
          ) : renderContent()}
        </main>
      </div>
      <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`}</style>
    </div>
  );
}
