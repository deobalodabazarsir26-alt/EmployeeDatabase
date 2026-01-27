
import React, { useState, useEffect } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Save, X, Info, User as UserIcon, Briefcase, Landmark, AlertCircle, Hash, Activity } from 'lucide-react';

interface EmployeeFormProps {
  employee: Employee | null;
  data: AppData;
  currentUser: User;
  onSave: (emp: Employee) => void;
  onCancel: () => void;
}

const DEACTIVATION_REASONS = ['Transfer', 'Death', 'Resign', 'Debarred'];

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, data, currentUser, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Employee>>(employee || {
    Gender: 'Male',
    PwD: 'No',
    Service_Type: ServiceType.REGULAR,
    Active: 'Yes',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableOffices, setAvailableOffices] = useState(data.offices || []);
  const [availableBranches, setAvailableBranches] = useState(() => {
    // Correctly handle Bank_ID 0 or other numbers
    if (employee && employee.Bank_ID !== undefined && employee.Bank_ID !== null && data.branches) {
      return data.branches.filter(b => Number(b.Bank_ID) === Number(employee.Bank_ID));
    }
    return [];
  });

  const selections = data.userPostSelections || {};
  const rawSelections = selections[currentUser.User_ID];
  const userPostSelections = Array.isArray(rawSelections) ? rawSelections : [];
  const posts = data.posts || [];
  
  const availablePosts = currentUser.User_Type === UserType.ADMIN 
    ? posts 
    : posts.filter(p => userPostSelections.includes(p.Post_ID));

  useEffect(() => {
    if (typeof formData.Department_ID === 'number' && data.offices) {
      setAvailableOffices(data.offices.filter(o => Number(o.Department_ID) === Number(formData.Department_ID)));
    } else {
      setAvailableOffices(data.offices || []);
    }
  }, [formData.Department_ID, data.offices]);

  useEffect(() => {
    // Explicit check for numeric type to support numeric 0 and avoid TS comparison errors
    if (typeof formData.Bank_ID === 'number' && data.branches) {
      const filtered = data.branches.filter(b => Number(b.Bank_ID) === Number(formData.Bank_ID));
      setAvailableBranches(filtered);
    } else {
      setAvailableBranches([]);
    }
  }, [formData.Bank_ID, data.branches]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Employee ID Validation
    const idValue = Number(formData.Employee_ID);
    if (formData.Employee_ID === undefined || formData.Employee_ID === null || (formData.Employee_ID as any) === '') {
      newErrors.Employee_ID = "Employee ID is required";
    } else if (isNaN(idValue) || idValue <= 0) {
      newErrors.Employee_ID = "Employee ID must be a positive number";
    } else {
      // Check for uniqueness
      const isDuplicate = data.employees.some(e => 
        Number(e.Employee_ID) === idValue && 
        (!employee || Number(employee.Employee_ID) !== Number(e.Employee_ID))
      );
      if (isDuplicate) {
        newErrors.Employee_ID = "This Employee ID is already assigned to another record";
      }
    }

    if (!formData.Employee_Name?.trim()) newErrors.Employee_Name = "First name is required";
    if (!formData.Employee_Surname?.trim()) newErrors.Employee_Surname = "Surname is required";
    
    if (!formData.Mobile) {
      newErrors.Mobile = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(formData.Mobile)) {
      newErrors.Mobile = "Enter a valid 10-digit mobile number";
    }

    if (!formData.ACC_No) {
      newErrors.ACC_No = "Account number is required";
    } else if (!/^[0-9]{9,18}$/.test(formData.ACC_No)) {
      newErrors.ACC_No = "Enter a valid account number (9-18 digits)";
    }

    if (formData.Department_ID === undefined || formData.Department_ID === null || (formData.Department_ID as any) === '') newErrors.Department_ID = "Please select a department";
    if (formData.Office_ID === undefined || formData.Office_ID === null || (formData.Office_ID as any) === '') newErrors.Office_ID = "Please select an office";
    if (formData.Post_ID === undefined || formData.Post_ID === null || (formData.Post_ID as any) === '') newErrors.Post_ID = "Please select a post";
    if (formData.Pay_ID === undefined || formData.Pay_ID === null || (formData.Pay_ID as any) === '') newErrors.Pay_ID = "Please select a payscale";
    if (formData.Bank_ID === undefined || formData.Bank_ID === null || (formData.Bank_ID as any) === '') newErrors.Bank_ID = "Please select a bank";
    if (formData.Branch_ID === undefined || formData.Branch_ID === null || (formData.Branch_ID as any) === '') newErrors.Branch_ID = "Please select a branch";
    if (!formData.DOB) newErrors.DOB = "Date of birth is required";
    if (!formData.EPIC?.trim()) newErrors.EPIC = "EPIC number is required";

    // Deactivation Reason Validation
    if (formData.Active === 'No' && !formData.DA_Reason) {
      newErrors.DA_Reason = "Please specify the deactivation reason";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Timestamp logic moved to parent handler in App.tsx
      onSave(formData as Employee);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;
    
    // For ID fields, convert to number if possible, else keep as empty string for the controlled input
    if (name.includes('ID') || name === 'AC_No' || name === 'Employee_ID') {
      finalValue = value === '' ? '' : Number(value);
    }
    
    // Logic for Status Change
    if (name === 'Active' && value === 'Yes') {
      setFormData(prev => ({ ...prev, [name]: finalValue, DA_Reason: '' }));
      return;
    }

    // Logic for Bank Change: Reset Branch and IFSC if bank changes
    if (name === 'Bank_ID') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: finalValue, 
        Branch_ID: '' as any, 
        IFSC_Code: '' 
      }));
      return;
    }

    // Logic for Branch Change: Auto-populate IFSC
    if (name === 'Branch_ID') {
      const branchId = finalValue === '' ? null : Number(finalValue);
      const branch = (data.branches || []).find(b => Number(b.Branch_ID) === branchId);
      setFormData(prev => ({ 
        ...prev, 
        [name]: finalValue, 
        IFSC_Code: branch ? branch.IFSC_Code : '' 
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));

    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  return (
    <div className="card shadow border-0 p-4 p-md-5">
      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold h4 mb-1">{employee ? 'Modify Record' : 'Employee Registration'}</h2>
          <p className="text-muted small mb-0">Complete all mandatory fields marked with asterisk (*)</p>
        </div>
        <div className="d-flex gap-2">
          {employee && (
            <div className="text-end me-3 d-none d-md-block">
              <div className="text-muted" style={{fontSize: '0.65rem'}}>Created: {employee.T_STMP_ADD}</div>
              <div className="text-muted" style={{fontSize: '0.65rem'}}>Last Updated: {employee.T_STMP_UPD}</div>
            </div>
          )}
          <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
            <X size={16} /> Cancel
          </button>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="alert alert-danger border-0 rounded-3 d-flex align-items-center gap-2 mb-4 py-2 small">
          <AlertCircle size={16} />
          <span>Please correct the highlighted errors before saving.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="row g-4 needs-validation" noValidate>
        <div className="col-12 mt-0">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <UserIcon size={18} /> Personal Information
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Employee ID *</label>
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0 text-muted"><Hash size={14} /></span>
            <input 
              type="number"
              required 
              name="Employee_ID" 
              value={formData.Employee_ID ?? ''} 
              onChange={handleChange} 
              readOnly={!!employee}
              className={`form-control border-start-0 ps-0 ${employee ? 'bg-light text-muted fw-bold' : 'bg-light'} ${errors.Employee_ID ? 'is-invalid' : ''}`} 
              placeholder="e.g. 1001" 
            />
          </div>
          {employee && <div className="text-muted mt-1" style={{fontSize: '0.65rem'}}>Registration ID cannot be modified</div>}
          <div className="text-danger small mt-1" style={{fontSize: '0.7rem'}}>{errors.Employee_ID}</div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">First Name *</label>
          <input 
            required 
            name="Employee_Name" 
            value={formData.Employee_Name || ''} 
            onChange={handleChange} 
            className={`form-control ${errors.Employee_Name ? 'is-invalid' : ''}`} 
            placeholder="e.g. Rahul" 
          />
          <div className="invalid-feedback">{errors.Employee_Name}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Surname *</label>
          <input 
            required 
            name="Employee_Surname" 
            value={formData.Employee_Surname || ''} 
            onChange={handleChange} 
            className={`form-control ${errors.Employee_Surname ? 'is-invalid' : ''}`} 
            placeholder="e.g. Sharma" 
          />
          <div className="invalid-feedback">{errors.Employee_Surname}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Gender</label>
          <select name="Gender" value={formData.Gender} onChange={handleChange} className="form-select">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">DOB *</label>
          <input 
            type="date" 
            name="DOB" 
            value={formData.DOB || ''} 
            onChange={handleChange} 
            className={`form-control ${errors.DOB ? 'is-invalid' : ''}`} 
          />
          <div className="invalid-feedback">{errors.DOB}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Mobile *</label>
          <input 
            name="Mobile" 
            value={formData.Mobile || ''} 
            onChange={handleChange} 
            className={`form-control ${errors.Mobile ? 'is-invalid' : ''}`} 
            placeholder="10 digit number" 
            maxLength={10}
          />
          <div className="invalid-feedback">{errors.Mobile}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">EPIC No. *</label>
          <input 
            name="EPIC" 
            value={formData.EPIC || ''} 
            onChange={handleChange} 
            className={`form-control ${errors.EPIC ? 'is-invalid' : ''}`} 
            placeholder="Voter ID" 
          />
          <div className="invalid-feedback">{errors.EPIC}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">PwD (Disability)</label>
          <select name="PwD" value={formData.PwD} onChange={handleChange} className="form-select">
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Briefcase size={18} /> Employment Details
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Department *</label>
          <select 
            required 
            name="Department_ID" 
            value={formData.Department_ID ?? ''} 
            onChange={handleChange} 
            className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}
          >
            <option value="">Choose Dept</option>
            {(data.departments || []).map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
          </select>
          <div className="invalid-feedback">{errors.Department_ID}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Office *</label>
          <select 
            required 
            name="Office_ID" 
            value={formData.Office_ID ?? ''} 
            onChange={handleChange} 
            className={`form-select ${errors.Office_ID ? 'is-invalid' : ''}`}
          >
            <option value="">Choose Office</option>
            {availableOffices.map(o => <option key={o.Office_ID} value={o.Office_ID}>{o.Office_Name}</option>)}
          </select>
          <div className="invalid-feedback">{errors.Office_ID}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Post *</label>
          <select 
            required 
            name="Post_ID" 
            value={formData.Post_ID ?? ''} 
            onChange={handleChange} 
            className={`form-select ${errors.Post_ID ? 'is-invalid' : ''}`}
          >
            <option value="">Choose Post</option>
            {availablePosts.map(p => <option key={p.Post_ID} value={p.Post_ID}>{p.Post_Name}</option>)}
          </select>
          <div className="invalid-feedback">{errors.Post_ID}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Payscale *</label>
          <select 
            required 
            name="Pay_ID" 
            value={formData.Pay_ID ?? ''} 
            onChange={handleChange} 
            className={`form-select ${errors.Pay_ID ? 'is-invalid' : ''}`}
          >
            <option value="">Choose Payscale</option>
            {(data.payscales || []).map(p => <option key={p.Pay_ID} value={p.Pay_ID}>{p.Pay_Name}</option>)}
          </select>
          <div className="invalid-feedback">{errors.Pay_ID}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Service Type</label>
          <select name="Service_Type" value={formData.Service_Type} onChange={handleChange} className="form-select">
            {Object.values(ServiceType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Activity size={18} /> Record Status & Lifecycle
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Record Status *</label>
          <select 
            name="Active" 
            value={formData.Active} 
            onChange={handleChange} 
            className="form-select"
          >
            <option value="Yes">Active (Enabled)</option>
            <option value="No">Inactive (Disabled)</option>
          </select>
          <div className="form-text small">Mark "Inactive" to remove from active operations.</div>
        </div>

        {formData.Active === 'No' && (
          <div className="col-md-8">
            <label className="form-label small fw-bold">Reason for Deactivation *</label>
            <select 
              name="DA_Reason" 
              value={formData.DA_Reason || ''} 
              onChange={handleChange} 
              className={`form-select ${errors.DA_Reason ? 'is-invalid' : ''}`}
            >
              <option value="">-- Select Reason --</option>
              {DEACTIVATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="invalid-feedback">{errors.DA_Reason}</div>
          </div>
        )}

        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Landmark size={18} /> Payment & Banking
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Bank Name *</label>
          <select 
            required
            name="Bank_ID" 
            value={formData.Bank_ID ?? ''} 
            onChange={handleChange} 
            className={`form-select ${errors.Bank_ID ? 'is-invalid' : ''}`}
          >
            <option value="">Select Bank</option>
            {(data.banks || []).map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
          </select>
          <div className="invalid-feedback">{errors.Bank_ID}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Branch *</label>
          <select 
            required
            name="Branch_ID" 
            value={formData.Branch_ID ?? ''} 
            onChange={handleChange} 
            className={`form-select ${errors.Branch_ID ? 'is-invalid' : ''}`}
          >
            <option value="">Select Branch</option>
            {availableBranches.map(b => <option key={b.Branch_ID} value={b.Branch_ID}>{b.Branch_Name}</option>)}
          </select>
          <div className="invalid-feedback">{errors.Branch_ID}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">Account Number *</label>
          <input 
            required
            name="ACC_No" 
            value={formData.ACC_No || ''} 
            onChange={handleChange} 
            className={`form-control ${errors.ACC_No ? 'is-invalid' : ''}`} 
            placeholder="Account No."
          />
          <div className="invalid-feedback">{errors.ACC_No}</div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold">IFSC (Auto)</label>
          <input readOnly name="IFSC_Code" value={formData.IFSC_Code || ''} className="form-control bg-light" />
        </div>

        <div className="col-12 text-end mt-5">
          <button type="button" onClick={onCancel} className="btn btn-light px-4 me-2">Cancel</button>
          <button type="submit" className="btn btn-primary px-5 d-inline-flex align-items-center gap-2">
            <Save size={18} /> Commit Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
