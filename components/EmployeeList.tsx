
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, AppData, ServiceType, User, UserType, Department, Office, Post } from '../types';
import { Search, Plus, Edit2, Filter, ChevronLeft, ChevronRight, XCircle, Briefcase, Trash2, ChevronUp, ChevronDown, Building2, Layers, Tag, Info, Lock } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
  data: AppData;
  currentUser: User;
  onEdit: (emp: Employee) => void;
  onAddNew: () => void;
  onDelete: (empId: number) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, data, currentUser, onEdit, onAddNew, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee, direction: 'asc' | 'desc' } | null>({ key: 'Employee_Name', direction: 'asc' });

  // Filter States
  const [deptTypeFilter, setDeptTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');

  const isAdmin = currentUser.User_Type === UserType.ADMIN;

  // Robust helper to get Dept Type from a department object (prioritizing Dept_Type)
  const extractDeptTypeStr = (dept: any): string => {
    if (!dept) return 'Other';
    const type = (dept.Dept_Type || dept.Department_Type || dept.dept_type || '').trim();
    return type || 'Other';
  };

  // Helper to get Dept Type string based on Dept ID
  const getDeptTypeById = (deptId: number) => {
    const dept = data.departments.find(d => Math.floor(Number(d.Department_ID)) === Math.floor(Number(deptId)));
    return extractDeptTypeStr(dept);
  };

  // 1. Calculations for Admin Filters with Counts
  const adminFilterOptions = useMemo(() => {
    if (!isAdmin) return null;

    // Dept Types from Departments Sheet (Global List)
    const typeCounts: Record<string, number> = {};
    data.departments.forEach(d => {
      const type = extractDeptTypeStr(d);
      if (!typeCounts[type]) typeCounts[type] = 0;
    });

    // Populate counts based on existing employees
    employees.forEach(e => {
      const type = getDeptTypeById(e.Department_ID);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Departments
    const deptCounts: Record<number, number> = {};
    employees.forEach(e => {
      const id = Math.floor(Number(e.Department_ID));
      deptCounts[id] = (deptCounts[id] || 0) + 1;
    });

    // Offices
    const officeCounts: Record<number, number> = {};
    employees.forEach(e => {
      const id = Math.floor(Number(e.Office_ID));
      officeCounts[id] = (officeCounts[id] || 0) + 1;
    });

    return { typeCounts, deptCounts, officeCounts };
  }, [isAdmin, data.departments, employees]);

  // 2. Calculations for Normal User Filters with Counts
  const normalFilterOptions = useMemo(() => {
    if (isAdmin) return null;

    // Offices assigned to user
    const officeCounts: Record<number, number> = {};
    employees.forEach(e => {
      const id = Math.floor(Number(e.Office_ID));
      officeCounts[id] = (officeCounts[id] || 0) + 1;
    });

    // Service Types
    const serviceCounts: Record<string, number> = {};
    employees.forEach(e => {
      serviceCounts[e.Service_Type] = (serviceCounts[e.Service_Type] || 0) + 1;
    });

    // Designations (Mapped to user)
    const designationCounts: Record<number, number> = {};
    employees.forEach(e => {
      const id = Math.floor(Number(e.Post_ID));
      designationCounts[id] = (designationCounts[id] || 0) + 1;
    });

    return { officeCounts, serviceCounts, designationCounts };
  }, [isAdmin, employees]);

  const filteredResults = useMemo(() => {
    let results = employees.filter(emp => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        `${emp.Employee_Name} ${emp.Employee_Surname}`.toLowerCase().includes(term) || 
        emp.Employee_ID.toString().includes(term) ||
        emp.EPIC?.toLowerCase().includes(term);

      // Admin Filters
      const matchesDeptType = !isAdmin || !deptTypeFilter || getDeptTypeById(emp.Department_ID) === deptTypeFilter;
      const matchesDept = !isAdmin || !deptFilter || Math.floor(Number(emp.Department_ID)) === Math.floor(Number(deptFilter));
      
      // Common / Role specific Office filter
      const matchesOffice = !officeFilter || Math.floor(Number(emp.Office_ID)) === Math.floor(Number(officeFilter));
      
      // Normal User Filters
      const matchesService = isAdmin || !serviceTypeFilter || emp.Service_Type === serviceTypeFilter;
      const matchesDesignation = isAdmin || !designationFilter || Math.floor(Number(emp.Post_ID)) === Math.floor(Number(designationFilter));

      return matchesSearch && matchesDeptType && matchesDept && matchesOffice && matchesService && matchesDesignation;
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
  }, [employees, searchTerm, sortConfig, deptTypeFilter, deptFilter, officeFilter, serviceTypeFilter, designationFilter, isAdmin, data.departments]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(start, start + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  const requestSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = (sortConfig?.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const clearFilters = () => {
    setDeptTypeFilter('');
    setDeptFilter('');
    setOfficeFilter('');
    setServiceTypeFilter('');
    setDesignationFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const startIndex = filteredResults.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredResults.length);

  return (
    <div className="employee-list-container animate-fade-in">
      {/* FILTER BAR SECTION */}
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4 col-lg-3">
              <label className="tiny fw-bold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                <Search size={14} /> Global Search
              </label>
              <div className="input-group">
                <input type="text" className="form-control" placeholder="Name, ID or EPIC..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
            </div>

            {isAdmin ? (
              <>
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="tiny fw-bold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                    <Layers size={14} /> Dept. Type
                  </label>
                  <select className="form-select" value={deptTypeFilter} onChange={(e) => { setDeptTypeFilter(e.target.value); setDeptFilter(''); setOfficeFilter(''); setCurrentPage(1); }}>
                    <option value="">All Types ({employees.length})</option>
                    {Object.entries(adminFilterOptions?.typeCounts || {}).map(([type, count]) => (
                      <option key={type} value={type}>{type} ({count})</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="tiny fw-bold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                    <Building2 size={14} /> Department
                  </label>
                  <select className="form-select" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setOfficeFilter(''); setCurrentPage(1); }}>
                    <option value="">All Depts ({employees.length})</option>
                    {data.departments
                      .filter(d => !deptTypeFilter || extractDeptTypeStr(d) === deptTypeFilter)
                      .map(d => (
                        <option key={d.Department_ID} value={d.Department_ID}>
                          {d.Department_Name} ({adminFilterOptions?.deptCounts[Math.floor(Number(d.Department_ID))] || 0})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="tiny fw-bold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                    <Tag size={14} /> Office
                  </label>
                  <select className="form-select" value={officeFilter} onChange={(e) => { setOfficeFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="">All Offices ({employees.length})</option>
                    {data.offices
                      .filter(o => !deptFilter || Math.floor(Number(o.Department_ID)) === Math.floor(Number(deptFilter)))
                      .map(o => (
                        <option key={o.Office_ID} value={o.Office_ID}>
                          {o.Office_Name} (#${o.Office_ID}) ({adminFilterOptions?.officeCounts[Math.floor(Number(o.Office_ID))] || 0})
                        </option>
                      ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="tiny fw-bold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                    <Building2 size={14} /> Office
                  </label>
                  <select className="form-select" value={officeFilter} onChange={(e) => { setOfficeFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="">All My Offices ({employees.length})</option>
                    {data.offices
                      .filter(o => Math.floor(Number(o.User_ID)) === Math.floor(Number(currentUser.User_ID)))
                      .map(o => (
                        <option key={o.Office_ID} value={o.Office_ID}>
                          {o.Office_Name} (#${o.Office_ID}) ({normalFilterOptions?.officeCounts[Math.floor(Number(o.Office_ID))] || 0})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="tiny fw-bold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                    <Layers size={14} /> Service Type
                  </label>
                  <select className="form-select" value={serviceTypeFilter} onChange={(e) => { setServiceTypeFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="">All Types ({employees.length})</option>
                    {Object.values(ServiceType).map(st => (
                      <option key={st} value={st}>{st} ({normalFilterOptions?.serviceCounts[st] || 0})</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-4 col-lg-2">
                  <label className="tiny fw-bold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                    <Briefcase size={14} /> Designation
                  </label>
                  <select className="form-select" value={designationFilter} onChange={(e) => { setDesignationFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="">All Designations ({employees.length})</option>
                    {(data.posts || []).filter(p => {
                      const selections = data.userPostSelections || {};
                      const userIdNum = Math.floor(Number(currentUser.User_ID));
                      const mappedIds = selections[userIdNum] || (selections as any)[userIdNum.toString()] || [];
                      return mappedIds.includes(Math.floor(Number(p.Post_ID)));
                    }).map(p => (
                      <option key={p.Post_ID} value={p.Post_ID}>
                        {p.Post_Name} ({normalFilterOptions?.designationCounts[Math.floor(Number(p.Post_ID))] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="col-12 col-lg-1 text-end">
              <button onClick={clearFilters} className="btn btn-outline-secondary w-100 rounded-3 px-0 border-2" title="Clear Filters">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="col-12 col-lg-2">
              <button onClick={onAddNew} className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2 py-2 shadow-sm rounded-pill fw-bold">
                <Plus size={18} /> Add New
              </button>
            </div>
          </div>
        </div>
        
        {/* COUNTER STRIP */}
        <div className="bg-primary-subtle py-2 px-4 d-flex justify-content-between align-items-center border-top">
          <div className="d-flex align-items-center gap-2 text-primary small fw-bold">
            <Info size={16} /> {filteredResults.length} Record(s) found matching criteria
          </div>
          <div className="small text-muted">Page {currentPage} of {Math.ceil(filteredResults.length / itemsPerPage) || 1}</div>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="tiny text-uppercase fw-bold text-muted">
                <th className="ps-4" style={{ width: '80px' }}>Portrait</th>
                <th className="cursor-pointer" onClick={() => requestSort('Employee_Name')}>
                  <div className="d-flex align-items-center gap-1">Employee Details {sortConfig?.key === 'Employee_Name' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
                </th>
                <th className="cursor-pointer" onClick={() => requestSort('Post_ID')}>
                  <div className="d-flex align-items-center gap-1">Designation {sortConfig?.key === 'Post_ID' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
                </th>
                <th className="cursor-pointer" onClick={() => requestSort('Office_ID')}>
                  <div className="d-flex align-items-center gap-1">Office {sortConfig?.key === 'Office_ID' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
                </th>
                <th>Status</th>
                <th className="text-end pe-4">Manage</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((emp) => {
                const post = data.posts.find(p => Math.floor(Number(p.Post_ID)) === Math.floor(Number(emp.Post_ID)))?.Post_Name;
                const officeObj = data.offices.find(o => Math.floor(Number(o.Office_ID)) === Math.floor(Number(emp.Office_ID)));
                const officeLabel = officeObj ? `${officeObj.Office_Name} (#${officeObj.Office_ID})` : 'N/A';
                
                // Case-insensitive finalized check
                const isOfficeFinalized = officeObj?.Finalized?.toString().toLowerCase() === 'yes';
                
                const isActive = emp.Active !== 'No';
                const initials = `${emp.Employee_Name.charAt(0)}${emp.Employee_Surname.charAt(0)}`.toUpperCase();

                // Logic: Disable edit for Normal users if Office is finalized
                const canEdit = isAdmin || !isOfficeFinalized;

                return (
                  <tr key={emp.Employee_ID}>
                    <td className="ps-4">
                      <div className="rounded-3 border overflow-hidden bg-light d-flex align-items-center justify-content-center shadow-sm" style={{ width: '48px', height: '60px' }}>
                        {emp.Photo ? (
                          <img src={emp.Photo} className="w-100 h-100 object-fit-cover" alt="Profile" />
                        ) : (
                          <span className="fw-bold text-primary small">{initials}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{emp.Employee_Name} {emp.Employee_Surname}</div>
                      <div className="tiny text-muted uppercase">ID: #{emp.Employee_ID} • {emp.Gender} • EPIC: {emp.EPIC}</div>
                    </td>
                    <td><span className="badge bg-primary-subtle text-primary fw-normal border border-primary-subtle px-2">{post || 'Unassigned'}</span></td>
                    <td>
                      <div className="d-flex align-items-center gap-1 text-muted small">
                        <Building2 size={12} />
                        <span className="text-truncate" style={{maxWidth: '120px'}} title={officeLabel}>{officeLabel}</span>
                        {isOfficeFinalized && (
                          <span className="badge bg-success-subtle text-success rounded-pill border border-success-subtle p-1 ms-1" title="Finalized Records (LOCKED)">
                            <Lock size={10} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {isActive ? (
                        <span className="badge bg-success-subtle text-success rounded-pill px-3">Deployed</span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger rounded-pill px-3">Deactivated</span>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex gap-2 justify-content-end">
                        <button 
                          onClick={() => canEdit && onEdit(emp)} 
                          className={`btn btn-sm rounded-3 border shadow-sm ${canEdit ? 'btn-light text-primary hover-primary' : 'btn-light text-muted opacity-50 cursor-not-allowed'}`}
                          title={canEdit ? 'Edit Record' : 'Record Locked: Office Finalized'}
                          disabled={!canEdit}
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && <button onClick={() => onDelete(emp.Employee_ID)} className="btn btn-outline-danger btn-sm rounded-3 hover-danger"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <div className="mb-2"><Search size={40} className="opacity-25" /></div>
                    <div className="fw-bold">No Records Found</div>
                    <div className="small">Try adjusting your filters or search terms.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white py-4 border-top d-flex justify-content-between align-items-center px-4">
          <div className="tiny text-muted d-flex align-items-center gap-3">
            <span>Showing {startIndex}-{endIndex} of {filteredResults.length}</span>
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
              <li className={`page-item ${currentPage === Math.ceil(filteredResults.length / itemsPerPage) ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16}/></button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      
      <style>{`
        .tiny { font-size: 0.65rem; font-weight: 700; }
        .object-fit-cover { object-fit: cover; }
        .cursor-pointer { cursor: pointer; }
        .cursor-pointer:hover { background-color: #f8fafc; }
        .hover-primary:hover { background-color: #4f46e5 !important; color: white !important; }
        .hover-danger:hover { background-color: #dc2626 !important; color: white !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cursor-not-allowed { cursor: not-allowed !important; }
      `}</style>
    </div>
  );
};

export default EmployeeList;
