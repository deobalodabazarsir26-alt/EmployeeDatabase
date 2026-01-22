
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
  // Initialize user from local storage safely
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('ems_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('Failed to load user session:', e);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  // Initialize data from local storage safely
  const [data, setData] = useState<AppData>(() => {
    try {
      const savedData = localStorage.getItem('ems_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Merge with INITIAL_DATA to ensure structure integrity
        return { ...INITIAL_DATA, ...parsed };
      }
    } catch (e) {
      console.warn('LocalStorage data cache unavailable or corrupted.');
    }
    return INITIAL_DATA;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Initial Sync from Google Sheets
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const remoteData = await syncService.fetchAllData();
      if (remoteData) {
        setData(remoteData);
        // Cache data safely
        try {
          localStorage.setItem('ems_data', JSON.stringify(remoteData));
        } catch (e) {
          console.warn('LocalStorage quota exceeded. Remote data will not be cached locally.');
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Persist user session independently
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('ems_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('ems_user');
      }
    } catch (e) {
      console.error('Failed to persist user session:', e);
    }
  }, [currentUser]);

  // Safe sync of data to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem('ems_data', JSON.stringify(data));
    } catch (e) {
      // If we hit the quota, we ignore it as the source of truth is Google Sheets
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('LocalStorage quota reached. Skipping local data cache update.');
      }
    }
  }, [data]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const filteredEmployees = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.User_Type === UserType.ADMIN) return data.employees;
    const userOfficeIds = data.offices.filter(o => o.User_ID === currentUser.User_ID).map(o => o.Office_ID);
    return data.employees.filter(e => userOfficeIds.includes(e.Office_ID));
  }, [currentUser, data.employees, data.offices]);

  const performSync = async (action: string, payload: any, newState: AppData) => {
    setIsSyncing(true);
    setSyncError(false);
    const success = await syncService.saveData(action, payload);
    if (success) {
      setData(newState);
    } else {
      setSyncError(true);
    }
    setIsSyncing(false);
  };

  const upsertEmployee = (employee: Employee) => {
    const exists = data.employees.find(e => e.Employee_ID === employee.Employee_ID);
    const newEmp = exists ? employee : { ...employee, Employee_ID: Date.now() };
    const newEmployees = exists
      ? data.employees.map(e => e.Employee_ID === employee.Employee_ID ? employee : e)
      : [...data.employees, newEmp];
    
    const newState = { ...data, employees: newEmployees };
    performSync('upsertEmployee', newEmp, newState);
    setActiveTab('employees');
    setEditingEmployee(null);
  };

  const deleteEmployee = (id: number) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      const newEmployees = data.employees.filter(e => e.Employee_ID !== id);
      const newState = { ...data, employees: newEmployees };
      performSync('deleteEmployee', { Employee_ID: id }, newState);
    }
  };

  const upsertOffice = (office: Office) => {
    const exists = data.offices.find(o => o.Office_ID === office.Office_ID);
    const newOff = exists ? office : { ...office, Office_ID: Date.now() };
    const newOffices = exists
      ? data.offices.map(o => o.Office_ID === office.Office_ID ? office : o)
      : [...data.offices, newOff];
    
    performSync('upsertOffice', newOff, { ...data, offices: newOffices });
  };

  const upsertBank = (bank: Bank) => {
    const exists = data.banks.find(b => b.Bank_ID === bank.Bank_ID);
    const newBk = exists ? bank : { ...bank, Bank_ID: Date.now() };
    const newBanks = exists
      ? data.banks.map(b => b.Bank_ID === bank.Bank_ID ? bank : b)
      : [...data.banks, newBk];
    
    performSync('upsertBank', newBk, { ...data, banks: newBanks });
  };

  const upsertBranch = (branch: BankBranch) => {
    const exists = data.branches.find(b => b.Branch_ID === branch.Branch_ID);
    const newBr = exists ? branch : { ...branch, Branch_ID: Date.now() };
    const newBranches = exists
      ? data.branches.map(b => b.Branch_ID === branch.Branch_ID ? branch : b)
      : [...data.branches, newBr];
    
    performSync('upsertBranch', newBr, { ...data, branches: newBranches });
  };

  const handleTogglePostSelection = (postId: number) => {
    if (!currentUser) return;
    const currentSelections = data.userPostSelections[currentUser.User_ID] || [];
    const isSelected = currentSelections.includes(postId);
    const newSelections = isSelected 
      ? currentSelections.filter(id => id !== postId)
      : [...currentSelections, postId];
    
    const newState = {
      ...data,
      userPostSelections: { ...data.userPostSelections, [currentUser.User_ID]: newSelections }
    };
    performSync('updatePostSelections', { User_ID: currentUser.User_ID, Post_IDs: newSelections }, newState);
  };

  if (!currentUser) {
    return <Login users={data.users} onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <RefreshCw size={48} className="text-primary mb-3 spin-animate" />
        <h5 className="fw-bold">Synchronizing with Google Sheets...</h5>
        <p className="text-muted small">Accessing remote database</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard employees={filteredEmployees} data={data} />;
      case 'employees': return <EmployeeList employees={filteredEmployees} data={data} onEdit={(emp) => { setEditingEmployee(emp); setActiveTab('employeeForm'); }} onDelete={deleteEmployee} onAddNew={() => { setEditingEmployee(null); setActiveTab('employeeForm'); }} />;
      case 'employeeForm': return <EmployeeForm employee={editingEmployee} data={data} currentUser={currentUser} onSave={upsertEmployee} onCancel={() => setActiveTab('employees')} />;
      case 'offices': return <OfficeManagement data={data} onSaveOffice={upsertOffice} />;
      case 'banks': return <BankManagement data={data} onSaveBank={upsertBank} onSaveBranch={upsertBranch} />;
      case 'managePosts': return <UserPostSelection data={data} currentUser={currentUser} onToggle={handleTogglePostSelection} />;
      default: return <Dashboard employees={filteredEmployees} data={data} />;
    }
  };

  return (
    <div className="container-fluid p-0 d-flex flex-column flex-md-row min-vh-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userType={currentUser.User_Type} onLogout={handleLogout} userName={currentUser.User_Name} />
      
      <main className="flex-grow-1 bg-light p-3 p-md-5 overflow-auto">
        <header className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h1 className="h3 fw-bold mb-1 text-capitalize">
              {activeTab === 'managePosts' ? 'Post Configuration' : activeTab.replace(/([A-Z])/g, ' $1')}
            </h1>
            <div className="d-flex align-items-center gap-2">
              <p className="text-muted small mb-0">Portal Management & Analytics</p>
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
                  {isSyncing ? 'Syncing...' : syncError ? 'Sync Failed' : 'Cloud Sync Active'}
                </span>
              </div>
            )}
            <div className="d-none d-md-block text-end">
              <div className="fw-semibold small">{currentUser.User_Name}</div>
              <span className={`badge ${currentUser.User_Type === UserType.ADMIN ? 'bg-primary' : 'bg-success'} rounded-pill`} style={{fontSize: '0.65rem'}}>
                {currentUser.User_Type}
              </span>
            </div>
            <button onClick={handleLogout} className="btn btn-outline-danger btn-sm rounded-circle p-2">
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
