import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Button } from "../components/ui/button.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

interface Equipment {
  id: string;
  name: string;
  site_id: string | null;
}

interface GroupedEquipment {
  name: string;
  site_id: string | null;
  count: number;
  ids: string[];
}

const AllEquipment: React.FC = () => {
  const { userRole } = useAuth();
  const [equipment, setEquipment] = useState<GroupedEquipment[]>([]);
  const [sites, setSites] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    site_id: "",
    count: 1,
  });

  const navigate = useNavigate();

  const fetchEquipment = async () => {
    setLoading(true);

    // fetch sites from construction_sites table
    const { data: sitesData, error: sitesError } = await supabase
      .from("construction_sites")
      .select("id, site_name");

    if (sitesError) console.error("Error fetching sites:", sitesError);
    else {
      const siteMap: Record<string, string> = {};
      (sitesData || []).forEach((site) => (siteMap[site.id] = site.site_name));
      setSites(siteMap);
    }

    // fetch equipment
    const { data: eqData, error: eqError } = await supabase
      .from("equipment")
      .select("id, name, site_id");

    if (eqError) console.error("Error fetching equipment:", eqError);
    else {
      const grouped: Record<string, GroupedEquipment> = {};
      (eqData || []).forEach((eq) => {
        const key = `${eq.name}-${eq.site_id || "null"}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: eq.name,
            site_id: eq.site_id,
            count: 1,
            ids: [eq.id],
          };
        } else {
          grouped[key].count += 1;
          grouped[key].ids.push(eq.id);
        }
      });
      setEquipment(Object.values(grouped));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleEditClick = (eq: GroupedEquipment, index: number) => {
    setEditingIndex(index);
    setEditForm({
      name: eq.name,
      site_id: eq.site_id || "",
      count: eq.count,
    });
  };

  const handleSaveEdit = async (eq: GroupedEquipment) => {
    await supabase
      .from("equipment")
      .update({
        name: editForm.name,
        site_id: editForm.site_id || null,
      })
      .in("id", eq.ids);

    if (editForm.count > eq.count) {
      const extraRows = Array.from(
        { length: editForm.count - eq.count },
        () => ({ name: editForm.name, site_id: editForm.site_id || null })
      );
      await supabase.from("equipment").insert(extraRows);
    } else if (editForm.count < eq.count) {
      const idsToDelete = eq.ids.slice(0, eq.count - editForm.count);
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
    <div className="p-6">
      <nav className="flex justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-lg mb-6">
        <h1 className="text-xl font-bold">All Equipment</h1>
        <Button
          onClick={() => navigate("/supervisor")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Go to Home
        </Button>
      </nav>

      <table className="w-full border border-gray-300 rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2 text-left">Name</th>
            <th className="border px-4 py-2 text-left">Site</th>
            <th className="border px-4 py-2 text-left">Count</th>
            <th className="border px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((eq, index) => (
            <React.Fragment key={index}>
              <tr>
                <td className="border px-4 py-2">{eq.name}</td>
                <td className="border px-4 py-2">
                  {eq.site_id ? sites[eq.site_id] || eq.site_id : "Not Assigned"}
                </td>
                <td className="border px-4 py-2">{eq.count}</td>
                <td className="border px-4 py-2 space-x-2">
                  <Button onClick={() => handleEditClick(eq, index)}>Edit</Button>
                  {userRole === "admin" && (
                    <Button variant="outline" onClick={() => handleDelete(eq)}>
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
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="border px-2 py-1 rounded w-full"
                        placeholder="Equipment Name"
                      />
                      <select
                        value={editForm.site_id}
                        onChange={(e) =>
                          setEditForm({ ...editForm, site_id: e.target.value })
                        }
                        className="border px-2 py-1 rounded w-full"
                      >
                        <option value="">Not Assigned</option>
                        {Object.entries(sites).map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={editForm.count}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            count: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="border px-2 py-1 rounded w-full"
                        placeholder="Quantity"
                      />
                      <div className="flex space-x-2">
                        <Button onClick={() => handleSaveEdit(eq)}>Save</Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingIndex(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AllEquipment;
