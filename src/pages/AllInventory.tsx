import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Button } from "../components/ui/button.tsx";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

interface Site {
  id: string;
  site_name: string;
}

interface EquipmentRow {
  name: string;
  _ids: Record<string, string[]>; 
  quantities: Record<string, string>; 
}

const AllInventory: React.FC = () => {
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("");
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: eqData, error: eqError } = await supabase
        .from("equipment")
        .select("id, name, site_id, quantity, isRental, construction_sites(site_name, id)");

      if (eqError) throw new Error(eqError.message);

      const { data: sitesData, error: sitesError } = await supabase
        .from("construction_sites")
        .select("id, site_name");

      if (sitesError) throw new Error(sitesError.message);

      setSites(sitesData || []);

      const rowsMap: Record<string, EquipmentRow> = {};

      (eqData || []).forEach((eq) => {
        const rowName = eq.isRental ? `${eq.name} (Rental)` : eq.name;
        const siteName = (eq.construction_sites as any)?.site_name || "Not Assigned";

        if (!rowsMap[rowName]) {
          rowsMap[rowName] = { name: rowName, _ids: {}, quantities: {} };
        }

        const currentNum = parseInt(rowsMap[rowName].quantities[siteName] || "0", 10);
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

  const generateTableHTML = () => {
    return `
      <div style="font-family: system-ui, sans-serif, Arial; font-size: 14px;">
        <h2 style="text-align:center; color:#2c3e50;">Equipment by Site</h2>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%; text-align:left;">
          <thead style="background:#f5f5f5;">
            <tr>
              <th>Equipment</th>
              <th>Total</th>
              ${sites.map((s) => `<th>${s.site_name}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${equipmentRows
              .map((row) => {
                const quantities = row.quantities || {};
                const total = Object.values(quantities).reduce(
                  (sum, val) => sum + Number(val || 0),
                  0
                );
                return `
                  <tr>
                    <td>${row.name}</td>
                    <td>${total}</td>
                    ${sites
                      .map((s) => `<td>${Number(quantities[s.site_name] || 0)}</td>`)
                      .join("")}
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const generateEmailHTML = () => {
    const tableHTML = generateTableHTML();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Equipment Inventory</title>
      </head>
      <body style="font-family: system-ui, sans-serif, Arial; font-size: 14px; margin:0; padding:0; background:#f9f9f9;">
        <div style="max-width:800px; margin:20px auto; padding:20px; background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
          ${tableHTML}
        </div>
      </body>
      </html>
    `;
  };

  const handleSendEmail = async () => {
    if (!recipient || !/\S+@\S+\.\S+/.test(recipient)) {
      alert("Please enter a valid recipient email");
      return;
    }

    const emailHTML = generateEmailHTML();

    try {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: "service_8mvjhwk",
          template_id: "template_2wv21ew",
          user_id: "qrkekZ5E4Mwxfb_rY",
          template_params: {
            email: recipient,
            subject: "Equipment Table",
            message: emailHTML,
          },
        }),
      });

      if (response.ok) {
        alert("Email sent successfully!");
      } else {
        const errText = await response.text();
        console.error("EmailJS Error:", errText);
        alert("Failed to send email");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending email");
    }
  };

  if (loading) return <p className="text-center mt-10">Loading inventory...</p>;

  return (
    <div className="p-4">
      <nav className="flex flex-col sm:flex-row justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-lg mb-4 gap-2 sm:gap-0">
        <h1 className="text-xl font-bold">Equipment by Site</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/supervisor")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to Home
          </Button>
        </div>
      </nav>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="email"
          placeholder="Recipient email"
          className="border px-3 py-2 rounded w-64"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <Button
          onClick={handleSendEmail}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Mail size={16} /> Send Table
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Equipment</th>
              <th className="border px-4 py-2 text-left">Total</th>
              {sites.map((site) => (
                <th key={site.id} className="border px-4 py-2 text-left">{site.site_name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipmentRows.map((row, i) => {
              const quantities = row.quantities || {};
              const total = Object.values(quantities).reduce((sum, val) => sum + Number(val || 0), 0);
              return (
                <tr key={i}>
                  <td className="border px-4 py-2 font-medium">{row.name}</td>
                  <td className="border px-4 py-2">{total}</td>
                  {sites.map((site) => (
                    <td key={site.id} className="border px-4 py-2">{Number(quantities[site.site_name] || 0)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllInventory;
