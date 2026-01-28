
import React, { useState, useEffect, useRef } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Save, X, Info, User as UserIcon, Briefcase, Landmark, AlertCircle, Hash, Activity, Search, Loader2, Power, FileText, Upload, ExternalLink, Camera, Scissors, Smartphone, CreditCard, Crop, Check } from 'lucide-react';
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
  const [rawPhoto, setRawPhoto] = useState<string | null>(null);
  const [croppedPhotoBase64, setCroppedPhotoBase64] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  
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

  const processAndCrop = (imageSrc: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ID Card Standard Aspect Ratio (3:4)
      const targetWidth = 450;
      const targetHeight = 600;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const imgAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;

      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

      if (imgAspect > targetAspect) {
        // Source is wider, crop sides
        sWidth = img.height * targetAspect;
        sx = (img.width - sWidth) / 2;
      } else {
        // Source is taller, crop top/bottom
        sHeight = img.width / targetAspect;
        sy = (img.height - sHeight) / 2;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      
      setCroppedPhotoBase64(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
      setShowCropper(true);
    };
    img.src = imageSrc;
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
      alert(`Verified on Web:\nBank: ${details.BANK}\nBranch: ${details.BRANCH}\n\nData is valid.`);
    } else {
      alert('IFSC not found on official database.');
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
        if (croppedPhotoBase64) {
          (payload as any).photoData = {
            base64: croppedPhotoBase64,
            name: `emp_photo_${formData.Employee_ID}.jpg`,
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
        alert('Transmission error. Please try again.');
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert("Security Alert: File size exceeds the 2MB corporate limit.");
        e.target.value = '';
        return;
      }
      if (type === 'photo') {
        const reader = new FileReader();
        reader.onload = (re) => {
          setRawPhoto(re.target?.result as string);
          processAndCrop(re.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setSelectedDoc(file);
      }
    }
  };

  return (
    <div className="card shadow-lg border-0 p-4 p-md-5 animate-in">
      {/* CROPPER OVERLAY */}
      {showCropper && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
          <div className="bg-white p-4 rounded-4 shadow-lg text-center" style={{ maxWidth: '400px' }}>
            <h5 className="fw-bold mb-3 d-flex align-items-center justify-content-center gap-2">
              <Crop className="text-primary" /> Cropping Facility
            </h5>
            <p className="small text-muted mb-4">The system has automatically detected the best 3:4 portrait crop for this employee photo.</p>
            <div className="mb-4 border rounded-3 overflow-hidden shadow-sm mx-auto" style={{ width: '225px', height: '300px' }}>
              <img src={`data:image/jpeg;base64,${croppedPhotoBase64}`} className="w-100 h-100 object-fit-cover" alt="Cropped Preview" />
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light w-100 rounded-pill" onClick={() => { setShowCropper(false); setCroppedPhotoBase64(null); setRawPhoto(null); if(photoInputRef.current) photoInputRef.current.value=''; }}>Cancel</button>
              <button type="button" className="btn btn-primary w-100 rounded-pill shadow" onClick={() => setShowCropper(false)}>Confirm Crop</button>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold h4 mb-1">{employee ? 'Modify Record' : 'Employee Registration'}</h2>
          <p className="text-muted small mb-0 text-uppercase tracking-wider fw-bold">Enterprise Resource Planning • Cloud Sync Active</p>
        </div>
        <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-4">Discard</button>
      </div>

      <form onSubmit={handleSubmit} className="row g-4">
        {/* PHOTO SECTION */}
        <div className="col-12 text-center mb-5">
          <div className="position-relative d-inline-block">
            <div 
              className={`rounded-4 border border-3 overflow-hidden bg-light shadow transition-all ${croppedPhotoBase64 ? 'border-success' : 'border-primary-subtle'}`}
              style={{ width: '150px', height: '200px', cursor: 'pointer' }}
              onClick={() => photoInputRef.current?.click()}
            >
              {croppedPhotoBase64 ? (
                <img src={`data:image/jpeg;base64,${croppedPhotoBase64}`} className="w-100 h-100 object-fit-cover" alt="Preview" />
              ) : formData.Employee_Photo_URL ? (
                <img src={formData.Employee_Photo_URL} className="w-100 h-100 object-fit-cover" alt="Existing" />
              ) : (
                <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted p-3">
                  <Camera size={40} className="mb-2 opacity-25" />
                  <span className="tiny fw-bold text-uppercase">Portrait Upload</span>
                </div>
              )}
            </div>
            <button 
              type="button"
              className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 shadow-lg border-2 border-white"
              style={{ width: '44px', height: '44px', transform: 'translate(35%, 35%)' }}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload size={20} />
            </button>
            <input type="file" ref={photoInputRef} className="d-none" accept="image/jpeg,image/png" onChange={(e) => handleFileChange(e, 'photo')} />
            <canvas ref={canvasRef} className="d-none" />
          </div>
          {croppedPhotoBase64 && (
            <div className="mt-4 animate-in">
              <span className="badge bg-success-subtle text-success rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2">
                <Check size={14} /> ID Photo Ready (3:4 Ratio)
              </span>
              <button type="button" className="btn btn-link btn-sm tiny text-primary fw-bold d-block mx-auto mt-1" onClick={() => photoInputRef.current?.click()}>Change Image</button>
            </div>
          )}
        </div>

        {/* SECTION 1: IDENTITY */}
        <div className="col-12 mt-2">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Hash size={18} /> Official Identity
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Employee ID *</label>
          <input name="Employee_ID" value={formData.Employee_ID ?? ''} onChange={e => setFormData({...formData, Employee_ID: Number(e.target.value)})} readOnly={!!employee} className={`form-control ${errors.Employee_ID ? 'is-invalid' : ''}`} placeholder="Record ID" />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">EPIC (Voter ID) *</label>
          <input value={formData.EPIC || ''} onChange={e => setFormData({...formData, EPIC: e.target.value.toUpperCase()})} className={`form-control ${errors.EPIC ? 'is-invalid' : ''}`} placeholder="ABC1234567" />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">PwD Category *</label>
          <select value={formData.PwD || 'No'} onChange={e => setFormData({...formData, PwD: e.target.value as 'Yes' | 'No'})} className="form-select">
            <option value="No">No</option>
            <option value="Yes">Yes (Disabled)</option>
          </select>
        </div>

        {/* SECTION 2: PERSONAL */}
        <div className="col-12 mt-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <UserIcon size={18} /> Personal Attributes
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">First Name *</label>
          <input value={formData.Employee_Name || ''} onChange={e => setFormData({...formData, Employee_Name: e.target.value})} className={`form-control ${errors.Employee_Name ? 'is-invalid' : ''}`} />
        </div>
        
        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Surname *</label>
          <input value={formData.Employee_Surname || ''} onChange={e => setFormData({...formData, Employee_Surname: e.target.value})} className={`form-control ${errors.Employee_Surname ? 'is-invalid' : ''}`} />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Gender *</label>
          <select value={formData.Gender || 'Male'} onChange={e => setFormData({...formData, Gender: e.target.value})} className="form-select">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Date of Birth *</label>
          <input type="date" value={formData.DOB || ''} onChange={e => setFormData({...formData, DOB: e.target.value})} className={`form-control ${errors.DOB ? 'is-invalid' : ''}`} />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Mobile Number *</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted"><Smartphone size={14}/></span>
            <input maxLength={10} value={formData.Mobile || ''} onChange={e => setFormData({...formData, Mobile: e.target.value})} className={`form-control ${errors.Mobile ? 'is-invalid' : ''}`} placeholder="9876543210" />
          </div>
        </div>

        {/* SECTION 3: PROFESSIONAL */}
        <div className="col-12 mt-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Briefcase size={18} /> Professional Placement
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Department *</label>
          <select value={formData.Department_ID ?? ''} onChange={e => setFormData({...formData, Department_ID: Number(e.target.value)})} className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose --</option>
            {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Office *</label>
          <select value={formData.Office_ID ?? ''} onChange={e => setFormData({...formData, Office_ID: Number(e.target.value)})} className={`form-select ${errors.Office_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose --</option>
            {availableOffices.map(o => <option key={o.Office_ID} value={o.Office_ID}>{o.Office_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Post (Designation) *</label>
          <select value={formData.Post_ID ?? ''} onChange={e => setFormData({...formData, Post_ID: Number(e.target.value)})} className={`form-select ${errors.Post_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose --</option>
            {availablePosts.map(p => <option key={p.Post_ID} value={p.Post_ID}>{p.Post_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Payscale Level *</label>
          <select value={formData.Pay_ID ?? ''} onChange={e => setFormData({...formData, Pay_ID: Number(e.target.value)})} className={`form-select ${errors.Pay_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose --</option>
            {data.payscales.map(p => <option key={p.Pay_ID} value={p.Pay_ID}>{p.Pay_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Service Type *</label>
          <select value={formData.Service_Type || ''} onChange={e => setFormData({...formData, Service_Type: e.target.value as ServiceType})} className="form-select">
            {Object.values(ServiceType).map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/* SECTION 4: BANKING */}
        <div className="col-12 mt-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Landmark size={18} /> Financial Details
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Bank *</label>
          <select value={formData.Bank_ID ?? ''} onChange={e => setFormData({...formData, Bank_ID: Number(e.target.value), Branch_ID: undefined})} className={`form-select ${errors.Bank_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose --</option>
            {data.banks.map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Branch *</label>
          <select value={formData.Branch_ID ?? ''} onChange={e => {
            const bId = Number(e.target.value);
            const branch = availableBranches.find(b => Number(b.Branch_ID) === bId);
            setFormData({...formData, Branch_ID: bId, IFSC_Code: branch?.IFSC_Code || ''});
          }} className={`form-select ${errors.Branch_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose --</option>
            {availableBranches.map(b => <option key={b.Branch_ID} value={b.Branch_ID}>{b.Branch_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Account Number *</label>
          <div className="input-group">
            <span className="input-group-text bg-light"><CreditCard size={14}/></span>
            <input value={formData.ACC_No || ''} onChange={e => setFormData({...formData, ACC_No: e.target.value})} className={`form-control ${errors.ACC_No ? 'is-invalid' : ''}`} placeholder="Account No" />
          </div>
        </div>

        {/* SECTION 5: LIFECYCLE */}
        <div className="col-12 mt-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Power size={18} /> Active Lifecycle
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Account Status *</label>
          <select value={formData.Active || 'Yes'} onChange={e => setFormData({...formData, Active: e.target.value as 'Yes' | 'No'})} className="form-select fw-bold">
            <option value="Yes">ACTIVE</option>
            <option value="No">INACTIVE</option>
          </select>
        </div>

        {formData.Active === 'No' && (
          <>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">Reason for Inactivation *</label>
              <select value={formData.DA_Reason || ''} onChange={e => setFormData({...formData, DA_Reason: e.target.value})} className={`form-select ${errors.DA_Reason ? 'is-invalid' : ''}`}>
                <option value="">Select...</option>
                {DEACTIVATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted d-flex justify-content-between">
                Justification Doc * <span className="tiny text-primary">Max 2MB PDF/IMG</span>
              </label>
              <div className="input-group shadow-sm">
                <input type="file" ref={docInputRef} className={`form-control ${errors.Doc ? 'is-invalid' : ''}`} onChange={(e) => handleFileChange(e, 'doc')} accept=".pdf,image/*" />
                {formData.Deactivation_Doc_URL && <a href={formData.Deactivation_Doc_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline-info"><ExternalLink size={16}/></a>}
              </div>
            </div>
          </>
        )}

        <div className="col-12 text-end mt-5 pt-4 border-top">
          <button type="button" onClick={onCancel} className="btn btn-light px-4 me-2 rounded-pill">Cancel</button>
          <button type="submit" className="btn btn-primary px-5 shadow-lg rounded-pill d-inline-flex align-items-center gap-2" disabled={isUploading}>
            {isUploading ? (
              <><Loader2 size={18} className="animate-spin" /> Transmitting...</>
            ) : (
              <><Save size={18} /> Sync with Cloud</>
            )}
          </button>
        </div>
      </form>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tiny { font-size: 0.65rem; }
        .object-fit-cover { object-fit: cover; }
        .animate-in { animation: fadeInScale 0.4s ease-out; }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
};

export default EmployeeForm;
