
import React, { useState, useMemo, useEffect } from 'react';
import { Department, AppData } from '../types';
import { Layers, Plus, Save, Trash2, Edit2, X, Lock, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DepartmentManagementProps {
  data: AppData;
  onSaveDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: number) => void;
}

const DepartmentManagement: React.FC<DepartmentManagementProps> = ({ data, onSaveDepartment, onDeleteDepartment }) => {
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);
  
  // Filtering & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [deptTypeFilter, setDeptTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Department, direction: 'asc' | 'desc' } | null>({ key: 'Department_Name', direction: 'asc' });

  const getDeptType = (dept: any): string => {
    if (!dept) return '';
    return (dept.Department_Type || dept.Dept_Type || dept.department_type || '').trim();
  };

  const departmentTypes = useMemo(() => {
    const types = new Set<string>();
    data.departments.forEach(d => {
      const type = getDeptType(d);
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [data.departments]);

  const filteredDepartments = useMemo(() => {
    let results = data.departments.filter(dept => {
      const matchesType = !deptTypeFilter || getDeptType(dept) === deptTypeFilter;
      const matchesSearch = !searchTerm || 
        dept.Department_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDeptType(dept).toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.Department_ID.toString().includes(searchTerm);
      return matchesType && matchesSearch;
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
  }, [data.departments, deptTypeFilter, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDepartments.slice(start, start + itemsPerPage);
  }, [filteredDepartments, currentPage, itemsPerPage]);

  useEffect(() => setCurrentPage(1), [searchTerm, deptTypeFilter, itemsPerPage]);

  const requestSort = (key: keyof Department) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Department) => {
    if (sortConfig?.key !== key) return <ChevronDown size={14} className="text-muted opacity-25" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept?.Department_Name?.trim()) {
      onSaveDepartment(editingDept as Department);
      setEditingDept(null);
    }
  };

  const isDeletable = (deptId: number) => {
    return !data.offices.some(o => Number(o.Department_ID) === deptId);
  };

  const startIndex = filteredDepartments.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredDepartments.length);

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom py-4 px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-info-subtle p-2 rounded-3 text-info"><Layers size={24} /></div>
            <div>
              <h5 className="mb-0 fw-bold">Department Master</h5>
              <p className="text-muted small mb-0">Classify and manage high-level organizational structures</p>
            </div>
          </div>
          <button onClick={() => setEditingDept({})} className="btn btn-primary px-4 shadow-sm d-flex align-items-center gap-2 rounded-pill">
            <Plus size={18} /> Add Dept
          </button>
        </div>

        <div className="row g-3">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 ps-3 text-muted"><Search size={18} /></span>
              <input type="text" className="form-control border-start-0" placeholder="Search departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="col-md-4">
            <select className="form-select" value={deptTypeFilter} onChange={(e) => setDeptTypeFilter(e.target.value)}>
              <option value="">All Dept Types</option>
              {departmentTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <button onClick={() => { setSearchTerm(''); setDeptTypeFilter(''); }} className="btn btn-outline-secondary w-100 rounded-pill">Reset</button>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {editingDept && (
          <div className="bg-light p-4 border-bottom animate-fade-in shadow-inner">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-bold mb-0 text-primary">{editingDept.Department_ID ? 'Edit Department' : 'New Department'}</h6>
              <button type="button" onClick={() => setEditingDept(null)} className="btn btn-sm btn-link text-muted p-0"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
                <label className="form-label tiny fw-bold text-muted text-uppercase">Department Name *</label>
                <input required value={editingDept.Department_Name || ''} onChange={e => setEditingDept({...editingDept, Department_Name: e.target.value})} className="form-control" placeholder="e.g. Higher Education" />
              </div>
              <div className="col-md-4">
                <label className="form-label tiny fw-bold text-muted text-uppercase">Department Type</label>
                <input value={editingDept.Department_Type || ''} onChange={e => setEditingDept({...editingDept, Department_Type: e.target.value})} className="form-control" placeholder="e.g. State Govt" />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button type="submit" className="btn btn-primary w-100 shadow-sm"><Save size={18} className="me-2" /> Save</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="tiny text-uppercase fw-bold text-muted">
                <th className="ps-4 cursor-pointer" onClick={() => requestSort('Department_ID')}>
                  <div className="d-flex align-items-center gap-1">ID {getSortIcon('Department_ID')}</div>
                </th>
                <th className="cursor-pointer" onClick={() => requestSort('Department_Name')}>
                  <div className="d-flex align-items-center gap-1">Department Name {getSortIcon('Department_Name')}</div>
                </th>
                <th className="cursor-pointer" onClick={() => requestSort('Department_Type')}>
                  <div className="d-flex align-items-center gap-1">Classification {getSortIcon('Department_Type')}</div>
                </th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(dept => (
                <tr key={dept.Department_ID}>
                  <td className="ps-4 py-3 text-muted">#{dept.Department_ID}</td>
                  <td className="fw-bold text-dark">{dept.Department_Name}</td>
                  <td>
                    {getDeptType(dept) ? (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 fw-normal">
                        {getDeptType(dept)}
                      </span>
                    ) : (
                      <span className="text-muted small">Not Specified</span>
                    )}
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex gap-2 justify-content-end">
                      <button onClick={() => setEditingDept(dept)} className="btn btn-light btn-sm rounded-3 border text-primary shadow-sm" title="Edit"><Edit2 size={16} /></button>
                      {isDeletable(Number(dept.Department_ID)) ? (
                        <button onClick={() => onDeleteDepartment(Number(dept.Department_ID))} className="btn btn-light btn-sm rounded-3 border text-danger shadow-sm" title="Delete"><Trash2 size={16} /></button>
                      ) : (
                        <button className="btn btn-light btn-sm rounded-3 border text-muted opacity-50" title="Locked: Assigned to offices" disabled><Lock size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={4} className="text-center py-5 text-muted">No departments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer bg-white border-top py-4 d-flex justify-content-between align-items-center px-4">
        <div className="d-flex align-items-center gap-4">
          <div className="small text-muted">Showing <strong>{startIndex}-{endIndex}</strong> of <strong>{filteredDepartments.length}</strong></div>
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
        .tiny { font-size: 0.7rem; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default DepartmentManagement;