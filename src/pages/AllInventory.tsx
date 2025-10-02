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
  construction_sites?: { site_name: string };
}

interface Site {
  id: string;
  site_name: string;
}

interface EquipmentRow {
  name: string;
  [siteName: string]: number | string; // site columns will be dynamic
}

const AllEquipmentTable: React.FC = () => {
  const { userRole } = useAuth();
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);

    const { data: eqData, error: eqError } = await supabase
      .from("equipment")
      .select("id, name, site_id, quantity, isRental, construction_sites(site_name)");

    if (eqError) {
      console.error("Error fetching equipment:", eqError);
      setLoading(false);
      return;
    }

    const { data: sitesData, error: sitesError } = await supabase
      .from("construction_sites")
      .select("id, site_name");

    if (sitesError) console.error("Error fetching sites:", sitesError);
    setSites(sitesData || []);

    // Build a map of equipment name -> site -> quantity
    const rowsMap: Record<string, EquipmentRow> = {};

    (eqData || []).forEach((eq) => {
      const rowName = eq.isRental ? `${eq.name} (Rental)` : eq.name;
      if (!rowsMap[rowName]) {
        rowsMap[rowName] = { name: rowName };
      }

      const siteName = eq.construction_sites?.site_name || "Not Assigned";
      rowsMap[rowName][siteName] = (rowsMap[rowName][siteName] || 0) + eq.quantity;
    });

    setEquipmentRows(Object.values(rowsMap));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading equipment...</p>;

  return (
    <div className="p-4">
      <nav className="flex flex-col sm:flex-row justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-lg mb-4 gap-2 sm:gap-0">
        <h1 className="text-xl font-bold">Equipment by Site</h1>
        <Button onClick={() => navigate("/supervisor")} className="bg-blue-600 hover:bg-blue-700">
          Go to Home
        </Button>
      </nav>

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
            {equipmentRows.map((row, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2 font-medium">{row.name}</td>
                {sites.map((site) => (
                  <td key={site.id} className="border px-4 py-2">
                    {row[site.site_name] || 0}
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

export default AllEquipmentTable;
