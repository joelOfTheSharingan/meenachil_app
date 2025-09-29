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
  const [pageLoading, setPageLoading] = useState(true);

  // Fetch all construction sites (with assigned supervisors)
  const fetchSites = async () => {
    console.log("🔄 Fetching sites...");
    const { data, error } = await supabase
      .from("construction_sites")
      .select("id, site_name, supervisor_id");

    if (error) {
      console.error("❌ Error fetching sites:", error);
      return;
    }
    console.log("✅ Sites fetched:", data);
    setSites(data || []);
  };

  // Fetch supervisors list
  const fetchSupervisors = async () => {
    console.log("🔄 Fetching supervisors...");
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("role", "supervisor");

    if (error) {
      console.error("❌ Error fetching supervisors:", error);
      return;
    }
    console.log("✅ Supervisors fetched:", data);
    setSupervisors(data || []);
  };

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        if (mounted) {
          setPageLoading(true);
          console.log("🚀 Starting data load...");
        }
        
        const [sitesResult, supervisorsResult] = await Promise.allSettled([
          fetchSites(), 
          fetchSupervisors()
        ]);
        
        if (mounted) {
          console.log("✅ Data loading complete");
          setPageLoading(false);
        }
      } catch (error) {
        console.error("❌ Error loading data:", error);
        if (mounted) {
          setPageLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Handle supervisor selection change
  const handleSupervisorChange = (supervisorId: string) => {
    setSelectedSupervisor(supervisorId);
    // Do not auto-select site - let user choose manually
  };

  // Handle site selection change
  const handleSiteChange = (siteId: string) => {
    setSelectedSite(siteId);
    
    // Find the supervisor currently assigned to this site
    const siteSupervisor = sites.find(site => site.id === siteId);
    
    if (siteSupervisor && siteSupervisor.supervisor_id) {
      setSelectedSupervisor(siteSupervisor.supervisor_id);
    } else {
      setSelectedSupervisor(""); // Clear supervisor selection if site has no current assignment
    }
  };

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

  if (pageLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto bg-white shadow-md rounded-xl">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sites and supervisors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold mb-6">Assign Supervisors to Sites</h1>

      <form onSubmit={handleAssign} className="space-y-4 mb-8">
        {/* Site Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Select Site ({sites.length} available)</label>
          <select
            value={selectedSite}
            onChange={(e) => handleSiteChange(e.target.value)}
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
          <label className="block text-sm font-medium mb-1">Select Investigator/Supervisor ({supervisors.length} available)</label>
          <select
            value={selectedSupervisor}
            onChange={(e) => handleSupervisorChange(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          >
            <option value="">Choose a supervisor</option>
            {supervisors.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.username ? sup.username : sup.email.split('@')[0]} ({sup.email})
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
      <div>
        <h2 className="text-xl font-semibold mb-4">Current Site Assignments</h2>
        {sites.length === 0 ? (
          <p className="text-gray-500">No sites available.</p>
        ) : (
          <ul className="space-y-3">
            {sites.map((site) => {
              // Find the supervisor assigned to this site
              const assignedSupervisor = supervisors.find(sup => sup.id === site.supervisor_id);
              const supervisorDisplay = assignedSupervisor 
                ? (assignedSupervisor.username ? assignedSupervisor.username : assignedSupervisor.email.split('@')[0])
                : null;
              
              return (
                <li
                  key={site.id}
                  className="p-4 border rounded-lg bg-gray-50 flex justify-between"
                >
                  <span className="font-medium">{site.site_name}</span>
                  <span className="text-sm text-gray-600">
                    {site.supervisor_id && supervisorDisplay && assignedSupervisor
                      ? `${supervisorDisplay} (${assignedSupervisor.email})`
                      : "Unassigned"
                    }
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
