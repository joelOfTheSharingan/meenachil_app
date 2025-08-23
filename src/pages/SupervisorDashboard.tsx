import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts"; 
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndEquipment = async () => {
      // 1. Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error fetching user:", userError.message);
        return;
      }

      if (user) {
        setUserEmail(user.email);

        // 2. Get equipment belonging to this supervisor
        const { data, error } = await supabase
          .from("equipment")
          .select(`
            id,
            name,
            status,
            date_bought,
            construction_sites!inner(contractor)
          `)
          .eq("construction_sites.contractor", user.email);

        if (error) {
          console.error("Error fetching equipment:", error.message);
        } else {
          setEquipment(data || []);
        }
      }

      setLoading(false);
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

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="p-6">
      <div className="bg-white shadow-lg rounded-xl p-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-700">
              Engineer Dashboard
            </h1>
            <p className="text-gray-600">
              Logged in as: <span className="font-semibold">{userEmail}</span>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/inventory")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Go to All Equipments
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Equipment Section */}
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          My Equipment
        </h2>

        {equipment.length === 0 ? (
          <p className="text-gray-500">No equipment found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-gray-600 font-medium border-b">
                    ID
                  </th>
                  <th className="p-3 text-left text-gray-600 font-medium border-b">
                    Name
                  </th>
                  <th className="p-3 text-left text-gray-600 font-medium border-b">
                    Status
                  </th>
                  <th className="p-3 text-left text-gray-600 font-medium border-b">
                    Date Bought
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-700">{eq.id}</td>
                    <td className="p-3 text-gray-700">{eq.name}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${
                          eq.status === "available"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {eq.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-700">
                      {eq.date_bought
                        ? new Date(eq.date_bought).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
