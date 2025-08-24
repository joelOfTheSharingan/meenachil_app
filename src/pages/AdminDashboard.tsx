import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // For navigation

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .ilike("name", `%${searchTerm}%`);
      if (error) {
        console.error("Error fetching users:", error.message);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    if (searchTerm.length > 0) {
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut(); // Log the user out
      navigate("/login"); // Redirect to the login page
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        {/* Logo Button */}
        <button
          onClick={() => navigate("/home")} // Redirect to home page
          className="flex items-center space-x-2"
        >
          <img
            src="/public/logo.png" // Replace with your logo's path
            alt="Logo"
            className="h-10 w-10"
          />
          <span className="text-xl font-bold text-gray-800">
            Admin Dashboard
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-300"
        >
          Logout
        </button>
      </div>

      {/* See All Equipment Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/inventory")}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-300"
        >
          See All Equipment
        </button>
      </div>

      {/* Search Input */}
      <input
        type="text"
        className="border p-2 w-full mb-4"
        placeholder="Search user by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* User List */}
      {loading ? (
        <p>Loading...</p>
      ) : users.length > 0 ? (
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="p-4 border rounded">
              <p>
                <strong>Name:</strong> {user.name}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Role:</strong> {user.role}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        searchTerm && <p>No users found.</p>
      )}
    </div>
  );
}
