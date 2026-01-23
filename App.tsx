
import React, { useState, useEffect, useMemo } from 'react';
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
import { LogOut, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [syncError, setSyncError] = useState(false);

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const remoteData = await syncService.fetchAllData();
      if (remoteData) {
        // Advanced Sanitization: Recursively convert anything ending in _ID to a safe Number
        const sanitizeTable = (table: any[]) => {
          if (!Array.isArray(table)) return [];
          return table.map(item => {
            const newItem = { ...item };
            Object.keys(newItem).forEach(key => {
              if (key.endsWith('_ID') || key === 'AC_No' || key === 'Bank_ID' || key === 'User_ID' || key === 'Post_ID') {
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
        sanitizedData.branches = sanitizeTable(remoteData.branches || []);
        sanitizedData.posts = sanitizeTable(remoteData.posts || []);
        sanitizedData.payscales = sanitizeTable(remoteData.payscales || []);
        sanitizedData.employees = sanitizeTable(remoteData.employees || []);

        // Robust Sanitization for UserPostSelections (The relational mapping)
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
        try {
          localStorage.setItem('ems_data', JSON.stringify(mergedData));
        } catch (e) {}
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('ems_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('ems_user');
      }
    } catch (e) {}
  }, [currentUser]);

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
    setData(newState);
    setIsSyncing(true);
    setSyncError(false);
    
    try {
      localStorage.setItem('ems_data', JSON.stringify(newState));
    } catch (e) {}

    const success = await syncService.saveData(action, payload);
    if (!success) {
      setSyncError(true);
    }
    setIsSyncing(false);
  };

  const upsertEmployee = (employee: Employee) => {
    const employees = data.employees || [];
    const exists = employees.find(e => Number(e.Employee_ID) === Number(employee.Employee_ID));
    const newEmp = exists ? employee : { ...employee, Employee_ID: Date.now() };
    const newEmployees = exists
      ? employees.map(e => Number(e.Employee_ID) === Number(employee.Employee_ID) ? employee : e)
      : [...employees, newEmp];
    
    const newState = { ...data, employees: newEmployees };
    performSync('upsertEmployee', newEmp, newState);
    setActiveTab('employees');
    setEditingEmployee(null);
  };

  const deleteEmployee = (id: number) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      const newEmployees = (data.employees || []).filter(e => Number(e.Employee_ID) !== Number(id));
      const newState = { ...data, employees: newEmployees };
      performSync('deleteEmployee', { Employee_ID: id }, newState);
    }
  };

  const upsertOffice = (office: Office) => {
    const offices = data.offices || [];
    const exists = offices.find(o => Number(o.Office_ID) === Number(office.Office_ID));
    const newOff = exists ? office : { ...office, Office_ID: Date.now() };
    const newOffices = exists
      ? offices.map(o => Number(o.Office_ID) === Number(office.Office_ID) ? office : o)
      : [...offices, newOff];
    
    performSync('upsertOffice', newOff, { ...data, offices: newOffices });
  };

  const upsertBank = (bank: Bank) => {
    const banks = data.banks || [];
    const exists = banks.find(b => Number(b.Bank_ID) === Number(bank.Bank_ID));
    const newBk = exists ? bank : { ...bank, Bank_ID: Date.now() };
    const newBanks = exists
      ? banks.map(b => Number(b.Bank_ID) === Number(bank.Bank_ID) ? bank : b)
      : [...banks, newBk];
    
    performSync('upsertBank', newBk, { ...data, banks: newBanks });
  };

  const upsertBranch = (branch: BankBranch) => {
    const branches = data.branches || [];
    const exists = branches.find(b => Number(b.Branch_ID) === Number(branch.Branch_ID));
    const newBr = exists ? branch : { ...branch, Branch_ID: Date.now() };
    const newBranches = exists
      ? branches.map(b => Number(b.Branch_ID) === Number(branch.Branch_ID) ? branch : b)
      : [...branches, newBr];
    
    performSync('upsertBranch', newBr, { ...data, branches: newBranches });
  };

  const handleTogglePostSelection = (postId: number) => {
    if (!currentUser) return;
    const selections = data.userPostSelections || {};
    const userId = Number(currentUser.User_ID);
    const rawSelections = selections[userId];
    const currentSelections = Array.isArray(rawSelections) ? rawSelections : [];
    
    const isSelected = currentSelections.includes(Number(postId));
    const newSelections = isSelected 
      ? currentSelections.filter(id => Number(id) !== Number(postId))
      : [...currentSelections, Number(postId)];
    
    const newState = {
      ...data,
      userPostSelections: { ...selections, [userId]: newSelections }
    };
    performSync('updatePostSelections', { User_ID: userId, Post_IDs: newSelections }, newState);
  };

  const handleLogin = (user: User) => {
    const sanitizedUser = { ...user, User_ID: Number(user.User_ID) };
    setCurrentUser(sanitizedUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return <Login users={data.users || []} onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <RefreshCw size={48} className="text-primary mb-3 spin-animate" />
        <h5 className="fw-bold">Synchronizing with Cloud...</h5>
        <p className="text-muted small">Loading Post Mappings & Employee Records</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard employees={filteredEmployees} data={data} />;
      case 'employees': return <EmployeeList employees={filteredEmployees} data={data} currentUser={currentUser} onEdit={(emp) => { setEditingEmployee(emp); setActiveTab('employeeForm'); }} onDelete={deleteEmployee} onAddNew={() => { setEditingEmployee(null); setActiveTab('employeeForm'); }} />;
      case 'employeeForm': return <EmployeeForm employee={editingEmployee} data={data} currentUser={currentUser} onSave={upsertEmployee} onCancel={() => setActiveTab('employees')} />;
      case 'offices': return <OfficeManagement data={data} onSaveOffice={upsertOffice} />;
      case 'banks': return <BankManagement data={data} onSaveBank={upsertBank} onSaveBranch={upsertBranch} />;
      case 'managePosts': return <UserPostSelection data={data} currentUser={currentUser} onToggle={handleTogglePostSelection} />;
      default: return <Dashboard employees={filteredEmployees} data={data} />;
    }
  };

  return (
    <div className="container-fluid p-0 d-flex flex-column flex-md-row min-vh-100">
      <Sidebar data={data} activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
      
      <main className="flex-grow-1 bg-light p-3 p-md-5 overflow-auto">
        <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h1 className="h3 fw-bold mb-1 text-capitalize">
              {activeTab === 'managePosts' ? 'Post Configuration' : activeTab.replace(/([A-Z])/g, ' $1')}
            </h1>
            <div className="d-flex align-items-center gap-2">
              <p className="text-muted small mb-0">Google Sheets Live Sync</p>
              {!GSHEET_API_URL && <span className="badge bg-warning text-dark" style={{fontSize: '0.6rem'}}>OFFLINE MODE</span>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            {GSHEET_API_URL && (
              <div className="d-flex align-items-center gap-1 me-2 px-2 py-1 bg-white rounded-pill border small">
                {isSyncing ? (
                  <RefreshCw size={12} className="text-primary spin-animate" />
                ) : syncError ? (
                  <AlertCircle size={12} className="text-danger" />
                ) : (
                  <CheckCircle size={12} className="text-success" />
                )}
                <span className="text-muted" style={{fontSize: '0.7rem'}}>
                  {isSyncing ? 'Syncing...' : syncError ? 'Sync Failed' : 'Database Online'}
                </span>
              </div>
            )}
            <div className="d-none d-md-block text-end">
              <div className="fw-semibold small">{currentUser.User_Name}</div>
              <span className={`badge ${currentUser.User_Type === UserType.ADMIN ? 'bg-primary' : 'bg-success'} rounded-pill`} style={{fontSize: '0.65rem'}}>
                {currentUser.User_Type}
              </span>
            </div>
            <button onClick={handleLogout} className="btn btn-outline-danger btn-sm rounded-circle p-2 shadow-sm">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="container-xl px-0">
          {renderContent()}
        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-animate { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
