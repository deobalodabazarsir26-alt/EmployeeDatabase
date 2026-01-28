
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserType, AppData } from '../types';
import { ShieldCheck, Plus, User as UserIcon, Lock, Save, Trash2, Edit2, X, Search, Filter, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserManagementProps {
  data: AppData;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ data, onSaveUser, onDeleteUser }) => {
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Filtering & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof User, direction: 'asc' | 'desc' } | null>({ key: 'User_Name', direction: 'asc' });

  const filteredUsers = useMemo(() => {
    let results = data.users.filter(user => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        user.User_Name.toLowerCase().includes(term) || 
        user.User_ID.toString().includes(term);
      const matchesType = !typeFilter || user.User_Type === typeFilter;
      return matchesSearch && matchesType;
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
  }, [data.users, searchTerm, typeFilter, sortConfig]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  useEffect(() => setCurrentPage(1), [searchTerm, typeFilter, itemsPerPage]);

  const requestSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof User) => {
    if (sortConfig?.key !== key) return <ChevronDown size={14} className="text-muted opacity-25" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
  };

  // Improved mapping to handle case-insensitivity from spreadsheet data
  const getSafeUserType = (val: any): UserType => {
    if (!val) return UserType.NORMAL;
    const str = String(val).trim().toLowerCase();
    if (str === 'admin') return UserType.ADMIN;
    return UserType.NORMAL;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editingUser?.User_Name?.trim()) newErrors.User_Name = "Required";
    if (!editingUser?.Password?.trim()) newErrors.Password = "Required";
    if (!editingUser?.User_Type) newErrors.User_Type = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSaveUser(editingUser as User);
      setEditingUser(null);
    }
  };

  const startIndex = filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredUsers.length);

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom py-4 px-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary"><ShieldCheck size={24} /></div>
            <div>
              <h5 className="mb-0 fw-bold">User Registry</h5>
              <p className="text-muted small mb-0">Manage system access levels and credentials</p>
            </div>
          </div>
          <button onClick={() => setEditingUser({ User_Type: UserType.NORMAL })} className="btn btn-primary px-4 shadow-sm d-flex align-items-center gap-2">
            <Plus size={18} /> Add User
          </button>
        </div>

        <div className="row g-3">
          <div className="col-md-5">
            <div className="input-group shadow-sm">
              <span className="input-group-text bg-white border-end-0 ps-3 text-muted"><Search size={16} /></span>
              <input type="text" className="form-control border-start-0" placeholder="Search by username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="col-md-4">
            <select className="form-select shadow-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Access Levels</option>
              <option value={UserType.ADMIN}>Administrators</option>
              <option value={UserType.NORMAL}>Normal Users</option>
            </select>
          </div>
          <div className="col-md-3">
            <button onClick={() => { setSearchTerm(''); setTypeFilter(''); }} className="btn btn-outline-secondary w-100 shadow-sm border-2 fw-semibold">Reset Filters</button>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {editingUser && (
          <div className="bg-light p-4 border-bottom animate-fade-in shadow-inner">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-primary">{editingUser.User_ID ? 'Modify System Credentials' : 'Register New User Account'}</h6>
              <button type="button" onClick={() => setEditingUser(null)} className="btn btn-sm btn-link text-muted p-0"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-bold">Username *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted"><UserIcon size={16} /></span>
                  <input required value={editingUser.User_Name || ''} onChange={e => setEditingUser({...editingUser, User_Name: e.target.value})} className={`form-control border-start-0 ps-1 ${errors.User_Name ? 'is-invalid' : ''}`} placeholder="e.g. jdoe_admin" />
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Password *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted"><Lock size={16} /></span>
                  <input type="password" required value={editingUser.Password || ''} onChange={e => setEditingUser({...editingUser, Password: e.target.value})} className={`form-control border-start-0 ps-1 ${errors.Password ? 'is-invalid' : ''}`} placeholder="••••••••" />
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">User Access Level *</label>
                <select required value={getSafeUserType(editingUser.User_Type)} onChange={e => setEditingUser({...editingUser, User_Type: e.target.value as UserType})} className="form-select">
                  <option value={UserType.NORMAL}>Normal User (Restricted View)</option>
                  <option value={UserType.ADMIN}>Administrator (Full Access)</option>
                </select>
              </div>
              <div className="col-12 text-end pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-light px-4 me-2">Cancel</button>
                <button type="submit" className="btn btn-primary px-4 shadow-sm"><Save size={18} className="me-2" /> Save Account</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4 cursor-pointer" onClick={() => requestSort('User_Name')}>
                  <div className="d-flex align-items-center gap-1">Identity {getSortIcon('User_Name')}</div>
                </th>
                <th className="cursor-pointer" onClick={() => requestSort('User_Type')}>
                  <div className="d-flex align-items-center gap-1">Access Level {getSortIcon('User_Type')}</div>
                </th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(user => (
                <tr key={user.User_ID}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{user.User_Name}</div>
                    <div className="tiny text-muted uppercase">SYSTEM ID: #{user.User_ID}</div>
                  </td>
                  <td>
                    <span className={`badge ${user.User_Type === UserType.ADMIN ? 'bg-primary' : 'bg-success-subtle text-success border border-success-subtle'} rounded-pill px-3 py-1`}>
                      {user.User_Type}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex gap-2 justify-content-end">
                      <button onClick={() => setEditingUser(user)} className="btn btn-light btn-sm rounded-3 border text-primary shadow-sm" title="Edit Profile"><Edit2 size={16} /></button>
                      <button onClick={() => onDeleteUser(user.User_ID)} className="btn btn-light btn-sm rounded-3 border text-danger shadow-sm" title="Remove Account"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={3} className="text-center py-5 text-muted">No accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer bg-white border-top py-4 d-flex justify-content-between align-items-center px-4">
        <div className="d-flex align-items-center gap-4">
          <div className="small text-muted">Showing <strong>{startIndex}-{endIndex}</strong> of <strong>{filteredUsers.length}</strong></div>
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
        .tiny { font-size: 0.65rem; font-weight: 700; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default UserManagement;
