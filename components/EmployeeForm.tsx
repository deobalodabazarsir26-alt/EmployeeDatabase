
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Employee, AppData, ServiceType, User, UserType, Bank, BankBranch } from '../types';
import { Save, X, Info, User as UserIcon, Briefcase, Landmark, AlertCircle, Hash, Activity, Search, Loader2, Power, FileText, Upload, ExternalLink, Camera, Scissors, Smartphone, CreditCard, Crop, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { ifscService } from '../services/ifscService';
import { generateUniqueId } from '../App';

interface EmployeeFormProps {
  employee: Employee | null;
  data: AppData;
  currentUser: User;
  onSave: (emp: Employee) => void;
  onSaveBank: (bank: Bank) => void;
  onSaveBranch: (branch: BankBranch) => void;
  onCancel: () => void;
}

const DEACTIVATION_REASONS = ['Transfer', 'Death', 'Resign', 'Debarred'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, data, currentUser, onSave, onSaveBank, onSaveBranch, onCancel }) => {
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
  
  // High-performance drag tracking
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
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
    
    // Set internal resolution once
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const scaleX = targetWidth / sourceImage.width;
    const scaleY = targetHeight / sourceImage.height;
    const baseScale = Math.max(scaleX, scaleY);
    const finalScale = baseScale * zoom;

    const drawWidth = sourceImage.width * finalScale;
    const drawHeight = sourceImage.height * finalScale;

    const x = (targetWidth - drawWidth) / 2 + offset.x;
    const y = (targetHeight - drawHeight) / 2 + offset.y;

    ctx.drawImage(sourceImage, x, y, drawWidth, drawHeight);

    // Subtle crop guide
    ctx.strokeStyle = 'rgba(79, 70, 229, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, targetWidth, targetHeight);
  }, [sourceImage, zoom, offset]);

  useEffect(() => {
    if (showCropper) drawCropper();
  }, [showCropper, drawCropper]);

  // Global Mouse/Touch Event Management for Smooth Dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      
      const canvas = displayCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        setOffset(prev => ({ 
          x: prev.x + (dx * scaleX), 
          y: prev.y + (dy * scaleY) 
        }));
      }
      
      dragStartRef.current = { x: clientX, y: clientY };
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const handleStartDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
  };

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
      if (!selectedDoc && !formData.DA_Doc) newErrors.Doc = "Justification doc required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleIfscVerify = async () => {
    const ifscInput = formData.IFSC_Code?.trim().toUpperCase();
    if (!ifscInput || ifscInput.length !== 11) return alert('Enter valid 11-digit IFSC');
    
    setIsVerifyingIfsc(true);
    const details = await ifscService.fetchDetails(ifscInput);
    setIsVerifyingIfsc(false);
    
    if (details) {
      let bank = data.banks.find(b => b.Bank_Name.toLowerCase().trim() === details.BANK.toLowerCase().trim());
      let targetBankId: number;
      
      if (!bank) {
        targetBankId = generateUniqueId();
        onSaveBank({ Bank_ID: targetBankId, Bank_Name: details.BANK });
      } else {
        targetBankId = Math.floor(Number(bank.Bank_ID));
      }

      let branch = data.branches.find(b => b.IFSC_Code === details.IFSC);
      let targetBranchId: number;
      
      if (!branch) {
        targetBranchId = generateUniqueId();
        onSaveBranch({ Branch_ID: targetBranchId, Branch_Name: details.BRANCH, IFSC_Code: details.IFSC, Bank_ID: targetBankId });
      } else {
        targetBranchId = Math.floor(Number(branch.Branch_ID));
        targetBankId = Math.floor(Number(branch.Bank_ID));
      }

      setFormData(prev => ({
        ...prev,
        Bank_ID: targetBankId,
        Branch_ID: targetBranchId,
        IFSC_Code: details.IFSC
      }));
      
      alert(`Verified: ${details.BANK}, ${details.BRANCH}`);
    } else {
      alert('IFSC code not found.');
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
        alert('Sync Error. Please try again.');
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert("File size must be under 2MB.");
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
      {/* CROPPER OVERLAY */}
      {showCropper && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 3000, backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)' }}>
          <div className="bg-white p-4 rounded-4 shadow-2xl text-center" style={{ maxWidth: '420px', width: '90%' }}>
            <h6 className="fw-bold mb-3 d-flex align-items-center justify-content-center gap-2">
              <Scissors size={20} className="text-primary" /> Profile Alignment
            </h6>
            
            <div 
              className="position-relative mb-4 mx-auto border rounded-3 overflow-hidden bg-light shadow-inner" 
              style={{ width: '300px', height: '400px', cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <canvas 
                ref={displayCanvasRef} 
                onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
                onTouchStart={(e) => handleStartDrag(e.touches[0].clientX, e.touches[0].clientY)}
                className="w-100 h-100"
              />
              <div className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none border border-white border-2 opacity-25"></div>
            </div>

            <div className="mb-4">
              <div className="d-flex align-items-center gap-3 mb-2 px-3">
                <ZoomOut size={18} className="text-muted" />
                <input 
                  type="range" 
                  className="form-range" 
                  min="0.5" 
                  max="5" 
                  step="0.01" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))} 
                />
                <ZoomIn size={18} className="text-muted" />
              </div>
              <div className="tiny text-primary fw-bold text-uppercase d-flex align-items-center justify-content-center gap-2">
                <Move size={14} /> Drag image to position face
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light w-100 rounded-pill fw-bold" onClick={() => setShowCropper(false)}>Cancel</button>
              <button type="button" className="btn btn-primary w-100 rounded-pill shadow-sm fw-bold" onClick={confirmCrop}>Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold h4 mb-1">{employee ? 'Modify Record' : 'Register Employee'}</h2>
          <p className="text-muted small mb-0 text-uppercase tracking-wider fw-bold">Enterprise Resource Data Entry</p>
        </div>
        <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-4">Discard</button>
      </div>

      <form onSubmit={handleSubmit} className="row g-4">
        {/* PHOTO & IDENTITY */}
        <div className="col-12 col-lg-3 text-center mb-4">
          <div className="position-relative d-inline-block">
            <div 
              className={`rounded-4 border border-3 overflow-hidden bg-light shadow-md transition-all ${croppedPhotoBase64 ? 'border-success' : 'border-primary-subtle'}`}
              style={{ width: '160px', height: '210px', cursor: 'pointer' }}
              onClick={() => photoInputRef.current?.click()}
            >
              {croppedPhotoBase64 ? (
                <img src={`data:image/jpeg;base64,${croppedPhotoBase64}`} className="w-100 h-100 object-fit-cover" alt="Profile" />
              ) : formData.Photo ? (
                <img src={formData.Photo} className="w-100 h-100 object-fit-cover" alt="Existing" />
              ) : (
                <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted p-3 bg-white">
                  <Camera size={44} className="mb-2 text-primary opacity-25" />
                  <span className="tiny fw-bold text-uppercase text-primary">Photo</span>
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
        </div>

        <div className="col-12 col-lg-9">
            <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
                <Hash size={18} /> Official Identification
            </div>
            <div className="row g-3">
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">Employee ID *</label>
                    <input name="Employee_ID" value={formData.Employee_ID ?? ''} onChange={e => setFormData({...formData, Employee_ID: Number(e.target.value)})} readOnly={!!employee} className={`form-control fw-bold ${errors.Employee_ID ? 'is-invalid' : ''}`} placeholder="Record ID" />
                </div>
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">EPIC (Voter ID) *</label>
                    <input value={formData.EPIC || ''} onChange={e => setFormData({...formData, EPIC: e.target.value.toUpperCase()})} className={`form-control text-uppercase fw-bold ${errors.EPIC ? 'is-invalid' : ''}`} placeholder="VOTER ID" />
                </div>
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">Birth Date *</label>
                    <input type="date" value={formData.DOB || ''} onChange={e => setFormData({...formData, DOB: e.target.value})} className={`form-control ${errors.DOB ? 'is-invalid' : ''}`} />
                </div>
                <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Mobile Number *</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white"><Smartphone size={14}/></span>
                        <input maxLength={10} value={formData.Mobile || ''} onChange={e => setFormData({...formData, Mobile: e.target.value})} className={`form-control fw-bold ${errors.Mobile ? 'is-invalid' : ''}`} placeholder="10 Digits" />
                    </div>
                </div>
                <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">PwD Status *</label>
                    <select value={formData.PwD || 'No'} onChange={e => setFormData({...formData, PwD: e.target.value as 'Yes' | 'No'})} className="form-select">
                        <option value="No">No (General)</option>
                        <option value="Yes">Yes (Disabled)</option>
                    </select>
                </div>
            </div>
        </div>

        {/* PERSONAL */}
        <div className="col-12 mt-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <UserIcon size={18} /> Personal Details
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
          <select value={formData.Gender || 'Male'} onChange={e => setFormData({...formData, Gender: e.target.value})} className="form-select">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* ORGANIZATIONAL PLACEMENT (SERVICE TYPE AND PAYSCALE RE-INFORCED) */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Briefcase size={18} /> Organizational Placement
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Department *</label>
          <select value={formData.Department_ID ?? ''} onChange={e => setFormData({...formData, Department_ID: Number(e.target.value)})} className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}>
            <option value="">Choose Department</option>
            {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Office *</label>
          <select value={formData.Office_ID ?? ''} onChange={e => setFormData({...formData, Office_ID: Number(e.target.value)})} className={`form-select ${errors.Office_ID ? 'is-invalid' : ''}`}>
            <option value="">Choose Office</option>
            {availableOffices.map(o => <option key={o.Office_ID} value={o.Office_ID}>{o.Office_Name}</option>)}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Service Type *</label>
          <select value={formData.Service_Type || ''} onChange={e => setFormData({...formData, Service_Type: e.target.value as ServiceType})} className="form-select fw-bold">
            {Object.values(ServiceType).map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-bold text-muted">Designation (Post) *</label>
          <select value={formData.Post_ID ?? ''} onChange={e => setFormData({...formData, Post_ID: Number(e.target.value)})} className={`form-select fw-bold ${errors.Post_ID ? 'is-invalid' : ''}`}>
            <option value="">Choose Designation</option>
            {availablePosts.map(p => <option key={p.Post_ID} value={p.Post_ID}>{p.Post_Name}</option>)}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-bold text-muted">Payscale Level *</label>
          <select value={formData.Pay_ID ?? ''} onChange={e => setFormData({...formData, Pay_ID: Number(e.target.value)})} className={`form-select fw-bold ${errors.Pay_ID ? 'is-invalid' : ''}`}>
            <option value="">Choose Scale</option>
            {data.payscales.map(p => <option key={p.Pay_ID} value={p.Pay_ID}>{p.Pay_Name}</option>)}
          </select>
        </div>

        {/* BANKING */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Landmark size={18} /> Financial & Banking Entry
          </div>
        </div>

        <div className="col-12 mb-2">
            <div className="p-4 bg-white border border-2 border-primary-subtle rounded-4 shadow-sm">
                <div className="row g-4 align-items-end">
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-primary text-uppercase tracking-wider">IFSC Code (Automated Verify) *</label>
                        <div className="input-group input-group-lg shadow-sm">
                            <span className="input-group-text bg-primary text-white border-primary"><Hash size={24} /></span>
                            <input 
                                value={formData.IFSC_Code || ''} 
                                onChange={e => setFormData({...formData, IFSC_Code: e.target.value.toUpperCase()})} 
                                className="form-control fw-bold text-primary border-primary" 
                                placeholder="IFSC CODE"
                                style={{ letterSpacing: '1px' }}
                            />
                            <button type="button" onClick={handleIfscVerify} className="btn btn-primary px-4 d-flex align-items-center gap-2" disabled={isVerifyingIfsc}>
                                {isVerifyingIfsc ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
                                <span className="d-none d-md-inline fw-bold">Verify</span>
                            </button>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted">Bank Account Number *</label>
                        <div className="input-group input-group-lg shadow-sm">
                            <span className="input-group-text bg-light"><CreditCard size={24}/></span>
                            <input value={formData.ACC_No || ''} onChange={e => setFormData({...formData, ACC_No: e.target.value})} className={`form-control fw-bold border-start-0 ${errors.ACC_No ? 'is-invalid' : ''}`} placeholder="ACCOUNT NO" />
                        </div>
                    </div>
                </div>
                <div className="row g-3 mt-4 pt-3 border-top">
                    <div className="col-md-6">
                        <label className="form-label tiny fw-bold text-muted uppercase">Mapped Bank</label>
                        <select value={formData.Bank_ID ?? ''} onChange={e => setFormData({...formData, Bank_ID: Number(e.target.value)})} className={`form-select bg-light border-0 fw-bold ${errors.Bank_ID ? 'is-invalid' : ''}`}>
                            <option value="">-- Choice --</option>
                            {data.banks.map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label tiny fw-bold text-muted uppercase">Mapped Branch</label>
                        <select value={formData.Branch_ID ?? ''} onChange={e => setFormData({...formData, Branch_ID: Number(e.target.value)})} className={`form-select bg-light border-0 fw-bold ${errors.Branch_ID ? 'is-invalid' : ''}`}>
                            <option value="">-- Choice --</option>
                            {availableBranches.map(b => <option key={b.Branch_ID} value={b.Branch_ID}>{b.Branch_Name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* STATUS */}
        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Power size={18} /> Record Status
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Lifecycle Status *</label>
          <select value={formData.Active || 'Yes'} onChange={e => setFormData({...formData, Active: e.target.value as 'Yes' | 'No'})} className="form-select fw-bold">
            <option value="Yes">ACTIVE</option>
            <option value="No">INACTIVE</option>
          </select>
        </div>

        {formData.Active === 'No' && (
          <>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">Reason *</label>
              <select value={formData.DA_Reason || ''} onChange={e => setFormData({...formData, DA_Reason: e.target.value})} className={`form-select ${errors.DA_Reason ? 'is-invalid' : ''}`}>
                <option value="">Select Reason...</option>
                {DEACTIVATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">Proof (DA_Doc) *</label>
              <div className="input-group shadow-sm">
                <input type="file" ref={docInputRef} className={`form-control ${errors.Doc ? 'is-invalid' : ''}`} onChange={(e) => handleFileChange(e, 'doc')} accept=".pdf,image/*" />
                {formData.DA_Doc && <a href={formData.DA_Doc} target="_blank" rel="noopener noreferrer" className="btn btn-outline-info"><ExternalLink size={16}/></a>}
              </div>
            </div>
          </>
        )}

        <div className="col-12 text-end mt-5 pt-4 border-top">
          <button type="button" onClick={onCancel} className="btn btn-light px-4 me-3 rounded-pill fw-bold border">Cancel</button>
          <button type="submit" className="btn btn-primary px-5 shadow-lg rounded-pill d-inline-flex align-items-center gap-2 fw-bold" disabled={isUploading}>
            {isUploading ? (
              <><Loader2 size={18} className="animate-spin" /> Updating...</>
            ) : (
              <><Save size={18} /> Save Record</>
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
        .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); }
        .grab { cursor: grab; }
        .grabbing { cursor: grabbing; }
      `}</style>
    </div>
  );
};

export default EmployeeForm;
