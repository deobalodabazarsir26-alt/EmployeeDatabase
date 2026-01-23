
import React, { useState } from 'react';
import { Office, AppData } from '../types';
import { Plus, Edit2, Building2, MapPin, Hash, UserCheck, X, Save } from 'lucide-react';

interface OfficeManagementProps {
  data: AppData;
  onSaveOffice: (office: Office) => void;
}

const OfficeManagement: React.FC<OfficeManagementProps> = ({ data, onSaveOffice }) => {
  const [editingOffice, setEditingOffice] = useState<Partial<Office> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  return (
    <div className="container-fluid px-0">
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary">
              <Building2 size={24} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold">Office Directory</h5>
              <p className="text-muted small mb-0">Manage organizational units and assignments</p>
            </div>
          </div>
          <button 
            onClick={() => { setEditingOffice({}); setErrors({}); }}
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <Plus size={18} />
            Add New Office
          </button>
        </div>

        <div className="card-body p-0">
          {editingOffice && (
            <div className="bg-light p-4 border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold mb-0">{editingOffice.Office_ID ? 'Edit Office Details' : 'Configure New Office'}</h6>
                <button type="button" onClick={() => setEditingOffice(null)} className="btn btn-sm btn-link text-muted p-0">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSave} className="row g-3" noValidate>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Office Name</label>
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
                  <label className="form-label small fw-bold">Block Area</label>
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
                  <label className="form-label small fw-bold">AC Number</label>
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
                  <label className="form-label small fw-bold">Department Linkage</label>
                  <select 
                    required 
                    value={editingOffice.Department_ID || ''} 
                    onChange={e => handleFieldChange('Department_ID', Number(e.target.value))} 
                    className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}
                  >
                    <option value="">Select Department...</option>
                    {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
                  </select>
                  <div className="invalid-feedback">{errors.Department_ID}</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Assign to User</label>
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
                  <button type="submit" className="btn btn-primary px-4 d-flex align-items-center gap-2">
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
                  <th className="border-0">Department</th>
                  <th className="border-0">Custodian</th>
                  <th className="text-end pe-4 border-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.offices.map(office => (
                  <tr key={office.Office_ID}>
                    <td className="ps-4">
                      <div className="fw-bold">{office.Office_Name}</div>
                      <div className="small text-muted">ID: #{office.Office_ID}</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <span className="badge bg-light text-dark fw-normal border">{office.Block}</span>
                        <span className="badge bg-primary-subtle text-primary fw-normal border border-primary-subtle">AC {office.AC_No}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-secondary small">
                        {data.departments.find(d => d.Department_ID === office.Department_ID)?.Department_Name || 'Unlinked'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center" style={{width: '24px', height: '24px', fontSize: '0.7rem'}}>
                          {(data.users.find(u => u.User_ID === office.User_ID)?.User_Name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="small">
                          {data.users.find(u => u.User_ID === office.User_ID)?.User_Name || 'None'}
                        </span>
                      </div>
                    </td>
                    <td className="text-end pe-4">
                      <button onClick={() => { setEditingOffice(office); setErrors({}); }} className="btn btn-light btn-sm rounded-pill text-primary me-1" title="Edit">
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeManagement;
