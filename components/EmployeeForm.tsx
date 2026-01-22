
import React, { useState, useEffect } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Save, X, Info, User as UserIcon, Briefcase, Landmark, AlertCircle } from 'lucide-react';

interface EmployeeFormProps {
  employee: Employee | null;
  data: AppData;
  currentUser: User;
  onSave: (emp: Employee) => void;
  onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, data, currentUser, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Employee>>(employee || {
    Gender: 'Male',
    PwD: 'No',
    Service_Type: ServiceType.REGULAR,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableOffices, setAvailableOffices] = useState(data.offices || []);
  const [availableBranches, setAvailableBranches] = useState(data.branches || []);

  const selections = data.userPostSelections || {};
  // Fix: Defensive check to ensure userPostSelections is always an array
  const rawSelections = selections[currentUser.User_ID];
  const userPostSelections = Array.isArray(rawSelections) ? rawSelections : [];
  const posts = data.posts || [];
  
  const availablePosts = currentUser.User_Type === UserType.ADMIN 
    ? posts 
    : posts.filter(p => userPostSelections.includes(p.Post_ID));

  useEffect(() => {
    if (formData.Department_ID && data.offices) {
      setAvailableOffices(data.offices.filter(o => o.Department_ID === Number(formData.Department_ID)));
    } else {
      setAvailableOffices(data.offices || []);
    }
  }, [formData.Department_ID, data.offices]);

  useEffect(() => {
    if (formData.Bank_ID && data.branches) {
      setAvailableBranches(data.branches.filter(b => b.Bank_ID === Number(formData.Bank_ID)));
    } else {
      setAvailableBranches(data.branches || []);
    }
  }, [formData.Bank_ID, data.branches]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
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

    if (!formData.Department_ID) newErrors.Department_ID = "Please select a department";
    if (!formData.Office_ID) newErrors.Office_ID = "Please select an office";
    if (!formData.Post_ID) newErrors.Post_ID = "Please select a post";
    if (!formData.Pay_ID) newErrors.Pay_ID = "Please select a payscale";
    if (!formData.Bank_ID) newErrors.Bank_ID = "Please select a bank";
    if (!formData.Branch_ID) newErrors.Branch_ID = "Please select a branch";
    if (!formData.DOB) newErrors.DOB = "Date of birth is required";
    if (!formData.EPIC?.trim()) newErrors.EPIC = "EPIC number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData as Employee);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue: any = value;
    if (name.includes('ID') || name === 'AC_No') finalValue = Number(value);
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));

    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }

    if (name === 'Branch_ID') {
      const branch = (data.branches || []).find(b => b.Branch_ID === Number(value));
      if (branch) setFormData(prev => ({ ...prev, IFSC_Code: branch.IFSC_Code }));
    }
  };

  return (
    <div className="card shadow border-0 p-4 p-md-5">
      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold h4 mb-1">{employee ? 'Modify Record' : 'Employee Registration'}</h2>
          <p className="text-muted small mb-0">Complete all mandatory fields marked with asterisk (*)</p>
        </div>
        <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
          <X size={16} /> Cancel
        </button>
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
            value={formData.Department_ID || ''} 
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
            value={formData.Office_ID || ''} 
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
            value={formData.Post_ID || ''} 
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
            value={formData.Pay_ID || ''} 
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
            <option value={ServiceType.REGULAR}>{ServiceType.REGULAR}</option>
            <option value={ServiceType.IRREGULAR}>{ServiceType.IRREGULAR}</option>
          </select>
        </div>

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
            value={formData.Bank_ID || ''} 
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
            value={formData.Branch_ID || ''} 
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
