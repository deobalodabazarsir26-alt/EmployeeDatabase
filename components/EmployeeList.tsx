
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, AppData, ServiceType, User, UserType, Department } from '../types';
import { Search, Plus, Edit2, Filter, ChevronLeft, ChevronRight, XCircle, Briefcase, AlertTriangle, CheckCircle2, Trash2, Layers, Building2, Tag, Activity, ListOrdered } from 'lucide-react';

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
  const [deptTypeFilter, setDeptTypeFilter] = useState<string>(''); 
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [officeFilter, setOfficeFilter] = useState<string>('');
  const [postFilter, setPostFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Default increased to 25

  const isAdmin = currentUser.User_Type === UserType.ADMIN;

  // Helper to extract department type reliably across potential case/name variations from GSheets
  const getDeptType = (dept?: Department): string => {
    if (!dept) return '';
    return (dept.Department_Type || (dept as any).Dept_Type || (dept as any).department_type || '').trim();
  };

  // --- 1. BASE DATA SCOPING ---
  const userRelevantOffices = useMemo(() => {
    if (isAdmin) return data.offices || [];
    return (data.offices || []).filter(o => Number(o.User_ID) === Number(currentUser.User_ID));
  }, [data.offices, currentUser, isAdmin]);

  // --- 2. HIERARCHICAL FILTERING LOGIC ---

  // LEVEL 1: Search Filter
  const filteredBySearch = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return employees;
    return employees.filter(emp => 
      `${emp.Employee_Name} ${emp.Employee_Surname}`.toLowerCase().includes(term) ||
      emp.EPIC.toLowerCase().includes(term) ||
      emp.Mobile.includes(term)
    );
  }, [employees, searchTerm]);

  // LEVEL 2: Department Type (Admin Only)
  const departmentTypes = useMemo(() => {
    if (!isAdmin) return [];
    const types = new Set<string>();
    (data.departments || []).forEach(d => {
      const type = getDeptType(d);
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [data.departments, isAdmin]);

  const deptTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBySearch.forEach(emp => {
      const d = data.departments.find(dept => Number(dept.Department_ID) === Number(emp.Department_ID));
      const type = getDeptType(d);
      if (type) counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [filteredBySearch, data.departments]);

  const filteredByDeptType = useMemo(() => {
    if (!isAdmin || !deptTypeFilter) return filteredBySearch;
    return filteredBySearch.filter(emp => {
      const d = data.departments.find(dept => Number(dept.Department_ID) === Number(emp.Department_ID));
      return getDeptType(d) === deptTypeFilter;
    });
  }, [filteredBySearch, deptTypeFilter, isAdmin, data.departments]);

  // LEVEL 3: Department Filter
  const userRelevantDepartments = useMemo(() => {
    let depts = data.departments || [];
    if (!isAdmin) {
      const relevantOfficeDeptIds = new Set(userRelevantOffices.map(o => Number(o.Department_ID)));
      depts = depts.filter(d => relevantOfficeDeptIds.has(Number(d.Department_ID)));
    }
    if (isAdmin && deptTypeFilter) {
      depts = depts.filter(d => getDeptType(d) === deptTypeFilter);
    }
    return depts;
  }, [data.departments, isAdmin, deptTypeFilter, userRelevantOffices]);

  const deptCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredByDeptType.forEach(emp => {
      const id = Number(emp.Department_ID);
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [filteredByDeptType]);

  const filteredByDept = useMemo(() => {
    if (!deptFilter) return filteredByDeptType;
    return filteredByDeptType.filter(emp => Number(emp.Department_ID) === Number(deptFilter));
  }, [filteredByDeptType, deptFilter]);

  // LEVEL 4: Office Filter
  const filteredDropdownOffices = useMemo(() => {
    let offices = userRelevantOffices;
    if (deptFilter) {
      offices = offices.filter(o => Number(o.Department_ID) === Number(deptFilter));
    } else if (isAdmin && deptTypeFilter) {
      const validDepts = new Set(userRelevantDepartments.map(d => Number(d.Department_ID)));
      offices = offices.filter(o => validDepts.has(Number(o.Department_ID)));
    }
    return offices;
  }, [userRelevantOffices, deptFilter, isAdmin, deptTypeFilter, userRelevantDepartments]);

  const officeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredByDept.forEach(emp => {
      const id = Number(emp.Office_ID);
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [filteredByDept]);

  const filteredByOffice = useMemo(() => {
    if (!officeFilter) return filteredByDept;
    return filteredByDept.filter(emp => Number(emp.Office_ID) === Number(officeFilter));
  }, [filteredByDept, officeFilter]);

  // LEVEL 5: Designation & Service Counts (Based on Location Filters)
  const postCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    filteredByOffice.forEach(emp => {
      const id = Number(emp.Post_ID);
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [filteredByOffice]);

  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByOffice.forEach(emp => {
      const type = emp.Service_Type;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [filteredByOffice]);

  const availablePosts = useMemo(() => {
    const userId = Number(currentUser.User_ID);
    const selections = data.userPostSelections?.[userId] || [];
    let posts = data.posts || [];
    if (!isAdmin) {
      posts = posts.filter(p => selections.includes(Number(p.Post_ID)));
    }
    return posts.filter(p => (postCounts[Number(p.Post_ID)] || 0) > 0)
                .sort((a, b) => (postCounts[Number(b.Post_ID)] || 0) - (postCounts[Number(a.Post_ID)] || 0));
  }, [data.posts, data.userPostSelections, currentUser, isAdmin, postCounts]);

  const availableServiceTypes = useMemo(() => {
    return Object.values(ServiceType)
      .filter(type => (serviceCounts[type] || 0) > 0)
      .sort((a, b) => (serviceCounts[b] || 0) - (serviceCounts[a] || 0));
  }, [serviceCounts]);

  // --- 3. AUTO-RESET CASCADING FILTERS ---
  useEffect(() => {
    if (deptTypeFilter) {
      const selectedDept = data.departments.find(d => Number(d.Department_ID) === Number(deptFilter));
      if (selectedDept && getDeptType(selectedDept) !== deptTypeFilter) setDeptFilter('');
    }
  }, [deptTypeFilter, data.departments, deptFilter]);

  useEffect(() => {
    if (deptFilter) {
      const selectedOffice = data.offices.find(o => Number(o.Office_ID) === Number(officeFilter));
      if (selectedOffice && Number(selectedOffice.Department_ID) !== Number(deptFilter)) setOfficeFilter('');
    }
  }, [deptFilter, data.offices, officeFilter]);

  // --- 4. FINAL TABLE DATA ---
  const filteredResults = useMemo(() => {
    return filteredByOffice.filter(emp => {
      const matchesPost = !postFilter || Number(emp.Post_ID) === Number(postFilter);
      const matchesService = !serviceFilter || emp.Service_Type === serviceFilter;
      const matchesStatus = !statusFilter || emp.Active === statusFilter;
      return matchesPost && matchesService && matchesStatus;
    });
  }, [filteredByOffice, postFilter, serviceFilter, statusFilter]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(start, start + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  useEffect(() => setCurrentPage(1), [searchTerm, deptTypeFilter, deptFilter, officeFilter, postFilter, serviceFilter, statusFilter, itemsPerPage]);

  const clearFilters = () => {
    setSearchTerm(''); setDeptTypeFilter(''); setDeptFilter(''); setOfficeFilter('');
    setPostFilter(''); setServiceFilter(''); setStatusFilter('');
  };

  const startIndex = filteredResults.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredResults.length);

  return (
    <div className="card shadow-sm border-0 rounded-4">
      <div className="card-header bg-white py-4 border-bottom px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
              <Filter size={20} className="text-primary" />
              Employee Directory
            </h5>
            <p className="text-muted small mb-0 mt-1">
              Showing <span className="fw-bold text-dark">{filteredResults.length}</span> matching records from total <span className="fw-bold text-primary">{employees.length}</span>
            </p>
          </div>
          <button onClick={onAddNew} className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm px-4">
            <Plus size={18} /> Add New Record
          </button>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3 mb-3">
          <div className="col">
            <div className="input-group shadow-sm h-100 overflow-hidden">
              <span className="input-group-text bg-white border-end-0 text-muted px-2"><Search size={16} /></span>
              <input type="text" className="form-control border-start-0 ps-1" placeholder="Search by name, EPIC or Mobile..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          
          {isAdmin && (
            <div className="col">
              <div className="input-group shadow-sm h-100 overflow-hidden">
                <span className="input-group-text bg-white border-end-0 text-muted px-2"><Tag size={16} /></span>
                <select className="form-select border-start-0 ps-1 fw-medium" value={deptTypeFilter} onChange={(e) => setDeptTypeFilter(e.target.value)}>
                  <option value="">Dept Type</option>
                  {departmentTypes.map(type => (
                    <option key={type} value={type}>{type} ({deptTypeCounts[type] || 0})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="col">
            <div className="input-group shadow-sm h-100 overflow-hidden">
              <span className="input-group-text bg-white border-end-0 text-muted px-2"><Layers size={16} /></span>
              <select className="form-select border-start-0 ps-1" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">Department</option>
                {userRelevantDepartments.map(dept => (
                  <option key={dept.Department_ID} value={dept.Department_ID}>
                    {dept.Department_Name} ({deptCounts[Number(dept.Department_ID)] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col">
            <div className="input-group shadow-sm h-100 overflow-hidden">
              <span className="input-group-text bg-white border-end-0 text-muted px-2"><Building2 size={16} /></span>
              <select className="form-select border-start-0 ps-1" value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)}>
                <option value="">Office</option>
                {filteredDropdownOffices.map(office => (
                  <option key={office.Office_ID} value={office.Office_ID}>
                    {office.Office_Name} ({officeCounts[Number(office.Office_ID)] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col">
            <div className="input-group shadow-sm h-100 overflow-hidden">
              <span className="input-group-text bg-white border-end-0 text-muted px-2"><Briefcase size={16} /></span>
              <select className="form-select border-start-0 ps-1 fw-semibold" value={postFilter} onChange={(e) => setPostFilter(e.target.value)}>
                <option value="">Designation ({availablePosts.length})</option>
                {availablePosts.map(post => (
                  <option key={post.Post_ID} value={post.Post_ID}>
                    {post.Post_Name} ({postCounts[Number(post.Post_ID)] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col">
            <div className="input-group shadow-sm h-100 overflow-hidden">
              <span className="input-group-text bg-white border-end-0 text-muted px-2"><Activity size={16} /></span>
              <select className="form-select border-start-0 ps-1" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                <option value="">Service Type ({availableServiceTypes.length})</option>
                {availableServiceTypes.map(type => (
                  <option key={type} value={type}>
                    {type} ({serviceCounts[type] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col">
            <select className="form-select shadow-sm h-100" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Yes">Active Only</option>
              <option value="No">Inactive Only</option>
            </select>
          </div>

          <div className="col">
            <button onClick={clearFilters} className="btn btn-outline-secondary w-100 h-100 d-flex align-items-center justify-content-center gap-2 shadow-sm py-2 border-2 fw-semibold" disabled={!searchTerm && !deptTypeFilter && !deptFilter && !officeFilter && !postFilter && !serviceFilter && !statusFilter}>
              <XCircle size={18} /> Reset All
            </button>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th className="ps-4">Employee Details</th>
              <th>Status</th>
              <th>Dept & Office</th>
              <th>Post & Payscale</th>
              <th className="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((emp) => {
              const dObj = data.departments.find(d => Number(d.Department_ID) === Number(emp.Department_ID));
              const office = data.offices.find(o => Number(o.Office_ID) === Number(emp.Office_ID))?.Office_Name;
              const post = data.posts.find(p => Number(p.Post_ID) === Number(emp.Post_ID))?.Post_Name;
              const payscale = data.payscales.find(p => Number(p.Pay_ID) === Number(emp.Pay_ID))?.Pay_Name;
              const isActive = emp.Active !== 'No';
              const dType = getDeptType(dObj);

              return (
                <tr key={emp.Employee_ID} className={!isActive ? 'bg-light opacity-75' : ''}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark text-truncate" style={{maxWidth: '220px'}} title={`${emp.Employee_Name} ${emp.Employee_Surname}`}>
                      {emp.Employee_Name} {emp.Employee_Surname}
                    </div>
                    <div className="small text-muted">{emp.Gender} • <span className="text-primary fw-medium">{emp.Service_Type}</span></div>
                    {emp.PwD === 'Yes' && <span className="badge bg-warning-subtle text-warning small mt-1">PwD</span>}
                  </td>
                  <td>
                    {isActive ? (
                      <span className="badge badge-soft-success rounded-pill d-inline-flex align-items-center gap-1 shadow-none"><CheckCircle2 size={12} /> Active</span>
                    ) : (
                      <div className="d-flex flex-column">
                        <span className="badge bg-danger-subtle text-danger rounded-pill d-inline-flex align-items-center gap-1 mb-1"><AlertTriangle size={12} /> Inactive</span>
                        {emp.DA_Reason && <span className="text-muted" style={{fontSize: '0.65rem'}}>{emp.DA_Reason}</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="small fw-semibold text-secondary text-truncate" style={{maxWidth: '180px'}} title={office}>{office}</div>
                    <div className="small text-muted text-truncate" style={{maxWidth: '180px'}} title={dObj?.Department_Name}>
                      {dObj?.Department_Name} {isAdmin && dType && (
                        <span className="badge bg-light text-dark border ms-1" style={{fontSize: '0.6rem'}}>{dType}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="mb-1"><span className="badge badge-soft-primary rounded-pill text-truncate d-inline-block" style={{maxWidth: '160px'}} title={post}>{post}</span></div>
                    <div className="small text-muted" style={{fontSize: '0.75rem'}}>{payscale}</div>
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex gap-2 justify-content-end">
                      <button onClick={() => onEdit(emp)} className="btn btn-light btn-sm rounded-3 text-primary shadow-sm border px-3" title="Edit Record"><Edit2 size={16} /></button>
                      {isAdmin && <button onClick={() => { if(window.confirm(`Delete ${emp.Employee_Name}?`)) onDelete(emp.Employee_ID); }} className="btn btn-outline-danger btn-sm rounded-3 shadow-sm px-3" title="Delete Record"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredResults.length === 0 && (
              <tr><td colSpan={5} className="text-center py-5 text-muted">No records found matching your current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card-footer bg-white py-4 border-top d-flex flex-column flex-lg-row justify-content-between align-items-center gap-4 px-4">
        <div className="d-flex align-items-center gap-4">
          <div className="text-muted small">
            Showing <span className="fw-bold text-dark">{startIndex}</span> to <span className="fw-bold text-dark">{endIndex}</span> of <span className="fw-bold text-primary">{filteredResults.length}</span> records
          </div>
          
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-medium d-none d-sm-inline">Rows per page:</span>
            <select 
              className="form-select form-select-sm shadow-sm border-2" 
              style={{width: 'auto', minWidth: '80px'}} 
              value={itemsPerPage} 
              onChange={(e) => {
                const val = e.target.value;
                setItemsPerPage(val === 'all' ? filteredResults.length : Number(val));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <nav aria-label="Page navigation" className="shadow-sm rounded-3 overflow-hidden">
            <ul className="pagination mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link border-0 py-2 px-3 d-flex align-items-center gap-1 fw-semibold" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={18} /> Prev
                </button>
              </li>
              
              <li className="page-item active shadow-none">
                <span className="page-link bg-primary border-0 py-2 px-4 fw-bold">
                  {currentPage} / {totalPages}
                </span>
              </li>
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link border-0 py-2 px-3 d-flex align-items-center gap-1 fw-semibold" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight size={18} />
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
      
      <style>{`
        .pagination .page-link {
          color: var(--bs-primary);
          transition: all 0.2s;
        }
        .pagination .page-link:hover {
          background-color: #f1f5f9;
        }
        .pagination .page-item.disabled .page-link {
          color: #94a3b8;
          background-color: #f8fafc;
        }
        .pagination .page-item.active .page-link {
          background-color: var(--bs-primary);
          color: white;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default EmployeeList;
