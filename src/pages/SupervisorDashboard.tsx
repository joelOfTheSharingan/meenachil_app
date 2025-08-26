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
  const [myEquipment, setMyEquipment] = useState<any[]>([]);
  const [rentalEquipment, setRentalEquipment] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndEquipment = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("Error fetching user:", userError.message);
          return;
        }

        if (user) {
          setUserEmail(user.email);

          // ✅ Get the user's site_id
          const { data: userData, error: userDbError } = await supabase
            .from("users")
            .select("site_id")
            .eq("auth_id", user.id)
            .single();

          if (userDbError || !userData) {
            console.error("Error fetching user site ID:", userDbError?.message || "User not found in users table.");
            setLoading(false);
            return;
          }

          const userSiteId = userData.site_id;
          if (!userSiteId) {
            console.warn("User is not assigned to a site.");
            setLoading(false);
            return;
          }

          // ✅ Fetch equipment for that site
          const { data: equipmentData, error: equipmentError } = await supabase
            .from("equipment")
            .select("id, name, status, isRental")
            .eq("site_id", userSiteId);

          if (!equipmentError && equipmentData) {
            const groupedMyEquipment = equipmentData
              .filter(eq => !eq.isRental)
              .reduce((acc, current) => {
                const existing = acc.find(item => item.name === current.name);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ name: current.name, count: 1 });
                }
                return acc;
              }, []);
            setMyEquipment(groupedMyEquipment);

            const groupedRentalEquipment = equipmentData
              .filter(eq => eq.isRental)
              .reduce((acc, current) => {
                const existing = acc.find(item => item.name === current.name);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ name: current.name, count: 1 });
                }
                return acc;
              }, []);
            setRentalEquipment(groupedRentalEquipment);
          }

          // ✅ Fetch Incoming Transfer Requests
          const { data: requestsData, error: requestsError } = await supabase
            .from("equipment_transfers")
            .select(`
              id,
              status,
              equipment:equipment_id(name),
              from_site:from_site_id(site_name),
              requested_at
            `)
            .eq("to_site_id", userSiteId)
            .order("requested_at", { ascending: false });

          if (requestsError) {
            console.error("Error fetching incoming requests:", requestsError.message);
          } else {
            setIncomingRequests(requestsData || []);
          }
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

  if (loading) return <Loader />;

  return (
    <div className="p-6">
      <div className="bg-white shadow-lg rounded-xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button className="text-gray-600 focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <Link to="/newRequests">
              <button className="text-gray-600 focus:outline-none">
                <svg className="w-6 h-6 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </button>
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            Log Out
          </button>
        </div>

        {/* My Site Tools */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-blue-800 mb-4">My Site Tools</h2>
          <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
            {myEquipment.length === 0 ? (
              <p className="text-gray-500">No equipment found.</p>
            ) : (
              myEquipment.map((eq, index) => (
                <div key={index} className="flex justify-between items-center bg-white p-3 mb-2 rounded-md shadow-sm">
                  <span className="text-gray-700 font-medium">{eq.name}</span>
                  <span className="text-gray-900 font-bold px-3 py-1 bg-gray-200 rounded-full">{eq.count}</span>
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
                <div key={index} className="flex justify-between items-center bg-white p-3 mb-2 rounded-md shadow-sm">
                  <span className="text-gray-700 font-medium">{eq.name}</span>
                  <span className="text-gray-900 font-bold px-3 py-1 bg-gray-200 rounded-full">{eq.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ✅ Incoming Requests */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-green-700 mb-4">Incoming Requests</h2>
          <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
            {incomingRequests.length === 0 ? (
              <p className="text-gray-500">No incoming requests.</p>
            ) : (
              incomingRequests.map((req) => (
                <div key={req.id} className="flex flex-col bg-white p-3 mb-2 rounded-md shadow-sm">
                  <span className="font-medium text-gray-700">
                    {req.equipment?.name || "Unknown Equipment"}
                  </span>
                  <span className="text-sm text-gray-500">
                    From: {req.from_site?.site_name || "Unknown Site"}
                  </span>
                  <span className="text-sm text-gray-500">Status: {req.status}</span>
                  <span className="text-xs text-gray-400">
                    Requested: {new Date(req.requested_at).toLocaleString()}
                  </span>
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
