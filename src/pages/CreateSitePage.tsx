import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

export default function CreateSitePage() {
  const navigate = useNavigate();
  const [siteName, setSiteName] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch users from Supabase on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users") // replace with your users table name
        .select("id, email"); 

      if (error) {
        console.error("Error fetching users:", error.message);
      } else {
        setUsers(data || []);
      }
    };

    fetchUsers();
  }, []);

  const handleCreateSite = async () => {
  if (!siteName || !selectedUser) {
    setError("Please fill in all fields.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    // 1️⃣ Get the current max ID in the table
    const { data: maxData, error: maxError } = await supabase
      .from("construction_sites")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (maxError) throw maxError;

    // 2️⃣ Generate a new unique ID
    const newId = maxData?.[0]?.id + 1 || 1; // start from 1 if table empty

    // 3️⃣ Insert the new site
    const { data, error } = await supabase
      .from("construction_sites")
      .insert([
        { id: newId, site_name: siteName, supervisor_id: selectedUser },
      ]);

    if (error) throw error;

    // 4️⃣ Redirect to site list on success
    navigate("/assign-sites");
  } catch (err: any) {
    console.error("Error creating site:", err.message);
    setError(err.message || "Failed to create site.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Create New Site</h1>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <div className="mb-4">
        <label className="block font-medium mb-1">Site Name</label>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1">Assign Supervisor</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Select a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCreateSite}
        disabled={loading}
        className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded font-semibold w-full"
      >
        {loading ? "Creating..." : "Create Site"}
      </button>
    </div>
  );
}
