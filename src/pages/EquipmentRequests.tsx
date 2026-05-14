import React, { useEffect, useState, useCallback } from "react";
import { supabase, meenachil } from "../lib/supabase.ts";
import { useNavigate } from "react-router-dom";
import { EquipmentRequest } from "../lib/supabase.ts";

// Loader Component
const Loader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
  </div>
);

interface RequestWithDetails extends EquipmentRequest {
  site_name?: string;
  supervisor_email?: string;
  supervisor_username?: string;
  equipment_name_from_table?: string;
}

// ─── Lookup helpers (NO JOINS) ────────────────────────────────────────────────

const fetchSitesLookup = async (): Promise<Record<string, string>> => {
  const { data, error } = await meenachil
    .from("construction_sites")
    .select("id, site_name");
  if (error) { console.error("fetchSites error:", error); return {}; }
  return Object.fromEntries((data || []).map((s: any) => [s.id, s.site_name]));
};

const fetchUsersLookup = async (): Promise<Record<string, string>> => {
  // users live in the PUBLIC schema — use the base supabase client
  const { data, error } = await supabase
    .from("users")
    .select("id, username");
  if (error) { console.error("fetchUsers error:", error); return {}; }
  return Object.fromEntries((data || []).map((u: any) => [u.id, u.username]));
};

const fetchEquipmentLookup = async (): Promise<Record<string, string>> => {
  const { data, error } = await meenachil
    .from("equipment")
    .select("id, name");
  if (error) { console.error("fetchEquipment error:", error); return {}; }
  return Object.fromEntries((data || []).map((e: any) => [e.id, e.name]));
};

// ─────────────────────────────────────────────────────────────────────────────

// Edit Modal Component
const EditModal: React.FC<{
  request: RequestWithDetails;
  onClose: () => void;
  onSave: (updatedRequest: Partial<RequestWithDetails>) => void;
}> = ({ request, onClose, onSave }) => {
  const [editedRequest, setEditedRequest] = useState({
    equipment_name: request.equipment_name || request.equipment_name_from_table || "",
    quantity: request.quantity,
    isRental: request.isRental,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedRequest);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Edit Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
            <input
              type="text"
              value={editedRequest.equipment_name}
              onChange={(e) => setEditedRequest({ ...editedRequest, equipment_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={editedRequest.quantity}
              onChange={(e) => setEditedRequest({ ...editedRequest, quantity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isRental"
              checked={editedRequest.isRental}
              onChange={(e) => setEditedRequest({ ...editedRequest, isRental: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isRental" className="ml-2 text-sm text-gray-700">
              Is Rental Equipment
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EquipmentRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [editingRequest, setEditingRequest] = useState<RequestWithDetails | null>(null);

  // ── Single load: raw requests + lookup tables in parallel ──────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [rawRequests, sitesMap, usersMap, equipmentMap] = await Promise.all([
        meenachil
          .from("equipment_requests")
          .select("*")                          // NO joins
          .order("created_at", { ascending: false })
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          }),

        fetchSitesLookup(),
        fetchUsersLookup(),
        fetchEquipmentLookup(),
      ]);

      const enriched: RequestWithDetails[] = rawRequests.map((req: any) => ({
        ...req,
        site_name: sitesMap[req.site_id] || "Unknown Site",
        supervisor_username: usersMap[req.supervisor_id] || "Unknown User",
        equipment_name_from_table: equipmentMap[req.equipment_id] || "Unknown Equipment",
      }));

      setRequests(enriched);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleLogout = () => {
    const isLocal = window.location.hostname === "localhost";

    const url = isLocal
      ? "http://localhost:3000/home/"
      : "https://joelofthesharingan.github.io/home/";

    window.location.href = url;
  };


  const handleEditSave = async (requestId: string, updates: Partial<RequestWithDetails>) => {
    try {
      const { error } = await meenachil
        .from("equipment_requests")
        .update({
          equipment_name: updates.equipment_name,
          quantity: updates.quantity,
          isRental: updates.isRental,
        })
        .eq("id", requestId);

      if (error) {
        alert("Error updating request: " + error.message);
        return;
      }

      alert("✅ Request updated successfully");
      setEditingRequest(null);
      fetchRequests();
    } catch (err: any) {
      alert("Error updating request: " + err.message);
      console.error(err);
    }
  };

  const handleApprove = async (request: RequestWithDetails) => {
    if (!window.confirm(`Are you sure you want to approve this ${request.type} request?`)) return;

    try {
      const { error: updateError } = await meenachil
        .from("equipment_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (updateError) {
        alert("Error updating request status: " + updateError.message);
        return;
      }

      if (request.type === "buy") {
        const equipmentName = request.equipment_name || request.equipment_name_from_table;
        if (!equipmentName) { alert("Error: Equipment name not found"); return; }

        const { data: existingEquipment, error: checkError } = await meenachil
          .from("equipment")
          .select("id, quantity")
          .eq("site_id", request.site_id)
          .eq("name", equipmentName)
          .eq("isRental", request.isRental)
          .maybeSingle();

        if (checkError) { alert("Error checking existing equipment: " + checkError.message); return; }

        if (existingEquipment) {
          const { error: updateQuantityError } = await meenachil
            .from("equipment")
            .update({ quantity: existingEquipment.quantity + request.quantity })
            .eq("id", existingEquipment.id);
          if (updateQuantityError) { alert("Error updating equipment quantity: " + updateQuantityError.message); return; }
        } else {
          const { error: insertError } = await meenachil
            .from("equipment")
            .insert({
              name: equipmentName,
              site_id: request.site_id,
              quantity: request.quantity,
              isRental: request.isRental,
              status: "available",
              date_bought: new Date().toISOString(),
            });
          if (insertError) { alert("Error inserting new equipment: " + insertError.message); return; }
        }
      } else if (["sell", "return", "rent"].includes(request.type)) {
        if (!request.equipment_id) { alert(`Error: Equipment ID not found for ${request.type} operation`); return; }

        const { data: currentEquipment, error: fetchError } = await meenachil
          .from("equipment")
          .select("quantity")
          .eq("id", request.equipment_id)
          .single();

        if (fetchError) { alert("Error fetching current equipment: " + fetchError.message); return; }

        const newQuantity = currentEquipment.quantity - request.quantity;

        if (newQuantity <= 0) {
          const { error: deleteError } = await meenachil
            .from("equipment")
            .delete()
            .eq("id", request.equipment_id);
          if (deleteError) { alert("Error deleting equipment: " + deleteError.message); return; }
        } else {
          const { error: updateQuantityError } = await meenachil
            .from("equipment")
            .update({ quantity: newQuantity })
            .eq("id", request.equipment_id);
          if (updateQuantityError) { alert("Error updating equipment quantity: " + updateQuantityError.message); return; }
        }
      }

      alert("✅ Request approved and equipment updated successfully");
      fetchRequests();
    } catch (err: any) {
      alert("Error processing approval: " + err.message);
      console.error(err);
    }
  };

  const handleReject = async (request: RequestWithDetails) => {
    if (!window.confirm(`Are you sure you want to reject this ${request.type} request?`)) return;

    try {
      const { error } = await meenachil
        .from("equipment_requests")
        .update({ status: "rejected" })
        .eq("id", request.id);

      if (error) { alert("Error rejecting request: " + error.message); return; }

      alert("✅ Request rejected");
      fetchRequests();
    } catch (err: any) {
      alert("Error rejecting request: " + err.message);
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      buy: "bg-blue-100 text-blue-800",
      sell: "bg-orange-100 text-orange-800",
      rent: "bg-green-100 text-green-800",
      return: "bg-purple-100 text-purple-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const filteredRequests = requests.filter(
    (req) => filter === "all" || req.status === filter
  );

  if (loading) return <Loader />;

  return (
    <div className="relative">
      {/* Edit Modal */}
      {editingRequest && (
        <EditModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSave={(updates) => handleEditSave(editingRequest.id, updates)}
        />
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
            {[
              { label: "Dashboard", path: "/admin", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" },
              { label: "All Equipment", path: "/inventory", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
              { label: "Manage Users", path: "/users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
              { label: "Manage Sites", path: "/assign-sites", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
              { label: "Transaction Logs", path: "/transactions", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors w-full text-left"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            ))}
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Equipment Requests</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium"
            >
              Back to home
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              {[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "approved", label: "Approved" },
                { key: "rejected", label: "Rejected" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === tab.key
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No requests found.</p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
                          {request.type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status?.toUpperCase()}
                        </span>
                        {request.isRental && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            RENTAL
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-800 mb-1">
                        {request.equipment_name || request.equipment_name_from_table || "Unknown Equipment"}
                      </h3>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Quantity:</strong> {request.quantity}</p>
                        <p><strong>Site:</strong> {request.site_name || "Unknown Site"}</p>
                        <p><strong>Supervisor:</strong> {request.supervisor_username || request.supervisor_email || "Unknown"}</p>
                        <p><strong>Requested:</strong> {new Date(request.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {request.status === "pending" && (
                        <>
                          <button
                            onClick={() => setEditingRequest(request)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleApprove(request)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentRequests;