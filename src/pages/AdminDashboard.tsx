import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

// Types
interface Site {
  site_name: string;
}

interface Supervisor {
  email: string;
}

interface Equipment {
  name: string;
}

interface EquipmentRequest {
  id: string;
  type: string;
  equipment_name?: string;
  quantity: number;
  created_at: string;
  isRental?: boolean;
  status?: string;
}

interface RequestWithDetails extends EquipmentRequest {
  site?: Site;
  supervisor?: Supervisor;
  equipment?: Equipment;
  site_name?: string;
  supervisor_email?: string;
  supervisor_username?: string;
  equipment_name_from_table?: string;
}

interface NavButton {
  label: string;
  path: string;
  color: string;
  icon: React.ReactNode;
}

// Sidebar Component
const Sidebar = ({
  isOpen,
  onClose,
  navButtons,
}: {
  isOpen: boolean;
  onClose: () => void;
  navButtons: NavButton[];
}) => {
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Admin Menu</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="space-y-2">
            {navButtons.map((btn) => (
              <button
                key={btn.path}
                onClick={() => handleNavClick(btn.path)}
                className="w-full flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

// Loading Component
const LoadingSpinner = () => (
  <div className="flex justify-center py-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

// Empty State Component
const EmptyState = () => (
  <p className="text-gray-500 text-center py-4">No pending requests</p>
);

// Request Card Component
const RequestCard = ({
  request,
  onApprove,
  onReject,
}: {
  request: RequestWithDetails;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      buy: "bg-blue-100 text-blue-800",
      sell: "bg-orange-100 text-orange-800",
      rent: "bg-green-100 text-green-800",
      return: "bg-purple-100 text-purple-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
            {request.type.toUpperCase()}
          </span>
          {request.isRental && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              RENTAL
            </span>
          )}
        </div>

        <h4 className="font-medium text-gray-800 text-sm">
          {request.equipment_name || request.equipment_name_from_table || "Unknown Equipment"}
        </h4>

        <div className="text-xs text-gray-600 space-y-1 mt-1">
          <p>
            <strong>Qty:</strong> {request.quantity}
          </p>
          <p>
            <strong>Site:</strong> {request.site_name || "Unknown"}
          </p>
          <p>
            <strong>From:</strong> {request.supervisor_username || "Unknown"}
          </p>
          <p>
            <strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-2 ml-4">
        <button
          onClick={() => onApprove(request.id)}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onReject(request.id)}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({
  button,
  onClick,
}: {
  button: NavButton;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`text-white font-semibold px-4 py-2 rounded-lg transition duration-300 ${button.color} flex items-center space-x-3 justify-center`}
  >
    {button.icon}
    <span>{button.label}</span>
  </button>
);

// Main Admin Dashboard Component
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");

  // Navigation buttons configuration
  const navButtons: NavButton[] = [
    {
      label: "See All Equipment",
      path: "/inventory",
      color: "bg-blue-500 hover:bg-blue-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      label: "Manage Users",
      path: "/users",
      color: "bg-green-500 hover:bg-green-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
      ),
    },
    {
      label: "Manage Sites",
      path: "/assign-sites",
      color: "bg-yellow-500 hover:bg-yellow-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      label: "Transaction Logs",
      path: "/transactions",
      color: "bg-purple-500 hover:bg-purple-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      label: "Equipment Requests",
      path: "/equipment-requests",
      color: "bg-indigo-500 hover:bg-indigo-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
  ];

  // Fetch sites with pending requests
  const fetchSitesWithPendingRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_requests")
        .select("site:site_id(site_name)")
        .eq("status", "pending");

      if (error) throw error;

      // Extract unique site names
      const uniqueSites = Array.from(
        new Set(
          data
            ?.map((req: any) => req.site?.site_name)
            .filter((site_name: string | undefined) => site_name)
        )
      ).map((site_name: string) => ({ site_name }));

      setSites(uniqueSites);
    } catch (err) {
      console.error("Error fetching sites:", err);
    }
  }, []);

  // Fetch pending equipment requests
  const fetchPendingRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_requests")
        .select(`
          *,
          site:site_id(site_name),
          supervisor:supervisor_id(username),
          equipment:equipment_id(name)
        `)
        .eq("status", "pending");

      if (error) throw error;

      const transformedData = (data || []).map((req: any) => ({
        ...req,
        site_name: req.site?.site_name,
        supervisor_username: req.supervisor?.username,
        equipment_name_from_table: req.equipment?.name,
      }));

      setPendingRequests(transformedData);
    } catch (err) {
      console.error("Error fetching pending requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSitesWithPendingRequests();
    fetchPendingRequests();
  }, [fetchSitesWithPendingRequests, fetchPendingRequests]);

  // Simplified logout handler
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Logout failed:", error.message);
    } finally {
      navigate("/login");
    }
  };

  // Handle inline approve/reject actions
  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("equipment_requests")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Refresh the list and sites
      fetchPendingRequests();
      fetchSitesWithPendingRequests();
    } catch (err) {
      console.error("Error approving request:", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("equipment_requests")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      // Refresh the list and sites
      fetchPendingRequests();
      fetchSitesWithPendingRequests();
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  return (
    <div className="relative">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navButtons={navButtons}
      />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-xl p-6">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <button
                className="text-gray-600 focus:outline-none hover:text-gray-800 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition duration-300"
            >
              Log Out
            </button>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {navButtons.map((btn) => (
              <QuickActionButton
                key={btn.path}
                button={btn}
                onClick={() => navigate(btn.path)}
              />
            ))}
          </div>

          {/* Pending Equipment Requests */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <select
                className="border rounded p-2 text-sm"
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                <option value="all">All Sites</option>
                {sites.map((site) => (
                  <option key={site.site_name} value={site.site_name}>
                    {site.site_name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => navigate("/equipment-requests")}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All →
              </button>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : pendingRequests.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {pendingRequests
                  .filter((req) => selectedSite === "all" || req.site_name === selectedSite)
                  .map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Admin Panel</h3>
            <p className="text-gray-600">
              Use the buttons above or the menu sidebar to navigate to inventory management,
              user management, site assignment, or view transaction logs. The sidebar provides
              quick access to all administrative functions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}