import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Button } from "../components/ui/button.tsx";
import { useNavigate } from "react-router-dom";
import { Mail, Edit2, Save, X, Loader2 } from "lucide-react";

// --- Interfaces (No Change) ---
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
  const [showEmailModal, setShowEmailModal] = useState(false); 
  
  // --- New Global Editing States ---
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  // ---------------------------------
  
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
      const initialDraft: Record<string, Record<string, string>> = {}; // Initialize draft state

      (eqData || []).forEach((eq: any) => {
        const rowName = eq.isRental ? `${eq.name} (Rental)` : eq.name;
        const siteName = (eq.construction_sites as any)?.site_name || "Not Assigned";

        if (!rowsMap[rowName]) {
          rowsMap[rowName] = { name: rowName, _ids: {}, quantities: {} };
          initialDraft[rowName] = {};
        }

        const currentNum = parseInt(rowsMap[rowName].quantities[siteName] || "0", 10);
        const newNum = currentNum + (eq.quantity || 0);
        
        rowsMap[rowName].quantities[siteName] = String(newNum);
        initialDraft[rowName][siteName] = String(newNum); // Set initial draft value

        rowsMap[rowName]._ids[siteName] = rowsMap[rowName]._ids[siteName] || [];
        rowsMap[rowName]._ids[siteName].push(eq.id);
      });

      setEquipmentRows(Object.values(rowsMap));
      setDraftQuantities(initialDraft); // Set the initial draft for editing
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

// ---------------------------------------------------------------------
// --- GLOBAL EDITING LOGIC ---
// ---------------------------------------------------------------------

  const handleToggleEdit = () => {
    if (isTableEditing) {
      // If exiting edit mode via cancel, reset draft to current saved data
      setDraftQuantities(equipmentRows.reduce((acc, row) => {
        acc[row.name] = row.quantities;
        return acc;
      }, {} as Record<string, Record<string, string>>));
    } else {
        // When entering edit mode, ensure the draft is fresh
        // (This is primarily handled in fetchData, but kept here as a fallback)
    }
    setIsTableEditing(!isTableEditing);
  };

  const handleDraftChange = (rowName: string, siteName: string, value: string) => {
    setDraftQuantities(prev => ({
      ...prev,
      [rowName]: {
        ...prev[rowName],
        [siteName]: value,
      },
    }));
  };

  const handleSaveAllEdits = async () => {
    if (!window.confirm("Are you sure you want to save all changes to the inventory?")) {
        return;
    }

    setIsSaving(true);
    const updates: { id: string, quantity: number }[] = [];
    const errors: string[] = [];

    // Map through the draft state to find changes
    equipmentRows.forEach(row => {
        const currentQuantities = row.quantities;
        const draft = draftQuantities[row.name];
        
        sites.forEach(site => {
            const siteName = site.site_name;
            const currentQty = Number(currentQuantities[siteName] || 0);
            const draftQty = Number(draft[siteName] || 0);
            
            // Check for a valid change and if the equipment exists at the site
            if (currentQty !== draftQty) {
                if (isNaN(draftQty) || draftQty < 0) {
                    errors.push(`Invalid quantity for ${row.name} at ${siteName}.`);
                    return;
                }

                // Get the ID of one equipment record to update.
                const equipmentIds = row._ids[siteName];
                const firstEquipmentId = equipmentIds?.[0]; 

                if (firstEquipmentId) {
                    updates.push({ id: firstEquipmentId, quantity: draftQty });
                } else if (draftQty > 0) {
                    // This is a situation where the user entered a quantity > 0
                    // but no equipment ID exists. This would require an INSERT
                    // which is complex. For simplicity, we warn them.
                    errors.push(`Cannot set ${row.name} at ${siteName} to ${draftQty}. No existing record found to update.`);
                }
            }
        });
    });

    if (errors.length > 0) {
        setIsSaving(false);
        alert(`Validation Errors:\n${errors.join('\n')}\nNo changes were saved.`);
        return;
    }
    
    if (updates.length === 0) {
        setIsSaving(false);
        setIsTableEditing(false);
        alert("No changes detected.");
        return;
    }

    try {
        // Batch update using a promise for each required change (or use RLS for bulk RPC if performance is key)
        const updatePromises = updates.map(update => 
            supabase.from('equipment').update({ quantity: update.quantity }).eq('id', update.id)
        );

        const results = await Promise.all(updatePromises);
        results.forEach(result => {
            if (result.error) throw new Error(result.error.message);
        });

        // Re-fetch all data to ensure the UI reflects the new aggregate totals
        await fetchData(); 
        setIsTableEditing(false);
        alert(`Successfully saved ${updates.length} changes.`);

    } catch (error: any) {
        console.error("Error during batch update:", error.message);
        alert(`Failed to save some changes: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

// ---------------------------------------------------------------------
// --- EMAIL LOGIC (Unchanged) ---
// ---------------------------------------------------------------------

  const generateTableHTML = () => { /* ... (Same as original) */
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
                // Use the draft quantities if in editing mode, otherwise use saved quantities
                const quantitiesToDisplay = isTableEditing ? draftQuantities[row.name] || row.quantities : row.quantities;

                const total = Object.values(quantitiesToDisplay).reduce(
                  (sum, val) => sum + Number(val || 0),
                  0
                );
                return `
                  <tr>
                    <td>${row.name}</td>
                    <td>${total}</td>
                    ${sites
                      .map((s) => `<td>${Number(quantitiesToDisplay[s.site_name] || 0)}</td>`)
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

  const generateEmailHTML = () => { /* ... (Same as original) */
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

  const handleSendEmail = async () => { /* ... (Same as original) */
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
        setShowEmailModal(false); 
        setRecipient(""); 
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
      {/* Blue Top Section */}
<nav className="relative flex justify-between items-center bg-gradient-to-r from-blue-700 to-blue-500 text-white px-6 py-4 rounded-xl mb-6 shadow-md border border-blue-400">
  
  {/* 1. Left Section: Home Button (and Title) */}
  <div className="flex items-center gap-4">
    <Button
      onClick={() => navigate("/supervisor")}
      className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg shadow-sm"
      disabled={isTableEditing}
    >
      Home
    </Button>
    <h1 className="text-2xl font-bold tracking-wide drop-shadow-sm hidden sm:block">Equipment by Site</h1>
  </div>

  {/* 2. Right Section: Edit Button and Mail Icon */}
  <div className="flex gap-3 items-center">
    
    {/* Global Edit Button (Left side of the right group) */}
    <Button
      onClick={handleToggleEdit}
      className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
        isTableEditing
          ? "bg-red-500 hover:bg-red-600"
          : "bg-orange-500 hover:bg-orange-600"
      } shadow-md`}
      disabled={isSaving}
    >
      {isTableEditing ? <X size={18} /> : <Edit2 size={18} />}
      {isTableEditing ? "Cancel Edit" : "Edit"}
    </Button>

    {/* Mail Icon (Right side of the right group) */}
    <button
      onClick={() => setShowEmailModal(!showEmailModal)}
      className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-all shadow-sm border border-blue-400 relative"
      disabled={isTableEditing}
    >
      <Mail size={22} />
    </button>

    {/* Email Popover Div */}
    {showEmailModal && (
      <div className="absolute right-4 top-full mt-3 z-20 bg-white p-4 rounded-xl shadow-2xl flex flex-col gap-3 border border-gray-200 w-64 animate-in fade-in slide-in-from-top-2">
        <input
          type="email"
          placeholder="Recipient email"
          className="border px-3 py-2 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <Button
          onClick={handleSendEmail}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Mail size={16} /> Send Table
        </Button>
      </div>
    )}
    
  </div>
</nav>
      {/* Save Button for Edit Mode */}
      {isTableEditing && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={handleSaveAllEdits}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      )}

      {/* Table Section */}
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
            {equipmentRows.map((row) => {
              // Use draft quantities if available, otherwise use fetched data
              const quantitiesToDisplay = isTableEditing ? draftQuantities[row.name] || row.quantities : row.quantities;
              
              const total = Object.values(quantitiesToDisplay).reduce((sum, val) => sum + Number(val || 0), 0);

              return (
                <tr key={row.name}>
                  <td className="border px-4 py-2 font-medium">{row.name}</td>
                  {/* Total column remains static display */}
                  <td className="border px-4 py-2">{total}</td>
                  
                  {sites.map((site) => {
                    const siteName = site.site_name;
                    const currentValue = quantitiesToDisplay[siteName] || "0";
                    
                    return (
                      <td key={site.id} className="border px-4 py-2 relative">
                        {isTableEditing ? (
                          // Editable Mode: Render Input Field
                          <input
                            type="number"
                            className="w-full border rounded text-center p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            value={currentValue}
                            onChange={(e) => handleDraftChange(row.name, siteName, e.target.value)}
                            disabled={isSaving}
                            min="0"
                          />
                        ) : (
                          // Display Mode
                          <span>{currentValue}</span>
                        )}
                      </td>
                    );
                  })}
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