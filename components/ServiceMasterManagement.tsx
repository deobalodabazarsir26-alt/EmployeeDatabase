
import React, { useState, useMemo, useEffect } from 'react';
import { Post, Payscale, AppData } from '../types';
import { Briefcase, DollarSign, Plus, Save, Trash2, Edit2, X, Lock, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface ServiceMasterProps {
  data: AppData;
  onSavePost: (post: Post) => void;
  onDeletePost: (postId: number) => void;
  onSavePayscale: (pay: Payscale) => void;
  onDeletePayscale: (payId: number) => void;
}

const ServiceMasterManagement: React.FC<ServiceMasterProps> = ({ data, onSavePost, onDeletePost, onSavePayscale, onDeletePayscale }) => {
  // Post state
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null);
  const [postSearch, setPostSearch] = useState('');
  const [postPage, setPostPage] = useState(1);
  const [postLimit, setPostLimit] = useState(10);
  const [postSort, setPostSort] = useState<{ key: keyof Post, direction: 'asc' | 'desc' } | null>({ key: 'Post_Name', direction: 'asc' });

  // Pay state
  const [editingPay, setEditingPay] = useState<Partial<Payscale> | null>(null);
  const [paySearch, setPaySearch] = useState('');
  const [payPage, setPayPage] = useState(1);
  const [payLimit, setPayLimit] = useState(10);
  const [paySort, setPaySort] = useState<{ key: keyof Payscale, direction: 'asc' | 'desc' } | null>({ key: 'Pay_Name', direction: 'asc' });

  // Filtering & Logic for Posts
  const filteredPosts = useMemo(() => {
    let results = (data.posts || []).filter(p => 
      !postSearch || p.Post_Name.toLowerCase().includes(postSearch.toLowerCase())
    );
    if (postSort) {
      results = [...results].sort((a, b) => {
        const valA = String(a[postSort.key] || '').toLowerCase();
        const valB = String(b[postSort.key] || '').toLowerCase();
        if (valA < valB) return postSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return postSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return results;
  }, [data.posts, postSearch, postSort]);

  const paginatedPosts = useMemo(() => {
    const start = (postPage - 1) * postLimit;
    return filteredPosts.slice(start, start + postLimit);
  }, [filteredPosts, postPage, postLimit]);

  // Filtering & Logic for Payscales
  const filteredPays = useMemo(() => {
    let results = (data.payscales || []).filter(p => 
      !paySearch || p.Pay_Name.toLowerCase().includes(paySearch.toLowerCase())
    );
    if (paySort) {
      results = [...results].sort((a, b) => {
        const valA = String(a[paySort.key] || '').toLowerCase();
        const valB = String(b[paySort.key] || '').toLowerCase();
        if (valA < valB) return paySort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return paySort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return results;
  }, [data.payscales, paySearch, paySort]);

  const paginatedPays = useMemo(() => {
    const start = (payPage - 1) * payLimit;
    return filteredPays.slice(start, start + payLimit);
  }, [filteredPays, payPage, payLimit]);

  useEffect(() => setPostPage(1), [postSearch, postLimit]);
  useEffect(() => setPayPage(1), [paySearch, payLimit]);

  const requestPostSort = (key: keyof Post) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (postSort && postSort.key === key && postSort.direction === 'asc') direction = 'desc';
    setPostSort({ key, direction });
  };

  const requestPaySort = (key: keyof Payscale) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (paySort && paySort.key === key && paySort.direction === 'asc') direction = 'desc';
    setPaySort({ key, direction });
  };

  const getSortIcon = (config: any, key: string) => {
    if (config?.key !== key) return <ChevronDown size={14} className="text-muted opacity-25" />;
    return config.direction === 'asc' ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
  };

  const handlePostSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPost?.Post_Name) {
      onSavePost(editingPost as Post);
      setEditingPost(null);
    }
  };

  const handlePaySave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPay?.Pay_Name) {
      onSavePayscale(editingPay as Payscale);
      setEditingPay(null);
    }
  };

  const isPostDeletable = (id: number) => {
    const hasEmployees = data.employees.some(e => Number(e.Post_ID) === id);
    const hasMappings = Object.values(data.userPostSelections || {}).some((arr: any) => 
      Array.isArray(arr) && arr.includes(id)
    );
    return !hasEmployees && !hasMappings;
  };

  const isPayDeletable = (id: number) => !data.employees.some(e => Number(e.Pay_ID) === id);

  return (
    <div className="row g-4">
      {/* POSTS SECTION */}
      <div className="col-lg-7">
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom py-3 px-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-primary-subtle p-2 rounded-3 text-primary shadow-sm"><Briefcase size={20} /></div>
                <h6 className="mb-0 fw-bold">Designation Master</h6>
              </div>
              <button onClick={() => setEditingPost({})} className="btn btn-sm btn-primary px-3 rounded-pill shadow-sm"><Plus size={14} /> Add Post</button>
            </div>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 ps-3"><Search size={14} /></span>
              <input type="text" className="form-control border-start-0" placeholder="Search designations..." value={postSearch} onChange={e => setPostSearch(e.target.value)} />
            </div>
          </div>

          <div className="card-body p-0">
            {editingPost && (
              <div className="p-4 bg-light border-bottom animate-fade-in">
                <form onSubmit={handlePostSave} className="row g-2">
                  <div className="col-md-5">
                    <label className="tiny fw-bold text-muted text-uppercase mb-1">Post Name</label>
                    <input className="form-control form-control-sm" placeholder="Post Name" value={editingPost.Post_Name || ''} onChange={e => setEditingPost({...editingPost, Post_Name: e.target.value})} required />
                  </div>
                  <div className="col-md-3">
                    <label className="tiny fw-bold text-muted text-uppercase mb-1">Class</label>
                    <select className="form-select form-select-sm" value={editingPost.Class || ''} onChange={e => setEditingPost({...editingPost, Class: e.target.value})} required>
                      <option value="">Class...</option>
                      <option value="I">Class I</option>
                      <option value="II">Class II</option>
                      <option value="III">Class III</option>
                      <option value="IV">Class IV</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="tiny fw-bold text-muted text-uppercase mb-1">Cat.</label>
                    <input className="form-control form-control-sm" placeholder="Cat." value={editingPost.Category || ''} onChange={e => setEditingPost({...editingPost, Category: e.target.value})} />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button type="submit" className="btn btn-primary btn-sm w-100 shadow-sm"><Save size={14} /></button>
                  </div>
                </form>
              </div>
            )}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="tiny text-uppercase">
                    <th className="ps-4 cursor-pointer" onClick={() => requestPostSort('Post_Name')}>
                      <div className="d-flex align-items-center gap-1">Post Name {getSortIcon(postSort, 'Post_Name')}</div>
                    </th>
                    <th className="cursor-pointer" onClick={() => requestPostSort('Class')}>
                      <div className="d-flex align-items-center gap-1">Class {getSortIcon(postSort, 'Class')}</div>
                    </th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPosts.map(p => (
                    <tr key={p.Post_ID} className="small">
                      <td className="ps-4 fw-semibold">{p.Post_Name} <span className="text-muted small">({p.Category})</span></td>
                      <td><span className="badge bg-light text-dark border">{p.Class}</span></td>
                      <td className="text-end pe-4">
                        <div className="d-flex gap-1 justify-content-end">
                          <button onClick={() => setEditingPost(p)} className="btn btn-link btn-sm text-primary p-0"><Edit2 size={14} /></button>
                          {isPostDeletable(Number(p.Post_ID)) ? (
                            <button onClick={() => onDeletePost(Number(p.Post_ID))} className="btn btn-link btn-sm text-danger p-0"><Trash2 size={14} /></button>
                          ) : (
                            <button className="btn btn-link btn-sm text-muted p-0 opacity-50" title="In Use" disabled><Lock size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedPosts.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-4 text-muted">No posts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="tiny text-muted">Showing {Math.min(filteredPosts.length, (postPage-1)*postLimit+1)}-{Math.min(filteredPosts.length, postPage*postLimit)} of {filteredPosts.length}</div>
              <select className="form-select form-select-sm" style={{width: '70px'}} value={postLimit} onChange={e => setPostLimit(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            {Math.ceil(filteredPosts.length/postLimit) > 1 && (
              <nav><ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${postPage === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPostPage(p => p - 1)}><ChevronLeft size={14}/></button></li>
                <li className="page-item active"><span className="page-link px-2">{postPage}</span></li>
                <li className={`page-item ${postPage === Math.ceil(filteredPosts.length/postLimit) ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPostPage(p => p + 1)}><ChevronRight size={14}/></button></li>
              </ul></nav>
            )}
          </div>
        </div>
      </div>

      {/* PAYSCALE SECTION */}
      <div className="col-lg-5">
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom py-3 px-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-success-subtle p-2 rounded-3 text-success shadow-sm"><DollarSign size={20} /></div>
                <h6 className="mb-0 fw-bold">Pay Scales</h6>
              </div>
              <button onClick={() => setEditingPay({})} className="btn btn-sm btn-success px-3 rounded-pill shadow-sm"><Plus size={14} /> Add Scale</button>
            </div>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 ps-3"><Search size={14} /></span>
              <input type="text" className="form-control border-start-0" placeholder="Search scales..." value={paySearch} onChange={e => setPaySearch(e.target.value)} />
            </div>
          </div>

          <div className="card-body p-0">
            {editingPay && (
              <div className="p-4 bg-light border-bottom animate-fade-in">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="tiny fw-bold text-muted text-uppercase">Pay Scale Config</h6>
                  <button type="button" onClick={() => setEditingPay(null)} className="btn btn-link text-muted p-0"><X size={16} /></button>
                </div>
                <form onSubmit={handlePaySave} className="input-group input-group-sm">
                  <input className="form-control" placeholder="Level/Scale Name" value={editingPay.Pay_Name || ''} onChange={e => setEditingPay({...editingPay, Pay_Name: e.target.value})} required />
                  <button type="submit" className="btn btn-success"><Save size={14} /></button>
                </form>
              </div>
            )}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="tiny text-uppercase">
                    <th className="ps-4 cursor-pointer" onClick={() => requestPaySort('Pay_Name')}>
                      <div className="d-flex align-items-center gap-1">Scale Name {getSortIcon(paySort, 'Pay_Name')}</div>
                    </th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPays.map(s => (
                    <tr key={s.Pay_ID} className="small">
                      <td className="ps-4 fw-semibold">{s.Pay_Name}</td>
                      <td className="text-end pe-4">
                        <div className="d-flex gap-1 justify-content-end">
                          <button onClick={() => setEditingPay(s)} className="btn btn-link btn-sm text-primary p-0"><Edit2 size={14} /></button>
                          {isPayDeletable(Number(s.Pay_ID)) ? (
                            <button onClick={() => onDeletePayscale(Number(s.Pay_ID))} className="btn btn-link btn-sm text-danger p-0"><Trash2 size={14} /></button>
                          ) : (
                            <button className="btn btn-link btn-sm text-muted p-0 opacity-50" title="In Use" disabled><Lock size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedPays.length === 0 && (
                    <tr><td colSpan={2} className="text-center py-4 text-muted">No scales found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="tiny text-muted">{filteredPays.length} Total</div>
              <select className="form-select form-select-sm" style={{width: '70px'}} value={payLimit} onChange={e => setPayLimit(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            {Math.ceil(filteredPays.length/payLimit) > 1 && (
              <nav><ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${payPage === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPayPage(p => p - 1)}><ChevronLeft size={14}/></button></li>
                <li className="page-item active"><span className="page-link px-2">{payPage}</span></li>
                <li className={`page-item ${payPage === Math.ceil(filteredPays.length/payLimit) ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPayPage(p => p + 1)}><ChevronRight size={14}/></button></li>
              </ul></nav>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .tiny { font-size: 0.7rem; }
        .cursor-pointer { cursor: pointer; }
        .cursor-pointer:hover { background-color: #f8fafc; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ServiceMasterManagement;