
import React, { useState, useMemo, useEffect } from 'react';
import { Office, AppData, Department, User } from '../types';
import { Plus, Edit2, Building2, MapPin, Hash, UserCheck, X, Save, Trash2, Lock, Search, Filter, Tag, Layers, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface OfficeManagementProps {
  data: AppData;
  onSaveOffice: (office: Office) => void;
  onDeleteOffice: (officeId: number) => void;
}

const OfficeManagement: React.FC<OfficeManagementProps> = ({ data, onSaveOffice, onDeleteOffice }) => {
  const [editingOffice, setEditingOffice] = useState<Partial<Office> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Office, direction: 'asc' | 'desc' } | null>({ key: 'Office_Name', direction: 'asc' });

  const filteredOffices = useMemo(() => {
    let results = data.offices.filter(office => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        office.Office_Name.toLowerCase().includes(term) || 
        office.Office_ID.toString().includes(term) ||
        office.Block.toLowerCase().includes(term);

      const matchesDept = !deptFilter || Number(office.Department_ID) === Number(deptFilter);
      return matchesSearch && matchesDept;
    });

    if (sortConfig) {
      results = [...results].sort((a, b) => {
        const valA = String(a[sortConfig.key] || '').toLowerCase();
        const valB = String(b[sortConfig.key] || '').toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return results;
  }, [data.offices, searchTerm, deptFilter, sortConfig]);

  const totalPages = Math.ceil(filteredOffices.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOffices.slice(start, start + itemsPerPage);
  }, [filteredOffices, currentPage, itemsPerPage]);

  useEffect(() => setCurrentPage(1), [searchTerm, deptFilter, itemsPerPage]);

  const requestSort = (key: keyof Office) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Office) => {
    if (sortConfig?.key !== key) return <ChevronDown size={14} className="text-muted opacity-25" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editingOffice?.Office_Name?.trim()) newErrors.Office_Name = "Required";
    if (!editingOffice?.Block?.trim()) newErrors.Block = "Required";
    if (!editingOffice?.AC_No) newErrors.AC_No = "Required";
    if (!editingOffice?.Department_ID) newErrors.Department_ID = "Required";
    if (!editingOffice?.User_ID) newErrors.User_ID = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSaveOffice(editingOffice as Office);
      setEditingOffice(null);
    }
  };

  const isDeletable = (officeId: number) => !data.employees.some(e => Number(e.Office_ID) === officeId);

  const startIndex = filteredOffices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredOffices.length);

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom py-4 px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary"><Building2 size={24} /></div>
            <div>
              <h5 className="mb-0 fw-bold">Office Master</h5>
              <p className="text-muted small mb-0">Manage organizational units and custodians</p>
            </div>
          </div>
          <button onClick={() => setEditingOffice({})} className="btn btn-primary px-4 shadow-sm d-flex align-items-center gap-2">
            <Plus size={18} /> Add Office
          </button>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <div className="input-group shadow-sm">
              <span className="input-group-text bg-white border-end-0 ps-3 text-muted"><Search size={16} /></span>
              <input type="text" className="form-control border-start-0" placeholder="Search by name, block or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="col-md-4">
            <select className="form-select shadow-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <button onClick={() => { setSearchTerm(''); setDeptFilter(''); }} className="btn btn-outline-secondary w-100 shadow-sm border-2 fw-semibold">Reset</button>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {editingOffice && (
          <div className="bg-light p-4 border-bottom animate-fade-in shadow-inner">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-primary">{editingOffice.Office_ID ? 'Update Office Details' : 'Register New Office'}</h6>
              <button type="button" onClick={() => setEditingOffice(null)} className="btn btn-sm btn-link text-muted p-0"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="row g-3">
              <div className="col-md-3">
                <label className="form-label small fw-bold">Office Name *</label>
                <input required value={editingOffice.Office_Name || ''} onChange={e => setEditingOffice({...editingOffice, Office_Name: e.target.value})} className={`form-control ${errors.Office_Name ? 'is-invalid' : ''}`} placeholder="e.g. District HQ" />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Block / Location *</label>
                <input required value={editingOffice.Block || ''} onChange={e => setEditingOffice({...editingOffice, Block: e.target.value})} className={`form-control ${errors.Block ? 'is-invalid' : ''}`} placeholder="e.g. Central Zone" />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold">AC No *</label>
                <input type="number" required value={editingOffice.AC_No || ''} onChange={e => setEditingOffice({...editingOffice, AC_No: Number(e.target.value)})} className={`form-control ${errors.AC_No ? 'is-invalid' : ''}`} />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold">Department *</label>
                <select required value={editingOffice.Department_ID || ''} onChange={e => setEditingOffice({...editingOffice, Department_ID: Number(e.target.value)})} className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}>
                  <option value="">Select Dept...</option>
                  {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-bold">Office Custodian *</label>
                <select required value={editingOffice.User_ID || ''} onChange={e => setEditingOffice({...editingOffice, User_ID: Number(e.target.value)})} className={`form-select ${errors.User_ID ? 'is-invalid' : ''}`}>
                  <option value="">Choose User...</option>
                  {data.users.map(u => <option key={u.User_ID} value={u.User_ID}>{u.User_Name}</option>)}
                </select>
              </div>
              <div className="col-12 text-end pt-2">
                <button type="button" onClick={() => setEditingOffice(null)} className="btn btn-light me-2 px-4">Discard</button>
                <button type="submit" className="btn btn-primary px-4 shadow-sm"><Save size={18} className="me-2" /> {editingOffice.Office_ID ? 'Update Office' : 'Save Office'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4 cursor-pointer" onClick={() => requestSort('Office_Name')}>
                  <div className="d-flex align-items-center gap-1">Office Name {getSortIcon('Office_Name')}</div>
                </th>
                <th className="cursor-pointer" onClick={() => requestSort('Block')}>
                  <div className="d-flex align-items-center gap-1">Location / Block {getSortIcon('Block')}</div>
                </th>
                <th>Department</th>
                <th className="cursor-pointer" onClick={() => requestSort('User_ID')}>
                  <div className="d-flex align-items-center gap-1">Custodian {getSortIcon('User_ID')}</div>
                </th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(office => {
                const custodian = data.users.find(u => Number(u.User_ID) === Number(office.User_ID));
                const dept = data.departments.find(d => Number(d.Department_ID) === Number(office.Department_ID));
                return (
                  <tr key={office.Office_ID}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{office.Office_Name}</div>
                      <div className="tiny text-muted uppercase">OFFICE ID: #{office.Office_ID}</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <MapPin size={14} className="text-muted" />
                        <span>{office.Block} <span className="text-muted">• AC {office.AC_No}</span></span>
                      </div>
                    </td>
                    <td><span className="badge bg-light text-dark border fw-normal">{dept?.Department_Name || 'Unknown'}</span></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <UserCheck size={14} className="text-primary" />
                        <span className="small fw-semibold">{custodian?.User_Name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex gap-2 justify-content-end">
                        <button onClick={() => setEditingOffice(office)} className="btn btn-light btn-sm rounded-3 border text-primary shadow-sm" title="Edit Office"><Edit2 size={16} /></button>
                        {isDeletable(Number(office.Office_ID)) ? (
                          <button onClick={() => onDeleteOffice(Number(office.Office_ID))} className="btn btn-light btn-sm rounded-3 border text-danger shadow-sm" title="Delete Office"><Trash2 size={16} /></button>
                        ) : (
                          <button className="btn btn-light btn-sm rounded-3 border text-muted opacity-50" title="Locked: Active employees assigned" disabled><Lock size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={5} className="text-center py-5 text-muted">No offices found matching criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer bg-white border-top py-4 d-flex justify-content-between align-items-center px-4">
        <div className="d-flex align-items-center gap-4">
          <div className="small text-muted">Showing <strong>{startIndex}-{endIndex}</strong> of <strong>{filteredOffices.length}</strong></div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">Per page:</span>
            <select className="form-select form-select-sm" style={{width: '80px'}} value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        {totalPages > 1 && (
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
              </li>
              <li className="page-item active"><span className="page-link px-3">{currentPage} of {totalPages}</span></li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
              </li>
            </ul>
          </nav>
        )}
      </div>
      <style>{`
        .cursor-pointer { cursor: pointer; user-select: none; }
        .cursor-pointer:hover { background-color: #f8fafc; }
        .tiny { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default OfficeManagement;
