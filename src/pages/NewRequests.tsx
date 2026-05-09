import React, { useEffect, useState } from "react";
import { supabase, uploadImageToSupabase,meenachil } from "../lib/supabase.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

// Simple Icon components to avoid external dependencies like lucide-react for this snippet
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

interface EquipmentItem {
  id: number;
  name: string;
  total: number;
  type: "nonRental" | "rental";
}

interface TransferRow {
  localId: number; // For React keys
  equipmentId: string;
  quantity: number;
  maxQuantity: number;
}

const NewRequests: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fromSites, setFromSites] = useState<{ id: string; site_name: string }[]>([]);
  const [fromSiteId, setFromSiteId] = useState<string>("");
  const [toSites, setToSites] = useState<{ id: string; site_name: string }[]>([]);
  const [toSiteId, setToSiteId] = useState<string>("");

  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  
  // --- MODIFIED: State for handling multiple items ---
  const [transferItems, setTransferItems] = useState<TransferRow[]>([
    { localId: Date.now(), equipmentId: "", quantity: 1, maxQuantity: 1 }
  ]);

  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch supervisor's sites
  useEffect(() => {
    const fetchSupervisorSites = async () => {
      if (!user) return;

      const { data, error } = await meenachil
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
      const { data, error } = await meenachil
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
      const { data, error } = await meenachil
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

  // --- NEW: Add / Remove / Update Row Logic ---

  const handleAddRow = () => {
    setTransferItems([
      ...transferItems,
      { localId: Date.now(), equipmentId: "", quantity: 1, maxQuantity: 1 }
    ]);
  };

  const handleRemoveRow = (localId: number) => {
    if (transferItems.length === 1) return; // Prevent deleting the last row
    setTransferItems(transferItems.filter(item => item.localId !== localId));
  };

  const updateRow = (localId: number, field: keyof TransferRow, value: any) => {
    setTransferItems(items => items.map(item => {
      if (item.localId !== localId) return item;

      // If we are changing the equipment, we need to update maxQuantity automatically
      if (field === 'equipmentId') {
        const selectedEq = equipmentList.find(e => e.id.toString() === value);
        return {
          ...item,
          equipmentId: value,
          maxQuantity: selectedEq ? selectedEq.total : 1,
          quantity: 1 // reset quantity when equipment changes
        };
      }

      // Standard update for quantity
      return { ...item, [field]: value };
    }));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fromSiteId || !user?.id || !toSiteId) {
      alert("Missing required fields.");
      return;
    }
    
    // Check if any row is missing equipment
    const invalidRow = transferItems.find(item => !item.equipmentId);
    if (invalidRow) {
      alert("Please select equipment for all rows.");
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

    // --- MODIFIED: Create Payload for Batch Insert ---
    const payload = transferItems.map(item => ({
      equipment_id: Number(item.equipmentId),
      from_site_id: fromSiteId,
      to_site_id: toSiteId,
      requested_by: user.id,
      status: "pending",
      quantity: item.quantity,
      vehicle_number: vehicleNumber,
      remarks,
      image_url,
    }));

    const { error } = await meenachil.from("equipment_transfers").insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Failed to create request. Try refreshing");
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

        {/* --- MODIFIED: Dynamic Equipment List --- */}
        <div>
          <label className="block text-sm mb-1 font-medium text-gray-700">Equipment List</label>
          <div className="space-y-3">
            {transferItems.map((item, index) => (
              <div key={item.localId} className="relative bg-gray-50 p-3 rounded-lg border border-gray-200">
                
                {/* Mobile Responsive Flex Container */}
                <div className="flex gap-2 items-start">
                  
                  {/* Select: flex-1 allows it to take remaining width */}
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-gray-500 mb-1 block">Item Name</label>
                    <select
                      value={item.equipmentId}
                      onChange={(e) => updateRow(item.localId, 'equipmentId', e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select equipment</option>
                      {equipmentList
                        .filter((eq) => eq.total > 0)
                        .map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} (Max: {eq.total})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Quantity: Fixed width + flex-shrink-0 prevents squishing */}
                  <div className="w-20 flex-shrink-0">
                    <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                    <input
                      type="number"
                      min={1}
                      max={item.maxQuantity}
                      value={item.quantity}
                      onChange={(e) =>
                        updateRow(item.localId, 'quantity', Math.min(Number(e.target.value), item.maxQuantity))
                      }
                      className="w-full border border-gray-300 rounded p-2 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Remove Button (Only show if more than 1 item) */}
                {transferItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(item.localId)}
                    className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow border border-gray-200 hover:bg-red-50"
                    title="Remove item"
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
            Add Another Equipment
          </button>
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
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-sm"
        >
          {loading ? "Submitting..." : `Transfer ${transferItems.length} Item${transferItems.length > 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  );
};

export default NewRequests;