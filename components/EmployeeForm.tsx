
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Employee, AppData, ServiceType, User, Bank, BankBranch } from '../types';
import { Save, User as UserIcon, Briefcase, Landmark, Hash, Search, Loader2, Power, ExternalLink, Camera, Scissors, Smartphone, CreditCard, ZoomIn, ZoomOut, Upload } from 'lucide-react';
import { ifscService } from '../services/ifscService';

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

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, data, onSave, onSaveBank, onSaveBranch, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Employee>>(employee || {
    Employee_ID: 0, // Placeholder for server-side sequential ID
    Gender: 'Male',
    PwD: 'No',
    Service_Type: ServiceType.REGULAR,
    Active: 'Yes',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVerifyingIfsc, setIsVerifyingIfsc] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null);
  const [croppedPhotoBase64, setCroppedPhotoBase64] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [availableOffices, setAvailableOffices] = useState(data.offices || []);

  useEffect(() => {
    if (formData.Department_ID !== undefined && data.offices) {
      setAvailableOffices(data.offices.filter(o => Math.floor(Number(o.Department_ID)) === Math.floor(Number(formData.Department_ID))));
    } else {
      setAvailableOffices([]);
    }
  }, [formData.Department_ID, data.offices]);

  const drawCropper = useCallback(() => {
    if (!sourceImage || !displayCanvasRef.current) return;
    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetWidth = 300;
    const targetHeight = 400;
    
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const scaleX = targetWidth / sourceImage.width;
    const scaleY = targetHeight / sourceImage.height;
    const baseScale = Math.max(scaleX, scaleY);
    const finalScale = baseScale * zoom;

    const drawWidth = sourceImage.width * finalScale;
    const drawHeight = sourceImage.height * finalScale;

    ctx.save();
    ctx.translate(targetWidth / 2 + offset.x, targetHeight / 2 + offset.y);
    ctx.drawImage(sourceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(5, 5, targetWidth - 10, targetHeight - 10);
    ctx.setLineDash([]);
  }, [sourceImage, zoom, offset]);

  useEffect(() => {
    if (showCropper) drawCropper();
  }, [showCropper, drawCropper]);

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (clientX: number, clientY: number) => {
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      
      const canvas = displayCanvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const newX = offsetRef.current.x + (dx * scaleX);
        const newY = offsetRef.current.y + (dy * scaleY);
        offsetRef.current = { x: newX, y: newY };
        setOffset({ x: newX, y: newY });
      }
      dragStartRef.current = { x: clientX, y: clientY };
    };

    const onMouseMove = (e: MouseEvent) => handleGlobalMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault(); 
        handleGlobalMove(e.touches[0].clientX, e.touches[0].clientY);
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

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, clientX: number, clientY: number) => {
    if (e.cancelable) e.preventDefault();
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
    if (!formData.Employee_Name?.trim()) newErrors.Employee_Name = "Required";
    if (!formData.Employee_Surname?.trim()) newErrors.Employee_Surname = "Required";
    if (!formData.DOB) newErrors.DOB = "Required";
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
      let targetBankId = bank ? Math.floor(Number(bank.Bank_ID)) : 0; 
      
      let branch = data.branches.find(b => b.IFSC_Code === details.IFSC);
      let targetBranchId = branch ? Math.floor(Number(branch.Branch_ID)) : 0;

      setFormData(prev => ({ ...prev, Bank_ID: targetBankId, Branch_ID: targetBranchId, IFSC_Code: details.IFSC }));
      alert(`Verified: ${details.BANK}, ${details.BRANCH}`);
    } else {
      alert('IFSC code not found.');
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("File conversion failed"));
      }
    };
    reader.onerror = reject;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsUploading(true);
      const payload: any = { ...formData };
      try {
        if (croppedPhotoBase64) {
          payload.photoData = {
            base64: croppedPhotoBase64,
            name: `photo_${Date.now()}.jpg`,
            mimeType: 'image/jpeg'
          };
        }
        if (selectedDoc) {
          const docBase64 = await toBase64(selectedDoc);
          payload.fileData = {
            base64: docBase64,
            name: `doc_${selectedDoc.name.replace(/\s+/g, '_')}`,
            mimeType: selectedDoc.type
          };
        }
        onSave(payload as Employee);
      } catch (err) {
        console.error("Submission failed:", err);
        alert('Could not process files. Ensure they are under 2MB.');
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert("File size limit is 2MB.");
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
      {showCropper && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 3000, backgroundColor: 'rgba(15, 23, 42, 0.96)', backdropFilter: 'blur(10px)' }}>
          <div className="bg-white p-4 rounded-4 shadow-2xl text-center" style={{ maxWidth: '440px', width: '90%' }}>
            <h6 className="fw-bold mb-3 d-flex align-items-center justify-content-center gap-2">
              <Scissors size={20} className="text-primary" /> Profile Alignment
            </h6>
            <div 
              className="position-relative mb-4 mx-auto border-0 rounded-3 overflow-hidden bg-dark shadow-inner" 
              style={{ width: '300px', height: '400px', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
              onMouseDown={(e) => handleStartDrag(e, e.clientX, e.clientY)}
              onTouchStart={(e) => handleStartDrag(e, e.touches[0].clientX, e.touches[0].clientY)}
            >
              <canvas ref={displayCanvasRef} className="w-100 h-100" style={{ pointerEvents: 'none' }} />
            </div>
            <div className="mb-4">
              <div className="d-flex align-items-center gap-3 mb-2 px-3">
                <ZoomOut size={18} className="text-muted" />
                <input type="range" className="form-range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
                <ZoomIn size={18} className="text-muted" />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light border w-100 rounded-pill fw-bold" onClick={() => setShowCropper(false)}>Cancel</button>
              <button type="button" className="btn btn-primary w-100 rounded-pill shadow-sm fw-bold" onClick={confirmCrop}>Confirm Alignment</button>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold h4 mb-1">{employee ? 'Update Personnel Record' : 'Register New Personnel'}</h2>
          <p className="text-muted small mb-0 text-uppercase tracking-wider fw-bold">Cloud-Safe Sequential IDs</p>
        </div>
        <button onClick={onCancel} className="btn btn-outline-secondary btn-sm rounded-pill px-4">Discard</button>
      </div>

      <form onSubmit={handleSubmit} className="row g-4">
        <div className="col-12 col-lg-3 text-center mb-4">
          <div className="position-relative d-inline-block">
            <div 
              className={`rounded-4 border border-3 overflow-hidden bg-light shadow-md transition-all ${croppedPhotoBase64 ? 'border-success' : 'border-primary-subtle'}`}
              style={{ width: '160px', height: '210px', cursor: 'pointer' }}
              onClick={() => photoInputRef.current?.click()}
            >
              {croppedPhotoBase64 ? (
                <img src={`data:image/jpeg;base64,${croppedPhotoBase64}`} className="w-100 h-100 object-fit-cover" alt="New" />
              ) : formData.Photo && !formData.Photo.includes('DRIVE_ERR') ? (
                <img src={formData.Photo} className="w-100 h-100 object-fit-cover" alt="Existing" />
              ) : (
                <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted p-3 bg-white">
                  <Camera size={44} className="mb-2 text-primary opacity-25" />
                  <span className="tiny fw-bold text-uppercase text-primary">Capture Photo</span>
                </div>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 shadow-lg border-3 border-white" style={{ width: '48px', height: '48px', transform: 'translate(25%, 25%)' }} onClick={() => photoInputRef.current?.click()}>
              <Upload size={20} />
            </button>
            <input type="file" ref={photoInputRef} className="d-none" accept="image/jpeg,image/png" onChange={(e) => handleFileChange(e, 'photo')} />
          </div>
        </div>

        <div className="col-12 col-lg-9">
            <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
                <Hash size={18} /> Official Identifiers
            </div>
            <div className="row g-3">
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">Employee ID</label>
                    <div className="form-control fw-bold bg-light text-muted">
                        {formData.Employee_ID && Number(formData.Employee_ID) !== 0 ? `EMP #${formData.Employee_ID}` : 'Auto-Assigned'}
                    </div>
                </div>
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">Voter ID (EPIC) *</label>
                    <input value={formData.EPIC || ''} onChange={e => setFormData({...formData, EPIC: e.target.value.toUpperCase()})} className={`form-control text-uppercase fw-bold ${errors.EPIC ? 'is-invalid' : ''}`} placeholder="EPIC NO" />
                </div>
                <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted">Date of Birth *</label>
                    <input type="date" value={formData.DOB || ''} onChange={e => setFormData({...formData, DOB: e.target.value})} className={`form-control ${errors.DOB ? 'is-invalid' : ''}`} />
                </div>
                <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Mobile Number *</label>
                    <div className="input-group">
                        <span className="input-group-text bg-white border-end-0"><Smartphone size={14}/></span>
                        <input maxLength={10} value={formData.Mobile || ''} onChange={e => setFormData({...formData, Mobile: e.target.value})} className={`form-control fw-bold border-start-0 ps-1 ${errors.Mobile ? 'is-invalid' : ''}`} placeholder="10 Digits" />
                    </div>
                </div>
                <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">PwD Status *</label>
                    <select value={formData.PwD || 'No'} onChange={e => setFormData({...formData, PwD: e.target.value as 'Yes' | 'No'})} className="form-select">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="col-12 mt-4">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <UserIcon size={18} /> Personal Profile
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

        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Briefcase size={18} /> Organizational Placement
          </div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Department *</label>
          <select value={formData.Department_ID ?? ''} onChange={e => setFormData({...formData, Department_ID: Number(e.target.value)})} className={`form-select ${errors.Department_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Department...</option>
            {data.departments.map(d => <option key={d.Department_ID} value={d.Department_ID}>{d.Department_Name}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Office *</label>
          <select value={formData.Office_ID ?? ''} onChange={e => setFormData({...formData, Office_ID: Number(e.target.value)})} className={`form-select ${errors.Office_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Office...</option>
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
          <label className="form-label small fw-bold text-muted">Designation *</label>
          <select value={formData.Post_ID ?? ''} onChange={e => setFormData({...formData, Post_ID: Number(e.target.value)})} className={`form-select fw-bold ${errors.Post_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Designation...</option>
            {data.posts.map(p => <option key={p.Post_ID} value={p.Post_ID}>{p.Post_Name}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold text-muted">Payscale Level *</label>
          <select value={formData.Pay_ID ?? ''} onChange={e => setFormData({...formData, Pay_ID: Number(e.target.value)})} className={`form-select fw-bold ${errors.Pay_ID ? 'is-invalid' : ''}`}>
            <option value="">Select Scale...</option>
            {data.payscales.map(p => <option key={p.Pay_ID} value={p.Pay_ID}>{p.Pay_Name}</option>)}
          </select>
        </div>

        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Landmark size={18} /> Banking & Financial
          </div>
        </div>
        <div className="col-12 mb-2">
            <div className="p-4 bg-white border border-2 border-primary-subtle rounded-4 shadow-sm">
                <div className="row g-4 align-items-end">
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-primary text-uppercase tracking-wider">IFSC Validation *</label>
                        <div className="input-group input-group-lg shadow-sm">
                            <span className="input-group-text bg-primary text-white border-primary"><Hash size={24} /></span>
                            <input value={formData.IFSC_Code || ''} onChange={e => setFormData({...formData, IFSC_Code: e.target.value.toUpperCase()})} className="form-control fw-bold text-primary border-primary" placeholder="IFSC" />
                            <button type="button" onClick={handleIfscVerify} className="btn btn-primary px-4 d-flex align-items-center gap-2" disabled={isVerifyingIfsc}>
                                {isVerifyingIfsc ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
                                <span className="d-none d-md-inline fw-bold">Verify</span>
                            </button>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label small fw-bold text-muted">Account Number *</label>
                        <div className="input-group input-group-lg shadow-sm">
                            <span className="input-group-text bg-light border-end-0"><CreditCard size={24}/></span>
                            <input value={formData.ACC_No || ''} onChange={e => setFormData({...formData, ACC_No: e.target.value})} className={`form-control fw-bold border-start-0 ps-1 ${errors.ACC_No ? 'is-invalid' : ''}`} placeholder="A/C NO" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="col-12 mt-5">
          <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold border-start border-4 border-primary ps-3 bg-primary-subtle py-2 rounded-end">
            <Power size={18} /> Account Status
          </div>
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-bold text-muted">Active Record *</label>
          <select 
            value={formData.Active || 'Yes'} 
            onChange={e => {
              const val = e.target.value as 'Yes' | 'No';
              const updates: Partial<Employee> = { Active: val };
              // Clear deactivation reasons and docs if switching back to Active
              if (val === 'Yes') {
                updates.DA_Reason = '';
                updates.DA_Doc = '';
              }
              setFormData({...formData, ...updates});
            }} 
            className="form-select fw-bold"
          >
            <option value="Yes">YES (ACTIVE)</option>
            <option value="No">NO (INACTIVE)</option>
          </select>
        </div>
        {formData.Active === 'No' && (
          <>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">Deactivation Reason *</label>
              <select value={formData.DA_Reason || ''} onChange={e => setFormData({...formData, DA_Reason: e.target.value})} className={`form-select ${errors.DA_Reason ? 'is-invalid' : ''}`}>
                <option value="">Choose Reason...</option>
                {DEACTIVATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold text-muted">Verification Proof (DA_Doc) *</label>
              <div className="input-group shadow-sm">
                <input type="file" ref={docInputRef} className={`form-control ${errors.Doc ? 'is-invalid' : ''}`} onChange={(e) => handleFileChange(e, 'doc')} accept=".pdf,image/*" />
                {formData.DA_Doc && !formData.DA_Doc.includes('DRIVE_ERR') && (
                    <a href={formData.DA_Doc} target="_blank" rel="noopener noreferrer" className="btn btn-outline-info">
                        <ExternalLink size={16}/>
                    </a>
                )}
              </div>
            </div>
          </>
        )}

        <div className="col-12 text-end mt-5 pt-4 border-top">
          <button type="button" onClick={onCancel} className="btn btn-light px-4 me-3 rounded-pill fw-bold border">Cancel</button>
          <button type="submit" className="btn btn-primary px-5 shadow-lg rounded-pill d-inline-flex align-items-center gap-2 fw-bold" disabled={isUploading}>
            {isUploading ? <><Loader2 size={18} className="animate-spin" /> Synchronizing...</> : <><Save size={18} /> Update Record</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
