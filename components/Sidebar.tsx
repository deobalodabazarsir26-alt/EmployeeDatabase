
import React from 'react';
import { UserType, User, AppData } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Landmark, 
  LogOut, 
  ChevronRight, 
  Briefcase, 
  ShieldCheck, 
  Layers, 
  DollarSign,
  ShieldAlert,
  X
} from 'lucide-react';

interface SidebarProps {
  data: AppData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ data, activeTab, setActiveTab, currentUser, onLogout, onClose }) => {
  const userType = currentUser.User_Type;
  const userName = currentUser.User_Name;
  const currentUserId = currentUser.User_ID;

  const selectedCount = React.useMemo(() => {
    const selections = data.userPostSelections || {};
    const ids = selections[currentUserId] || (selections as any)[currentUserId.toString()];
    return Array.isArray(ids) ? ids.length : 0;
  }, [data.userPostSelections, currentUserId]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, adminOnly: false },
    { id: 'employees', label: 'Employees', icon: <Users size={20} />, adminOnly: false },
    { id: 'finalization', label: 'Finalization', icon: <ShieldAlert size={20} />, adminOnly: false },
    { 
      id: 'managePosts', 
      label: userType === UserType.ADMIN ? 'Designation Master' : 'My Designations', 
      icon: <Briefcase size={20} />, 
      adminOnly: false,
      badge: userType !== UserType.ADMIN && selectedCount > 0 ? selectedCount : null
    },
    { type: 'divider', adminOnly: true },
    { type: 'header', label: 'Administration', adminOnly: true },
    { id: 'users', label: 'User Accounts', icon: <ShieldCheck size={20} />, adminOnly: true },
    { id: 'offices', label: 'Office Master', icon: <Building2 size={20} />, adminOnly: true },
    { id: 'departments', label: 'Departments', icon: <Layers size={20} />, adminOnly: true },
    { id: 'banks', label: 'Bank & Branches', icon: <Landmark size={20} />, adminOnly: true },
    { id: 'serviceMaster', label: 'Post & Pay Master', icon: <DollarSign size={20} />, adminOnly: true },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (onClose && window.innerWidth <= 992) {
      onClose();
    }
  };

  return (
    <div className="sidebar d-flex flex-column h-100 p-3 bg-dark">
      {/* Sidebar Header - Fixed */}
      <div className="d-flex align-items-center justify-content-between mb-4 px-2 flex-shrink-0">
        <div className="d-flex align-items-center">
          <div className="bg-primary rounded-3 p-2 me-2 d-flex align-items-center justify-content-center text-white" style={{width: '40px', height: '40px'}}>
            <Users size={24} strokeWidth={3} />
          </div>
          <span className="fs-5 fw-bold tracking-tight text-white">EMS Portal</span>
        </div>
        <button className="btn btn-dark d-lg-none p-1" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
      
      {/* Scrollable Menu Area */}
      <div className="flex-grow-1 overflow-y-auto pe-1 custom-sidebar-scroll mb-3">
        <ul className="nav nav-pills flex-column">
          {menuItems.map((item, idx) => {
            if (item.adminOnly && userType !== UserType.ADMIN) return null;
            
            if (item.type === 'divider') {
              return <hr key={`div-${idx}`} className="bg-secondary opacity-25 my-2 my-md-3" />;
            }
            
            if (item.type === 'header') {
              return <li key={`head-${idx}`} className="px-3 mb-1 mb-md-2 small text-uppercase text-secondary fw-bold" style={{fontSize: '0.65rem', letterSpacing: '0.05em'}}>{item.label}</li>;
            }

            const isActive = activeTab === item.id || (item.id === 'employees' && activeTab === 'employeeForm');
            
            return (
              <li className="nav-item" key={item.id}>
                <button
                  onClick={() => handleTabClick(item.id!)}
                  className={`nav-link border-0 w-100 text-start py-2 py-md-3 ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span className="flex-grow-1 text-truncate">{item.label}</span>
                  {item.badge && <span className="badge bg-white text-primary rounded-pill small me-2" style={{fontSize: '0.65rem'}}>{item.badge}</span>}
                  {isActive && <ChevronRight size={14} className="flex-shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <hr className="bg-secondary opacity-25 my-3 flex-shrink-0" />
      
      {/* Sidebar Footer - Fixed */}
      <div className="dropdown mt-auto flex-shrink-0">
        <div className="d-flex align-items-center text-white text-decoration-none px-2 mb-2">
          <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center me-2 flex-shrink-0" style={{width: '32px', height: '32px'}}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="fw-bold small text-truncate">{userName}</div>
            <div className="text-secondary text-truncate" style={{fontSize: '0.7rem'}}>{userType} Account</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn btn-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-2 mt-2 border-secondary shadow-sm">
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <style>{`
        .custom-sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        .custom-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        }
        .nav-link.active {
          background-color: var(--bs-primary) !important;
          color: white !important;
        }
        .nav-link {
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;