
import React from 'react';
import { UserType, User, AppData } from '../types';
import { LayoutDashboard, Users, Building2, Landmark, LogOut, ChevronRight, Briefcase } from 'lucide-react';

interface SidebarProps {
  data: AppData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ data, activeTab, setActiveTab, currentUser, onLogout }) => {
  const userType = currentUser.User_Type;
  const userName = currentUser.User_Name;
  const selectedCount = data.userPostSelections?.[currentUser.User_ID]?.length || 0;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, adminOnly: false },
    { id: 'employees', label: 'Employees', icon: <Users size={20} />, adminOnly: false },
    { 
      id: 'managePosts', 
      label: userType === UserType.ADMIN ? 'All Posts' : 'Manage My Posts', 
      icon: <Briefcase size={20} />, 
      adminOnly: false,
      badge: userType !== UserType.ADMIN && selectedCount > 0 ? selectedCount : null
    },
    { id: 'offices', label: 'Offices', icon: <Building2 size={20} />, adminOnly: true },
    { id: 'banks', label: 'Banks', icon: <Landmark size={20} />, adminOnly: true },
  ];

  return (
    <div className="sidebar d-flex flex-column flex-shrink-0 p-3" style={{ width: '280px' }}>
      <div className="d-flex align-items-center mb-4 px-2">
        <div className="bg-primary rounded-3 p-2 me-2 d-flex align-items-center justify-content-center text-white" style={{width: '40px', height: '40px'}}>
          <Users size={24} strokeWidth={3} />
        </div>
        <span className="fs-4 fw-bold tracking-tight">EMS Portal</span>
      </div>
      
      <hr className="bg-secondary" />

      <ul className="nav nav-pills flex-column mb-auto">
        {menuItems.map((item) => {
          if (item.adminOnly && userType !== UserType.ADMIN) return null;
          const isActive = activeTab === item.id || (item.id === 'employees' && activeTab === 'employeeForm');
          
          return (
            <li className="nav-item" key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`nav-link border-0 w-100 text-start ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span className="flex-grow-1">{item.label}</span>
                {item.badge && <span className="badge bg-white text-primary rounded-pill small me-2" style={{fontSize: '0.65rem'}}>{item.badge}</span>}
                {isActive && <ChevronRight size={14} />}
              </button>
            </li>
          );
        })}
      </ul>

      <hr className="bg-secondary" />
      
      <div className="dropdown">
        <div className="d-flex align-items-center text-white text-decoration-none px-2 mb-2">
          <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: '32px', height: '32px'}}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="fw-bold small truncate">{userName}</div>
            <div className="text-secondary" style={{fontSize: '0.7rem'}}>{userType} Account</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn btn-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-2 mt-2">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
