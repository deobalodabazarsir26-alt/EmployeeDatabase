
import React, { useState, useEffect, useRef } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Save, X, Info, User as UserIcon, Briefcase, Landmark, AlertCircle, Hash, Activity, Search, Loader2, Power, FileText, Upload, ExternalLink, Camera, Scissors, Smartphone, CreditCard } from 'lucide-react';
import { ifscService } from '../services/ifscService';

interface EmployeeFormProps {
  employee: Employee | null;
  data: AppData;
  currentUser: User;
  onSave: (emp: Employee) => void;
  onCancel: () => void;
}

const DEACTIVATION_REASONS = ['Transfer', 'Death', 'Resign', 'Debarred'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, data, currentUser, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Employee>>(employee || {
    Gender: 'Male',
    PwD: 'No',
    Service_Type: ServiceType.REGULAR,
    Active: 'Yes',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVerifyingIfsc, setIsVerifyingIfsc] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // File states
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [croppedPhotoBase64, setCroppedPhotoBase64] = useState<string | null>(null);
  
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [availableOffices, setAvailableOffices] = useState(data.offices || []);
  const [availableBranches, setAvailableBranches] = useState(() => {
    if (formData.Bank_ID && data.branches) {
      return data.branches.filter(b => Math.floor(Number(b.Bank_ID)) === Math.floor(Number(formData.Bank_ID)));
    }
    return [];
  });

  const posts = data.posts || [];
  const selections = data.userPostSelections?.[Math.floor(Number(currentUser.User_ID))] || [];
  const availablePosts = currentUser.User_Type === UserType.ADMIN 
    ? posts 
    : posts.filter(p => selections.includes(Math.floor(Number(p.Post_ID))));

  useEffect(() => {
    if (formData.Department_ID !== undefined && data.offices) {
      setAvailableOffices(data.offices.filter(o => Math.floor(Number(o.Department_ID)) === Math.floor(Number(formData.Department_ID))));
    } else {
      setAvailableOffices([]);
    }
  }, [formData.Department_ID, data.offices]);

  useEffect(() => {
    if (formData.Bank_ID !== undefined && data.branches) {
      setAvailableBranches(data.branches.filter(b => Math.floor(Number(b.Bank_ID)) === Math.floor(Number(formData.Bank_ID))));
    } else {
      setAvailableBranches([]);
    }
  }, [formData.Bank_ID, data.branches]);

  const autoCropImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const targetWidth = 300;
        const targetHeight = 400;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const imgAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;

        let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
        if (imgAspect > targetAspect) {
          sourceWidth = img.height * targetAspect;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          sourceHeight = img.width / targetAspect;
          sourceY = (img.height - sourceHeight) / 2;
        }

        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        setCroppedPhotoBase64(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.Employee_ID) newErrors.Employee_ID = "Required";
    if (!formData.Employee_Name?.trim()) newErrors.Employee_Name = "Required";
    if (!formData.Employee_Surname?.trim()) newErrors.Employee_Surname = "Required";
    if (!formData.DOB) newErrors.DOB = "Required";
    if (!formData.Gender) newErrors.Gender = "Required";
    if (!formData.Mobile || !/^[0-9]{10}$/.test(formData.Mobile)) newErrors.Mobile = "10 digit mobile required";
    if (!formData.EPIC?.trim()) newErrors.EPIC = "Required";
    
    if (!formData.Department_ID) newErrors.Department_ID = "Required";
    if (!formData.Office_ID) newErrors.Office_ID = "Required";
    if (!formData.Post_ID) newErrors.Post_ID = "Required";
    if (!formData.Pay_ID) newErrors.Pay_ID = "Required";

    if (!formData.ACC_No) newErrors.ACC_No = "Required";
    if (!formData.Bank_ID) newErrors.Bank_ID = "Required";
    if (!formData.Branch_ID) newErrors.Branch_ID = "Required";

    if (formData.Active === 'No') {
      if (!formData.DA_Reason) newErrors.DA_Reason = "Required for inactive";
      if (!selectedDoc && !formData.Deactivation_Doc_URL) newErrors.Doc = "Justification doc required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleIfscVerify = async () => {
    const ifsc = formData.IFSC_Code?.trim();
    if (!ifsc || ifsc.length !== 11) return alert('Enter valid 11-digit IFSC');
    setIsVerifyingIfsc(true);
    const details = await ifscService.fetchDetails(ifsc);
    setIsVerifyingIfsc(false);
    if (details) {
      alert(`Bank: ${details.BANK}\nBranch: ${details.BRANCH}\n\nMatching records found.`);
    } else {
      alert('IFSC not found on web.');
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsUploading(true);
      let payload = { ...formData };
      try {
        if (selectedPhoto && croppedPhotoBase64) {
          (payload as any).photoData = {
            base64: croppedPhotoBase64,
            name: `photo_${formData.Employee_ID}.jpg`,
            mimeType: 'image/jpeg'
          };
        }
        if (selectedDoc) {
          const base64 = await toBase64(selectedDoc);
          (payload as any).fileData = {
            base64: base64,
            name: selectedDoc.name,
            mimeType: selectedDoc.type
          };
        }
        onSave(payload as Employee);
      } catch (err) {
        alert('Upload Error');
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert("Size limit 2MB exceeded.");
        e.target.value = '';
        return;
      }
      if (type === 'photo') {
        setSelectedPhoto(file);
        autoCropImage(file);
      } else {
        setSelectedDoc(file);
      }
    }
  };

  return (
    <div className="card shadow border-0 p-4 p-md-5">
      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold h4 mb-1">{employee ? 'Modify Record' : 'Employee Registration'}</h2>
          <p className="text-muted small mb-0">Complete all mandatory fields (*)</p>
        </div>
        <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-3"><X size={16} /> Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="row g-4">
        {/* PHOTO SECTION */}
        <div className="col-12 text-center mb-4">
          <div className="position-relative d-inline-block">
            <div 
              className="rounded-3 border border-3 border-primary-subtle overflow-hidden bg-light shadow-sm"
              style={{ width: '150px', height: '200px', cursor: 'pointer' }}
              onClick={() => photoInputRef.current?.click()}
            >
              {croppedPhotoBase64 ? (
                <img src={`data:image/jpeg;base64,${croppedPhotoBase64}`} className="w-100 h-100 object-fit-cover" alt="Preview" />
              ) : formData.Employee_Photo_URL ? (
                <img src={formData.Employee_Photo_URL} className="w-100 h-100 object-fit-cover" alt="Existing" />
              ) : (
                <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                  <Camera size={40} className="mb-2 opacity-50" />
                  <span className="tiny fw-bold">UPLOAD PHOTO</span>
                </div>
              )}
            </div>
            <button 
              type="button"
              className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 shadow"
              style={{ width: '40px', height: '40px', transform: 'translate(30%, 30%)' }}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload size={18} />
            </button>
            <input type="file" ref={photoInputRef} className="d-none" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
            <canvas ref={canvasRef} className="d-none" />
          </div>
          {selectedPhoto && <div className="mt-3 tiny text-success fw-bold d-flex align-items-center justify-content-center gap-1"><Scissors size={14} /> Center-crop active (ID Scale)</div>}
        </div>

        {/* SECTION 1: IDENTITY */}
        <div className="col-12 mt-0">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Hash size={18} /> Identification & Security
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Employee ID *</label>
          <input name="Employee_ID" value={formData.Employee_ID ?? ''} onChange={e => setFormData({...formData, Employee_ID: Number(e.target.value)})} readOnly={!!employee} className={`form-control bg-light ${errors.Employee_ID ? 'is-invalid' : ''}`} placeholder="Unique Record ID" />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">EPIC Number *</label>
          <input value={formData.EPIC || ''} onChange={e => setFormData({...formData, EPIC: e.target.value.toUpperCase()})} className={`form-control ${errors.EPIC ? 'is-invalid' : ''}`} placeholder="Voter Card ID" />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">PwD Status *</label>
          <select value={formData.PwD || 'No'} onChange={e => setFormData({...formData, PwD: e.target.value as 'Yes' | 'No'})} className="form-select">
            <option value="No">No (General)</option>
            <option value="Yes">Yes (Disabled)</option>
          </select>
        </div>

        {/* SECTION 2: PERSONAL */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <UserIcon size={18} /> Personal Details
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">First Name *</label>
          <input value={formData.Employee_Name || ''} onChange={e => setFormData({...formData, Employee_Name: e.target.value})} className={`form-control ${errors.Employee_Name ? 'is-invalid' : ''}`} />
        </div>
        
        <div className="col-md-4">
          <label className="form-label small fw-bold">Surname *</label>
          <input value={formData.Employee_Surname || ''} onChange={e => setFormData({...formData, Employee_Surname: e.target.value})} className={`form-control ${errors.Employee_Surname ? 'is-invalid' : ''}`} />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Gender *</label>
          <select value={formData.Gender || 'Male'} onChange={e => setFormData({...formData, Gender: e.target.value})} className="form-select">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Date of Birth *</label>
          <input type="date" value={formData.DOB || ''} onChange={e => setFormData({...formData, DOB: e.target.value})} className={`form-control ${errors.DOB ? 'is-invalid' : ''}`} />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Mobile *</label>
          <div className="input-group">
            <span className="input-group-text bg-light"><Smartphone size={14}/></span>
            <input maxLength={10} value={formData.Mobile || ''} onChange={e => setFormData({...formData, Mobile: e.target.value})} className={`form-control ${errors.Mobile ? 'is-invalid' : ''}`} placeholder="10 digits" />
          </div>
        </div>

        {/* SECTION 3: PROFESSIONAL */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Briefcase size={18} /> Employment & Designation
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Department *</label>
          <select value={formData.Department_ID ?? ''} onChange={e => setFormData({...formData, Department_ID: Number(e.target.value)})} className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}>
            <option value="">Choose Dept</option>
            {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Office *</label>
          <select value={formData.Office_ID ?? ''} onChange={e => setFormData({...formData, Office_ID: Number(e.target.value)})} className={`form-select ${errors.Office_ID ? 'is-invalid' : ''}`}>
            <option value="">Choose Office</option>
            {availableOffices.map(o => <option key={o.Office_ID} value={o.Office_ID}>{o.Office_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Service Type *</label>
          <select value={formData.Service_Type || ''} onChange={e => setFormData({...formData, Service_Type: e.target.value as ServiceType})} className="form-select">
            {Object.values(ServiceType).map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Designation (Post) *</label>
          <select value={formData.Post_ID ?? ''} onChange={e => setFormData({...formData, Post_ID: Number(e.target.value)})} className={`form-select ${errors.Post_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Post</option>
            {availablePosts.map(p => <option key={p.Post_ID} value={p.Post_ID}>{p.Post_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Pay Scale (Level) *</label>
          <select value={formData.Pay_ID ?? ''} onChange={e => setFormData({...formData, Pay_ID: Number(e.target.value)})} className={`form-select ${errors.Pay_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Level</option>
            {data.payscales.map(p => <option key={p.Pay_ID} value={p.Pay_ID}>{p.Pay_Name}</option>)}
          </select>
        </div>

        {/* SECTION 4: BANKING */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Landmark size={18} /> Banking & Payments
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Bank Name *</label>
          <select value={formData.Bank_ID ?? ''} onChange={e => setFormData({...formData, Bank_ID: Number(e.target.value), Branch_ID: undefined})} className={`form-select ${errors.Bank_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Bank</option>
            {data.banks.map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Branch *</label>
          <select value={formData.Branch_ID ?? ''} onChange={e => {
            const bId = Number(e.target.value);
            const branch = availableBranches.find(b => Number(b.Branch_ID) === bId);
            setFormData({...formData, Branch_ID: bId, IFSC_Code: branch?.IFSC_Code || ''});
          }} className={`form-select ${errors.Branch_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Branch</option>
            {availableBranches.map(b => <option key={b.Branch_ID} value={b.Branch_ID}>{b.Branch_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">IFSC Code (Verify)</label>
          <div className="input-group">
            <input value={formData.IFSC_Code || ''} onChange={e => setFormData({...formData, IFSC_Code: e.target.value.toUpperCase()})} className="form-control" />
            <button type="button" onClick={handleIfscVerify} className="btn btn-outline-primary" disabled={isVerifyingIfsc}>
              {isVerifyingIfsc ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-bold">Account Number *</label>
          <div className="input-group">
            <span className="input-group-text bg-light"><CreditCard size={14}/></span>
            <input value={formData.ACC_No || ''} onChange={e => setFormData({...formData, ACC_No: e.target.value})} className={`form-control ${errors.ACC_No ? 'is-invalid' : ''}`} placeholder="Bank Account Number" />
          </div>
        </div>

        {/* SECTION 5: LIFECYCLE */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Power size={18} /> Account Status
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Current Status *</label>
          <select value={formData.Active || 'Yes'} onChange={e => setFormData({...formData, Active: e.target.value as 'Yes' | 'No'})} className="form-select">
            <option value="Yes">Active</option>
            <option value="No">Inactive</option>
          </select>
        </div>

        {formData.Active === 'No' && (
          <>
            <div className="col-md-4">
              <label className="form-label small fw-bold">Inactivation Reason *</label>
              <select value={formData.DA_Reason || ''} onChange={e => setFormData({...formData, DA_Reason: e.target.value})} className={`form-select ${errors.DA_Reason ? 'is-invalid' : ''}`}>
                <option value="">Select Reason...</option>
                {DEACTIVATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold d-flex justify-content-between">
                Justification Doc * <span className="tiny text-muted fw-normal">Max 2MB</span>
              </label>
              <div className="input-group">
                <input type="file" ref={docInputRef} className={`form-control ${errors.Doc ? 'is-invalid' : ''}`} onChange={(e) => handleFileChange(e, 'doc')} accept=".pdf,image/*" />
                {formData.Deactivation_Doc_URL && <a href={formData.Deactivation_Doc_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline-info"><ExternalLink size={16}/></a>}
              </div>
              {selectedDoc && <div className="tiny text-success mt-1 fw-bold">File staged for upload: {selectedDoc.name}</div>}
            </div>
          </>
        )}

        {/* SUBMIT BUTTONS */}
        <div className="col-12 text-end mt-5 pt-4 border-top">
          <button type="button" onClick={onCancel} className="btn btn-light px-4 me-2">Discard Changes</button>
          <button type="submit" className="btn btn-primary px-5 shadow-sm d-inline-flex align-items-center gap-2" disabled={isUploading}>
            {isUploading ? (
              <><Loader2 size={18} className="animate-spin" /> Transmitting to Cloud...</>
            ) : (
              <><Save size={18} /> {employee ? 'Update Employee Record' : 'Create New Record'}</>
            )}
          </button>
        </div>
      </form>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tiny { font-size: 0.65rem; }
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </div>
  );
};

export default EmployeeForm;
