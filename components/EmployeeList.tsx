
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Search, Plus, Edit2, Trash2, Filter, ChevronLeft, ChevronRight, XCircle, Briefcase, Info } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
  data: AppData;
  currentUser: User;
  onEdit: (emp: Employee) => void;
  onDelete: (id: number) => void;
  onAddNew: () => void;
}

const ITEMS_PER_PAGE = 10;

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, data, currentUser, onEdit, onDelete, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [postFilter, setPostFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate counts for each service type based on total employees available to this user
  const serviceTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(emp => {
      const type = emp.Service_Type;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [employees]);

  // Calculate counts for each designation (post) based on total employees available to this user
  const postCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    employees.forEach(emp => {
      const pId = Number(emp.Post_ID);
      counts[pId] = (counts[pId] || 0) + 1;
    });
    return counts;
  }, [employees]);

  // Filter available posts for the dropdown BASED ON UserPostSelections for the LOGGED-IN user
  const availablePosts = useMemo(() => {
    const userId = Number(currentUser.User_ID);
    const selections = data.userPostSelections?.[userId] || [];
    
    // Admins see all system posts as the master authority
    if (currentUser.User_Type === UserType.ADMIN) return data.posts;
    
    // Normal users see ONLY the posts they have mapped in the "Manage My Posts" section
    // We filter the global posts list by the IDs present in the user's selections
    return data.posts.filter(p => selections.includes(Number(p.Post_ID)));
  }, [data.posts, data.userPostSelections, currentUser]);

  // Reset to first page when filters change to avoid empty results on non-existent pages
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, postFilter, serviceFilter]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const fullName = `${emp.Employee_Name} ${emp.Employee_Surname}`.toLowerCase();
      const matchesSearch = 
        fullName.includes(searchTerm.toLowerCase()) ||
        emp.EPIC.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Mobile.includes(searchTerm);
      
      const matchesPost = postFilter === '' || Number(emp.Post_ID) === Number(postFilter);
      const matchesService = serviceFilter === '' || emp.Service_Type === serviceFilter;

      return matchesSearch && matchesPost && matchesService;
    });
  }, [employees, searchTerm, postFilter, serviceFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const clearFilters = () => {
    setSearchTerm('');
    setPostFilter('');
    setServiceFilter('');
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
          <div className="col-12 col-lg-4">
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
                    : `All Mapped Designations (${employees.length})`}
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

          <div className="col-6 col-lg-3">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted px-2">
                <Info size={16} />
              </span>
              <select 
                className="form-select bg-light border-start-0 ps-0"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                <option value="">All Service Types ({employees.length})</option>
                {Object.values(ServiceType).map(type => {
                  const count = serviceTypeCounts[type] || 0;
                  return (
                    <option key={type} value={type}>
                      {type} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="col-12 col-lg-2">
            <button 
              onClick={clearFilters}
              className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
              disabled={!searchTerm && !postFilter && !serviceFilter}
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
              <th>Dept & Office</th>
              <th>Post & Payscale</th>
              <th>Contact Info</th>
              <th className="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((emp) => {
              const dept = data.departments.find(d => Number(d.Department_ID) === Number(emp.Department_ID))?.Department_Name;
              const office = data.offices.find(o => Number(o.Office_ID) === Number(emp.Office_ID))?.Office_Name;
              const post = data.posts.find(p => Number(p.Post_ID) === Number(emp.Post_ID))?.Post_Name;
              const payscale = data.payscales.find(p => Number(p.Pay_ID) === Number(emp.Pay_ID))?.Pay_Name;
              
              return (
                <tr key={emp.Employee_ID}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{emp.Employee_Name} {emp.Employee_Surname}</div>
                    <div className="small text-muted">{emp.Gender} • <span className="text-primary fw-medium">{emp.Service_Type}</span></div>
                    {emp.PwD === 'Yes' && <span className="badge bg-warning-subtle text-warning small mt-1">PwD</span>}
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
                  <td>
                    <div className="small">{emp.Mobile}</div>
                    <div className="small text-muted" style={{fontSize: '0.75rem'}}>EPIC: {emp.EPIC}</div>
                  </td>
                  <td className="text-end pe-4">
                    <div className="btn-group">
                      <button onClick={() => onEdit(emp)} className="btn btn-light btn-sm rounded-3 me-2 text-primary shadow-sm border">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(emp.Employee_ID)} className="btn btn-light btn-sm rounded-3 text-danger shadow-sm border">
                        <Trash2 size={16} />
                      </button>
                    </div>
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
