
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Search, Plus, Edit2, Filter, ChevronLeft, ChevronRight, XCircle, Briefcase, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
  data: AppData;
  currentUser: User;
  onEdit: (emp: Employee) => void;
  onAddNew: () => void;
}

const ITEMS_PER_PAGE = 10;

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, data, currentUser, onEdit, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [postFilter, setPostFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const postCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    employees.forEach(emp => {
      const pId = Number(emp.Post_ID);
      counts[pId] = (counts[pId] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(emp => {
      counts[emp.Service_Type] = (counts[emp.Service_Type] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const availablePosts = useMemo(() => {
    const userId = Number(currentUser.User_ID);
    const selections = data.userPostSelections?.[userId] || [];
    if (currentUser.User_Type === UserType.ADMIN) return data.posts;
    return data.posts.filter(p => selections.includes(Number(p.Post_ID)));
  }, [data.posts, data.userPostSelections, currentUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, postFilter, serviceFilter, statusFilter]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const fullName = `${emp.Employee_Name} ${emp.Employee_Surname}`.toLowerCase();
      const matchesSearch = 
        fullName.includes(searchTerm.toLowerCase()) ||
        emp.EPIC.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Mobile.includes(searchTerm);
      
      const matchesPost = postFilter === '' || Number(emp.Post_ID) === Number(postFilter);
      const matchesService = serviceFilter === '' || emp.Service_Type === serviceFilter;
      const matchesStatus = statusFilter === '' || emp.Active === statusFilter;

      return matchesSearch && matchesPost && matchesService && matchesStatus;
    });
  }, [employees, searchTerm, postFilter, serviceFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const clearFilters = () => {
    setSearchTerm('');
    setPostFilter('');
    setServiceFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  return (
    <div className="card shadow-sm border-0 overflow-hidden">
      <div className="card-header bg-white py-4 border-bottom">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Filter size={20} className="text-primary" />
            Employee Directory
          </h5>
          <button onClick={onAddNew} className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm">
            <Plus size={18} /> Add New Record
          </button>
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-3">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted px-3">
                <Search size={18} />
              </span>
              <input 
                type="text"
                className="form-control bg-light border-start-0 ps-0"
                placeholder="Search name, EPIC, mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="col-6 col-lg-3">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted px-2">
                <Briefcase size={16} />
              </span>
              <select 
                className="form-select bg-light border-start-0 ps-0"
                value={postFilter}
                onChange={(e) => setPostFilter(e.target.value)}
              >
                <option value="">
                  {availablePosts.length === 0 
                    ? 'No Mapped Designations' 
                    : `All Designations (${employees.length})`}
                </option>
                {availablePosts.map(post => {
                  const count = postCounts[Number(post.Post_ID)] || 0;
                  return (
                    <option key={post.Post_ID} value={post.Post_ID}>
                      {post.Post_Name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="col-6 col-lg-2">
            <select 
              className="form-select bg-light"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="">All Services ({employees.length})</option>
              {Object.values(ServiceType).map(type => {
                const count = serviceCounts[type] || 0;
                return (
                  <option key={type} value={type}>
                    {type} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="col-6 col-lg-2">
            <select 
              className="form-select bg-light"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Yes">Active Only</option>
              <option value="No">Inactive Only</option>
            </select>
          </div>

          <div className="col-6 col-lg-2">
            <button 
              onClick={clearFilters}
              className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
              disabled={!searchTerm && !postFilter && !serviceFilter && !statusFilter}
            >
              <XCircle size={18} /> Reset
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
              const dept = data.departments.find(d => Number(d.Department_ID) === Number(emp.Department_ID))?.Department_Name;
              const office = data.offices.find(o => Number(o.Office_ID) === Number(emp.Office_ID))?.Office_Name;
              const post = data.posts.find(p => Number(p.Post_ID) === Number(emp.Post_ID))?.Post_Name;
              const payscale = data.payscales.find(p => Number(p.Pay_ID) === Number(emp.Pay_ID))?.Pay_Name;
              
              const isActive = emp.Active !== 'No';

              return (
                <tr key={emp.Employee_ID} className={!isActive ? 'bg-light opacity-75' : ''}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{emp.Employee_Name} {emp.Employee_Surname}</div>
                    <div className="small text-muted">{emp.Gender} • <span className="text-primary fw-medium">{emp.Service_Type}</span></div>
                    {emp.PwD === 'Yes' && <span className="badge bg-warning-subtle text-warning small mt-1">PwD</span>}
                  </td>
                  <td>
                    {isActive ? (
                      <span className="badge badge-soft-success rounded-pill d-inline-flex align-items-center gap-1">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <div className="d-flex flex-column">
                        <span className="badge bg-danger-subtle text-danger rounded-pill d-inline-flex align-items-center gap-1 mb-1">
                          <AlertTriangle size={12} /> Inactive
                        </span>
                        {emp.DA_Reason && <span className="text-muted" style={{fontSize: '0.65rem'}}>{emp.DA_Reason}</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="small fw-semibold text-secondary">{office}</div>
                    <div className="small text-muted">{dept}</div>
                  </td>
                  <td>
                    <div className="mb-1">
                      <span className="badge badge-soft-primary rounded-pill">
                        {post}
                      </span>
                    </div>
                    <div className="small text-muted" style={{fontSize: '0.75rem'}}>{payscale}</div>
                  </td>
                  <td className="text-end pe-4">
                    <button onClick={() => onEdit(emp)} className="btn btn-light btn-sm rounded-3 text-primary shadow-sm border px-3">
                      <Edit2 size={16} className="me-1" /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-5 text-muted">
                  <div className="mb-2"><Search size={48} className="opacity-25" /></div>
                  No records found matching your current filter selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="card-footer bg-white py-3 border-top-0 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div className="text-muted small">
            Showing <span className="fw-bold text-dark">{startIndex}</span> to <span className="fw-bold text-dark">{endIndex}</span> of <span className="fw-bold text-dark">{filtered.length}</span> records
          </div>

          {totalPages > 1 && (
            <nav aria-label="Page navigation">
              <ul className="pagination mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link d-flex align-items-center gap-1 border-0 rounded-3 shadow-sm mx-1" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                </li>
                
                <li className="page-item disabled">
                  <span className="page-link bg-transparent border-0 text-dark fw-bold px-3">
                    {currentPage} / {totalPages}
                  </span>
                </li>

                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link d-flex align-items-center gap-1 border-0 rounded-3 shadow-sm mx-1" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
