import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error getting session:", sessionError.message);
        return;
      }

      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Logout failed:", error.message);
      }

      navigate("/login");
    } catch (err: any) {
      console.error("Unexpected logout error:", err.message);
      navigate("/login");
    }
  };

  const baseBtn = "text-white font-semibold px-4 py-2 rounded-lg transition duration-300";

  const navButtons = [
    { label: "See All Equipment", path: "/inventory", color: "bg-blue-500 hover:bg-blue-600", icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>) },
    { label: "Manage Users", path: "/users", color: "bg-green-500 hover:bg-green-600", icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>) },
    { label: "Manage Sites", path: "/assign-sites", color: "bg-yellow-500 hover:bg-yellow-600", icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>) },
    { label: "Transaction Logs", path: "/transactions", color: "bg-purple-500 hover:bg-purple-600", icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>) },
    { label: "Create New Site", path: "/create-site", color: "bg-indigo-500 hover:bg-indigo-600", icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>) },
  ];

  return (
    <div className="relative">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Admin Menu</h2>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="space-y-4">
            {navButtons.map((btn) => (
              <Link
                key={btn.path}
                to={btn.path}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 focus:outline-none hover:text-gray-800 transition-colors" onClick={() => setSidebarOpen(true)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition duration-300"
            >
              Log Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {navButtons.map((btn) => (
              <button
                key={btn.path}
                onClick={() => navigate(btn.path)}
                className={`${baseBtn} ${btn.color} flex items-center space-x-3 justify-center`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Admin Panel</h3>
            <p className="text-gray-600">
              Use the buttons above or the menu sidebar to navigate to inventory management, 
              user management, site assignment, or view transaction logs. The sidebar provides 
              quick access to all administrative functions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
