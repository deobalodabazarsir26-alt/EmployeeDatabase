
import React, { useState } from 'react';
import { AppData, User, UserType, Post } from '../types';
import { Briefcase, X, Plus, Info, CheckCircle2, Search, ArrowRight } from 'lucide-react';

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

  // Derive the two lists
  const selectedPosts = (data.posts || []).filter(p => selectedPostIds.includes(Number(p.Post_ID)));
  const availablePosts = (data.posts || []).filter(p => 
    !selectedPostIds.includes(Number(p.Post_ID)) &&
    (searchTerm === '' || p.Post_Name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                <th className="text-end pe-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map(post => (
                <tr key={post.Post_ID}>
                  <td className="ps-4 fw-semibold">{post.Post_Name}</td>
                  <td><span className="badge bg-light text-dark border">{post.Category}</span></td>
                  <td className="text-center"><span className="badge badge-soft-primary px-3">Class {post.Class}</span></td>
                  <td className="text-end pe-4"><span className="text-success small fw-bold">Active</span></td>
                </tr>
              ))}
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
              {selectedPosts.map(post => (
                <div key={post.Post_ID} className="col-12 col-md-6 col-lg-4">
                  <div className="card border-0 shadow-sm rounded-3 h-100 selection-chip position-relative overflow-hidden bg-white">
                    <div className="card-body p-3 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary rounded-circle p-2 text-white">
                          <Briefcase size={14} />
                        </div>
                        <div>
                          <div className="fw-bold small text-truncate" style={{maxWidth: '150px'}} title={post.Post_Name}>
                            {post.Post_Name}
                          </div>
                          <div className="text-muted" style={{fontSize: '0.65rem'}}>Class {post.Class} • {post.Category}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => onToggle(Number(post.Post_ID))}
                        className="btn btn-outline-danger btn-sm rounded-circle p-1 border-0 hover-bg-danger shadow-none"
                        title="Remove Designation"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
              <thead className="table-light sticky-top" style={{zIndex: 1}}>
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
        .hover-bg-danger:hover {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }
        .sticky-top { top: 0; }
        .bg-light-subtle { background-color: #f8fafc; }
      `}</style>
    </div>
  );
};

export default UserPostSelection;
