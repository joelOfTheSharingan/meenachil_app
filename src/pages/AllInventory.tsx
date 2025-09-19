import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Button } from "../components/ui/button.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

interface Equipment {
  id: string;
  name: string;
  site_id: string | null;
  quantity: number;
}

interface GroupedEquipment {
  name: string;
  site_id: string | null;
  site_name?: string | null;
  totalQuantity: number;
  ids: string[];
}

const AllEquipment: React.FC = () => {
  const { userRole } = useAuth();
  const [equipment, setEquipment] = useState<GroupedEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ totalQuantity: 1 });
  const navigate = useNavigate();

  const fetchEquipment = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("equipment")
      .select("id, name, site_id, quantity, construction_sites(site_name)");

    if (error) {
      console.error("Error fetching equipment:", error);
      setLoading(false);
      return;
    }

    const grouped: Record<string, GroupedEquipment> = {};

    (data || []).forEach((eq) => {
      const key = `${eq.name}-${eq.site_id || "null"}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: eq.name,
          site_id: eq.site_id,
          site_name: eq.construction_sites?.site_name || "Not Assigned",
          totalQuantity: eq.quantity || 0,
          ids: [eq.id],
        };
      } else {
        grouped[key].totalQuantity += eq.quantity || 0;
        grouped[key].ids.push(eq.id);
      }
    });

    setEquipment(Object.values(grouped));
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleEditClick = (eq: GroupedEquipment, index: number) => {
    setEditingIndex(index);
    setEditForm({ totalQuantity: eq.totalQuantity });
  };

  const handleSaveEdit = async (eq: GroupedEquipment) => {
    const diff = editForm.totalQuantity - eq.totalQuantity;

    if (diff > 0) {
      const newRows = Array.from({ length: diff }, () => ({
        name: eq.name,
        site_id: eq.site_id,
        quantity: 1,
      }));
      await supabase.from("equipment").insert(newRows);
    } else if (diff < 0) {
      const idsToDelete = eq.ids.slice(0, -diff);
      await supabase.from("equipment").delete().in("id", idsToDelete);
    }

    setEditingIndex(null);
    await fetchEquipment();
  };

  const handleDelete = async (eq: GroupedEquipment) => {
    await supabase.from("equipment").delete().in("id", eq.ids);
    await fetchEquipment();
  };

  if (loading) return <p className="text-center mt-10">Loading equipment...</p>;

  return (
    <div className="p-4">
      <nav className="flex justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-lg mb-4">
        <h1 className="text-xl font-bold">All Equipment</h1>
        <Button onClick={() => navigate("/supervisor")} className="bg-blue-600 hover:bg-blue-700">
          Go to Home
        </Button>
      </nav>

      <div className="overflow-x-auto">
  <div className="transform origin-top-left scale-60">
    <table className="w-full min-w-[500px] border border-gray-300 rounded-lg">
      <thead className="bg-gray-100">
        <tr>
          <th className="border px-4 py-2 text-left">Name</th>
          <th className="border px-4 py-2 text-left">Site</th>
          <th className="border px-4 py-2 text-left w-24">Total Quantity</th>
          <th className="border px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {equipment.map((eq, index) => (
          <React.Fragment key={index}>
            <tr>
              <td className="border px-4 py-2">{eq.name}</td>
              <td className="border px-4 py-2">{eq.site_name}</td>
              <td className="border px-4 py-2 w-24">{eq.totalQuantity}</td>
              <td className="border px-4 py-2 space-x-2">
                <Button onClick={() => handleEditClick(eq, index)}>Edit</Button>
                {userRole === "admin" && (
                  <Button variant="outline" className="text-red-600" onClick={() => handleDelete(eq)}>
                    Remove
                  </Button>
                )}
              </td>
            </tr>

            {editingIndex === index && (
              <tr>
                <td colSpan={4} className="border px-4 py-4 bg-gray-50">
                  <div className="space-y-3">
                    <input
                      type="number"
                      min={1}
                      value={editForm.totalQuantity}
                      onChange={(e) =>
                        setEditForm({ totalQuantity: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="border px-2 py-1 rounded w-full"
                    />
                    <div className="flex space-x-2">
                      <Button onClick={() => handleSaveEdit(eq)}>Save</Button>
                      <Button variant="outline" onClick={() => setEditingIndex(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}

        {/* Total Row */}
        <tr className="bg-gray-200 font-bold">
          <td colSpan={2} className="border px-4 py-2 text-right">
            Total Quantity:
          </td>
          <td className="border px-4 py-2 w-24">
            {equipment.reduce((sum, eq) => sum + eq.totalQuantity, 0)}
          </td>
          <td className="border px-4 py-2"></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
    </div>
  );
};

export default AllEquipment;
