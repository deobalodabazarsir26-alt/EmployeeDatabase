
import React, { useState } from 'react';
import { Department, AppData } from '../types';
import { Layers, Plus, Save, Trash2, Edit2, X, Lock, Tag } from 'lucide-react';

interface DepartmentManagementProps {
  data: AppData;
  onSaveDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: number) => void;
}

const DEPT_TYPES = ['State Govt', 'Central Govt', 'Autonomous', 'Local Body', 'Statutory'];

const DepartmentManagement: React.FC<DepartmentManagementProps> = ({ data, onSaveDepartment, onDeleteDepartment }) => {
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);

  // Helper to get department type regardless of GSheet header naming (Dept_Type vs Department_Type)
  const getDeptType = (dept: any): string => {
    if (!dept) return '';
    return (dept.Department_Type || dept.Dept_Type || dept.department_type || '').trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept?.Department_Name?.trim()) {
      // Ensure we save using the standard key 'Department_Type' for the database
      const finalDept = {
        ...editingDept,
        Department_Type: getDeptType(editingDept)
      };
      onSaveDepartment(finalDept as Department);
      setEditingDept(null);
    }
  };

  const isDeletable = (deptId: number) => {
    const hasOffices = data.offices.some(o => Number(o.Department_ID) === deptId);
    const hasEmployees = data.employees.some(e => Number(e.Department_ID) === deptId);
    return !hasOffices && !hasEmployees;
  };

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-info-subtle p-2 rounded-3 text-info shadow-sm">
            <Layers size={24} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold">Department Master</h5>
            <p className="text-muted small mb-0">Manage organizational departments and categories</p>
          </div>
        </div>
        {!editingDept && (
          <button onClick={() => setEditingDept({})} className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
            <Plus size={18} /> Add Department
          </button>
        )}
      </div>

      <div className="card-body p-0">
        {editingDept && (
          <div className="bg-light p-4 border-bottom">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">{editingDept.Department_ID ? 'Edit Department' : 'New Department'}</h6>
              <button type="button" onClick={() => setEditingDept(null)} className="btn btn-sm btn-link text-muted p-0"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold">Department Name *</label>
                <input 
                  required 
                  className="form-control"
                  placeholder="e.g. Information Technology"
                  value={editingDept.Department_Name || ''}
                  onChange={e => setEditingDept({...editingDept, Department_Name: e.target.value})}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Department Type</label>
                <div className="input-group">
                  <span className="input-group-text bg-white"><Tag size={16} /></span>
                  <select 
                    className="form-select"
                    value={getDeptType(editingDept)}
                    onChange={e => setEditingDept({...editingDept, Department_Type: e.target.value})}
                  >
                    <option value="">-- Choose Type --</option>
                    {DEPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button type="submit" className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 shadow-sm">
                  <Save size={18} /> Save
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">ID</th>
                <th>Department Name</th>
                <th>Type</th>
                <th>Units</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.departments.map(dept => {
                const linkedOffices = data.offices.filter(o => Number(o.Department_ID) === Number(dept.Department_ID)).length;
                const deletable = isDeletable(Number(dept.Department_ID));
                const dType = getDeptType(dept);

                return (
                  <tr key={dept.Department_ID}>
                    <td className="ps-4 fw-bold text-muted">#{dept.Department_ID}</td>
                    <td className="fw-semibold">{dept.Department_Name}</td>
                    <td>
                      {dType ? (
                        <span className="badge bg-info-subtle text-info border border-info-subtle px-3 py-1">
                          {dType}
                        </span>
                      ) : (
                        <span className="text-muted italic small">Uncategorized</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${linkedOffices > 0 ? 'bg-primary-subtle text-primary' : 'bg-light text-muted border'}`}>
                        {linkedOffices} Offices
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex gap-2 justify-content-end">
                        <button onClick={() => setEditingDept(dept)} className="btn btn-light btn-sm rounded-3 border text-primary"><Edit2 size={16} /></button>
                        {deletable ? (
                          <button onClick={() => onDeleteDepartment(Number(dept.Department_ID))} className="btn btn-light btn-sm rounded-3 border text-danger"><Trash2 size={16} /></button>
                        ) : (
                          <button className="btn btn-light btn-sm rounded-3 border text-muted opacity-50" title="Locked: Linked records found" disabled><Lock size={16} /></button>
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

export default DepartmentManagement;
