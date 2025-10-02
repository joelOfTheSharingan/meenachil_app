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
  const [showCreate, setShowCreate] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newContractorSupervisorId, setNewContractorSupervisorId] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedSiteId, setExpandedSiteId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");

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

  // Delete site with confirmation
  const handleDeleteSite = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    const siteLabel = site ? site.site_name : "this site";
    const ok = window.confirm(`Are you sure you want to delete "${siteLabel}"? This cannot be undone.`);
    if (!ok) return;

    setDeletingId(siteId);
    try {
      const { error } = await supabase
        .from("construction_sites")
        .delete()
        .eq("id", siteId);

      if (error) {
        console.error("Error deleting site:", error);
        alert("❌ Failed to delete site. It may have related data.");
      } else {
        alert("✅ Site deleted successfully");
        setExpandedSiteId("");
        await fetchSites();
        if (selectedSite === siteId) {
          setSelectedSite("");
        }
      }
    } catch (err) {
      console.error("Unexpected delete error:", err);
      alert("❌ Failed to delete site");
    } finally {
      setDeletingId("");
    }
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

  // Handle create new site
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    setCreating(true);
    try {
      const selectedSup = supervisors.find(s => s.id === newContractorSupervisorId);
      const { data, error } = await supabase
        .from("construction_sites")
        .insert({ 
          site_name: newSiteName.trim(), 
          supervisor_id: newContractorSupervisorId || null
        })
        .select("id, site_name")
        .single();

      if (error) {
        console.error("Error creating site:", error);
        alert("❌ Failed to create site");
      } else {
        alert("✅ Site created successfully!");
        setShowCreate(false);
        setNewSiteName("");
        setNewContractorSupervisorId("");
        await fetchSites();
        if (data?.id) {
          setSelectedSite(String(data.id));
        }
      }
    } catch (err) {
      console.error("Unexpected error creating site:", err);
      alert("❌ Failed to create site");
    } finally {
      setCreating(false);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assign Supervisors to Sites</h1>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
          aria-label="Create new site"
          title="Create new site"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75H19.5a.75.75 0 010 1.5h-6.75V19.5a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          New Site
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateSite} className="space-y-3 mb-8 border rounded-xl p-4 bg-gray-50">
          <h2 className="text-lg font-semibold">Create New Site</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Site Name</label>
            <input
              type="text"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder="e.g., Site A"
              className="w-full border rounded-lg p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Supervisor (optional)</label>
            <select
              value={newContractorSupervisorId}
              onChange={(e) => setNewContractorSupervisorId(e.target.value)}
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
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={creating || !newSiteName.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Site"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewSiteName(""); setNewContractorSupervisorId(""); }}
              className="px-3 py-2 rounded-lg border"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => setExpandedSiteId(prev => (prev === site.id ? "" : site.id))}
                    title="View actions"
                  >
                    <span className="font-medium">{site.site_name}</span>
                    <span className="text-sm text-gray-600">
                      {site.supervisor_id && supervisorDisplay && assignedSupervisor
                        ? `${supervisorDisplay} (${assignedSupervisor.email})`
                        : "Unassigned"
                      }
                    </span>
                  </div>
                  {expandedSiteId === site.id && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}
                        disabled={deletingId === site.id}
                        className="px-3 py-1 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        {deletingId === site.id ? "Deleting..." : "Delete site"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setExpandedSiteId(""); }}
                        className="px-3 py-1 rounded-md border text-sm"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
