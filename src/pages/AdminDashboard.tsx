import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      console.error("Error logging out:", error.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center space-x-2"
        >
          <img src="/public/logo.png" alt="Logo" className="h-10 w-10" />
          <span className="text-xl font-bold text-gray-800">
            Admin Dashboard
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-300"
        >
          Logout
        </button>
      </div>

      {/* Navigation Buttons - stacked vertically */}
      <div className="mb-6 flex flex-col gap-4">
        <button
          onClick={() => navigate("/inventory")}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-300"
        >
          See All Equipment
        </button>

        <button
          onClick={() => navigate("/users")}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-300"
        >
          Manage Users
        </button>

        <button
          onClick={() => navigate("/assign-sites")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-300"
        >
          Assign Sites to Supervisors
        </button>
      </div>

      <p className="text-gray-600">
        Use the buttons above to navigate to inventory, manage users, or assign sites to supervisors.
      </p>
    </div>
  );
}
