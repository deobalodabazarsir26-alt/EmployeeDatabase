
import React, { useState } from 'react';
import { AppData, User, UserType, Post } from '../types';
import { Briefcase, X, Plus, Info, CheckCircle2, Search, ArrowRight, Lock } from 'lucide-react';

interface UserPostSelectionProps {
  data: AppData;
  currentUser: User;
  onToggle: (postId: number) => void;
}

const UserPostSelection: React.FC<UserPostSelectionProps> = ({ data, currentUser, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const selections = data.userPostSelections || {};
  const currentUserId = Number(currentUser.User_ID);
  const rawSelections = selections[currentUserId];
  const selectedPostIds = Array.isArray(rawSelections) ? rawSelections.map(id => Number(id)) : [];
  const isAdmin = currentUser.User_Type === UserType.ADMIN;

  // Helper to check if a post is in use by any employee
  const getUsageCount = (postId: number) => {
    return (data.employees || []).filter(emp => Number(emp.Post_ID) === postId).length;
  };

  // Derive the two lists
  const selectedPosts = (data.posts || []).filter(p => selectedPostIds.includes(Number(p.Post_ID)));
  const availablePosts = (data.posts || []).filter(p => 
    !selectedPostIds.includes(Number(p.Post_ID)) &&
    (searchTerm === '' || p.Post_Name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRemove = (post: Post) => {
    const count = getUsageCount(Number(post.Post_ID));
    if (count > 0) {
      alert(`Cannot remove "${post.Post_Name}": This designation is currently assigned to ${count} employee(s) in the system. Please update those employee records before removing this designation from your mapping.`);
      return;
    }
    onToggle(Number(post.Post_ID));
  };

  if (isAdmin) {
    return (
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom py-3">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary shadow-sm">
              <Briefcase size={24} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold">System Designation Master</h5>
              <p className="text-muted small mb-0">Full catalog of posts available in the system</p>
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Post Name</th>
                <th>Category</th>
                <th className="text-center">Class</th>
                <th>Global Usage</th>
                <th className="text-end pe-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map(post => {
                const count = getUsageCount(Number(post.Post_ID));
                return (
                  <tr key={post.Post_ID}>
                    <td className="ps-4 fw-semibold">{post.Post_Name}</td>
                    <td><span className="badge bg-light text-dark border">{post.Category}</span></td>
                    <td className="text-center"><span className="badge badge-soft-primary px-3">Class {post.Class}</span></td>
                    <td>
                      <span className={`small fw-bold ${count > 0 ? 'text-primary' : 'text-muted'}`}>
                        {count} Employees
                      </span>
                    </td>
                    <td className="text-end pe-4"><span className="text-success small fw-bold">Active</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="designation-manager">
      {/* SECTION 1: SELECTED POSTS BOX */}
      <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary shadow-sm">
              <CheckCircle2 size={20} />
            </div>
            <h6 className="mb-0 fw-bold">My Active Designations ({selectedPosts.length})</h6>
          </div>
          <span className="badge bg-primary rounded-pill px-3" style={{fontSize: '0.7rem'}}>CLOUD SYNCED</span>
        </div>
        <div className="card-body bg-light-subtle p-4">
          {selectedPosts.length > 0 ? (
            <div className="row g-3">
              {selectedPosts.map(post => {
                const usageCount = getUsageCount(Number(post.Post_ID));
                const isLocked = usageCount > 0;
                
                return (
                  <div key={post.Post_ID} className="col-12 col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-3 h-100 selection-chip bg-white overflow-hidden">
                      <div className="card-body p-3 d-flex align-items-center justify-content-between gap-2">
                        <div className="d-flex align-items-center gap-2 flex-grow-1 min-width-0">
                          <div className="bg-primary-subtle text-primary rounded-circle p-2 flex-shrink-0 d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                            <Briefcase size={16} />
                          </div>
                          
                          <div className="min-width-0">
                            <div className="fw-bold small text-truncate text-dark" title={post.Post_Name}>
                              {post.Post_Name}
                            </div>
                            <div className="text-muted text-truncate d-flex align-items-center gap-1" style={{fontSize: '0.65rem'}}>
                              Class {post.Class} • {post.Category}
                              {isLocked && <span className="text-primary fw-bold ms-1">• In Use ({usageCount})</span>}
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(post);
                          }}
                          className={`btn ${isLocked ? 'btn-light text-muted opacity-50' : 'btn-danger-subtle'} btn-sm rounded-circle p-1 flex-shrink-0 border-0 hover-action-btn shadow-sm ms-2`}
                          title={isLocked ? `Locked: Assigned to ${usageCount} employees` : "Remove Designation"}
                          style={{ 
                            width: '30px', 
                            height: '30px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            position: 'relative',
                            zIndex: 5
                          }}
                        >
                          {isLocked ? <Lock size={14} /> : <X size={16} strokeWidth={3} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="bg-white d-inline-flex p-3 rounded-circle shadow-sm mb-3">
                <Briefcase size={32} className="text-muted opacity-50" />
              </div>
              <h6 className="text-muted fw-bold">No Designations Selected</h6>
              <p className="text-muted small">Choose from the list below to begin building your profile.</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: ADD MORE POSTS */}
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="card-header bg-white border-bottom py-3">
          <div className="row align-items-center">
            <div className="col-12 col-md-6 mb-3 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-success-subtle p-2 rounded-3 text-success shadow-sm">
                  <Plus size={20} />
                </div>
                <h6 className="mb-0 fw-bold">Add More Designations</h6>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0 text-muted ps-3"><Search size={14} /></span>
                <input 
                  type="text" 
                  className="form-control bg-light border-start-0" 
                  placeholder="Filter available posts..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" style={{maxHeight: '400px'}}>
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light sticky-top" style={{zIndex: 10}}>
                <tr>
                  <th className="ps-4 py-3 border-0">Post Name</th>
                  <th className="border-0">Class</th>
                  <th className="border-0">Category</th>
                  <th className="text-end pe-4 border-0">Action</th>
                </tr>
              </thead>
              <tbody>
                {availablePosts.length > 0 ? (
                  availablePosts.map(post => (
                    <tr key={post.Post_ID}>
                      <td className="ps-4">
                        <div className="fw-semibold small">{post.Post_Name}</div>
                      </td>
                      <td><span className="badge badge-soft-primary rounded-pill">Class {post.Class}</span></td>
                      <td><span className="small text-muted">{post.Category}</span></td>
                      <td className="text-end pe-4">
                        <button 
                          onClick={() => onToggle(Number(post.Post_ID))}
                          className="btn btn-sm btn-primary rounded-pill px-3 d-inline-flex align-items-center gap-1 shadow-sm"
                        >
                          <Plus size={14} /> Add <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-5">
                      <p className="text-muted mb-0 small">
                        {searchTerm ? 'No results for your search.' : 'All designations have been added!'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-light py-2 text-center">
          <div className="small text-muted d-flex align-items-center justify-content-center gap-1">
            <Info size={14} className="text-primary" />
            Selection will be saved automatically to <span className="text-primary fw-bold">UserPostSelections</span>
          </div>
        </div>
      </div>

      <style>{`
        .selection-chip { 
          transition: transform 0.2s, box-shadow 0.2s; 
          border: 1px solid #edf2f7 !important;
        }
        .selection-chip:hover { 
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
        }
        .btn-danger-subtle {
          background-color: #fee2e2;
          color: #dc2626;
        }
        .hover-action-btn:hover {
          background-color: #ef4444 !important;
          color: white !important;
          transform: scale(1.1);
        }
        .btn-light.hover-action-btn:hover {
          background-color: #e2e8f0 !important;
          color: #475569 !important;
          transform: none;
        }
        .min-width-0 { min-width: 0; }
        .sticky-top { top: 0; position: sticky; background: white; }
        .bg-light-subtle { background-color: #f8fafc; }
      `}</style>
    </div>
  );
};

export default UserPostSelection;
