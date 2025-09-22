import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";

interface Site {
  id: string;
  site_name: string;
  supervisor_id?: string | null;
  supervisor?: {
    id: string;
    username: string;
    email: string;
  } | null;
}

interface Supervisor {
  id: string;
  username: string;
  email: string;
}

export default function AssignSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch all construction sites (with assigned supervisors)
  const fetchSites = async () => {
    const { data, error } = await supabase
      .from("construction_sites")
      .select("id, site_name, supervisor_id, supervisor:supervisor_id (id, username, email)");

    if (error) {
      console.error("Error fetching sites:", error);
      return;
    }
    setSites(data || []);
  };

  // Fetch supervisors list
  const fetchSupervisors = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("role", "supervisor");

    if (error) {
      console.error("Error fetching supervisors:", error);
      return;
    }
    setSupervisors(data || []);
  };

  useEffect(() => {
    fetchSites();
    fetchSupervisors();
  }, []);

  // Handle assignment
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !selectedSupervisor) return;

    setLoading(true);

    const { error } = await supabase
      .from("construction_sites")
      .update({ supervisor_id: selectedSupervisor })
      .eq("id", selectedSite);

    setLoading(false);

    if (error) {
      console.error("Error assigning supervisor:", error);
      alert("❌ Failed to assign supervisor");
    } else {
      alert("✅ Supervisor assigned successfully!");
      setSelectedSite("");
      setSelectedSupervisor("");
      fetchSites(); // refresh list immediately
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold mb-6">Assign Supervisors to Sites</h1>

      <form onSubmit={handleAssign} className="space-y-4 mb-8">
        {/* Site Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Select Site</label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          >
            <option value="">Choose a site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
        </div>

        {/* Supervisor Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Select Supervisor</label>
          <select
            value={selectedSupervisor}
            onChange={(e) => setSelectedSupervisor(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          >
            <option value="">Choose a supervisor</option>
            {supervisors.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.username} ({sup.email})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedSite || !selectedSupervisor}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Assigning..." : "Assign Supervisor"}
        </button>
      </form>

      {/* Current Site Assignments */}
      {/* Current Site Assignments */}
<div>
  <h2 className="text-xl font-semibold mb-4">Current Site Assignments</h2>
  {sites.length === 0 ? (
    <p className="text-gray-500">No sites available.</p>
  ) : (
    <ul className="space-y-3">
      {sites.map((site) => (
        <li
          key={site.id}
          className="p-4 border rounded-lg bg-gray-50 flex justify-between"
        >
          <span className="font-medium">{site.site_name}</span>
          <span className="text-sm text-gray-600">
            {site.supervisor
              ? site.supervisor.username
                ? site.supervisor.username
                : site.supervisor.email
              : "Unassigned"}
          </span>
        </li>
      ))}
    </ul>
  )}
</div>

    </div>
  );
}
