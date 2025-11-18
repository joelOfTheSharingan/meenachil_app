import React, { useEffect, useState } from "react";
import { supabase, uploadImageToSupabase } from "../lib/supabase.ts";
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
  const [remarks, setRemarks] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch supervisor's sites
  useEffect(() => {
    const fetchSupervisorSites = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("construction_sites")
        .select("id, site_name")
        .eq("supervisor_id", user.id);

      if (error) return console.error(error);

      if (data && data.length > 0) {
        setFromSites(data);
        setFromSiteId(data[0].id);
      }
    };

    fetchSupervisorSites();
  }, [user]);

  // Fetch all sites
  useEffect(() => {
    const fetchSites = async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("id, site_name");

      if (error) return console.error(error);
      setToSites(data || []);
    };

    fetchSites();
  }, []);

  // Fetch equipment
  useEffect(() => {
    if (!fromSiteId) return;

    const fetchEquipment = async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, quantity, isRental")
        .eq("site_id", fromSiteId);

      if (error) return console.error(error);

      const nonRentalGrouped: Record<string, { id: number; total: number }> = {};
      const rentalGrouped: Record<string, { id: number; total: number }> = {};

      (data || []).forEach((eq) => {
        const target = eq.isRental ? rentalGrouped : nonRentalGrouped;
        if (!target[eq.name]) target[eq.name] = { id: eq.id, total: 0 };
        target[eq.name].total += eq.quantity || 0;
      });

      const nonRentalList = Object.entries(nonRentalGrouped).map(([name, v]) => ({
        id: v.id,
        name,
        total: v.total,
        type: "nonRental" as const,
      }));

      const rentalList = Object.entries(rentalGrouped).map(([name, v]) => ({
        id: v.id,
        name,
        total: v.total,
        type: "rental" as const,
      }));

      setEquipmentList([...nonRentalList, ...rentalList]);
    };

    fetchEquipment();
  }, [fromSiteId]);

  // Update quantity limit
  useEffect(() => {
    if (!selectedEquipment) {
      setMaxQuantity(1);
      setQuantity(1);
      return;
    }

    const s = equipmentList.find((eq) => eq.id.toString() === selectedEquipment);
    if (s) {
      setMaxQuantity(s.total);
      if (quantity > s.total) setQuantity(s.total);
    }
  }, [selectedEquipment, equipmentList]);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromSiteId || !user?.id || !selectedEquipment || !toSiteId) {
      alert("Missing required fields.");
      return;
    }

    if (vehicleNumber.length > 13) {
      alert("Vehicle number must be ≤ 13 characters.");
      return;
    }

    setLoading(true);

let image_url: string | null = null;
if (imageFile) {
  try {
    image_url = await uploadImageToSupabase(imageFile);
  } catch (err) {
    console.error(err);
    alert("Image upload failed.");
  }
}

    const { error } = await supabase.from("equipment_transfers").insert([
      {
        equipment_id: Number(selectedEquipment),
        from_site_id: fromSiteId,
        to_site_id: toSiteId,
        requested_by: user.id,
        status: "pending",
        quantity,
        vehicle_number: vehicleNumber,
        remarks,
        image_url,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Failed to create request. Try refreshing");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      alert("Transfer submitted successfully.");
      navigate("/dashboard");
    }
  };

  if (fromSites.length === 0) {
    return (
      <div className="p-6">
        <p>You are not assigned as a supervisor for any site.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">New Tool Transfer</h1>
        <button
          onClick={() => navigate("/home")}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          Home
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From Site */}
        <div>
          <label className="block text-sm mb-1">From Site</label>
          <select
            value={fromSiteId}
            onChange={(e) => setFromSiteId(e.target.value)}
            className="w-full border rounded p-2"
          >
            {fromSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_name}
              </option>
            ))}
          </select>
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm mb-1">Equipment</label>
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="w-full border rounded p-2"
            required
          >
            <option value="">Select equipment</option>
            {equipmentList
              .filter((eq) => eq.total > 0)
              .map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} (Available: {eq.total})
                </option>
              ))}
          </select>
        </div>

        {/* Vehicle Number */}
        <div>
          <label className="block text-sm mb-1">Vehicle Number</label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            maxLength={13}
            className="w-full border rounded p-2"
            required
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm mb-1">Quantity (Max: {maxQuantity})</label>
          <input
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.min(Number(e.target.value), maxQuantity))
            }
            className="w-full border rounded p-2"
            required
          />
        </div>

        {/* To Site */}
        <div>
          <label className="block text-sm mb-1">To Site</label>
          <select
            value={toSiteId}
            onChange={(e) => setToSiteId(e.target.value)}
            className="w-full border rounded p-2"
            required
          >
            <option value="">Select site</option>
            {toSites
              .filter((s) => s.id !== fromSiteId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_name}
                </option>
              ))}
          </select>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm mb-1">Upload Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full border rounded p-2"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm mb-1">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          {loading ? "Submitting..." : "Transfer"}
        </button>
      </form>
    </div>
  );
};

export default NewRequests;
