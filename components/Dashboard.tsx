
import React, { useMemo } from 'react';
import { Employee, AppData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Users, UserCheck, Landmark, Building2 } from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  data: AppData;
}

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ employees, data }) => {
  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.Gender] = (counts[e.Gender] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const serviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.Service_Type] = (counts[e.Service_Type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const stats = [
    { label: 'Total Employees', value: employees.length, icon: <Users size={24} />, class: 'text-primary bg-primary-subtle' },
    { label: 'Offices', value: data.offices.length, icon: <Building2 size={24} />, class: 'text-info bg-info-subtle' },
    { label: 'Banks', value: data.banks.length, icon: <Landmark size={24} />, class: 'text-success bg-success-subtle' },
    { label: 'Average', value: (employees.length / (data.offices.length || 1)).toFixed(1), icon: <UserCheck size={24} />, class: 'text-warning bg-warning-subtle' },
  ];

  return (
    <div className="dashboard">
      <div className="row g-4 mb-5">
        {stats.map((stat, idx) => (
          <div key={idx} className="col-12 col-sm-6 col-xl-3">
            <div className="card h-100 p-3">
              <div className="d-flex align-items-center gap-3">
                <div className={`p-3 rounded-4 ${stat.class} d-flex align-items-center justify-content-center`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-muted small fw-medium">{stat.label}</div>
                  <div className="h3 fw-bold mb-0">{stat.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card p-4 h-100">
            <h5 className="fw-bold mb-4">Gender Distribution</h5>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                    {genderData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-4 h-100">
            <h5 className="fw-bold mb-4">Service Type</h5>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;