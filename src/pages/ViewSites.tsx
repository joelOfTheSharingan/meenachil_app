import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { EquipmentTransfer } from "../lib/supabase.ts";

const ViewSites: React.FC = () => {
  const [myEquipment, setMyEquipment] = useState<any[]>([]);
  const [rentalEquipment, setRentalEquipment] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [userSiteId, setUserSiteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("site_id")
        .eq("auth_id", user.id)
        .single();

      if (!userData?.site_id) return;
      setUserSiteId(userData.site_id);

      // Fetch equipment
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("id, name, isRental, quantity")
        .eq("site_id", userData.site_id);

      if (equipmentData) {
        const groupByName = (arr: any[], rental: boolean) =>
          arr
            .filter((eq) => eq.isRental === rental)
            .reduce((acc: any[], curr) => {
              const existing = acc.find((item) => item.name === curr.name);
              if (existing) existing.count += curr.quantity ?? 0;
              else acc.push({ name: curr.name, count: curr.quantity ?? 0 });
              return acc;
            }, []);

        setMyEquipment(groupByName(equipmentData, false));
        setRentalEquipment(groupByName(equipmentData, true));
      }

      // Incoming requests
      const { data: inReq } = await supabase
        .from("equipment_transfers")
        .select(
          `id, equipment_id, quantity, status, requested_at, 
           equipment(name), from_site:from_site_id(site_name)`
        )
        .eq("to_site_id", userData.site_id);

      setIncomingRequests(inReq ?? []);

      // Outgoing requests
      const { data: outReq } = await supabase
        .from("equipment_transfers")
        .select(
          `id, equipment_id, quantity, status, requested_at, 
           equipment(name), to_site:to_site_id(site_name)`
        )
        .eq("from_site_id", userData.site_id);

      setOutgoingRequests(outReq ?? []);
    };

    fetchData();
  }, []);

  const pendingRequests = incomingRequests.filter(
    (req) => req.status === "pending"
  );

  return (
    <div className="p-6">
      {/* My Site Tools */}
      <h2 className="text-xl font-bold text-blue-800 mb-4">My Site Tools</h2>
      <div className="bg-gray-100 p-4 rounded-lg shadow-inner mb-6">
        {myEquipment.length === 0 ? (
          <p className="text-gray-500">No equipment found.</p>
        ) : (
          myEquipment.map((eq, index) => (
            <div
              key={index}
              className="flex justify-between bg-white p-3 mb-2 rounded-md shadow-sm"
            >
              <span>{eq.name}</span>
              <span className="font-bold">{eq.count}</span>
            </div>
          ))
        )}
      </div>

      {/* Rental */}
      <h2 className="text-xl font-bold text-gray-700 mb-4">Rental</h2>
      <div className="bg-gray-100 p-4 rounded-lg shadow-inner mb-6">
        {rentalEquipment.length === 0 ? (
          <p className="text-gray-500">No rental equipment found.</p>
        ) : (
          rentalEquipment.map((eq, index) => (
            <div
              key={index}
              className="flex justify-between bg-white p-3 mb-2 rounded-md shadow-sm"
            >
              <span>{eq.name}</span>
              <span className="font-bold">{eq.count}</span>
            </div>
          ))
        )}
      </div>

      {/* Incoming Requests */}
      <h2 className="text-xl font-bold text-green-700 mb-4">
        Incoming Requests
      </h2>
      <div className="bg-gray-100 p-4 rounded-lg shadow-inner mb-6">
        {pendingRequests.length === 0 ? (
          <p className="text-gray-500">No pending requests.</p>
        ) : (
          pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white p-3 mb-2 rounded-md shadow-sm"
            >
              <p>{req.equipment?.name || "Unknown"}</p>
              <p>Quantity: {req.quantity}</p>
              <p>From: {req.from_site?.site_name}</p>
              <p>Status: {req.status}</p>
              <p>
                Requested: {new Date(req.requested_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Outgoing Requests */}
      <h2 className="text-xl font-bold text-blue-700 mb-4">
        Outgoing Requests
      </h2>
      <div className="bg-gray-100 p-4 rounded-lg shadow-inner">
        {outgoingRequests.length === 0 ? (
          <p className="text-gray-500">No outgoing requests.</p>
        ) : (
          outgoingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white p-3 mb-2 rounded-md shadow-sm"
            >
              <p>{req.equipment?.name || "Unknown"}</p>
              <p>Quantity: {req.quantity}</p>
              <p>To: {req.to_site?.site_name}</p>
              <p>Status: {req.status}</p>
              <p>
                Requested: {new Date(req.requested_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ViewSites;
