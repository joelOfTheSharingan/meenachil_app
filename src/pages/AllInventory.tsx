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
  isRental?: boolean;
  construction_sites?: { site_name: string; id: string };
}

interface Site {
  id: string;
  site_name: string;
}

interface EquipmentRow {
  name: string;
  _ids: Record<string, string[]>; // Track equipment IDs per site
  quantities: Record<string, string>; // Store as strings while editing
}

const EditableEquipmentTable: React.FC = () => {
  // const { userRole } = useAuth();
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: eqData, error: eqError } = await supabase
        .from("equipment")
        .select("id, name, site_id, quantity, isRental, construction_sites(site_name, id)");

      if (eqError) throw new Error(`Error fetching equipment: ${eqError.message}`);

      const { data: sitesData, error: sitesError } = await supabase
        .from("construction_sites")
        .select("id, site_name");

      if (sitesError) throw new Error(`Error fetching sites: ${sitesError.message}`);

      setSites(sitesData || []);

      const rowsMap: Record<string, EquipmentRow> = {};

      (eqData || []).forEach((eq) => {
        const rowName = eq.isRental ? `${eq.name} (Rental)` : eq.name;
        const siteName = (eq.construction_sites as any)?.site_name || "Not Assigned";

        if (!rowsMap[rowName]) {
          rowsMap[rowName] = { name: rowName, _ids: {}, quantities: {} };
        }

        const current = rowsMap[rowName].quantities[siteName] ?? "0";
        const currentNum = parseInt(current || "0", 10);
        rowsMap[rowName].quantities[siteName] = String(currentNum + (eq.quantity || 0));

        rowsMap[rowName]._ids[siteName] = rowsMap[rowName]._ids[siteName] || [];
        rowsMap[rowName]._ids[siteName].push(eq.id);
      });

      setEquipmentRows(Object.values(rowsMap));
    } catch (err) {
      console.error(err);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle cell input; allow empty string during editing so user can replace 0
  const handleCellChange = (rowIndex: number, siteName: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    const trimmed = cleaned.replace(/^0+(?=\d)/, "");
    const nextValue = cleaned === "" ? "" : trimmed;
    setEquipmentRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex
          ? { ...row, quantities: { ...row.quantities, [siteName]: nextValue } }
          : row
      )
    );
  };

  // Save all changes to Supabase, including zero quantities
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const row of equipmentRows) {
        for (const siteName in row._ids) {
          const ids = row._ids[siteName];
          const val = row.quantities[siteName];
          const totalQty = val === "" ? 0 : Number(val ?? 0); // Explicitly handle empty and 0

          if (ids.length === 0) continue;

          const perRowQty = Math.floor(totalQty / ids.length);
          const remainder = totalQty % ids.length;

          for (let i = 0; i < ids.length; i++) {
            const qtyToSet = i === 0 ? perRowQty + remainder : perRowQty;
            const { error } = await supabase
              .from("equipment")
              .update({ quantity: qtyToSet })
              .eq("id", ids[i]);
            if (error) throw new Error(`Error updating equipment ${ids[i]}: ${error.message}`);
          }
        }
      }
      setEditing(false);
      await fetchData(); // Refresh data after saving
    } catch (err) {
      console.error("Error saving equipment:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Loading equipment...</p>;
  }

  return (
    <div className="p-4">
      <nav className="flex flex-col sm:flex-row justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-lg mb-4 gap-2 sm:gap-0">
        <h1 className="text-xl font-bold">Equipment by Site</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/supervisor")}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saving}
          >
            Go to Home
          </Button>
          <Button
            onClick={() => setEditing(!editing)}
            className="bg-yellow-500 hover:bg-yellow-600"
            disabled={saving}
          >
            {editing ? "Cancel Edit" : "Edit"}
          </Button>
          {editing && (
            <Button
              onClick={handleSaveAll}
              className="bg-green-600 hover:bg-green-700"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save All"}
            </Button>
          )}
        </div>
      </nav>

      {/* Saving Indicator */}
      {saving && (
        <div className="text-center text-blue-600 font-semibold mb-4">
          Saving...
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Equipment</th>
              {sites.map((site) => (
                <th key={site.id} className="border px-4 py-2 text-left">
                  {site.site_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipmentRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border px-4 py-2 font-medium">{row.name}</td>
                {sites.map((site) => (
                  <td key={site.id} className="border px-4 py-2">
                    {editing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row.quantities[site.site_name] ?? ""}
                        onChange={(e) => handleCellChange(rowIndex, site.site_name, e.target.value)}
                        className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={saving}
                      />
                    ) : (
                      (row.quantities[site.site_name] === "" ? 0 : Number(row.quantities[site.site_name] ?? 0))
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableEquipmentTable;