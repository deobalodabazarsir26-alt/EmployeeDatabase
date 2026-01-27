
import React, { useState, useMemo, useEffect } from 'react';
import { Office, AppData, Department } from '../types';
import { Plus, Edit2, Building2, MapPin, Hash, UserCheck, X, Save, Trash2, Lock, Search, Filter, Tag, Layers } from 'lucide-react';

interface OfficeManagementProps {
  data: AppData;
  onSaveOffice: (office: Office) => void;
  onDeleteOffice: (officeId: number) => void;
}

const OfficeManagement: React.FC<OfficeManagementProps> = ({ data, onSaveOffice, onDeleteOffice }) => {
  const [editingOffice, setEditingOffice] = useState<Partial<Office> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptTypeFilter, setDeptTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Helper to get department type reliably
  const getDeptType = (dept?: Department): string => {
    if (!dept) return '';
    return (dept.Department_Type || (dept as any).Dept_Type || (dept as any).department_type || '').trim();
  };

  // Derive unique department types for the filter
  const departmentTypes = useMemo(() => {
    const types = new Set<string>();
    (data.departments || []).forEach(d => {
      const type = getDeptType(d);
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [data.departments]);

  // Derive departments filtered by selected type
  const filteredDepartments = useMemo(() => {
    if (!deptTypeFilter) return data.departments;
    return data.departments.filter(d => getDeptType(d) === deptTypeFilter);
  }, [data.departments, deptTypeFilter]);

  // Filter Logic
  const filteredOffices = useMemo(() => {
    return data.offices.filter(office => {
      // 1. Search Filter (ID or Name)
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        office.Office_Name.toLowerCase().includes(term) || 
        office.Office_ID.toString().includes(term);

      // 2. Department Filter
      const matchesDept = !deptFilter || Number(office.Department_ID) === Number(deptFilter);

      // 3. Department Type Filter
      let matchesDeptType = true;
      if (deptTypeFilter) {
        const dept = data.departments.find(d => Number(d.Department_ID) === Number(office.Department_ID));
        matchesDeptType = getDeptType(dept) === deptTypeFilter;
      }

      return matchesSearch && matchesDept && matchesDeptType;
    });
  }, [data.offices, searchTerm, deptFilter, deptTypeFilter, data.departments]);

  // Reset Department filter if the selected Type changes and the current Dept doesn't match
  useEffect(() => {
    if (deptTypeFilter && deptFilter) {
      const selectedDept = data.departments.find(d => Number(d.Department_ID) === Number(deptFilter));
      if (selectedDept && getDeptType(selectedDept) !== deptTypeFilter) {
        setDeptFilter('');
      }
    }
  }, [deptTypeFilter, deptFilter, data.departments]);

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
      setErrors({});
    }
  };

  const handleFieldChange = (field: keyof Office, value: any) => {
    setEditingOffice(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const up = { ...prev };
        delete up[field];
        return up;
      });
    }
  };

  const isDeletable = (officeId: number) => {
    return !data.employees.some(e => Number(e.Office_ID) === officeId);
  };

  const handleDelete = (office: Office) => {
    if (window.confirm(`Delete office "${office.Office_Name}"? This cannot be undone.`)) {
      onDeleteOffice(Number(office.Office_ID));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDeptTypeFilter('');
    setDeptFilter('');
  };

  return (
    <div className="container-fluid px-0">
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
        <div className="card-header bg-white border-bottom py-4 px-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary-subtle p-2 rounded-3 text-primary shadow-sm">
                <Building2 size={24} />
              </div>
              <div>
                <h5 className="mb-0 fw-bold">Office Directory</h5>
                <p className="text-muted small mb-0">Manage organizational units and assignments</p>
              </div>
            </div>
            <button 
              onClick={() => { setEditingOffice({}); setErrors({}); }}
              className="btn btn-primary d-flex align-items-center gap-2 shadow-sm px-4"
            >
              <Plus size={18} />
              Add New Office
            </button>
          </div>

          {/* Filter Bar */}
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                  <Search size={16} />
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0 ps-1" 
                  placeholder="Search Office Name or ID..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                  <Tag size={16} />
                </span>
                <select 
                  className="form-select border-start-0 ps-1 fw-medium" 
                  value={deptTypeFilter} 
                  onChange={(e) => setDeptTypeFilter(e.target.value)}
                >
                  <option value="">All Dept Types</option>
                  {departmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                  <Layers size={16} />
                </span>
                <select 
                  className="form-select border-start-0 ps-1" 
                  value={deptFilter} 
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {filteredDepartments.map(dept => (
                    <option key={dept.Department_ID} value={dept.Department_ID}>
                      {dept.Department_Name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-2">
              <button 
                onClick={clearFilters} 
                className="btn btn-outline-secondary w-100 h-100 d-flex align-items-center justify-content-center gap-2 shadow-sm border-2 fw-semibold"
                disabled={!searchTerm && !deptTypeFilter && !deptFilter}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {editingOffice && (
            <div className="bg-light p-4 border-bottom animate-fade-in">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold mb-0 text-primary d-flex align-items-center gap-2">
                  <Filter size={18} />
                  {editingOffice.Office_ID ? 'Edit Office Details' : 'Configure New Office'}
                </h6>
                <button type="button" onClick={() => setEditingOffice(null)} className="btn btn-sm btn-link text-muted p-0">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="row g-3" noValidate>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Office Name *</label>
                  <div className="input-group has-validation">
                    <span className="input-group-text bg-white"><Building2 size={16} /></span>
                    <input 
                      required 
                      value={editingOffice.Office_Name || ''} 
                      onChange={e => handleFieldChange('Office_Name', e.target.value)} 
                      className={`form-control ${errors.Office_Name ? 'is-invalid' : ''}`} 
                      placeholder="Enter office name" 
                    />
                    <div className="invalid-feedback">{errors.Office_Name}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Block Area *</label>
                  <div className="input-group has-validation">
                    <span className="input-group-text bg-white"><MapPin size={16} /></span>
                    <input 
                      required 
                      value={editingOffice.Block || ''} 
                      onChange={e => handleFieldChange('Block', e.target.value)} 
                      className={`form-control ${errors.Block ? 'is-invalid' : ''}`} 
                      placeholder="Block/District" 
                    />
                    <div className="invalid-feedback">{errors.Block}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">AC Number *</label>
                  <div className="input-group has-validation">
                    <span className="input-group-text bg-white"><Hash size={16} /></span>
                    <input 
                      type="number" 
                      required 
                      value={editingOffice.AC_No || ''} 
                      onChange={e => handleFieldChange('AC_No', Number(e.target.value))} 
                      className={`form-control ${errors.AC_No ? 'is-invalid' : ''}`} 
                      placeholder="Constituency No." 
                    />
                    <div className="invalid-feedback">{errors.AC_No}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Department Linkage *</label>
                  <select 
                    required 
                    value={editingOffice.Department_ID || ''} 
                    onChange={e => handleFieldChange('Department_ID', Number(e.target.value))} 
                    className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}
                  >
                    <option value="">Select Department...</option>
                    {data.departments.map(d => (
                      <option key={d.Department_ID} value={d.Department_ID}>
                        {d.Department_Name} ({getDeptType(d)})
                      </option>
                    ))}
                  </select>
                  <div className="invalid-feedback">{errors.Department_ID}</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Assign to User (Custodian) *</label>
                  <div className="input-group has-validation">
                    <span className="input-group-text bg-white"><UserCheck size={16} /></span>
                    <select 
                      required 
                      value={editingOffice.User_ID || ''} 
                      onChange={e => handleFieldChange('User_ID', Number(e.target.value))} 
                      className={`form-select ${errors.User_ID ? 'is-invalid' : ''}`}
                    >
                      <option value="">Choose User...</option>
                      {data.users.map(u => <option key={u.User_ID} value={u.User_ID}>{u.User_Name} ({u.User_Type})</option>)}
                    </select>
                    <div className="invalid-feedback">{errors.User_ID}</div>
                  </div>
                </div>
                <div className="col-12 d-flex justify-content-end gap-2 mt-4">
                  <button type="button" onClick={() => setEditingOffice(null)} className="btn btn-light px-4">Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 d-flex align-items-center gap-2 shadow-sm">
                    <Save size={18} /> Save Office
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 border-0">Office Details</th>
                  <th className="border-0">Block & AC</th>
                  <th className="border-0">Department / Type</th>
                  <th className="border-0">Custodian</th>
                  <th className="text-end pe-4 border-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffices.length > 0 ? (
                  filteredOffices.map(office => {
                    const dept = data.departments.find(d => Number(d.Department_ID) === Number(office.Department_ID));
                    const deletable = isDeletable(Number(office.Office_ID));
                    return (
                      <tr key={office.Office_ID}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{office.Office_Name}</div>
                          <div className="small text-muted">ID: <span className="fw-medium">#{office.Office_ID}</span></div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <span className="badge bg-light text-dark fw-normal border">{office.Block}</span>
                            <span className="badge bg-primary-subtle text-primary fw-normal border border-primary-subtle px-2">AC {office.AC_No}</span>
                          </div>
                        </td>
                        <td>
                          <div className="small fw-semibold text-secondary">{dept?.Department_Name || 'Unlinked'}</div>
                          {dept && (
                            <div className="small text-muted italic" style={{ fontSize: '0.7rem' }}>
                              {getDeptType(dept)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center" style={{width: '28px', height: '28px', fontSize: '0.75rem'}}>
                              {(data.users.find(u => Number(u.User_ID) === Number(office.User_ID))?.User_Name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="small fw-medium">
                              {data.users.find(u => Number(u.User_ID) === Number(office.User_ID))?.User_Name || 'None'}
                            </span>
                          </div>
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-flex gap-1 justify-content-end">
                            <button onClick={() => { setEditingOffice(office); setErrors({}); }} className="btn btn-light btn-sm rounded-3 text-primary border shadow-sm" title="Edit">
                              <Edit2 size={16} />
                            </button>
                            {deletable ? (
                              <button onClick={() => handleDelete(office)} className="btn btn-light btn-sm rounded-3 text-danger border shadow-sm" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <button className="btn btn-light btn-sm rounded-3 text-muted border opacity-50" title="Locked: Office has employees" disabled>
                                <Lock size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      No offices found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-white border-top py-3 px-4">
          <span className="small text-muted">Showing <strong>{filteredOffices.length}</strong> offices</span>
        </div>
      </div>
      
      <style>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default OfficeManagement;
