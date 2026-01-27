
import React, { useState } from 'react';
import { User, UserType, AppData } from '../types';
import { ShieldCheck, Plus, User as UserIcon, Lock, Save, Trash2, Edit2, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface UserManagementProps {
  data: AppData;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ data, onSaveUser, onDeleteUser }) => {
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  const toggleUserExpansion = (userId: number) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editingUser?.User_Name?.trim()) newErrors.User_Name = "Required";
    if (!editingUser?.Password?.trim()) newErrors.Password = "Required";
    if (!editingUser?.User_Type) newErrors.User_Type = "Required";

    // Duplicate username check
    const isDuplicate = data.users.some(u => 
      u.User_Name === editingUser?.User_Name && 
      (!editingUser.User_ID || u.User_ID !== editingUser.User_ID)
    );
    if (isDuplicate) newErrors.User_Name = "Username already exists";

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

  const isDeletable = (userId: number) => {
    const hasOffices = data.offices.some(o => Number(o.User_ID) === userId);
    return !hasOffices;
  };

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary-subtle p-2 rounded-3 text-primary shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold">User Management</h5>
            <p className="text-muted small mb-0">Control system access and permissions</p>
          </div>
        </div>
        {!editingUser && (
          <button onClick={() => setEditingUser({ User_Type: UserType.NORMAL })} className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
            <Plus size={18} /> New User
          </button>
        )}
      </div>

      <div className="card-body p-0">
        {editingUser && (
          <div className="bg-light p-4 border-bottom">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-bold mb-0">{editingUser.User_ID ? 'Update User Details' : 'Register New User'}</h6>
              <button type="button" onClick={() => setEditingUser(null)} className="btn btn-sm btn-link text-muted p-0"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-bold">Username</label>
                <div className="input-group has-validation">
                  <span className="input-group-text bg-white"><UserIcon size={16} /></span>
                  <input 
                    required 
                    value={editingUser.User_Name || ''} 
                    onChange={e => setEditingUser({...editingUser, User_Name: e.target.value})} 
                    className={`form-control ${errors.User_Name ? 'is-invalid' : ''}`}
                    placeholder="Workspace ID"
                  />
                  <div className="invalid-feedback">{errors.User_Name}</div>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Password</label>
                <div className="input-group has-validation">
                  <span className="input-group-text bg-white"><Lock size={16} /></span>
                  <input 
                    type="password"
                    required 
                    value={editingUser.Password || ''} 
                    onChange={e => setEditingUser({...editingUser, Password: e.target.value})} 
                    className={`form-control ${errors.Password ? 'is-invalid' : ''}`}
                    placeholder="Security Key"
                  />
                  <div className="invalid-feedback">{errors.Password}</div>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">User Access Level</label>
                <select 
                  className="form-select"
                  value={editingUser.User_Type || ''}
                  onChange={e => setEditingUser({...editingUser, User_Type: e.target.value as UserType})}
                >
                  {Object.values(UserType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-12 text-end mt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-light px-4 me-2">Cancel</button>
                <button type="submit" className="btn btn-primary px-4 d-flex align-items-center gap-2 shadow-sm d-inline-flex">
                  <Save size={18} /> {editingUser.User_ID ? 'Commit Changes' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">User Details</th>
                <th>Account Type</th>
                <th>Office Assignments</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(user => {
                const userId = Number(user.User_ID);
                const assignedOffices = data.offices.filter(o => Number(o.User_ID) === userId);
                const deletable = isDeletable(userId);
                const isExpanded = expandedUsers.has(userId);
                
                const showAll = assignedOffices.length > 5;
                const visibleOffices = isExpanded ? assignedOffices : assignedOffices.slice(0, 5);
                const remainingCount = assignedOffices.length - 5;

                return (
                  <tr key={user.User_ID}>
                    <td className="ps-4">
                      <div className="fw-bold">{user.User_Name}</div>
                      <div className="small text-muted">ID: #{user.User_ID}</div>
                    </td>
                    <td>
                      <span className={`badge ${user.User_Type === UserType.ADMIN ? 'bg-primary' : 'bg-success-subtle text-success'} rounded-pill`}>
                        {user.User_Type}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap align-items-center gap-1" style={{ maxWidth: '400px' }}>
                        {assignedOffices.length > 0 ? (
                          <>
                            {visibleOffices.map(o => (
                              <span key={o.Office_ID} className="badge bg-light text-dark border small fw-normal">
                                {o.Office_Name}
                              </span>
                            ))}
                            {!isExpanded && showAll && (
                              <span className="text-muted small fw-bold px-1">
                                and {remainingCount} more
                              </span>
                            )}
                            {showAll && (
                              <button 
                                onClick={() => toggleUserExpansion(userId)}
                                className="btn btn-link btn-sm p-0 ms-1 text-primary text-decoration-none fw-bold d-flex align-items-center gap-1"
                                style={{ fontSize: '0.7rem' }}
                              >
                                {isExpanded ? (
                                  <>Show Less <ChevronUp size={12} /></>
                                ) : (
                                  <>Show All <ChevronDown size={12} /></>
                                )}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-muted small italic">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex gap-2 justify-content-end">
                        <button onClick={() => setEditingUser(user)} className="btn btn-light btn-sm rounded-3 border text-primary"><Edit2 size={16} /></button>
                        {deletable ? (
                          <button onClick={() => onDeleteUser(Number(user.User_ID))} className="btn btn-light btn-sm rounded-3 border text-danger"><Trash2 size={16} /></button>
                        ) : (
                          <button className="btn btn-light btn-sm rounded-3 border text-muted opacity-50" title="Locked: Assigned as custodian for offices" disabled><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
