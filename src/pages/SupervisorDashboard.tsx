import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useNavigate, Link } from "react-router-dom";
import { EquipmentTransfer, EquipmentRequest } from "../lib/supabase.ts";

// Loader Component
const Loader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
  </div>
);

interface Site {
  id: string;
  site_name: string;
}

const Dashboard: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [userSites, setUserSites] = useState<Site[]>([]);
  const [myEquipment, setMyEquipment] = useState<any[]>([]);
  const [rentalEquipment, setRentalEquipment] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [outgoingAdminRequests, setOutgoingAdminRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedRemarks, setExpandedRemarks] = useState<Set<string>>(new Set());
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Refresh incoming requests (to selected site)
  const refreshRequests = async (siteId: string) => {
    try {
      const { data: requestsData, error } = await supabase
        .from("equipment_transfers")
        .select(`
          id,
          equipment_id,
          quantity,
          status,
          accepted,
          comment,
          vehicle_number,
          remarks,
          image_url,
          equipment(name, isRental),
          from_site_id,
          to_site_id,
          from_site:from_site_id(site_name),
          to_site:to_site_id(site_name),
          requested_at
        `)
        .eq("to_site_id", siteId)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error.message);
        return;
      }

      setIncomingRequests(requestsData ?? []);
    } catch (err) {
      console.error("Unexpected error while fetching requests:", err);
    }
  };

  // Refresh outgoing requests (from selected site)
  const refreshOutgoingRequests = async (siteId: string) => {
    try {
      const { data: outgoingData, error } = await supabase
        .from("equipment_transfers")
        .select(`
          id,
          equipment_id,
          quantity,
          status,
          accepted,
          comment,
          vehicle_number,
          remarks,
          equipment(name, isRental),
          from_site_id,
          to_site_id,
          from_site:from_site_id(site_name),
          to_site:to_site_id(site_name),
          requested_at
        `)
        .eq("from_site_id", siteId)
        .eq("status", "pending")   // ✅ only pending
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Error fetching outgoing requests:", error.message);
        return;
      }

      setOutgoingRequests(outgoingData ?? []);
    } catch (err) {
      console.error("Unexpected error while fetching outgoing requests:", err);
    }
  };

  // Refresh equipment requests sent to admin (created by this supervisor for selected site)
  const refreshOutgoingAdminRequests = async (siteId: string, supervisorId: string) => {
    try {
      const { data, error } = await supabase
        .from("equipment_requests")
        .select(`
          id,
          equipment_id,
          equipment:equipment_id(name, isRental),
          equipment_name,
          quantity,
          isRental,
          status,
          created_at,
          type
        `)
        .eq("site_id", siteId)
        .eq("supervisor_id", supervisorId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching outgoing admin requests:", error.message);
        return;
      }

      // Normalize for rendering similar to transfers
      const normalized = (data || []).map((req: any) => ({
        kind: "admin_request",
        id: req.id,
        quantity: req.quantity,
        status: req.status,
        requested_at: req.created_at,
        equipment: {
          name: req.equipment?.name || req.equipment_name || "Unknown Equipment",
          isRental: typeof req.isRental === "boolean" ? req.isRental : req.equipment?.isRental,
        },
        to_label: "Admin",
        type: req.type,
      }));

      setOutgoingAdminRequests(normalized);
    } catch (err) {
      console.error("Unexpected error while fetching outgoing admin requests:", err);
    }
  };

  // Refresh equipment for selected site
  const refreshEquipment = async (siteId: string) => {
    const { data: equipmentData, error: eqError } = await supabase
      .from("equipment")
      .select("id, name, status, isRental, quantity")
      .eq("site_id", siteId);

    if (eqError) {
      console.error("Error fetching equipment:", eqError.message);
      return;
    }

    if (equipmentData) {
      const groupByName = (arr: any[], rental: boolean) =>
        arr
          .filter((eq) => eq.isRental === rental)
          .reduce((acc: any[], curr) => {
            const existing = acc.find((item) => item.name === curr.name);
            if (existing) existing.count += curr.quantity ?? 0;
            else acc.push({ name: curr.name, count: curr.quantity ?? 0 });
            return acc;
          }, []);

      setMyEquipment(groupByName(equipmentData, false));
      setRentalEquipment(groupByName(equipmentData, true));
    }
  };

  // Fetch all sites associated with the user
  const fetchUserSites = async (userId: string) => {
    try {
      const { data: sitesData, error } = await supabase
        .from("construction_sites")
        .select("id, site_name")
        .eq("supervisor_id", userId);

      if (error) {
        console.error("Error fetching user sites:", error.message);
        return [];
      }

      return sitesData || [];
    } catch (err) {
      console.error("Unexpected error while fetching sites:", err);
      return [];
    }
  };

  // Handle site selection change
  const handleSiteChange = async (siteId: string) => {
    setSelectedSiteId(siteId);
    if (siteId) {
      await refreshEquipment(siteId);
      await refreshRequests(siteId);
      await refreshOutgoingRequests(siteId);
      if (currentUserId) {
        await refreshOutgoingAdminRequests(siteId, currentUserId);
      }
    }
  };

  useEffect(() => {
  const fetchUserAndEquipment = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user:", userError.message);
        return;
      }
      if (!user) return;

      setUserEmail(user.email || null);

      // Try fetching user row by auth_id first
      let { data: userRow, error: userDbError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      // Fallback: fetch by id if auth_id is missing
      if (!userRow) {
        ({ data: userRow, error: userDbError } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle());
      }

      if (!userRow) {
        console.error("Could not find user row:", userDbError?.message);
        return;
      }

      const userId = userRow.id; // matches supervisor_id in construction_sites
      setCurrentUserId(userId);

      // Fetch sites using users.id
      const sites = await fetchUserSites(userId);
      setUserSites(sites);

      // Set initial selected site
      const initialSiteId = sites.length > 0 ? sites[0].id : null;
      if (initialSiteId) {
        setSelectedSiteId(initialSiteId);
        await refreshEquipment(initialSiteId);
        await refreshRequests(initialSiteId);
        await refreshOutgoingRequests(initialSiteId);
        await refreshOutgoingAdminRequests(initialSiteId, userId);
      } else {
        console.warn("User has no sites assigned.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchUserAndEquipment();
}, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      console.error("Error logging out:", error.message);
    }
  };

  const handleDecision = async (req: EquipmentTransfer, accept: boolean) => {
    if (!req.equipment_id || !req.to_site_id || !req.from_site_id) {
      alert("Missing equipment or site info.");
      console.error("Request missing IDs:", req);
      return;
    }

    const comment = window.prompt(
      `Add a comment for ${accept ? "accepting" : "rejecting"} this request:`,
      req.comment || ""
    );
    if (comment === null) return;

    try {
      const { error: transferError } = await supabase
        .from("equipment_transfers")
        .update({
          status: accept ? "approved" : "rejected",
          accepted: accept ? true : false,
          comment,
        })
        .eq("id", req.id);
      if (transferError) throw transferError;

      if (!accept) {
        if (selectedSiteId) {
          await refreshRequests(selectedSiteId);
          await refreshOutgoingRequests(selectedSiteId);
        }
        return;
      }

      const { data: fromEquipments, error: fromError } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", req.equipment_id);

      if (fromError || !fromEquipments || fromEquipments.length === 0) {
        alert("Error: Source equipment not found.");
        console.error("Source equipment fetch error:", fromError);
        return;
      }

      const fromEq = fromEquipments[0];

      const { error: insertError } = await supabase.from("equipment").insert([
        {
          name: fromEq.name,
          status: fromEq.status,
          isRental: fromEq.isRental,
          quantity: -req.quantity,
          site_id: req.from_site_id,
          date_bought: new Date().toISOString(),
        },
        {
          name: fromEq.name,
          status: fromEq.status,
          isRental: fromEq.isRental,
          quantity: req.quantity,
          site_id: req.to_site_id,
          date_bought: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        alert("Error recording transfer in equipment table.");
        console.error(insertError);
        return;
      }

      if (selectedSiteId) {
        await refreshRequests(selectedSiteId);
        await refreshOutgoingRequests(selectedSiteId);
        await refreshEquipment(selectedSiteId);
      }
    } catch (err: any) {
      alert("Error processing transfer: " + err.message);
      console.error(err);
    }
  };

  const handleCancelTransfer = async (req: EquipmentTransfer) => {
    try {
      const { error: cancelError } = await supabase
        .from("equipment_transfers")
        .update({ status: "cancelled" })
        .eq("id", req.id);

      if (cancelError) {
        alert("Error cancelling transfer: " + cancelError.message);
        console.error(cancelError);
        return;
      }

      if (selectedSiteId) {
        await refreshOutgoingRequests(selectedSiteId);
      }
    } catch (err: any) {
      alert("Error cancelling transfer: " + err.message);
      console.error(err);
    }
  };

  const handleCancelAdminRequest = async (reqId: string) => {
    try {
      const ok = window.confirm("Are you sure you want to cancel this request?");
      if (!ok) return;

      const { error } = await supabase
        .from("equipment_requests")
        .delete()
        .eq("id", reqId)
        .eq("status", "pending");

      if (error) {
        alert("Error cancelling request: " + error.message);
        console.error(error);
        return;
      }

      if (selectedSiteId && currentUserId) {
        await refreshOutgoingAdminRequests(selectedSiteId, currentUserId);
      }
    } catch (err: any) {
      alert("Error cancelling request: " + err.message);
      console.error(err);
    }
  };

  const toggleRemark = (reqId: string) => {
    setExpandedRemarks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reqId)) {
        newSet.delete(reqId);
      } else {
        newSet.add(reqId);
      }
      return newSet;
    });
  };
  const toggleImage = (reqId: string) => {
    setExpandedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reqId)) {
        newSet.delete(reqId);
      } else {
        newSet.add(reqId);
      }
      return newSet;
    });
  };

  if (loading) return <Loader />;

  const pendingRequests = incomingRequests.filter(
    (req) => req.status === "pending"
  );

  const selectedSite = userSites.find(site => site.id === selectedSiteId);

  return (
    <div className="relative">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="space-y-4">
            <Link
              to="/transactions"
              className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>See all past transactions</span>
            </Link>
            
            <Link
              to="/newRequests"
              className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Transfer</span>
            </Link>
            <Link
          to="/send-request"
          className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Buy Equipment</span>
          </Link>

          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="bg-white shadow-lg rounded-xl p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <button 
                className="text-gray-600 focus:outline-none hover:text-gray-800 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  ></path>
                </svg>
              </button>
              
            </div>
            <div className="flex justify-end items-center">
              <span className="text-gray-600 text-sm mr-2 hidden sm:inline">
                Signed in as <strong>{userEmail}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium"
              >
                Log Out
              </button>
            </div>
          </div>

        {/* Site Selection Dropdown */}
        <div className="mb-6">
          <label htmlFor="site-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Construction Site:
          </label>
          <select
            id="site-select"
            value={selectedSiteId || ""}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="" disabled>Choose a site...</option>
            {userSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
          {selectedSite && (
            <p className="text-sm text-gray-600 mt-1">
              Currently viewing: <strong>{selectedSite.site_name}</strong>
            </p>
          )}
        </div>

        {selectedSiteId ? (
          <>
            {/* My Site Tools */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-blue-800 mb-4">My Site Tools</h2>
              <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
                {myEquipment.filter((eq) => eq.count > 0).length === 0 ? (
                  <p className="text-gray-500">No equipment found.</p>
                ) : (
                  myEquipment
                    .filter((eq) => eq.count > 0)
                    .map((eq, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-white p-3 mb-2 rounded-md shadow-sm"
                      >
                        <span className="text-gray-700 font-medium">{eq.name}</span>
                        <span className="text-gray-900 font-bold px-3 py-1 bg-gray-200 rounded-full">
                          {eq.count}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Rental Tools */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-700 mb-4">Rental</h2>
              <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
                {rentalEquipment.filter((eq) => eq.count > 0).length === 0 ? (
                  <p className="text-gray-500">No rental equipment found.</p>
                ) : (
                  rentalEquipment
                    .filter((eq) => eq.count > 0)
                    .map((eq, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-white p-3 mb-2 rounded-md shadow-sm"
                      >
                        <span className="text-gray-700 font-medium">{eq.name}</span>
                        <span className="text-gray-900 font-bold px-3 py-1 bg-gray-200 rounded-full">
                          {eq.count}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Incoming Requests */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-green-700 mb-4">Incoming Requests</h2>
              <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
                {pendingRequests.length === 0 ? (
                  <p className="text-gray-500">No pending requests.</p>
                ) : (
                  pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col bg-white p-3 mb-2 rounded-md shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-700">
                          {req.equipment?.name || "Unknown Equipment"}
                        </span>

                        {req.equipment?.isRental && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            Rental
                          </span>
                        )}
                      </div>

                      <span className="text-sm text-gray-500">
                        Quantity: {req.quantity ?? "N/A"}
                      </span>
                      <span className="text-sm text-gray-500">
                        From: {req.from_site?.site_name || "Unknown Site"}
                      </span>
                      <span className="text-sm text-gray-500">Status: {req.status}</span>

                      {req.vehicle_number && (
                        <span className="text-sm text-gray-500">Vehicle: {req.vehicle_number}</span>
                      )}

                      {/* SEE IMAGE BUTTON */}
                      {req.image_url && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleImage(req.id)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
                          >
                            {expandedImages.has(req.id) ? "▼ Hide Image" : "▶ See Image"}
                          </button>

                          {expandedImages.has(req.id) && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <img
                                src={req.image_url}
                                alt="Attached"
                                className="max-h-64 rounded shadow-md object-contain mx-auto"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* REMARKS */}
                      {req.remarks && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleRemark(req.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            {expandedRemarks.has(req.id) ? "▼" : "▶"} View Remark
                          </button>

                          {expandedRemarks.has(req.id) && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <p className="text-sm text-gray-700">{req.remarks}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <span className="text-xs text-gray-400">
                        Requested: {new Date(req.requested_at).toLocaleString()}
                      </span>

                      {/* ACCEPT / REJECT */}
                      <div className="mt-2 flex space-x-2">
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                          onClick={() => handleDecision(req, true)}
                        >
                          Accept
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to reject this request?")) {
                              handleDecision(req, false);
                            }
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>


            {/* Outgoing Requests */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-blue-700 mb-4">Outgoing Requests</h2>
              <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
                {outgoingRequests.length === 0 && outgoingAdminRequests.length === 0 ? (
                  <p className="text-gray-500">No outgoing requests.</p>
                ) : (
                  <>
                  {outgoingRequests.map((req) => (
                    <div key={req.id} className="flex flex-col bg-white p-3 mb-2 rounded-md shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-700">
                          {req.equipment?.name || "Unknown Equipment"}
                        </span>
                        
                        {req.equipment?.isRental && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            Rental
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">Quantity: {req.quantity ?? "N/A"}</span>
                      <span className="text-sm text-gray-500">
                        To: {req.to_site?.site_name || "Unknown Site"}
                      </span>
                      <span className="text-sm text-gray-500">Status: {req.status}</span>
                      {req.vehicle_number && (
                          <span className="text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
  Vehicle: {req.vehicle_number}
</span>

                        )}
                      {req.remarks && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleRemark(req.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            {expandedRemarks.has(req.id) ? '▼' : '▶'} View Remark
                          </button>
                          {expandedRemarks.has(req.id) && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <p className="text-sm text-gray-700">{req.remarks}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-xs text-gray-400">
                        Requested: {new Date(req.requested_at).toLocaleString()}
                      </span>

                      {req.status === "pending" && (
                        <div className="mt-2">
                          <button
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to cancel this transfer?")) {
                                handleCancelTransfer(req);
                              }
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Outgoing requests to Admin */}
                  {outgoingAdminRequests.map((req: any) => (
                    <div key={req.id} className="flex flex-col bg-white p-3 mb-2 rounded-md shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-700">
                          {req.equipment?.name || "Unknown Equipment"}
                        </span>
                        {req.equipment?.isRental && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            Rental
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">Quantity: {req.quantity ?? "N/A"}</span>
                      <span className="text-sm text-gray-500">To: Admin</span>
                      <span className="text-sm text-gray-500">Status: {req.status}</span>
                      
                      <span className="text-xs text-gray-400">
                        Requested: {new Date(req.requested_at).toLocaleString()}
                      </span>

                      {req.status === "pending" && (
                        <div className="mt-2">
                          <button
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                            onClick={() => handleCancelAdminRequest(req.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Please select a construction site to view its data.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;