
import React, { useState } from 'react';
import { Bank, BankBranch, AppData } from '../types';
import { Plus, Landmark, Building, Hash, Save, MapPin } from 'lucide-react';

interface BankManagementProps {
  data: AppData;
  onSaveBank: (bank: Bank) => void;
  onSaveBranch: (branch: BankBranch) => void;
}

const BankManagement: React.FC<BankManagementProps> = ({ data, onSaveBank, onSaveBranch }) => {
  const [newBankName, setNewBankName] = useState('');
  const [newBranch, setNewBranch] = useState<Partial<BankBranch>>({});

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBankName.trim()) {
      onSaveBank({ Bank_ID: 0, Bank_Name: newBankName });
      setNewBankName('');
    }
  };

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBranch.Branch_Name && newBranch.IFSC_Code && newBranch.Bank_ID) {
      onSaveBranch(newBranch as BankBranch);
      setNewBranch({});
    }
  };

  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <div className="card shadow-sm border-0 rounded-4 h-100">
          <div className="card-header bg-white border-bottom py-3">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary-subtle p-2 rounded-3 text-primary">
                <Landmark size={20} />
              </div>
              <h6 className="mb-0 fw-bold">Supported Banks</h6>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleBankSubmit} className="mb-4">
              <label className="form-label small fw-bold text-muted">Register New Bank</label>
              <div className="input-group">
                <input 
                  placeholder="Enter full bank name..." 
                  value={newBankName} 
                  onChange={e => setNewBankName(e.target.value)}
                  className="form-control"
                  required
                />
                <button className="btn btn-primary px-3" type="submit">
                  <Plus size={18} />
                </button>
              </div>
            </form>

            <div className="list-group list-group-flush border rounded-3 overflow-hidden">
              {data.banks.map(bank => (
                <div key={bank.Bank_ID} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-light text-muted p-2 rounded-circle">
                      <Landmark size={14} />
                    </div>
                    <span className="fw-semibold text-dark">{bank.Bank_Name}</span>
                  </div>
                  <span className="badge bg-light text-muted fw-normal border">ID: {bank.Bank_ID}</span>
                </div>
              ))}
              {data.banks.length === 0 && (
                <div className="list-group-item text-center py-4 text-muted small">No banks registered yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-7">
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-header bg-white border-bottom py-3">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-success-subtle p-2 rounded-3 text-success">
                <Building size={20} />
              </div>
              <h6 className="mb-0 fw-bold">Branch Locations & IFSC</h6>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleBranchSubmit} className="p-3 bg-light rounded-3 border mb-4">
              <h6 className="fw-bold mb-3 small text-uppercase tracking-wider">Add New Branch Linkage</h6>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-bold mb-1">Select Bank *</label>
                  <select 
                    required 
                    value={newBranch.Bank_ID || ''} 
                    onChange={e => setNewBranch({...newBranch, Bank_ID: Number(e.target.value)})}
                    className="form-select"
                  >
                    <option value="">-- Choose a Bank --</option>
                    {data.banks.map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
                  </select>
                </div>
                <div className="col-md-7">
                  <label className="form-label small fw-bold mb-1">Branch Name *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><MapPin size={16} /></span>
                    <input 
                      required 
                      value={newBranch.Branch_Name || ''} 
                      onChange={e => setNewBranch({...newBranch, Branch_Name: e.target.value})}
                      className="form-control"
                      placeholder="e.g. Downtown"
                    />
                  </div>
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-bold mb-1">IFSC Code *</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Hash size={16} /></span>
                    <input 
                      required 
                      value={newBranch.IFSC_Code || ''} 
                      onChange={e => setNewBranch({...newBranch, IFSC_Code: e.target.value})}
                      className="form-control"
                      placeholder="e.g. SBIN00..."
                    />
                  </div>
                </div>
                <div className="col-12 text-end">
                  <button type="submit" className="btn btn-success d-inline-flex align-items-center gap-2 px-4 shadow-sm">
                    <Save size={18} /> Create Branch
                  </button>
                </div>
              </div>
            </form>

            <div className="table-responsive border rounded-3 overflow-hidden">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3 border-0 py-3">Branch Name</th>
                    <th className="border-0 py-3">IFSC Code</th>
                    <th className="border-0 py-3">Associated Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branches.map(branch => (
                    <tr key={branch.Branch_ID}>
                      <td className="ps-3 fw-bold">{branch.Branch_Name}</td>
                      <td>
                        <code className="bg-light px-2 py-1 rounded text-primary border">{branch.IFSC_Code}</code>
                      </td>
                      <td className="small text-secondary">
                        {data.banks.find(b => b.Bank_ID === branch.Bank_ID)?.Bank_Name || 'Unknown Bank'}
                      </td>
                    </tr>
                  ))}
                  {data.branches.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted small">No branch data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankManagement;
