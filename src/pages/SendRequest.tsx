import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../contexts/AuthContext.tsx";

const SendRequest: React.FC = () => {
  const { user } = useAuth();

  const [action, setAction] = useState<"buy" | "sell" | "return">("buy");
  const [sites, setSites] = useState<{ id: string; site_name: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [equipmentList, setEquipmentList] = useState<{ id: number; name: string }[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isRental, setIsRental] = useState<boolean>(false);

  // Fetch sites supervised by the current user
  useEffect(() => {
    const fetchSites = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("construction_sites")
        .select("id, site_name")
        .eq("supervisor_id", user.id);
      if (error) {
        console.error("Error fetching sites:", error);
        return;
      }
      setSites(data || []);
    };
    fetchSites();
  }, [user]);

  // Fetch equipment for the selected site
  useEffect(() => {
    const fetchEquipment = async () => {
      if (!selectedSite) return;
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name")
        .eq("site_id", selectedSite);
      if (error) {
        console.error("Error fetching equipment:", error);
        return;
      }
      setEquipmentList(data || []);
    };
    fetchEquipment();
  }, [selectedSite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedSite) {
      alert("Please select a site.");
      return;
    }

    const equipmentName = selectedEquipment
      ? equipmentList.find((eq) => eq.id === Number(selectedEquipment))?.name
      : customEquipment;

    if (!equipmentName) {
      alert("Please select or enter equipment.");
      return;
    }

    const { error } = await supabase.from("equipment_requests").insert([
  {
    supervisor_id: user.id,
    site_id: selectedSite,
    equipment_id: selectedEquipment ? Number(selectedEquipment) : null,
    equipment_name: equipmentName,
    quantity,
    isRental,
    created_at: new Date().toISOString(),
    type: action, // << Add this line to satisfy NOT NULL constraint
  },
]);

    if (error) {
      console.error("Error creating request:", error);
      alert("❌ Failed to send request");
    } else {
      alert("✅ Request submitted successfully!");
      // Reset form
      setSelectedEquipment("");
      setCustomEquipment("");
      setQuantity(1);
      setIsRental(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
      <h1 className="text-xl font-bold mb-4">Send Request</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Selector */}
        <div>
          <label className="block mb-1 font-medium">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as "buy" | "sell" | "return")}
            className="w-full border rounded-lg p-2"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="return">Return</option>
          </select>
        </div>

        {/* Site Selector */}
        <div>
          <label className="block mb-1 font-medium">Select Site</label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select a site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
        </div>

        {/* Equipment Selector */}
        <div>
          <label className="block mb-1 font-medium">Equipment</label>
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="w-full border rounded-lg p-2 mb-2"
          >
            <option value="">Select existing equipment</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Or enter custom equipment"
            value={customEquipment}
            onChange={(e) => setCustomEquipment(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block mb-1 font-medium">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Rental Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isRental}
            onChange={(e) => setIsRental(e.target.checked)}
          />
          <label>Is Rental</label>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Send Request
        </button>
      </form>
    </div>
  );
};

export default SendRequest;
