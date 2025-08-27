import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useNavigate, Link } from "react-router-dom";

// ✅ Loader Component
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔄 Fetch requests separately so we can call it after accept/reject
  // 🔄 Fetch requests separately so we can call it after accept/reject
const refreshRequests = async (siteId: string) => {
  const { data: requestsData, error } = await supabase
    .from("equipment_transfers")
    .select(`
      id,
      status,
      accepted,
      comment,
      quantity,
      equipment_id,
      equipment:equipment_id(name),
      from_site:from_site_id(site_name),
      requested_at
    `)
    .eq("to_site_id", siteId)
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("Error fetching requests:", error.message);
    return;
  }

  setIncomingRequests(requestsData || []);
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

        // ✅ Fetch Equipment
        const { data: equipmentData } = await supabase
          .from("equipment")
          .select("id, name, status, isRental")
          .eq("site_id", userData.site_id);

        if (equipmentData) {
          const groupByName = (arr: any[], rental: boolean) =>
            arr
              .filter((eq) => eq.isRental === rental)
              .reduce((acc, curr) => {
                const existing = acc.find((item) => item.name === curr.name);
                if (existing) existing.count++;
                else acc.push({ name: curr.name, count: 1 });
                return acc;
              }, []);
          setMyEquipment(groupByName(equipmentData, false));
          setRentalEquipment(groupByName(equipmentData, true));
        }

        // ✅ Fetch Incoming Requests
        await refreshRequests(userData.site_id);
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

  const handleDecision = async (req: any, accept: boolean) => {
  console.log("Updating transfer:", req.id, "accepted:", accept); // ✅ debug log

  const { error } = await supabase
    .from("equipment_transfers")
    .update({ accepted: accept })  // must be true OR false
    .eq("id", req.id);

  if (error) {
    console.error("Supabase error:", error.message);
    alert("Error: " + error.message);
    return;
  }

  // refresh after update
  await refreshRequests(userSiteId);
};


  if (loading) return <Loader />;

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
            {myEquipment.length === 0 ? (
              <p className="text-gray-500">No equipment found.</p>
            ) : (
              myEquipment.map((eq, index) => (
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
            {rentalEquipment.length === 0 ? (
              <p className="text-gray-500">No rental equipment found.</p>
            ) : (
              rentalEquipment.map((eq, index) => (
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
  <h2 className="text-xl font-bold text-green-700 mb-4">
    Incoming Requests
  </h2>
  <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
    {incomingRequests.length === 0 ? (
      <p className="text-gray-500">No incoming requests.</p>
    ) : (
      incomingRequests.map((req) => (
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
          <span className="text-sm text-gray-500">
            Status: {req.status}
          </span>
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

      </div>
    </div>
  );
};

export default Dashboard;
