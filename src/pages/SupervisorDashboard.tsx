import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useNavigate, Link } from "react-router-dom";
import { EquipmentTransfer } from "../lib/supabase.ts";

// Loader Component
const Loader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
  </div>
);

const Dashboard: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userSiteId, setUserSiteId] = useState<string | null>(null);
  const [myEquipment, setMyEquipment] = useState<any[]>([]);
  const [rentalEquipment, setRentalEquipment] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Refresh incoming requests (to this site)
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
          equipment(name),
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

  // Refresh outgoing requests (from this site)

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
          equipment(name),
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
  // Refresh equipment for current site
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

  useEffect(() => {
    const fetchUserAndEquipment = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          console.error("Error fetching user:", userError.message);
          return;
        }
        if (!user) return;

        setUserEmail(user.email);

        const { data: userData, error: userDbError } = await supabase
          .from("users")
          .select("site_id")
          .eq("auth_id", user.id)
          .single();

        if (userDbError || !userData) {
          console.error(
            "Error fetching user site ID:",
            userDbError?.message || "User not found."
          );
          setLoading(false);
          return;
        }

        setUserSiteId(userData.site_id);

        if (!userData.site_id) {
          console.warn("User is not assigned to a site.");
          setLoading(false);
          return;
        }

        await refreshEquipment(userData.site_id);
        await refreshRequests(userData.site_id);
        await refreshOutgoingRequests(userData.site_id);
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
        if (userSiteId) {
          await refreshRequests(userSiteId);
          await refreshOutgoingRequests(userSiteId);
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

      if (userSiteId) {
        await refreshRequests(userSiteId);
        await refreshOutgoingRequests(userSiteId);
        await refreshEquipment(userSiteId);
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

      if (userSiteId) {
        await refreshOutgoingRequests(userSiteId);
      }
    } catch (err: any) {
      alert("Error cancelling transfer: " + err.message);
      console.error(err);
    }
  };

  if (loading) return <Loader />;

  const pendingRequests = incomingRequests.filter(
    (req) => req.status === "pending"
  );

  return (
    <div className="p-6">
      <div className="bg-white shadow-lg rounded-xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button className="text-gray-600 focus:outline-none">
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
            <Link to="/newRequests">
              <button className="text-gray-600 focus:outline-none">
                <svg
                  className="w-6 h-6 transform -rotate-45"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
              </button>
            </Link>
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
                  <span className="font-medium text-gray-700">
                    {req.equipment?.name || "Unknown Equipment"}
                  </span>
                  <span className="text-sm text-gray-500">
                    Quantity: {req.quantity ?? "N/A"}
                  </span>
                  <span className="text-sm text-gray-500">
                    From: {req.from_site?.site_name || "Unknown Site"}
                  </span>
                  <span className="text-sm text-gray-500">Status: {req.status}</span>
                  <span className="text-xs text-gray-400">
                    Requested: {new Date(req.requested_at).toLocaleString()}
                  </span>

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
                        if (
                          window.confirm("Are you sure you want to reject this request?")
                        ) {
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
<h2 className="text-xl font-bold text-blue-700 mb-4">Outgoing Requests</h2>
{outgoingRequests.length === 0 ? (
  <p className="text-gray-500">No outgoing requests.</p>
) : (
  outgoingRequests.map((req) => (
    <div key={req.id} className="flex flex-col bg-white p-3 mb-2 rounded-md shadow-sm">
      <span className="font-medium text-gray-700">
        {req.equipment?.name || "Unknown Equipment"}
      </span>
      <span className="text-sm text-gray-500">Quantity: {req.quantity ?? "N/A"}</span>
      <span className="text-sm text-gray-500">
        To: {req.to_site?.site_name || "Unknown Site"}
      </span>
      <span className="text-sm text-gray-500">Status: {req.status}</span>
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
  ))
)}

      </div>
    </div>
  );
};

export default Dashboard;