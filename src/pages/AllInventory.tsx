import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Button } from "../components/ui/button.tsx"; // custom button
import { useAuth } from "../contexts/AuthContext.tsx";
import { useNavigate } from "react-router-dom"; // ⬅️ needed for navigation

interface Equipment {
  id: string;
  name: string;
  site_id: string | null;
}

const AllEquipment: React.FC = () => {
  const { user, userRole } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // ⬅️ hook for navigation

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, site_id");

      if (error) {
        console.error("Error fetching equipment:", error);
      } else {
        setEquipment(data || []);
      }
      setLoading(false);
    };

    fetchEquipment();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading equipment...</p>;

  return (
    <div className="p-6">
      {/* ✅ Navbar */}
      <nav className="flex justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-lg mb-6">
        <h1 className="text-xl font-bold">All Equipment</h1>
        <Button onClick={() => navigate("/supervisor")} className="bg-blue-600 hover:bg-blue-700">
          Go to Dashboard
        </Button>
      </nav>

      {/* ✅ Equipment Table */}
      <table className="w-full border border-gray-300 rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2 text-left">ID</th>
            <th className="border px-4 py-2 text-left">Name</th>
            <th className="border px-4 py-2 text-left">Site</th>
            <th className="border px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((eq) => (
            <tr key={eq.id}>
              <td className="border px-4 py-2">{eq.id}</td>
              <td className="border px-4 py-2">{eq.name}</td>
              <td className="border px-4 py-2">
                {eq.site_id ? eq.site_id : "Not Assigned"}
              </td>
              <td className="border px-4 py-2 space-x-2">
                <Button variant="outline">Request Claim</Button>
                {userRole === "admin" && (
                  <>
                    <Button>Edit</Button>
                    <Button variant="outline">Remove</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AllEquipment;
