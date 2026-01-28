
import React, { useState, useEffect, useRef } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Save, X, Info, User as UserIcon, Briefcase, Landmark, AlertCircle, Hash, Activity, Search, Loader2, Power, FileText, Upload, ExternalLink, Camera, Scissors } from 'lucide-react';
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
    if (employee && employee.Bank_ID !== undefined && employee.Bank_ID !== null && data.branches) {
      return data.branches.filter(b => Math.floor(Number(b.Bank_ID)) === Math.floor(Number(employee.Bank_ID)));
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

        // Target aspect ratio for passport photo (3:4)
        const targetWidth = 300;
        const targetHeight = 400;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const imgAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;

        let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;

        if (imgAspect > targetAspect) {
          // Image is wider than 3:4, crop sides
          sourceWidth = img.height * targetAspect;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          // Image is taller than 3:4, crop top/bottom
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
    if (!formData.Mobile || !/^[0-9]{10}$/.test(formData.Mobile)) newErrors.Mobile = "10 digits required";
    if (!formData.Department_ID) newErrors.Department_ID = "Required";
    if (!formData.Post_ID) newErrors.Post_ID = "Required";

    if (formData.Active === 'No') {
      if (!formData.DA_Reason) newErrors.DA_Reason = "Required";
      if (!selectedDoc && !formData.Deactivation_Doc_URL) newErrors.Doc = "Justification required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        alert('File processing error');
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert("File size exceeds 2MB limit.");
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
          <h2 className="fw-bold h4 mb-1">{employee ? 'Modify Record' : 'New Registration'}</h2>
          <p className="text-muted small mb-0">Fields marked with * are mandatory</p>
        </div>
        <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-3"><X size={16} /> Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="row g-4">
        {/* PHOTO SECTION */}
        <div className="col-12 text-center mb-4">
          <div className="position-relative d-inline-block">
            <div 
              className="rounded-circle border border-3 border-primary-subtle overflow-hidden bg-light shadow-sm"
              style={{ width: '150px', height: '200px', borderRadius: '15px', cursor: 'pointer' }}
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
              style={{ width: '40px', height: '40px' }}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload size={18} />
            </button>
            <input type="file" ref={photoInputRef} className="d-none" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
            <canvas ref={canvasRef} className="d-none" />
          </div>
          {selectedPhoto && <div className="mt-2 tiny text-success fw-bold d-flex align-items-center justify-content-center gap-1"><Scissors size={14} /> Auto-cropped to ID specs</div>}
        </div>

        {/* PERSONAL INFO */}
        <div className="col-12">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <UserIcon size={18} /> Identification
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Employee ID *</label>
          <input name="Employee_ID" value={formData.Employee_ID ?? ''} onChange={e => setFormData({...formData, Employee_ID: Number(e.target.value)})} readOnly={!!employee} className={`form-control bg-light ${errors.Employee_ID ? 'is-invalid' : ''}`} />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">First Name *</label>
          <input name="Employee_Name" value={formData.Employee_Name || ''} onChange={e => setFormData({...formData, Employee_Name: e.target.value})} className="form-control" />
        </div>
        
        <div className="col-md-4">
          <label className="form-label small fw-bold">Surname *</label>
          <input name="Employee_Surname" value={formData.Employee_Surname || ''} onChange={e => setFormData({...formData, Employee_Surname: e.target.value})} className="form-control" />
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
          <label className="form-label small fw-bold">DOB *</label>
          <input type="date" value={formData.DOB || ''} onChange={e => setFormData({...formData, DOB: e.target.value})} className="form-control" />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Mobile *</label>
          <input maxLength={10} value={formData.Mobile || ''} onChange={e => setFormData({...formData, Mobile: e.target.value})} className={`form-control ${errors.Mobile ? 'is-invalid' : ''}`} />
        </div>

        {/* EMPLOYMENT */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3">
            <Briefcase size={18} /> Professional
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Department *</label>
          <select value={formData.Department_ID ?? ''} onChange={e => setFormData({...formData, Department_ID: Number(e.target.value)})} className="form-select">
            <option value="">Select Dept</option>
            {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Post *</label>
          <select value={formData.Post_ID ?? ''} onChange={e => setFormData({...formData, Post_ID: Number(e.target.value)})} className="form-select">
            <option value="">Select Post</option>
            {availablePosts.map(p => <option key={p.Post_ID} value={p.Post_ID}>{p.Post_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold">Active Status</label>
          <select value={formData.Active || 'Yes'} onChange={e => setFormData({...formData, Active: e.target.value as 'Yes' | 'No'})} className="form-select">
            <option value="Yes">Active</option>
            <option value="No">Inactive</option>
          </select>
        </div>

        {formData.Active === 'No' && (
          <>
            <div className="col-md-6">
              <label className="form-label small fw-bold">Reason *</label>
              <select value={formData.DA_Reason || ''} onChange={e => setFormData({...formData, DA_Reason: e.target.value})} className="form-select">
                <option value="">Select...</option>
                {DEACTIVATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold">Justification Doc * (Max 2MB)</label>
              <div className="input-group">
                <input type="file" ref={docInputRef} className="form-control" onChange={(e) => handleFileChange(e, 'doc')} accept=".pdf,image/*" />
                {formData.Deactivation_Doc_URL && <a href={formData.Deactivation_Doc_URL} target="_blank" className="btn btn-outline-info"><ExternalLink size={16}/></a>}
              </div>
            </div>
          </>
        )}

        <div className="col-12 text-end mt-5 pt-3 border-top">
          <button type="button" onClick={onCancel} className="btn btn-light px-4 me-2">Cancel</button>
          <button type="submit" className="btn btn-primary px-5 shadow-sm" disabled={isUploading}>
            {isUploading ? <><Loader2 size={18} className="animate-spin me-2" /> Saving...</> : <><Save size={18} className="me-2" /> Commit Records</>}
          </button>
        </div>
      </form>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tiny { font-size: 0.65rem; }
      `}</style>
    </div>
  );
};

export default EmployeeForm;
