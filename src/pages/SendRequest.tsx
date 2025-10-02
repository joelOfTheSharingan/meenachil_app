import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

interface Site {
  id: string;
  site_name: string;
}

const SendRequest: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState<"buy" | "sell" | "return" | "rent">("buy");
  const [equipmentList, setEquipmentList] = useState<{ id: number; name: string; isRental: boolean; site_name: string }[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [customEquipment, setCustomEquipment] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [userSites, setUserSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Fetch user sites
  const fetchUserSites = async (userId: string) => {
    try {
      const { data: sitesData, error } = await supabase
        .from("construction_sites")
        .select("id, site_name")
        .eq("supervisor_id", userId);

      if (error) {
        console.error("Error fetching user sites:", error.message);
        return [];
      }

      return sitesData || [];
    } catch (err) {
      console.error("Unexpected error while fetching sites:", err);
      return [];
    }
  };

  // Fetch all equipment with site information
  const fetchAllEquipment = async () => {
    const { data, error } = await supabase
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
    
    const transformedData = (data || []).map((eq: any) => ({
      id: eq.id,
      name: eq.name,
      isRental: eq.isRental,
      site_name: eq.site?.site_name || "Unknown Site"
    }));
    
    setEquipmentList(transformedData);
  };

  useEffect(() => {
    const initializeData = async () => {
      if (!user?.id) return;

      try {
        const sites = await fetchUserSites(user.id);
        setUserSites(sites);

        if (sites.length > 0) {
          const initialSiteId = sites[0].id;
          setSelectedSiteId(initialSiteId);
        }

        await fetchAllEquipment();
      } catch (err) {
        console.error("Error initializing data:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user]);

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSelectedEquipment("");
    setCustomEquipment("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSiteId) {
      alert("Please select a site");
      return;
    }

    if (type === "buy") {
      if (!selectedEquipment && !customEquipment.trim()) {
        alert("Please select existing equipment or enter a custom equipment name");
        return;
      }
    } else {
      if (!selectedEquipment) {
        alert(`Please select existing equipment to ${type}`);
        return;
      }
    }

    if (quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    try {
      // ✅ Map rent → buy + isRental=true
      let requestType: "buy" | "sell" | "return" = type === "rent" ? "buy" : type;
      let isRental = type === "rent" || type === "return";

      if (selectedEquipment) {
        const selectedEq = equipmentList.find(eq => eq.id.toString() === selectedEquipment);
        if (selectedEq) {
          isRental = type === "rent" || type === "return" || selectedEq.isRental;
        }
      }

      const { error } = await supabase.from("equipment_requests").insert([
        {
          supervisor_id: user.id,
          site_id: selectedSiteId,
          equipment_id: selectedEquipment ? Number(selectedEquipment) : null,
          equipment_name: selectedEquipment ? undefined : customEquipment.trim(),
          quantity,
          type: requestType,   // 👈 DB safe
          isRental,            // 👈 rental flag
          status: "pending",
        },
      ]);

      if (error) {
        console.error("Error creating request:", error);
        alert("❌ Failed to send request");
      } else {
        alert("✅ Request submitted to admin");
        setSelectedEquipment("");
        setCustomEquipment("");
        setQuantity(1);
        navigate("/supervisor");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("❌ Failed to send request");
    }
  };

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
        <p className="text-gray-600 mb-4">
          You don't have any construction sites assigned. Please contact an administrator.
        </p>
        <button
          onClick={() => navigate("/supervisor")}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
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
        {/* Site Selection */}
        <div>
          <label className="block mb-1 font-medium text-gray-700">Construction Site</label>
          <select
            value={selectedSiteId}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a site...</option>
            {userSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Selector */}
        <div>
          <label className="block mb-1 font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as "buy" | "sell" | "return" | "rent");
              setSelectedEquipment("");
              setCustomEquipment("");
            }}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="rent">Rent</option>
            <option value="return">Return</option>
          </select>
        </div>

        {/* Equipment Selection */}
        <div>
          <label className="block mb-1 font-medium text-gray-700">Equipment</label>
          {(type === "sell" || type === "return" || type === "rent" || type === "buy") && (
            <select
              value={selectedEquipment}
              onChange={(e) => {
                setSelectedEquipment(e.target.value);
                if (e.target.value) setCustomEquipment("");
              }}
              className="w-full border border-gray-300 rounded-lg p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {type === "buy" ? "Select existing equipment (optional)" : `Select equipment to ${type}`}
              </option>
              {(() => {
                const groupedEquipment = equipmentList.reduce((acc, eq) => {
                  const key = `${eq.name}_${eq.isRental ? 'rental' : 'owned'}_${eq.site_name}`;
                  if (!acc[key]) {
                    acc[key] = {
                      name: eq.name,
                      isRental: eq.isRental,
                      site_name: eq.site_name,
                      ids: []
                    };
                  }
                  acc[key].ids.push(eq.id);
                  return acc;
                }, {} as Record<string, { name: string; isRental: boolean; site_name: string; ids: number[] }>);

                return Object.entries(groupedEquipment).map(([key, group]) => (
                  <option key={key} value={group.ids[0]}>
                    {group.name} {group.isRental ? '(Rental)' : '(Owned)'} - {group.site_name}
                  </option>
                ));
              })()}
            </select>
          )}

          {type === "buy" && (
            <input
              type="text"
              placeholder="Or enter custom equipment name"
              value={customEquipment}
              onChange={(e) => {
                setCustomEquipment(e.target.value);
                if (e.target.value) setSelectedEquipment("");
              }}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block mb-1 font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate("/supervisor")}
            className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send Request
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendRequest;
