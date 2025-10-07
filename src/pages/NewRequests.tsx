import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

interface EquipmentItem {
  id: number;
  name: string;
  total: number;
  type: "nonRental" | "rental";
}

const NewRequests: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fromSites, setFromSites] = useState<{ id: string; site_name: string }[]>([]);
  const [fromSiteId, setFromSiteId] = useState<string>("");
  const [toSites, setToSites] = useState<{ id: string; site_name: string }[]>([]);
  const [toSiteId, setToSiteId] = useState<string>("");

  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [maxQuantity, setMaxQuantity] = useState<number>(1);
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch supervisor's sites
  useEffect(() => {
    const fetchSupervisorSites = async () => {
      if (!user) return;

      const { data: sitesData, error } = await supabase
        .from("construction_sites")
        .select("id, site_name")
        .eq("supervisor_id", user.id);

      if (error) {
        console.error("Error fetching supervisor sites:", error);
        return;
      }

      if (sitesData && sitesData.length > 0) {
        setFromSites(sitesData);
        setFromSiteId(sitesData[0].id);
      }
    };

    fetchSupervisorSites();
  }, [user]);

  // Fetch all sites for "To Site"
  useEffect(() => {
    const fetchSites = async () => {
      const { data, error } = await supabase.from("construction_sites").select("id, site_name");
      if (error) {
        console.error("Error fetching sites:", error);
        return;
      }
      setToSites(data || []);
    };
    fetchSites();
  }, []);

  // Fetch equipment and sum non-rental and rental separately
  useEffect(() => {
    if (!fromSiteId) return;

    const fetchEquipment = async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, quantity, isRental")
        .eq("site_id", fromSiteId);

      if (error) {
        console.error("Error fetching equipment:", error);
        return;
      }

      const nonRentalGrouped: Record<string, { id: number; total: number }> = {};
      const rentalGrouped: Record<string, { id: number; total: number }> = {};

      (data || []).forEach((eq) => {
        const target = eq.isRental ? rentalGrouped : nonRentalGrouped;
        if (!target[eq.name]) target[eq.name] = { id: eq.id, total: 0 };
        target[eq.name].total += eq.quantity || 0;
      });

      const nonRentalList = Object.entries(nonRentalGrouped).map(([name, { id, total }]) => ({
        id,
        name,
        total,
        type: "nonRental" as const,
      }));

      const rentalList = Object.entries(rentalGrouped).map(([name, { id, total }]) => ({
        id,
        name,
        total,
        type: "rental" as const,
      }));

      setEquipmentList([...nonRentalList, ...rentalList]);
    };

    fetchEquipment();
  }, [fromSiteId]);

  // Update maxQuantity when equipment changes
  useEffect(() => {
    if (!selectedEquipment) {
      setMaxQuantity(1);
      setQuantity(1);
      return;
    }

    const selected = equipmentList.find((eq) => eq.id.toString() === selectedEquipment);
    if (selected) {
      setMaxQuantity(selected.total);
      if (quantity > selected.total) setQuantity(selected.total);
    }
  }, [selectedEquipment, equipmentList]);

  // Handle submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !fromSiteId ||
      !user?.id ||
      !selectedEquipment ||
      !toSiteId ||
      quantity <= 0 ||
      vehicleNumber.length > 13
    ) {
      alert("Please fill all fields correctly. Vehicle number must be <= 13 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("equipment_transfers").insert([
      {
        equipment_id: Number(selectedEquipment),
        from_site_id: fromSiteId,
        to_site_id: toSiteId,
        requested_by: user.id,
        status: "pending",
        quantity,
        vehicle_number: vehicleNumber, // added here
      },
    ]);
    setLoading(false);

    if (error) {
      console.error("Error creating transfer request:", error);
      alert("❌ Failed to create request");
    } else {
      alert("✅ Request submitted successfully");
      navigate("/dashboard");
    }
  };

  if (fromSites.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">New Tool Transfer</h1>
          <button
            onClick={() => navigate("/home")}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition duration-300"
          >
            Home
          </button>
        </div>
        <p className="text-red-600">
          You are not assigned as a supervisor for any site. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">New Tool Transfer</h1>
        <button
          onClick={() => navigate("/home")}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition duration-300"
        >
          Home
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From Site */}
        <div>
          <label className="block text-sm font-medium mb-1">From Site</label>
          <select
            value={fromSiteId}
            onChange={(e) => setFromSiteId(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            {fromSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm font-medium mb-1">Equipment to Transfer</label>
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select equipment</option>
            {equipmentList
              .filter((eq) => eq.type === "nonRental" && eq.total > 0)
              .map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} (Available: {eq.total})
                </option>
              ))}
            {equipmentList
              .filter((eq) => eq.type === "rental" && eq.total > 0)
              .map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} (Rental Available: {eq.total})
                </option>
              ))}
          </select>
        </div>

        {/* Vehicle Number */}
        <div>
          <label className="block text-sm font-medium mb-1">Vehicle Number</label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            maxLength={13}
            placeholder="Enter vehicle number"
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-1">Quantity (Max: {maxQuantity})</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.min(Number(e.target.value), maxQuantity))}
            min={1}
            max={maxQuantity}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* To Site */}
        <div>
          <label className="block text-sm font-medium mb-1">To Site</label>
          <select
            value={toSiteId}
            onChange={(e) => setToSiteId(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select a site</option>
            {toSites.filter((site) => site.id !== fromSiteId).map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Transfer"}
        </button>
      </form>
    </div>
  );
};

export default NewRequests;
