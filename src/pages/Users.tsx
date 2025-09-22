
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, role")
      .ilike("username", `%${searchTerm}%`)
      .order("username", { ascending: true });

    if (error) {
      console.error("Error fetching users:", error.message);
      setUsers([]);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const switchRole = async () => {
    if (!confirmUser || !newRole) return;

    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", confirmUser.id);

    if (error) {
      console.error("Error updating role:", error.message);
    } else {
      fetchUsers();
    }
    setConfirmUser(null);
    setNewRole(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Navigation Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate("/admin")}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300"
        >
          ← Back to Dashboard
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Search Input */}
      <input
        type="text"
        className="border p-2 w-full mb-4 rounded-lg"
        placeholder="Search user by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* User List */}
      {loading ? (
        <p>Loading...</p>
      ) : users.length > 0 ? (
        <ul className="space-y-2">
          {users.map((user) => {
            const targetRole = user.role === "admin" ? "supervisor" : "admin";
            const buttonColor =
              targetRole === "admin"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-purple-500 hover:bg-purple-600";

            return (
              <li
                key={user.id}
                className="p-4 border rounded flex justify-between items-center"
              >
                <div>
                  <p>
                    <strong>Name:</strong> {user.username}
                  </p>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p>
                    <strong>Role:</strong> {user.role}
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => {
                      setConfirmUser(user);
                      setNewRole(targetRole);
                    }}
                    className={`w-32 text-white px-3 py-1 rounded-lg text-sm transition duration-300 ${buttonColor}`}
                  >
                    {targetRole === "admin" ? "Make Admin" : "Make Supervisor"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        searchTerm && <p>No users found.</p>
      )}

      {/* Confirmation Popup */}
      {confirmUser && newRole && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80 text-center">
            <p className="mb-4">
              Are you sure you want to make{" "}
              <span className="font-bold">{confirmUser.username}</span> an{" "}
              <span className="font-bold">{newRole}</span>?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={switchRole}
                className="w-24 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setConfirmUser(null);
                  setNewRole(null);
                }}
                className="w-24 bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-lg"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}