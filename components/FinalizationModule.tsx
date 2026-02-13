
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, UserType, Employee, Office, Department } from '../types';
import { ShieldCheck, Lock, Unlock, Users, Building2, ChevronRight, Edit3, CheckCircle2, AlertCircle, Info, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon, Search, XCircle } from 'lucide-react';

interface FinalizationModuleProps {
  data: AppData;
  currentUser: User;
  onUpdateOffice: (office: Office) => Promise<any>;
  onUpdateOffices: (offices: Office[]) => Promise<any>;
  onEditEmployee: (emp: Employee) => void;
}

const FinalizationModule: React.FC<FinalizationModuleProps> = ({ data, currentUser, onUpdateOffice, onUpdateOffices, onEditEmployee }) => {
  const isAdmin = currentUser.User_Type === UserType.ADMIN;
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Normal User State - Get offices assigned to this user
  const myOffices = useMemo(() => 
    data.offices.filter(o => Math.floor(Number(o.User_ID)) === Math.floor(Number(currentUser.User_ID))),
    [data.offices, currentUser]
  );

  const [selectedOfficeId, setSelectedOfficeId] = useState<number | ''>('');

  useEffect(() => {
    if (myOffices.length > 0 && (selectedOfficeId === '' || !myOffices.some(o => Math.floor(Number(o.Office_ID)) === Math.floor(Number(selectedOfficeId))))) {
      setSelectedOfficeId(Math.floor(Number(myOffices[0].Office_ID)));
    }
  }, [myOffices, selectedOfficeId]);

  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>(
    data.departments.length > 0 ? Math.floor(Number(data.departments[0].Department_ID)) : ''
  );

  const selectedOffice = useMemo(() => {
    if (selectedOfficeId === '') return undefined;
    const idNum = Math.floor(Number(selectedOfficeId));
    return data.offices.find(o => Math.floor(Number(o.Office_ID)) === idNum);
  }, [data.offices, selectedOfficeId]);

  // Filtering for Admin (Offices)
  const filteredDeptOffices = useMemo(() => {
    const idNum = Math.floor(Number(selectedDeptId));
    const base = data.offices.filter(o => Math.floor(Number(o.Department_ID)) === idNum);
    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase().trim();
    return base.filter(o => o.Office_Name.toLowerCase().includes(term) || o.Office_ID.toString().includes(term));
  }, [data.offices, selectedDeptId, searchTerm]);

  // Filtering for User (Employees)
  const filteredOfficeEmployees = useMemo(() => {
    if (selectedOfficeId === '') return [];
    const idNum = Math.floor(Number(selectedOfficeId));
    const base = data.employees.filter(e => Math.floor(Number(e.Office_ID)) === idNum);
    if (!searchTerm) return base;
    const term = searchTerm.toLowerCase().trim();
    return base.filter(e => `${e.Employee_Name} ${e.Employee_Surname}`.toLowerCase().includes(term) || e.Employee_ID.toString().includes(term));
  }, [data.employees, selectedOfficeId, searchTerm]);

  // Unified pagination calculations
  const totalItems = isAdmin ? filteredDeptOffices.length : filteredOfficeEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (isAdmin ? filteredDeptOffices : filteredOfficeEmployees).slice(start, start + itemsPerPage);
  }, [isAdmin, filteredDeptOffices, filteredOfficeEmployees, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDeptId, selectedOfficeId, searchTerm]);

  const hasAnyPending = useMemo(() => 
    filteredDeptOffices.some(o => o.Finalized?.toString().toLowerCase() !== 'yes'), 
    [filteredDeptOffices]
  );
  
  const hasAnyFinalized = useMemo(() => 
    filteredDeptOffices.some(o => o.Finalized?.toString().toLowerCase() === 'yes'), 
    [filteredDeptOffices]
  );

  const handleToggleFinalization = async (office: Office | undefined) => {
    if (!office || isProcessing) return;
    const isFinalized = office.Finalized?.toString().toLowerCase() === 'yes';
    const msg = isFinalized 
      ? `Are you sure you want to RE-OPEN records for "${office.Office_Name} (#${office.Office_ID})"?` 
      : `FINALIZING "${office.Office_Name} (#${office.Office_ID})" will lock all associated employee records for normal users. Continue?`;
    if (window.confirm(msg)) {
      setIsProcessing(true);
      try {
        const result = await onUpdateOffice({ ...office, Finalized: isFinalized ? 'No' : 'Yes' });
        if (result && !result.success) throw new Error(result.error || 'Update failed');
      } catch (err: any) {
        alert(`Finalization failed: ${err.message}.`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBatchUpdate = async (targetStatus: 'Yes' | 'No') => {
    const dept = data.departments.find(d => Math.floor(Number(d.Department_ID)) === Math.floor(Number(selectedDeptId)));
    if (!dept || isProcessing || filteredDeptOffices.length === 0) return;
    const targets = targetStatus === 'Yes' 
      ? filteredDeptOffices.filter(o => o.Finalized?.toString().toLowerCase() !== 'yes')
      : filteredDeptOffices.filter(o => o.Finalized?.toString().toLowerCase() === 'yes');
    if (targets.length === 0) return;
    if (window.confirm(`${targetStatus === 'Yes' ? 'FINALIZE' : 'DE-FINALIZE'} ${targets.length} offices under ${dept.Department_Name}?`)) {
      setIsProcessing(true);
      try {
        const officesToUpdate = targets.map(o => ({ ...o, Finalized: targetStatus }));
        await onUpdateOffices(officesToUpdate);
      } catch (err: any) {
        alert(`Batch update failed: ${err.message}.`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const renderPaginationFooter = () => (
    <div className="card-footer bg-white py-4 border-top d-flex justify-content-between align-items-center px-4 rounded-bottom-4 shadow-sm">
      <div className="tiny text-muted d-flex align-items-center gap-3">
        <span>Showing {startIndex}-{endIndex} of {totalItems}</span>
        <select className="form-select form-select-sm py-0" style={{width: '70px', height: '24px', fontSize: '0.65rem'}} value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      <nav>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16}/></button>
          </li>
          <li className="page-item active"><span className="page-link px-3">{currentPage}</span></li>
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}><ChevronRightIcon size={16}/></button>
          </li>
        </ul>
      </nav>
    </div>
  );

  const renderCounterStrip = () => (
    <div className="bg-primary-subtle py-2 px-4 d-flex justify-content-between align-items-center border-top">
      <div className="d-flex align-items-center gap-2 text-primary small fw-bold">
        <Info size={16} /> {totalItems} Record(s) found matching criteria
      </div>
      <div className="small text-muted">Page {currentPage} of {totalPages}</div>
    </div>
  );

  if (isAdmin) {
    return (
      <div className="finalization-admin animate-fade-in d-flex flex-column h-100 position-relative">
        {isProcessing && (
          <div className="processing-overlay position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 1000, backdropFilter: 'blur(2px)' }}>
            <div className="card shadow-lg border-0 rounded-4 p-4 text-center">
              <Loader2 size={48} className="text-primary animate-spin mb-3 mx-auto" />
              <h6 className="fw-bold mb-1">Processing Department Data</h6>
              <p className="small text-muted mb-0">Synchronizing records with Google Sheets...</p>
            </div>
          </div>
        )}

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <div className="row align-items-center g-3">
              <div className="col-md-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary-subtle p-2 rounded-3 text-primary"><ShieldCheck size={24} /></div>
                  <h5 className="mb-0 fw-bold">Admin</h5>
                </div>
              </div>
              <div className="col-md-3">
                <select className="form-select border-primary-subtle" value={selectedDeptId} onChange={e => setSelectedDeptId(Number(e.target.value))}>
                  {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted"><Search size={16}/></span>
                  <input type="text" className="form-control border-start-0 ps-1" placeholder="Search Office..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="col-md-3">
                <div className="d-flex gap-2">
                  <button onClick={() => handleBatchUpdate('Yes')} disabled={isProcessing || !hasAnyPending} className="btn btn-primary flex-grow-1 rounded-pill tiny fw-bold d-flex align-items-center justify-content-center gap-1 shadow-sm">
                    <Lock size={12} /> Finalize All
                  </button>
                  <button onClick={() => handleBatchUpdate('No')} disabled={isProcessing || !hasAnyFinalized} className="btn btn-outline-danger flex-grow-1 rounded-pill tiny fw-bold d-flex align-items-center justify-content-center gap-1 shadow-sm">
                    <Unlock size={12} /> De-Finalize
                  </button>
                </div>
              </div>
            </div>
          </div>
          {renderCounterStrip()}
        </div>

        <div className="row g-4 pb-2">
          {(paginatedResults as Office[]).map(office => {
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
                    <button onClick={() => handleToggleFinalization(office)} disabled={isProcessing} className={`btn btn-sm rounded-pill px-4 fw-bold mt-3 ${isLocked ? 'btn-outline-danger' : 'btn-success shadow-sm'}`}>
                      {isLocked ? 'De-Finalize' : 'Finalize'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {paginatedResults.length === 0 && (
            <div className="col-12 text-center py-5 text-muted">
              <Search size={40} className="opacity-25 mb-2" />
              <h6>No results found matching search criteria.</h6>
            </div>
          )}
        </div>
        {renderPaginationFooter()}
      </div>
    );
  }

  const isSelectedOfficeFinalized = selectedOffice?.Finalized?.toString().toLowerCase() === 'yes';

  return (
    <div className="finalization-user animate-fade-in d-flex flex-column h-100 position-relative">
      {isProcessing && (
        <div className="processing-overlay position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 1000, backdropFilter: 'blur(2px)' }}>
          <div className="card shadow-lg border-0 rounded-4 p-4 text-center">
            <Loader2 size={48} className="text-primary animate-spin mb-3 mx-auto" />
            <h6 className="fw-bold mb-1">Finalizing Records</h6>
            <p className="small text-muted mb-0">Synchronizing with cloud storage...</p>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-md-4">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary-subtle p-2 rounded-3 text-primary"><ShieldCheck size={24} /></div>
                <div>
                  <h5 className="mb-0 fw-bold">Verification</h5>
                  <p className="tiny text-muted mb-0">assigned records</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select border-primary-subtle fw-bold" value={selectedOfficeId} onChange={e => setSelectedOfficeId(Number(e.target.value))}>
                <option value="">-- Choose Office --</option>
                {myOffices.map(o => <option key={o.Office_ID} value={o.Office_ID}>{o.Office_Name}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted"><Search size={16}/></span>
                <input type="text" className="form-control border-start-0 ps-1" placeholder="Search Employee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        {renderCounterStrip()}
        {isSelectedOfficeFinalized && (
          <div className="bg-success text-white px-4 py-2 d-flex align-items-center gap-2 tiny fw-bold animate-pulse">
            <CheckCircle2 size={16} /> DATA SECURED. ALL RECORDS LOCKED.
          </div>
        )}
      </div>

      <div className="row g-4 mb-2">
        {(paginatedResults as Employee[]).map(emp => (
          <div key={emp.Employee_ID} className="col-12 col-md-6 col-xl-4">
            <div className="card h-100 border-0 shadow-sm rounded-4">
              <div className="card-body p-3">
                <div className="d-flex gap-3">
                  <div className="rounded-4 border overflow-hidden bg-light shadow-sm flex-shrink-0" style={{ width: '80px', height: '110px' }}>
                    {emp.Photo ? <img src={emp.Photo} className="w-100 h-100 object-fit-cover" alt="Profile" /> : <div className="w-100 h-100 d-flex align-items-center justify-content-center text-primary fw-bold">EMP</div>}
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <span className="tiny text-muted">ID: #{emp.Employee_ID}</span>
                      {!isSelectedOfficeFinalized ? <button onClick={() => onEditEmployee(emp)} className="btn btn-xs btn-light border text-primary"><Edit3 size={14} /></button> : <span className="text-success"><Lock size={14} /></span>}
                    </div>
                    <h6 className="fw-bold mb-1 text-truncate">{emp.Employee_Name} {emp.Employee_Surname}</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {paginatedResults.length === 0 && (
          <div className="col-12 text-center py-5 text-muted">
            <Search size={40} className="opacity-25 mb-2" />
            <h6>No employees found in this office matching search.</h6>
          </div>
        )}
      </div>
      
      {renderPaginationFooter()}

      {selectedOffice && (
        <div className="mt-auto sticky-bottom py-3 bg-light" style={{ zIndex: 10, bottom: '-24px', margin: '0 -24px' }}>
          <div className="card border-0 shadow-lg rounded-4 mx-4 bg-white border border-primary-subtle">
            <div className="card-body p-4 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <div className={`p-2 rounded-3 ${isSelectedOfficeFinalized ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                  {isProcessing ? <Loader2 size={24} className="animate-spin" /> : (isSelectedOfficeFinalized ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />)}
                </div>
                <div>
                  <div className="fw-bold">Office: {selectedOffice.Office_Name}</div>
                  <div className="small text-muted">{isSelectedOfficeFinalized ? 'Records are locked.' : `Ready to finalize ${filteredOfficeEmployees.length} records?`}</div>
                </div>
              </div>
              <button onClick={() => handleToggleFinalization(selectedOffice)} disabled={isProcessing} className={`btn btn-lg px-5 rounded-pill shadow-lg d-flex align-items-center gap-2 fw-bold transition-all ${isSelectedOfficeFinalized ? 'btn-outline-success border-2' : 'btn-primary'}`}>
                {isProcessing ? <><Loader2 size={20} className="animate-spin" /> Working...</> : (isSelectedOfficeFinalized ? <><Unlock size={20} /> Re-Open Office</> : <><Lock size={20} /> Finalize Office</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tiny { font-size: 0.65rem; }
        .object-fit-cover { object-fit: cover; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-pulse { animation: pulse 2s infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sticky-bottom { position: sticky; bottom: -24px; }
        .processing-overlay { cursor: wait; }
        .transition-all { transition: all 0.2s ease; }
        .page-link:hover { background-color: #f1f5f9; }
        .page-item.active .page-link { background-color: #4f46e5 !important; color: white !important; }
        .tiny { font-size: 0.65rem; font-weight: 700; }
      `}</style>
    </div>
  );
};

export default FinalizationModule;