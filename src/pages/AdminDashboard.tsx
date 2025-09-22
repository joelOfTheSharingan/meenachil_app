import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Shared button base styles
  const baseBtn =
    "text-white font-semibold px-4 py-2 rounded-lg transition duration-300";

  // Navigation buttons configuration
  const navButtons = [
    {
      label: "See All Equipment",
      path: "/inventory",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      label: "Manage Users",
      path: "/users",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      label: "Manage Sites",
      path: "/assign-sites",
      color: "bg-yellow-500 hover:bg-yellow-600",
    },
    {
      label: "Transaction Logs",
      path: "/transactions",
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center mb-6">
        <button
          onClick={handleLogout}
          className={`${baseBtn} bg-red-500 hover:bg-red-600 ml-auto`}
        >
          Logout
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="mb-6 flex flex-col gap-4">
        {navButtons.map((btn) => (
          <button
            key={btn.path}
            onClick={() => navigate(btn.path)}
            className={`${baseBtn} ${btn.color}`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <p className="text-gray-600">
        Use the buttons above to navigate to inventory, manage users, assign
        sites, or view transaction logs.
      </p>
    </div>
  );
}
