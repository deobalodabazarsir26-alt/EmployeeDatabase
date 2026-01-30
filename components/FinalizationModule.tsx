
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, UserType, Employee, Office, Department } from '../types';
import { ShieldCheck, Lock, Unlock, Users, Building2, ChevronRight, Edit3, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';

interface FinalizationModuleProps {
  data: AppData;
  currentUser: User;
  onUpdateOffice: (office: Office) => Promise<any>;
  onEditEmployee: (emp: Employee) => void;
}

const FinalizationModule: React.FC<FinalizationModuleProps> = ({ data, currentUser, onUpdateOffice, onEditEmployee }) => {
  const isAdmin = currentUser.User_Type === UserType.ADMIN;
  const [isProcessing, setIsProcessing] = useState(false);

  // Normal User State - Get offices assigned to this user
  const myOffices = useMemo(() => 
    data.offices.filter(o => Math.floor(Number(o.User_ID)) === Math.floor(Number(currentUser.User_ID))),
    [data.offices, currentUser]
  );

  // Default to the first office in the list if none selected
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | ''>('');

  useEffect(() => {
    // If we have offices and none is selected OR current selection is no longer valid, pick the first one
    if (myOffices.length > 0 && (selectedOfficeId === '' || !myOffices.some(o => Math.floor(Number(o.Office_ID)) === Math.floor(Number(selectedOfficeId))))) {
      console.log('Finalization: Auto-selecting first office', myOffices[0].Office_Name);
      setSelectedOfficeId(Math.floor(Number(myOffices[0].Office_ID)));
    }
  }, [myOffices, selectedOfficeId]);

  // Admin State - Default to the first department
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>(
    data.departments.length > 0 ? Math.floor(Number(data.departments[0].Department_ID)) : ''
  );

  const selectedOffice = useMemo(() => {
    if (selectedOfficeId === '') return undefined;
    const idNum = Math.floor(Number(selectedOfficeId));
    return data.offices.find(o => Math.floor(Number(o.Office_ID)) === idNum);
  }, [data.offices, selectedOfficeId]);

  const officeEmployees = useMemo(() => {
    if (selectedOfficeId === '') return [];
    const idNum = Math.floor(Number(selectedOfficeId));
    return data.employees.filter(e => Math.floor(Number(e.Office_ID)) === idNum);
  }, [data.employees, selectedOfficeId]);

  const deptOffices = useMemo(() => {
    if (selectedDeptId === '') return [];
    const idNum = Math.floor(Number(selectedDeptId));
    return data.offices.filter(o => Math.floor(Number(o.Department_ID)) === idNum);
  }, [data.offices, selectedDeptId]);

  const handleToggleFinalization = async (office: Office | undefined) => {
    if (!office) {
      console.error('Finalization: No office selected for action');
      return;
    }
    
    if (isProcessing) return;
    
    const isFinalized = office.Finalized?.toString().toLowerCase() === 'yes';
    const msg = isFinalized 
      ? `Are you sure you want to RE-OPEN records for "${office.Office_Name} (#${office.Office_ID})"?` 
      : `FINALIZING "${office.Office_Name} (#${office.Office_ID})" will lock all associated employee records for normal users. Continue?`;
    
    if (window.confirm(msg)) {
      setIsProcessing(true);
      console.log(`Finalization: Attempting toggle for Office ${office.Office_ID}`);
      
      try {
        const result = await onUpdateOffice({ 
            ...office, 
            Finalized: isFinalized ? 'No' : 'Yes' 
        });
        
        if (result && !result.success) {
           throw new Error(result.error || 'Server rejected the update');
        }
        console.log('Finalization: Toggle successful');
      } catch (err: any) {
        console.error('Finalization toggle failed:', err);
        alert(`Finalization failed: ${err.message || 'Unknown network error'}. Please refresh and try again.`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleFinalizeAllInDept = async () => {
    const dept = data.departments.find(d => Math.floor(Number(d.Department_ID)) === Math.floor(Number(selectedDeptId)));
    if (!dept || isProcessing) return;
    
    if (window.confirm(`Finalize ALL offices under ${dept.Department_Name}? This will lock all records for these offices.`)) {
      setIsProcessing(true);
      try {
        for (const office of deptOffices) {
          if (office.Finalized?.toString().toLowerCase() !== 'yes') {
            await onUpdateOffice({ ...office, Finalized: 'Yes' });
          }
        }
        alert('All offices in this department have been finalized.');
      } catch (err: any) {
        console.error('Batch finalization failed:', err);
        alert(`Batch update failed: ${err.message}. Check your internet and try again.`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (isAdmin) {
    return (
      <div className="finalization-admin animate-fade-in">
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <div className="row align-items-center g-3">
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary-subtle p-2 rounded-3 text-primary"><ShieldCheck size={24} /></div>
                  <h5 className="mb-0 fw-bold">Admin Finalization Control</h5>
                </div>
              </div>
              <div className="col-md-4">
                <select className="form-select border-primary-subtle" value={selectedDeptId} onChange={e => setSelectedDeptId(Number(e.target.value))}>
                  {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <button 
                    onClick={handleFinalizeAllInDept} 
                    disabled={isProcessing || deptOffices.length === 0}
                    className="btn btn-primary w-100 rounded-pill shadow-sm tiny fw-bold d-flex align-items-center justify-content-center gap-2"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Finalize All'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {deptOffices.map(office => {
            const empCount = data.employees.filter(e => Math.floor(Number(e.Office_ID)) === Math.floor(Number(office.Office_ID))).length;
            const isLocked = office.Finalized?.toString().toLowerCase() === 'yes';
            
            return (
              <div key={office.Office_ID} className="col-md-6 col-lg-4">
                <div className={`card h-100 border-0 shadow-sm rounded-4 transition-all ${isLocked ? 'bg-success-subtle' : 'bg-white'}`}>
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className={`p-3 rounded-4 ${isLocked ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                        {isLocked ? <Lock size={24} /> : <Unlock size={24} />}
                      </div>
                      <span className={`badge rounded-pill px-3 py-1 ${isLocked ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {isLocked ? 'Finalized' : 'Pending'}
                      </span>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">{office.Office_Name} (#${office.Office_ID})</h6>
                    <p className="tiny text-muted uppercase mb-4">{office.Block} Block • AC {office.AC_No}</p>
                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-1 text-muted small">
                        <Users size={14} /> <strong>{empCount}</strong> Records
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleToggleFinalization(office)}
                        disabled={isProcessing}
                        className={`btn btn-sm rounded-pill px-4 fw-bold ${isLocked ? 'btn-outline-danger' : 'btn-success shadow-sm'}`}
                      >
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : (isLocked ? 'De-Finalize' : 'Finalize')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const isSelectedOfficeFinalized = selectedOffice?.Finalized?.toString().toLowerCase() === 'yes';

  return (
    <div className="finalization-user animate-fade-in pb-5 mb-5">
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-md-8">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary-subtle p-2 rounded-3 text-primary"><ShieldCheck size={24} /></div>
                <div>
                  <h5 className="mb-0 fw-bold">Record Verification & Finalization</h5>
                  <p className="tiny text-muted mb-0">Review and lock records for your assigned offices</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <label className="tiny fw-bold text-muted text-uppercase d-block mb-1">Select Active Office</label>
              <select className="form-select border-primary-subtle fw-bold" value={selectedOfficeId} onChange={e => setSelectedOfficeId(Number(e.target.value))}>
                <option value="">-- Choose Office --</option>
                {myOffices.map(o => <option key={o.Office_ID} value={o.Office_ID}>{o.Office_Name} (#${o.Office_ID})</option>)}
              </select>
            </div>
          </div>
        </div>
        {isSelectedOfficeFinalized && (
          <div className="bg-success text-white px-4 py-2 d-flex align-items-center gap-2 tiny fw-bold animate-pulse">
            <CheckCircle2 size={16} /> DATA IS FINALIZED AND LOCKED. NO FURTHER EDITS PERMITTED.
          </div>
        )}
      </div>

      <div className="row g-4 mb-5 pb-5">
        {officeEmployees.map(emp => {
          const postName = data.posts.find(p => Math.floor(Number(p.Post_ID)) === Math.floor(Number(emp.Post_ID)))?.Post_Name;
          const initials = `${emp.Employee_Name.charAt(0)}${emp.Employee_Surname.charAt(0)}`.toUpperCase();
          
          return (
            <div key={emp.Employee_ID} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 border-0 shadow-sm rounded-4 selection-card">
                <div className="card-body p-3">
                  <div className="d-flex gap-3">
                    <div className="rounded-4 border overflow-hidden bg-light shadow-sm flex-shrink-0" style={{ width: '80px', height: '110px' }}>
                      {emp.Photo ? (
                        <img src={emp.Photo} className="w-100 h-100 object-fit-cover" alt="Profile" />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold text-primary">{initials}</div>
                      )}
                    </div>
                    <div className="flex-grow-1 min-width-0">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="tiny text-muted uppercase tracking-wider">EMP #{emp.Employee_ID}</span>
                        {!isSelectedOfficeFinalized ? (
                          <button onClick={() => onEditEmployee(emp)} className="btn btn-xs btn-light border text-primary shadow-sm" title="Edit Record">
                            <Edit3 size={14} />
                          </button>
                        ) : (
                          <span className="text-success" title="Record Locked"><Lock size={14} /></span>
                        )}
                      </div>
                      <h6 className="fw-bold mb-1 text-truncate text-dark">{emp.Employee_Name} {emp.Employee_Surname}</h6>
                      <div className="text-muted small mb-2 d-flex align-items-center gap-2">
                        <span className={`badge px-2 py-1 ${emp.Gender === 'Male' ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'}`}>{emp.Gender}</span>
                        <span className="tiny fw-bold text-uppercase">{emp.Service_Type}</span>
                      </div>
                      <div className="bg-light p-2 rounded-3">
                        <div className="tiny text-muted text-uppercase fw-bold mb-1">Designation</div>
                        <div className="small text-dark text-truncate fw-bold">{postName || 'Not Assigned'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedOffice && (
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden fixed-bottom mx-4 mb-4 bg-white border-top border-primary-subtle shadow-lg" style={{zIndex: 1050}}>
          <div className="card-body p-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className={`p-2 rounded-3 ${isSelectedOfficeFinalized ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                {isProcessing ? <Loader2 size={24} className="animate-spin" /> : (isSelectedOfficeFinalized ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />)}
              </div>
              <div>
                <div className="fw-bold text-dark">Office: {selectedOffice.Office_Name} (#${selectedOffice.Office_ID})</div>
                <div className="small text-muted">
                    {isSelectedOfficeFinalized 
                        ? 'All records are locked and secured.' 
                        : `Review all ${officeEmployees.length} records before final lock.`}
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleFinalization(selectedOffice);
              }}
              disabled={isProcessing}
              className={`btn btn-lg px-5 rounded-pill shadow-lg d-flex align-items-center gap-2 fw-bold transition-all ${isSelectedOfficeFinalized ? 'btn-outline-success border-2' : 'btn-primary border-0'}`}
            >
              {isProcessing ? (
                <><Loader2 size={20} className="animate-spin" /> Processing...</>
              ) : (
                isSelectedOfficeFinalized ? (
                  <><Unlock size={20} /> Re-Open Office</>
                ) : (
                  <><Lock size={20} /> Finalize Office Records</>
                )
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .tiny { font-size: 0.65rem; }
        .selection-card { transition: transform 0.2s ease; }
        .selection-card:hover { transform: translateY(-3px); }
        .object-fit-cover { object-fit: cover; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default FinalizationModule;
