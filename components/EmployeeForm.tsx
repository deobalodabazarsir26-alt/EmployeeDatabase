
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Employee, AppData, ServiceType, User, UserType } from '../types';
import { Save, X, Info, User as UserIcon, Briefcase, Landmark, AlertCircle, Hash, Activity, Search, Loader2, Power, FileText, Upload, ExternalLink, Camera, Scissors, Smartphone, CreditCard, Crop, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
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
  
  // File & Cropping states
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null);
  const [croppedPhotoBase64, setCroppedPhotoBase64] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const drawCropper = useCallback(() => {
    if (!sourceImage || !displayCanvasRef.current) return;
    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetWidth = 300;
    const targetHeight = 400;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Calculate initial scale to fit source image within target box (maintaining aspect ratio)
    const scaleX = targetWidth / sourceImage.width;
    const scaleY = targetHeight / sourceImage.height;
    const baseScale = Math.max(scaleX, scaleY);
    const finalScale = baseScale * zoom;

    const drawWidth = sourceImage.width * finalScale;
    const drawHeight = sourceImage.height * finalScale;

    // Center image then apply offset
    const x = (targetWidth - drawWidth) / 2 + offset.x;
    const y = (targetHeight - drawHeight) / 2 + offset.y;

    ctx.drawImage(sourceImage, x, y, drawWidth, drawHeight);

    // Overlay border for visual crop area
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, targetWidth, targetHeight);
  }, [sourceImage, zoom, offset]);

  useEffect(() => {
    if (showCropper) drawCropper();
  }, [showCropper, drawCropper]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const confirmCrop = () => {
    if (!displayCanvasRef.current) return;
    const dataUrl = displayCanvasRef.current.toDataURL('image/jpeg', 0.9);
    setCroppedPhotoBase64(dataUrl.split(',')[1]);
    setShowCropper(false);
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
      alert(`Cloud Verified:\nBank: ${details.BANK}\nBranch: ${details.BRANCH}\n\nThis code is valid.`);
    } else {
      alert('IFSC code not found in global directory.');
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
        alert('Transmission error. Check your cloud connection.');
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert("System Policy: Files must be under 2MB.");
        e.target.value = '';
        return;
      }
      if (type === 'photo') {
        const reader = new FileReader();
        reader.onload = (re) => {
          const img = new Image();
          img.onload = () => {
            setSourceImage(img);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            setShowCropper(true);
          };
          img.src = re.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        setSelectedDoc(file);
      }
    }
  };

  return (
    <div className="card shadow-lg border-0 p-4 p-md-5 animate-in">
      {/* ADVANCED CROPPER OVERLAY */}
      {showCropper && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white p-4 rounded-4 shadow-2xl text-center" style={{ maxWidth: '450px', width: '90%' }}>
            <h5 className="fw-bold mb-3 d-flex align-items-center justify-content-center gap-2">
              <Crop className="text-primary" /> Interactive Cropping
            </h5>
            <p className="small text-muted mb-4">Zoom and drag to align the employee's face within the 3:4 crop guide.</p>
            
            <div className="position-relative mb-4 mx-auto border rounded-3 overflow-hidden shadow-sm bg-light" style={{ width: '300px', height: '400px', cursor: isDragging ? 'grabbing' : 'grab' }}>
              <canvas 
                ref={displayCanvasRef} 
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove} 
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-100 h-100"
              />
              <div className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none d-flex align-items-center justify-content-center" style={{ pointerEvents: 'none' }}>
                <div className="border border-white border-2 opacity-50 w-100 h-100"></div>
                <div className="position-absolute w-100 h-100 d-flex flex-column justify-content-between">
                    <div className="border-top border-white opacity-25" style={{ height: '33%' }}></div>
                    <div className="border-top border-white opacity-25" style={{ height: '33%' }}></div>
                </div>
                <div className="position-absolute w-100 h-100 d-flex justify-content-between">
                    <div className="border-start border-white opacity-25" style={{ width: '33%' }}></div>
                    <div className="border-start border-white opacity-25" style={{ width: '33%' }}></div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex align-items-center gap-3 mb-2 px-2">
                <ZoomOut size={16} className="text-muted" />
                <input 
                  type="range" 
                  className="form-range" 
                  min="0.5" 
                  max="3" 
                  step="0.01" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))} 
                />
                <ZoomIn size={16} className="text-muted" />
              </div>
              <div className="tiny text-primary fw-bold text-uppercase tracking-wider">
                <Move size={12} className="me-1" /> Use mouse to reposition
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light w-100 rounded-pill fw-bold" onClick={() => { setShowCropper(false); setSourceImage(null); if(photoInputRef.current) photoInputRef.current.value=''; }}>Cancel</button>
              <button type="button" className="btn btn-primary w-100 rounded-pill shadow fw-bold" onClick={confirmCrop}>Confirm Alignment</button>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold h4 mb-1">{employee ? 'Modify Record' : 'Employee Registration'}</h2>
          <p className="text-muted small mb-0 text-uppercase tracking-wider fw-bold d-flex align-items-center gap-2">
             <Activity size={14} className="text-primary" /> Cloud-First Database Synchronization
          </p>
        </div>
        <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-4">Close Form</button>
      </div>

      <form onSubmit={handleSubmit} className="row g-4">
        {/* PHOTO & IDENTITY TOP BLOCK */}
        <div className="col-12 col-lg-3 text-center mb-4">
          <div className="position-relative d-inline-block">
            <div 
              className={`rounded-4 border border-3 overflow-hidden bg-light shadow-md transition-all ${croppedPhotoBase64 ? 'border-success' : 'border-primary-subtle'}`}
              style={{ width: '160px', height: '210px', cursor: 'pointer' }}
              onClick={() => photoInputRef.current?.click()}
            >
              {croppedPhotoBase64 ? (
                <img src={`data:image/jpeg;base64,${croppedPhotoBase64}`} className="w-100 h-100 object-fit-cover" alt="Profile" />
              ) : formData.Employee_Photo_URL ? (
                <img src={formData.Employee_Photo_URL} className="w-100 h-100 object-fit-cover" alt="Existing" />
              ) : (
                <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted p-3 bg-white">
                  <Camera size={44} className="mb-2 text-primary opacity-25" />
                  <span className="tiny fw-bold text-uppercase text-primary">Capture Profile</span>
                </div>
              )}
            </div>
            <button 
              type="button"
              className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 shadow-lg border-3 border-white"
              style={{ width: '48px', height: '48px', transform: 'translate(25%, 25%)' }}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload size={20} />
            </button>
            <input type="file" ref={photoInputRef} className="d-none" accept="image/jpeg,image/png" onChange={(e) => handleFileChange(e, 'photo')} />
          </div>
          {croppedPhotoBase64 && (
            <div className="mt-4 animate-in">
              <span className="badge bg-success text-white rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 small">
                <Check size={14} /> ID-Ready Portrait
              </span>
            </div>
          )}
        </div>

        <div className="col-12 col-lg-9">
            <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
                <Hash size={18} /> Identification & Security
            </div>
            <div className="row g-3">
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">Employee ID *</label>
                    <input name="Employee_ID" value={formData.Employee_ID ?? ''} onChange={e => setFormData({...formData, Employee_ID: Number(e.target.value)})} readOnly={!!employee} className={`form-control fw-bold ${errors.Employee_ID ? 'is-invalid' : ''}`} placeholder="Record ID" />
                </div>
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">EPIC (Voter Card) *</label>
                    <input value={formData.EPIC || ''} onChange={e => setFormData({...formData, EPIC: e.target.value.toUpperCase()})} className={`form-control text-uppercase fw-bold ${errors.EPIC ? 'is-invalid' : ''}`} placeholder="VOTER-ID-123" />
                </div>
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">PwD Category *</label>
                    <select value={formData.PwD || 'No'} onChange={e => setFormData({...formData, PwD: e.target.value as 'Yes' | 'No'})} className="form-select fw-medium">
                        <option value="No">No (General)</option>
                        <option value="Yes">Yes (Disabled)</option>
                    </select>
                </div>
                <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Mobile Number *</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white text-muted border-end-0"><Smartphone size={14}/></span>
                        <input maxLength={10} value={formData.Mobile || ''} onChange={e => setFormData({...formData, Mobile: e.target.value})} className={`form-control border-start-0 fw-bold ${errors.Mobile ? 'is-invalid' : ''}`} placeholder="9876543210" />
                    </div>
                </div>
                <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Date of Birth *</label>
                    <input type="date" value={formData.DOB || ''} onChange={e => setFormData({...formData, DOB: e.target.value})} className={`form-control fw-medium ${errors.DOB ? 'is-invalid' : ''}`} />
                </div>
            </div>
        </div>

        {/* SECTION 2: PERSONAL */}
        <div className="col-12 mt-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <UserIcon size={18} /> Personal Attributes
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">First Name *</label>
          <input value={formData.Employee_Name || ''} onChange={e => setFormData({...formData, Employee_Name: e.target.value})} className={`form-control fw-bold ${errors.Employee_Name ? 'is-invalid' : ''}`} />
        </div>
        
        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Surname *</label>
          <input value={formData.Employee_Surname || ''} onChange={e => setFormData({...formData, Employee_Surname: e.target.value})} className={`form-control fw-bold ${errors.Employee_Surname ? 'is-invalid' : ''}`} />
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Gender *</label>
          <select value={formData.Gender || 'Male'} onChange={e => setFormData({...formData, Gender: e.target.value})} className="form-select fw-medium">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* SECTION 3: PROFESSIONAL */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Briefcase size={18} /> Organizational Placement
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Department *</label>
          <select value={formData.Department_ID ?? ''} onChange={e => setFormData({...formData, Department_ID: Number(e.target.value)})} className={`form-select fw-medium ${errors.Department_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose Department --</option>
            {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Office *</label>
          <select value={formData.Office_ID ?? ''} onChange={e => setFormData({...formData, Office_ID: Number(e.target.value)})} className={`form-select fw-medium ${errors.Office_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose Office --</option>
            {availableOffices.map(o => <option key={o.Office_ID} value={o.Office_ID}>{o.Office_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Service Type *</label>
          <select value={formData.Service_Type || ''} onChange={e => setFormData({...formData, Service_Type: e.target.value as ServiceType})} className="form-select fw-medium">
            {Object.values(ServiceType).map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-bold text-muted">Designation (Post) *</label>
          <select value={formData.Post_ID ?? ''} onChange={e => setFormData({...formData, Post_ID: Number(e.target.value)})} className={`form-select fw-bold ${errors.Post_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose Designation --</option>
            {availablePosts.map(p => <option key={p.Post_ID} value={p.Post_ID}>{p.Post_Name}</option>)}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-bold text-muted">Payscale Level *</label>
          <select value={formData.Pay_ID ?? ''} onChange={e => setFormData({...formData, Pay_ID: Number(e.target.value)})} className={`form-select fw-bold ${errors.Pay_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose Level --</option>
            {data.payscales.map(p => <option key={p.Pay_ID} value={p.Pay_ID}>{p.Pay_Name}</option>)}
          </select>
        </div>

        {/* SECTION 4: BANKING - HIGHLIGHTED IFSC */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Landmark size={18} /> Financial & Banking Matrix
          </div>
        </div>

        <div className="col-md-12 mb-2">
            <div className="p-3 bg-light border border-primary-subtle rounded-4 shadow-sm">
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-primary text-uppercase tracking-wider d-flex align-items-center gap-2">
                            <Hash size={16} /> IFSC Code (Cloud Verification Required)
                        </label>
                        <div className="input-group input-group-lg">
                            <input 
                                value={formData.IFSC_Code || ''} 
                                onChange={e => setFormData({...formData, IFSC_Code: e.target.value.toUpperCase()})} 
                                className="form-control fw-bold text-primary border-primary-subtle bg-white" 
                                placeholder="SBIN00XXXXX"
                                style={{ letterSpacing: '2px' }}
                            />
                            <button type="button" onClick={handleIfscVerify} className="btn btn-primary px-4 shadow-sm d-flex align-items-center gap-2" disabled={isVerifyingIfsc}>
                                {isVerifyingIfsc ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                                <span className="d-none d-md-inline">Verify</span>
                            </button>
                        </div>
                        <div className="tiny text-muted mt-1 px-1">Ensure the 11-character alphanumeric code matches the bank record.</div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted">Account Number *</label>
                        <div className="input-group input-group-lg">
                            <span className="input-group-text bg-white text-muted"><CreditCard size={20}/></span>
                            <input value={formData.ACC_No || ''} onChange={e => setFormData({...formData, ACC_No: e.target.value})} className={`form-control fw-bold border-start-0 ${errors.ACC_No ? 'is-invalid' : ''}`} placeholder="Account No" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-bold text-muted">Bank Name *</label>
          <select value={formData.Bank_ID ?? ''} onChange={e => setFormData({...formData, Bank_ID: Number(e.target.value), Branch_ID: undefined})} className={`form-select fw-bold ${errors.Bank_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Choose Bank --</option>
            {data.banks.map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-bold text-muted">Branch *</label>
          <select value={formData.Branch_ID ?? ''} onChange={e => {
            const bId = Number(e.target.value);
            const branch = availableBranches.find(b => Number(b.Branch_ID) === bId);
            setFormData({...formData, Branch_ID: bId, IFSC_Code: branch?.IFSC_Code || formData.IFSC_Code || ''});
          }} className={`form-select fw-bold ${errors.Branch_ID ? 'is-invalid' : ''}`}>
            <option value="">-- Select Branch --</option>
            {availableBranches.map(b => <option key={b.Branch_ID} value={b.Branch_ID}>{b.Branch_Name}</option>)}
          </select>
        </div>

        {/* SECTION 5: LIFECYCLE */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Power size={18} /> Active Lifecycle Management
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">System Status *</label>
          <select value={formData.Active || 'Yes'} onChange={e => setFormData({...formData, Active: e.target.value as 'Yes' | 'No'})} className="form-select fw-bold text-uppercase">
            <option value="Yes" className="text-success fw-bold">Active Deployment</option>
            <option value="No" className="text-danger fw-bold">Inactive Record</option>
          </select>
        </div>

        {formData.Active === 'No' && (
          <>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">Deactivation Trigger *</label>
              <select value={formData.DA_Reason || ''} onChange={e => setFormData({...formData, DA_Reason: e.target.value})} className={`form-select fw-medium ${errors.DA_Reason ? 'is-invalid' : ''}`}>
                <option value="">Select Reason...</option>
                {DEACTIVATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted d-flex justify-content-between">
                Upload Proof * <span className="tiny text-primary fw-bold">MAX 2MB PDF/IMG</span>
              </label>
              <div className="input-group shadow-sm">
                <input type="file" ref={docInputRef} className={`form-control ${errors.Doc ? 'is-invalid' : ''}`} onChange={(e) => handleFileChange(e, 'doc')} accept=".pdf,image/*" />
                {formData.Deactivation_Doc_URL && <a href={formData.Deactivation_Doc_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline-info border-start-0"><ExternalLink size={16}/></a>}
              </div>
            </div>
          </>
        )}

        <div className="col-12 text-end mt-5 pt-4 border-top">
          <button type="button" onClick={onCancel} className="btn btn-light px-4 me-3 rounded-pill border fw-bold text-muted">Discard Draft</button>
          <button type="submit" className="btn btn-primary px-5 shadow-lg rounded-pill d-inline-flex align-items-center gap-2 fw-bold" disabled={isUploading}>
            {isUploading ? (
              <><Loader2 size={18} className="animate-spin" /> Synchronizing...</>
            ) : (
              <><Save size={18} /> Commit & Sync to Cloud</>
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
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .grab { cursor: grab; }
        .grabbing { cursor: grabbing; }
      `}</style>
    </div>
  );
};

export default EmployeeForm;
