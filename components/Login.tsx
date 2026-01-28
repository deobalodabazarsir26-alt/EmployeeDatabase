
import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, ShieldAlert, Lock, User as UserIcon } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.User_Name === userName && u.Password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('The credentials you entered are incorrect.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark bg-gradient">
      <div className="container" style={{ maxWidth: '480px' }}>
        <div className="text-center mb-5">
          <div className="bg-primary d-inline-flex align-items-center justify-content-center p-3 rounded-4 shadow-lg mb-3">
            <LogIn size={40} className="text-white" />
          </div>
          <h1 className="text-white fw-bold mb-1">Officials Login</h1>
          <p className="text-secondary">Please enter your credentials</p>
        </div>

        <div className="card login-card shadow-lg p-4 p-md-5">
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 rounded-3 border-0 py-2 small mb-4">
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label small fw-bold text-uppercase text-muted">Username</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted"><UserIcon size={18} /></span>
                <input 
                  type="text" 
                  className="form-control bg-light border-start-0" 
                  placeholder="Enter username" 
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold text-uppercase text-muted">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted"><Lock size={18} /></span>
                <input 
                  type="password" 
                  className="form-control bg-light border-start-0" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-3 fw-bold shadow-sm mb-4">
              Submit
            </button>
          </form>

          <div className="text-center mt-3 pt-4 border-top">
            <div className="text-muted small fw-bold mb-3 text-uppercase tracking-wider" style={{fontSize: '0.6rem'}}>Demo Accounts</div>
            <div className="d-flex gap-2 justify-content-center">
              <button 
                onClick={() => { setUserName('admin'); setPassword('123'); }}
                className="btn btn-outline-primary btn-sm rounded-pill px-3"
              >
                Admin User
              </button>
              <button 
                onClick={() => { setUserName('user1'); setPassword('123'); }}
                className="btn btn-outline-success btn-sm rounded-pill px-3"
              >
                Normal User
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-5">
          <p className="text-secondary small">&copy; 2026 EMS • Employee Database System</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
