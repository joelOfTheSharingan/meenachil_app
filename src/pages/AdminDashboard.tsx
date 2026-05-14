import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

// Types
interface Site {
  id: string;
  site_name: string;
}

interface EquipmentRequest {
  id: string;
  type: string;
  equipment_name?: string;
  quantity: number;
  created_at: string;
  isRental?: boolean;
  status?: string;
  site_id?: string;
  supervisor_id?: string;
  equipment_id?: string;
}

interface RequestWithDetails extends EquipmentRequest {
  site_name?: string;
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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

const LoadingSpinner = () => (
  <div className="flex justify-center py-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

const EmptyState = () => (
  <p className="text-gray-500 text-center py-4">No pending requests</p>
);

const RequestCard = ({
  request,
  onClick,
}: {
  request: RequestWithDetails;
  onClick: () => void;
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
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
    >
      <div className="flex justify-between items-center">
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
            <p><strong>Qty:</strong> {request.quantity}</p>
            <p><strong>Site:</strong> {request.site_name || "Unknown"}</p>
            <p><strong>From:</strong> {request.supervisor_username || "Unknown"}</p>
            <p><strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="ml-4 text-blue-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

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

// ─── Lookup helpers (NO JOINS) ────────────────────────────────────────────────

const fetchSitesLookup = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .schema("meenachil")
    .from("construction_sites")
    .select("id, site_name");
  if (error) { console.error("fetchSites error:", error); return {}; }
  return Object.fromEntries((data || []).map((s: any) => [s.id, s.site_name]));
};

const fetchUsersLookup = async (): Promise<Record<string, string>> => {
  // users live in the PUBLIC schema
  const { data, error } = await supabase
    .from("users")            // no .schema() call → defaults to public
    .select("id, username");
  if (error) { console.error("fetchUsers error:", error); return {}; }
  return Object.fromEntries((data || []).map((u: any) => [u.id, u.username]));
};

const fetchEquipmentLookup = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .schema("meenachil")
    .from("equipment")
    .select("id, name");
  if (error) { console.error("fetchEquipment error:", error); return {}; }
  return Object.fromEntries((data || []).map((e: any) => [e.id, e.name]));
};

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sitesForFilter, setSitesForFilter] = useState<{ site_name: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");

  const navButtons: NavButton[] = [
    {
      label: "See All Equipment",
      path: "/inventory",
      color: "bg-blue-500 hover:bg-blue-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: "Manage Users",
      path: "/users",
      color: "bg-green-500 hover:bg-green-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
    {
      label: "Manage Sites",
      path: "/assign-sites",
      color: "bg-yellow-500 hover:bg-yellow-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: "Transaction Logs",
      path: "/transactions",
      color: "bg-purple-500 hover:bg-purple-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Equipment Requests",
      path: "/equipment-requests",
      color: "bg-indigo-500 hover:bg-indigo-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  // ── Single load function: fetch raw requests + all lookup tables in parallel ──
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [rawRequests, sitesMap, usersMap, equipmentMap] = await Promise.all([
        // 1. Raw pending requests — NO joins
        supabase
          .schema("meenachil")
          .from("equipment_requests")
          .select("*")
          .eq("status", "pending")
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          }),

        // 2. Lookup tables
        fetchSitesLookup(),
        fetchUsersLookup(),
        fetchEquipmentLookup(),
      ]);

      // Enrich requests with resolved names
      const enriched: RequestWithDetails[] = rawRequests.map((req: any) => ({
        ...req,
        site_name: sitesMap[req.site_id] || "Unknown Site",
        supervisor_username: usersMap[req.supervisor_id] || "Unknown User",
        equipment_name_from_table: equipmentMap[req.equipment_id] || "Unknown Equipment",
      }));

      setPendingRequests(enriched);

      // Build filter list from resolved site names (no duplicates)
      const uniqueSiteNames = Array.from(
        new Set(enriched.map((r) => r.site_name).filter(Boolean))
      ).map((name) => ({ site_name: name as string }));
      setSitesForFilter(uniqueSiteNames);

    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = () => {
  const isLocal = window.location.hostname === "localhost";

  const url = isLocal
    ? "http://localhost:3000/home/"
    : "https://joelofthesharingan.github.io/home/";

  window.location.href = url;
};

  const filteredRequests = pendingRequests.filter(
    (req) => selectedSite === "all" || req.site_name === selectedSite
  );

  return (
    <div className="relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} navButtons={navButtons} />

      <div className="p-6 max-w-4xl mx-auto">
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
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium transition duration-300"
            >
              Back to home
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {navButtons.map((btn) => (
              <QuickActionButton key={btn.path} button={btn} onClick={() => navigate(btn.path)} />
            ))}
          </div>

          {/* Pending Requests */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Pending Requests</h2>
              <button
                onClick={() => navigate("/equipment-requests")}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
              >
                <span>View All</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <select
                className="border rounded p-2 text-sm w-full md:w-auto"
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
              >
                <option value="all">All Sites</option>
                {sitesForFilter.map((site) => (
                  <option key={site.site_name} value={site.site_name}>
                    {site.site_name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : filteredRequests.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {filteredRequests.slice(0, 5).map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={() => navigate("/equipment-requests")}
                  />
                ))}
                {filteredRequests.length > 5 && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => navigate("/equipment-requests")}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View {filteredRequests.length - 5} more requests →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Admin Panel</h3>
            <p className="text-gray-600">
              Use the buttons above or the menu sidebar to navigate to inventory management,
              user management, site assignment, or view transaction logs. Click on any pending
              request to view details and take action in the Equipment Requests page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}