import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

interface TransactionLog {
  id: string;
  from_site_name: string;
  to_site_name: string;
  requested_at: string;
  requested_by: { username: string | null; email: string };
  accepted: boolean;
  comment: string | null;
  quantity: number;
  status: "approved" | "pending" | "rejected" | "cancelled";
}

export default function TransactionLogs() {
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("equipment_transfers")
        .select(`
          id,
          from_site:from_site_id (site_name),
          to_site:to_site_id (site_name),
          requested_at,
          requested_by:requested_by (username, email),
          accepted,
          comment,
          quantity,
          status
        `);

      if (error) {
        console.error("Error fetching transaction logs:", error);
        setLoading(false);
        return;
      }

      const transformed = (data || []).map((log: any) => ({
        id: log.id,
        from_site_name: log.from_site?.site_name || "Unknown",
        to_site_name: log.to_site?.site_name || "Unknown",
        requested_at: log.requested_at,
        requested_by: log.requested_by || { username: null, email: "Unknown" },
        accepted: log.accepted,
        comment: log.comment,
        quantity: log.quantity,
        status: log.status,
      }));

      // Sort: pending first, then by requested_at ascending
      transformed.sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
      });

      setLogs(transformed);
      setLoading(false);
    };

    fetchLogs();
  }, []);

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
        <h1 className="text-2xl font-bold">Transaction Logs</h1>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition duration-300"
        >
          Go to Home
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-600">No transactions found.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">From Site</th>
                  <th className="px-4 py-2 border">To Site</th>
                  <th className="px-4 py-2 border">Requested At</th>
                  <th className="px-4 py-2 border">Requested By</th>
                  <th className="px-4 py-2 border">Quantity</th>
                  <th className="px-4 py-2 border">Comment</th>
                  <th className="px-4 py-2 border">Accepted</th>
                  <th className="px-4 py-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="text-center">
                    <td className="px-4 py-2 border">{log.from_site_name}</td>
                    <td className="px-4 py-2 border">{log.to_site_name}</td>
                    <td className="px-4 py-2 border">
                      {new Date(log.requested_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border">
                      {log.requested_by?.username || log.requested_by?.email}
                    </td>
                    <td className="px-4 py-2 border">{log.quantity}</td>
                    <td className="px-4 py-2 border">{log.comment || "-"}</td>
                    <td className="px-4 py-2 border">{log.accepted ? "✔" : "✘"}</td>
                    <td className="px-4 py-2 border">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(log.status)}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {logs.map((log) => (
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
                  <span className="font-semibold">Quantity:</span>{" "}
                  {log.quantity}
                </p>
                {log.comment && (
                  <p className="text-sm">
                    <span className="font-semibold">Comment:</span>{" "}
                    {log.comment}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">Accepted:</span>{" "}
                  {log.accepted ? "✔" : "✘"}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Status:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClasses(log.status)}`}
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
