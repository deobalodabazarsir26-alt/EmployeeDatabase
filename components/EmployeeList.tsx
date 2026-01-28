
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, AppData, ServiceType, User, UserType, Department } from '../types';
import { Search, Plus, Edit2, Filter, ChevronLeft, ChevronRight, XCircle, Briefcase, Trash2, ChevronUp, ChevronDown, UserMinus, UserPlus, FileText, Camera } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
  data: AppData;
  currentUser: User;
  onEdit: (emp: Employee) => void;
  onAddNew: () => void;
  onDelete: (empId: number) => void;
  onToggleStatus: (empId: number) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, data, currentUser, onEdit, onAddNew, onDelete, onToggleStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee, direction: 'asc' | 'desc' } | null>({ key: 'Employee_Name', direction: 'asc' });

  const isAdmin = currentUser.User_Type === UserType.ADMIN;

  const filteredResults = useMemo(() => {
    let results = employees.filter(emp => {
      const term = searchTerm.toLowerCase().trim();
      return !term || `${emp.Employee_Name} ${emp.Employee_Surname}`.toLowerCase().includes(term) || emp.Employee_ID.toString().includes(term);
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
  }, [employees, searchTerm, sortConfig]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(start, start + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  const requestSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = (sortConfig?.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const startIndex = filteredResults.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredResults.length);

  return (
    <div className="card shadow-sm border-0 rounded-4">
      <div className="card-header bg-white py-4 border-bottom px-4 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <div className="input-group shadow-sm" style={{ maxWidth: '300px' }}>
            <span className="input-group-text bg-white border-end-0 text-muted ps-3"><Search size={16} /></span>
            <input type="text" className="form-control border-start-0" placeholder="Search ID or Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <button onClick={onAddNew} className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 shadow-sm">
          <Plus size={18} /> Add New
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr className="bg-light tiny text-uppercase">
              <th className="ps-4" style={{ width: '80px' }}>Identity</th>
              <th className="cursor-pointer" onClick={() => requestSort('Employee_Name')}>
                Name {sortConfig?.key === 'Employee_Name' && (sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
              </th>
              <th>Status</th>
              <th>Designation</th>
              <th className="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((emp) => {
              const post = data.posts.find(p => Number(p.Post_ID) === Number(emp.Post_ID))?.Post_Name;
              const isActive = emp.Active !== 'No';
              const initials = `${emp.Employee_Name.charAt(0)}${emp.Employee_Surname.charAt(0)}`.toUpperCase();

              return (
                <tr key={emp.Employee_ID}>
                  <td className="ps-4">
                    <div className="rounded-3 border overflow-hidden bg-light d-flex align-items-center justify-content-center shadow-sm" style={{ width: '48px', height: '60px' }}>
                      {emp.Employee_Photo_URL ? (
                        <img src={emp.Employee_Photo_URL} className="w-100 h-100 object-fit-cover" alt="Profile" />
                      ) : (
                        <span className="fw-bold text-primary small">{initials}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold text-dark">{emp.Employee_Name} {emp.Employee_Surname}</div>
                    <div className="tiny text-muted uppercase">ID: #{emp.Employee_ID} • {emp.Gender}</div>
                  </td>
                  <td>
                    {isActive ? (
                      <span className="badge bg-success-subtle text-success rounded-pill px-3">Active</span>
                    ) : (
                      <span className="badge bg-danger-subtle text-danger rounded-pill px-3">Inactive ({emp.DA_Reason})</span>
                    )}
                  </td>
                  <td><span className="badge bg-primary-subtle text-primary fw-normal border border-primary-subtle px-2">{post}</span></td>
                  <td className="text-end pe-4">
                    <div className="d-flex gap-2 justify-content-end">
                      <button onClick={() => onToggleStatus(emp.Employee_ID)} className={`btn btn-sm rounded-3 border ${isActive ? 'btn-light text-warning' : 'btn-light text-success'}`}>
                        {isActive ? <UserMinus size={16} /> : <UserPlus size={16} />}
                      </button>
                      <button onClick={() => onEdit(emp)} className="btn btn-light btn-sm rounded-3 border text-primary shadow-sm"><Edit2 size={16} /></button>
                      {isAdmin && <button onClick={() => onDelete(emp.Employee_ID)} className="btn btn-outline-danger btn-sm rounded-3"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-footer bg-white py-4 border-top d-flex justify-content-between align-items-center px-4">
        <div className="tiny text-muted">Showing {startIndex}-{endIndex} of {filteredResults.length}</div>
        <nav><ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16}/></button></li>
          <li className="page-item active"><span className="page-link px-3">{currentPage}</span></li>
          <li className={`page-item ${currentPage === Math.ceil(filteredResults.length / itemsPerPage) ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16}/></button></li>
        </ul></nav>
      </div>
      <style>{`
        .tiny { font-size: 0.65rem; font-weight: 700; }
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </div>
  );
};

export default EmployeeList;
