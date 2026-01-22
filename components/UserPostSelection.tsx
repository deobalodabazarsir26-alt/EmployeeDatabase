
import React from 'react';
import { AppData, User, UserType } from '../types';
import { Briefcase, CheckCircle2, Circle, Search, Info } from 'lucide-react';

interface UserPostSelectionProps {
  data: AppData;
  currentUser: User;
  onToggle: (postId: number) => void;
}

const UserPostSelection: React.FC<UserPostSelectionProps> = ({ data, currentUser, onToggle }) => {
  const selections = data.userPostSelections || {};
  const rawSelections = selections[currentUser.User_ID];
  const selectedPostIds = Array.isArray(rawSelections) ? rawSelections : [];
  const isAdmin = currentUser.User_Type === UserType.ADMIN;

  return (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
      <div className="card-header bg-white border-bottom py-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary-subtle p-2 rounded-3 text-primary">
              <Briefcase size={24} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold">
                {isAdmin ? 'Designation Master List' : 'My Designation Preferences'}
              </h5>
              <p className="text-muted small mb-0">
                {isAdmin 
                  ? 'System-wide configuration of employee posts' 
                  : 'Manage which posts are available in your data entry forms'}
              </p>
            </div>
          </div>
          {!isAdmin && (
             <div className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill d-flex align-items-center gap-2">
               <Info size={14} />
               <span className="small fw-bold">{selectedPostIds.length} Selected</span>
             </div>
          )}
        </div>
      </div>
      
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                {!isAdmin && <th className="ps-4 border-0 text-center" style={{width: '60px'}}>Pick</th>}
                <th className={isAdmin ? "ps-4 border-0" : "border-0"}>Post Name</th>
                <th className="border-0">Category</th>
                <th className="border-0 text-center">Class</th>
                <th className="text-end pe-4 border-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.posts || []).map((post) => {
                const isSelected = selectedPostIds.includes(post.Post_ID);
                return (
                  <tr key={post.Post_ID} className={isSelected ? "table-primary-subtle" : ""}>
                    {!isAdmin && (
                      <td className="ps-4 text-center">
                        <button 
                          onClick={() => onToggle(post.Post_ID)}
                          className={`btn btn-sm p-1 rounded-circle border-0 transition-all ${isSelected ? 'text-primary' : 'text-muted opacity-25'}`}
                          title={isSelected ? "Click to remove" : "Click to select"}
                        >
                          {isSelected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                      </td>
                    )}
                    <td className={isAdmin ? "ps-4 fw-semibold" : "fw-semibold"}>
                      <div className="d-flex align-items-center gap-2">
                        {post.Post_Name}
                        {isSelected && !isAdmin && <span className="badge bg-primary rounded-circle p-1" style={{width: '6px', height: '6px', fontSize: 0}}>·</span>}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border fw-normal px-2">
                        {post.Category}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-soft-primary px-3 rounded-pill">
                        {post.Class}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      {isSelected ? (
                        <span className="badge bg-success-subtle text-success small rounded-pill px-2">Mapped</span>
                      ) : (
                        <span className="text-muted small opacity-50">Available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {!isAdmin && (
        <div className="card-footer bg-light py-3 border-top-0 border-bottom border-4 border-primary">
          <div className="small text-muted text-center fw-medium">
            Selections are automatically saved to your <span className="text-primary fw-bold">Cloud Profile</span> in Google Sheets
          </div>
        </div>
      )}

      <style>{`
        .transition-all { transition: all 0.2s ease; }
        .transition-all:hover { transform: scale(1.1); }
      `}</style>
    </div>
  );
};

export default UserPostSelection;
