import React, { useEffect, useState } from "react";
import { supabase,meenachil } from "../lib/supabase.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

// Icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

interface Site {
  id: string;
  site_name: string;
}

interface Equipment {
  id: number;
  name: string;
  isRental: boolean;
  site_name: string;
}

// Interface for each row in the UI
interface RequestRow {
  localId: number;
  equipmentId: string; // ID from dropdown
  customName: string;  // Typed name (for buy/rent)
  quantity: number;
}

const SendRequest: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState<"buy" | "sell" | "return" | "rent">("buy");
  const [userSites, setUserSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE: List of Items ---
  const [requestItems, setRequestItems] = useState<RequestRow[]>([
    { localId: Date.now(), equipmentId: "", customName: "", quantity: 1 }
  ]);

  // Fetch user sites
  const fetchUserSites = async (userId: string) => {
    const { data: sitesData, error } = await meenachil
      .from("construction_sites")
      .select("id, site_name")
      .eq("supervisor_id", userId);
    if (error) {
      console.error("Error fetching user sites:", error.message);
      return [];
    }
    return sitesData || [];
  };

  // Fetch all equipment
  const fetchAllEquipment = async () => {
    const { data, error } = await meenachil
      .from("equipment")
      .select(`
        id,
        name,
        isRental,
        site:site_id(site_name)
      `);
    if (error) {
      console.error("Error fetching equipment:", error);
      return;
    }
    const transformed = (data || []).map((eq: any) => ({
      id: eq.id,
      name: eq.name,
      isRental: eq.isRental,
      site_name: eq.site?.site_name || "Unknown Site"
    }));
    setEquipmentList(transformed);
  };

  useEffect(() => {
    const initialize = async () => {
      if (!user?.id) return;
      try {
        const sites = await fetchUserSites(user.id);
        setUserSites(sites);
        if (sites.length > 0) setSelectedSiteId(sites[0].id);
        await fetchAllEquipment();
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [user]);

  // --- ROW MANAGEMENT ---

  const handleAddRow = () => {
    setRequestItems([
      ...requestItems,
      { localId: Date.now(), equipmentId: "", customName: "", quantity: 1 }
    ]);
  };

  const handleRemoveRow = (localId: number) => {
    if (requestItems.length === 1) return;
    setRequestItems(requestItems.filter(item => item.localId !== localId));
  };

  const updateRow = (localId: number, field: keyof RequestRow, value: any) => {
    setRequestItems(items => items.map(item => {
      if (item.localId !== localId) return item;

      // Logic: If user selects dropdown, clear custom name. If user types custom name, clear dropdown.
      if (field === 'equipmentId') {
        return { ...item, equipmentId: value, customName: "" };
      }
      if (field === 'customName') {
        return { ...item, customName: value, equipmentId: "" };
      }

      return { ...item, [field]: value };
    }));
  };

  // --- SUBMISSION ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSiteId) {
      alert("Please select a site");
      return;
    }

    // Validate all rows
    for (const item of requestItems) {
      if (item.quantity <= 0) {
        alert("Quantity must be greater than 0 for all items");
        return;
      }

      if (type === "buy" || type === "rent") {
        if (!item.equipmentId && !item.customName.trim()) {
          alert("Please select existing equipment or enter a custom name for all items");
          return;
        }
      } else {
        // Sell / Return
        if (!item.equipmentId) {
          alert(`Please select existing equipment to ${type} for all items`);
          return;
        }
      }
    }

    try {
      const requestType = type === "rent" ? "buy" : type;
      const isRental = type === "rent";

      // Create Payload Array
      const payload = requestItems.map(item => {
        const equipmentId = item.equipmentId ? Number(item.equipmentId) : null;
        // If dropdown is selected, we usually don't send the name, OR we send the selected name
        // If custom is typed, we send that.
        const equipmentName = !item.equipmentId && item.customName.trim() 
          ? item.customName.trim() 
          : null; // Depending on DB, you might want to send the selected equipment's name here too, but usually ID is enough.

        return {
          supervisor_id: user.id,
          site_id: selectedSiteId,
          equipment_id: equipmentId,
          equipment_name: equipmentName,
          quantity: item.quantity,
          type: requestType,
          isRental,
          status: "pending",
        };
      });

      const { error } = await meenachil.from("equipment_requests").insert(payload);

      if (error) {
        console.error("Error creating request:", error);
        alert("❌ Failed to send request");
      } else {
        alert("✅ Requests submitted successfully");
        navigate("/supervisor");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("❌ Failed to send request");
    }
  };

  // Helper to filter options based on logic
  const getFilteredOptions = () => {
    return Object.values(
      equipmentList
        .filter(eq => {
          if (!selectedSiteId) return false;
          const siteName = userSites.find(s => s.id === selectedSiteId)?.site_name;
          switch (type) {
            case "buy": return true;
            case "sell": return eq.site_name === siteName && !eq.isRental;
            case "rent": return true;
            case "return": return eq.site_name === siteName && eq.isRental;
            default: return true;
          }
        })
        .reduce((acc: Record<string, { name: string; ids: number[] }>, eq) => {
          if (!acc[eq.name]) acc[eq.name] = { name: eq.name, ids: [] };
          acc[eq.name].ids.push(eq.id);
          return acc;
        }, {})
    );
  };

  const filteredOptions = getFilteredOptions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (userSites.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
        <h1 className="text-xl font-bold mb-4 text-red-600">No Sites Assigned</h1>
        <p className="text-gray-600 mb-4">You don't have any construction sites assigned.</p>
        <button onClick={() => navigate("/supervisor")} className="w-full bg-blue-600 text-white py-2 rounded-lg">Back</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Send Request</h1>
        <button
          onClick={() => navigate("/supervisor")}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Global settings for the batch */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => {
                 setSelectedSiteId(e.target.value);
                 // Reset items when site changes to avoid invalid selections
                 setRequestItems([{ localId: Date.now(), equipmentId: "", customName: "", quantity: 1 }]);
              }}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select site...</option>
              {userSites.map(site => <option key={site.id} value={site.id}>{site.site_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Type</label>
            <select
              value={type}
              onChange={(e) => { 
                setType(e.target.value as any); 
                // Reset items when type changes
                setRequestItems([{ localId: Date.now(), equipmentId: "", customName: "", quantity: 1 }]);
              }}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="rent">Rent</option>
              <option value="return">Return</option>
            </select>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* --- DYNAMIC ITEMS LIST --- */}
        <div>
           <label className="block mb-2 font-medium text-gray-700">Items Needed</label>
           
           <div className="space-y-4">
             {requestItems.map((item, index) => (
               <div key={item.localId} className="relative bg-gray-50 p-3 rounded-lg border border-gray-200">
                 
                 {/* Mobile Responsive Layout */}
                 <div className="flex gap-2 items-start">
                    
                    {/* Left Column: Equipment Select AND Custom Input (flex-1 takes all space) */}
                    <div className="flex-1 min-w-0">
                      <label className="text-xs text-gray-500 mb-1 block">Item Name</label>
                      
                      {/* Dropdown */}
                      <select
                        value={item.equipmentId}
                        onChange={(e) => updateRow(item.localId, 'equipmentId', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
                      >
                        <option value="">
                          {type === "buy" || type === "rent" ? "Select Existing (Optional)" : "Select Equipment"}
                        </option>
                        {filteredOptions.map(group => (
                          <option key={group.name} value={group.ids[0]}>
                            {group.name}
                          </option>
                        ))}
                      </select>

                      {/* Custom Input (Only for Buy/Rent) */}
                      {(type === "buy" || type === "rent") && (
                        <input
                          type="text"
                          placeholder="Or type custom name..."
                          value={item.customName}
                          onChange={(e) => updateRow(item.localId, 'customName', e.target.value)}
                          className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        />
                      )}
                    </div>

                    {/* Right Column: Quantity (Fixed width, won't shrink) */}
                    <div className="w-20 flex-shrink-0">
                      <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateRow(item.localId, 'quantity', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none h-[38px]" 
                      />
                    </div>
                 </div>

                 {/* Remove Button */}
                 {requestItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.localId)}
                      className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow border border-gray-200 hover:bg-red-50"
                    >
                      <TrashIcon />
                    </button>
                 )}
               </div>
             ))}
           </div>

           {/* Add Button */}
           <button
             type="button"
             onClick={handleAddRow}
             className="mt-3 w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-medium"
           >
             <PlusIcon />
             Add Another Item
           </button>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/supervisor")}
            className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm"
          >
            Send {requestItems.length} Request{requestItems.length > 1 ? 's' : ''}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendRequest;