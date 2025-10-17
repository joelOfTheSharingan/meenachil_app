import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../contexts/AuthContext.tsx";

interface TransactionLog {
  id: string;
  from_site_name: string;
  to_site_name: string;
  requested_at: string;
  requested_by: { username: string | null; email: string };
  equipment_name: string;
  accepted: boolean;
  comment: string | null;
  vehicle_number?: string | null;
  quantity: number;
  status: "approved" | "pending" | "rejected" | "cancelled";
}

export default function TransactionLogs() {
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;

      setLoading(true);

      let query = supabase
        .from("equipment_transfers")
        .select(`
          id,
          from_site:from_site_id (site_name),
          to_site:to_site_id (site_name),
          requested_at,
          requested_by:requested_by (username, email),
          equipment:equipment_id (name),
          vehicle_number,
          accepted,
          comment,
          quantity,
          status
        `);

      // Supervisor filter
      if (user.role === "supervisor") {
        const { data: userSites, error: sitesError } = await supabase
          .from("construction_sites")
          .select("id")
          .eq("supervisor_id", user.id);

        if (sitesError) {
          console.error("Error fetching user sites:", sitesError);
          setLoading(false);
          return;
        }

        if (userSites && userSites.length > 0) {
          const siteIds = userSites.map((site) => `"${site.id}"`).join(",");
          query = query.or(
            `from_site_id.in.(${siteIds}),to_site_id.in.(${siteIds})`
          );
        } else {
          setLogs([]);
          setFilteredLogs([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching transaction logs:", error);
        setLogs([]);
        setFilteredLogs([]);
        setLoading(false);
        return;
      }

      const transformed: TransactionLog[] = (data || []).map((log: any) => ({
        id: log.id,
        from_site_name: log.from_site?.site_name || "Unknown",
        to_site_name: log.to_site?.site_name || "Unknown",
        requested_at: log.requested_at,
        requested_by: log.requested_by || { username: null, email: "Unknown" },
        equipment_name: log.equipment?.name || "Unknown",
        accepted: log.accepted,
        comment: log.comment,
        vehicle_number: log.vehicle_number,
        quantity: log.quantity,
        status: log.status,
      }));

      // Sort: pending first, then latest first
      transformed.sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
      });

      setLogs(transformed);
      setFilteredLogs(transformed);

      // Extract unique site names
      const uniqueSites = new Set<string>();
      transformed.forEach((log) => {
        if (log.from_site_name !== "Unknown") uniqueSites.add(log.from_site_name);
        if (log.to_site_name !== "Unknown") uniqueSites.add(log.to_site_name);
      });
      setSites(Array.from(uniqueSites).sort());

      setLoading(false);
    };

    fetchLogs();
  }, [user]);

  // Filter logs when site changes
  useEffect(() => {
    if (selectedSite === "all") {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(
        logs.filter(
          (log) =>
            log.from_site_name === selectedSite || log.to_site_name === selectedSite
        )
      );
    }
  }, [selectedSite, logs]);

  const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Transaction Logs
          {user?.role === "supervisor" && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              (Your Sites Only)
            </span>
          )}
        </h1>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition duration-300"
        >
          Go to Home
        </button>
      </div>

      {/* Site Filter */}
      <div className="mb-4 flex items-center space-x-3">
        <label htmlFor="site-filter" className="font-semibold text-gray-700">
          Filter by Site:
        </label>
        <select
          id="site-filter"
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Sites</option>
          {sites.map((site) => (
            <option key={site} value={site}>
              {site}
            </option>
          ))}
        </select>
        {selectedSite !== "all" && (
          <button
            onClick={() => setSelectedSite("all")}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : filteredLogs.length === 0 ? (
        <p className="text-gray-600">
          {selectedSite === "all"
            ? "No transactions found."
            : `No transactions found for ${selectedSite}.`}
        </p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">From Site</th>
                  <th className="px-4 py-2 border">To Site</th>
                  <th className="px-4 py-2 border">Requested At</th>
                  <th className="px-4 py-2 border">Requested By</th>
                  <th className="px-4 py-2 border">Equipment</th>
                  <th className="px-4 py-2 border">Quantity</th>
                  <th className="px-4 py-2 border">Comment</th>
                  <th className="px-4 py-2 border">Vehicle</th>
                  <th className="px-4 py-2 border">Accepted</th>
                  <th className="px-4 py-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="text-center">
                    <td className="px-4 py-2 border">{log.from_site_name}</td>
                    <td className="px-4 py-2 border">{log.to_site_name}</td>
                    <td className="px-4 py-2 border">
                      {new Date(log.requested_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border">
                      {log.requested_by?.username || log.requested_by?.email}
                    </td>
                    <td className="px-4 py-2 border">{log.equipment_name}</td>
                    <td className="px-4 py-2 border">{log.quantity}</td>
                    <td className="px-4 py-2 border">{log.comment || "-"}</td>
                    <td className="px-4 py-2 border">{log.vehicle_number || "-"}</td>
                    <td className="px-4 py-2 border">{log.accepted ? "✔" : "✘"}</td>
                    <td className="px-4 py-2 border">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4 md:hidden">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-gray-200 rounded-lg shadow p-4"
              >
                <p className="text-sm">
                  <span className="font-semibold">From/To:</span> {log.from_site_name} →{" "}
                  {log.to_site_name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Requested At:</span>{" "}
                  {new Date(log.requested_at).toLocaleString()}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">By:</span>{" "}
                  {log.requested_by?.username || log.requested_by?.email}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Equipment:</span> {log.equipment_name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Quantity:</span> {log.quantity}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Vehicle:</span> {log.vehicle_number || "-"}
                </p>
                {log.comment && (
                  <p className="text-sm">
                    <span className="font-semibold">Comment:</span> {log.comment}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">Accepted:</span> {log.accepted ? "✔" : "✘"}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Status:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(
                      log.status
                    )}`}
                  >
                    {log.status}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
