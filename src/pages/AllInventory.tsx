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
  construction_sites?: { site_name: string };
}

interface Site {
  id: string;
  site_name: string;
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
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAll, setEditingAll] = useState(false);
  const [editForms, setEditForms] = useState<Record<number, { quantity: number; site_id: string | null }>>({});
  const navigate = useNavigate();

  const fetchEquipment = async () => {
    setLoading(true);

    // Fetch all equipment with site name
    const { data: eqData, error: eqError } = await supabase
      .from("equipment")
      .select("id, name, site_id, quantity, construction_sites(site_name)");

    if (eqError) {
      console.error("Error fetching equipment:", eqError);
      setLoading(false);
      return;
    }

    // Fetch all sites
    const { data: sitesData, error: sitesError } = await supabase
      .from("construction_sites")
      .select("id, site_name");

    if (sitesError) console.error("Error fetching sites:", sitesError);
    setSites(sitesData || []);

    const grouped: Record<string, GroupedEquipment> = {};
    (eqData || []).forEach((eq) => {
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

  const handleEditAllToggle = () => {
    const initialForm: Record<number, { quantity: number; site_id: string | null }> = {};
    equipment.forEach((eq, idx) => {
      initialForm[idx] = { quantity: eq.totalQuantity, site_id: eq.site_id };
    });
    setEditForms(initialForm);
    setEditingAll(!editingAll);
  };

  const handleSaveAll = async () => {
    for (const [idx, form] of Object.entries(editForms)) {
      const index = parseInt(idx);
      const eq = equipment[index];

      // Update quantity for all IDs
      const perRowQty = Math.floor(form.quantity / eq.ids.length);
      const remainder = form.quantity % eq.ids.length;
      for (let i = 0; i < eq.ids.length; i++) {
        const qtyToSet = i === 0 ? perRowQty + remainder : perRowQty;
        await supabase
          .from("equipment")
          .update({ quantity: qtyToSet, site_id: form.site_id })
          .eq("id", eq.ids[i]);
      }
    }

    setEditingAll(false);
    await fetchEquipment();
  };

  const handleDelete = async (eq: GroupedEquipment) => {
    await supabase.from("equipment").delete().in("id", eq.ids);
    await fetchEquipment();
  };

  if (loading) return <p className="text-center mt-10">Loading equipment...</p>;

  return (
    <div className="p-4">
      <nav className="flex flex-col sm:flex-row justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-lg mb-4 gap-2 sm:gap-0">
        <h1 className="text-xl font-bold">All Equipment</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate("/supervisor")} className="bg-blue-600 hover:bg-blue-700">
            Go to Home
          </Button>
          <Button onClick={handleEditAllToggle} className="bg-yellow-500 hover:bg-yellow-600">
            {editingAll ? "Cancel Edit" : "Edit"}
          </Button>
          {editingAll && (
            <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700">
              Save All
            </Button>
          )}
        </div>
      </nav>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
  <tr>
    <th className="border px-4 py-2 text-left">Name</th>
    <th className="border px-4 py-2 text-left">Site</th>
    <th className="border px-4 py-2 text-left w-24">Quantity</th>
  </tr>
</thead>
<tbody>
  {equipment.map((eq, index) => (
    <tr key={index}>
      <td className="border px-4 py-2">{eq.name}</td>
      <td className="border px-4 py-2">
        {editingAll ? (
          <select
            value={editForms[index].site_id || ""}
            onChange={(e) =>
              setEditForms({
                ...editForms,
                [index]: { ...editForms[index], site_id: e.target.value },
              })
            }
            className="border px-2 py-1 rounded w-full"
          >
            <option value="">Not Assigned</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
        ) : (
          eq.site_name
        )}
      </td>
      <td className="border px-4 py-2 w-24">
        {editingAll ? (
          <input
            type="number"
            min={1}
            value={editForms[index].quantity}
            onChange={(e) =>
              setEditForms({
                ...editForms,
                [index]: { ...editForms[index], quantity: Math.max(1, parseInt(e.target.value) || 1) },
              })
            }
            className="border px-2 py-1 rounded w-full"
          />
        ) : (
          eq.totalQuantity
        )}
      </td>
    </tr>
  ))}
</tbody>

        </table>
      </div>
    </div>
  );
};

export default AllEquipment;
