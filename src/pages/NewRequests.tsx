import React, { useEffect, useState } from "react"
import { supabase } from "../lib/supabase.ts"
import { useAuth } from "../contexts/AuthContext.tsx"

const NewRequests: React.FC = () => {
  const { user } = useAuth()
  const [fromSiteId, setFromSiteId] = useState<string>("")
  const [fromSiteName, setFromSiteName] = useState<string>("")
  const [toSites, setToSites] = useState<{ id: string; site_name: string }[]>([])
  const [toSiteId, setToSiteId] = useState<string>("")
  const [equipmentList, setEquipmentList] = useState<{ id: string; name: string }[]>([])
  const [equipmentId, setEquipmentId] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1) // ✅ new state for quantity
  const [loading, setLoading] = useState<boolean>(false)

  // ✅ Fetch logged-in user's site_id -> site_name
  useEffect(() => {
    const fetchUserSite = async () => {
      if (!user) return

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("site_id")
        .eq("id", user.id)
        .single()

      if (userError || !userData) {
        console.error("Error fetching user site:", userError)
        return
      }

      const siteId = userData.site_id
      setFromSiteId(siteId)

      const { data: siteData, error: siteError } = await supabase
        .from("construction_sites")
        .select("site_name")
        .eq("id", siteId)
        .single()

      if (siteError || !siteData) {
        console.error("Error fetching site name:", siteError)
        return
      }

      setFromSiteName(siteData.site_name)
    }

    fetchUserSite()
  }, [user])

  // ✅ Fetch all construction sites (for To Site dropdown)
  useEffect(() => {
    const fetchSites = async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("id, site_name")

      if (error) {
        console.error("Error fetching sites:", error)
        return
      }

      setToSites(data || [])
    }

    fetchSites()
  }, [])

  // ✅ Fetch equipment for user’s site
  useEffect(() => {
    const fetchEquipment = async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name")

      if (error) {
        console.error("Error fetching equipment:", error)
        return
      }

      setEquipmentList(data || [])
    }

    fetchEquipment()
  }, [])

  // ✅ Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromSiteId || !user?.id || !equipmentId || !toSiteId || quantity <= 0) return

    setLoading(true)

    const { error } = await supabase
      .from("equipment_transfers")
      .insert([
        {
          equipment_id: equipmentId,
          from_site_id: fromSiteId,
          to_site_id: toSiteId,
          requested_by: user.id, // FK to users
          status: "pending",
          quantity: quantity, // ✅ include quantity
        },
      ])

    setLoading(false)

    if (error) {
      console.error("Error creating transfer request:", error)
      alert("❌ Failed to create request")
    } else {
      alert("✅ Request submitted successfully")
      setEquipmentId("")
      setToSiteId("")
      setQuantity(1) // reset
    }
  }

  // 🚨 If user has no site assigned
  if (!fromSiteId) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
        <h1 className="text-xl font-bold mb-4">New Tool Transfer Request</h1>
        <p className="text-red-600">
          You are not assigned to a site. Please contact an administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-xl">
      <h1 className="text-xl font-bold mb-4">New Tool Transfer Request</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From Site - auto populated */}
        <div>
          <label className="block text-sm font-medium mb-1">From Site</label>
          <input
            type="text"
            value={fromSiteName}
            disabled
            className="w-full border rounded-lg p-2 bg-gray-100"
          />
        </div>

        {/* Equipment Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Equipment to Transfer</label>
          <select
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select equipment</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={1}
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
            {toSites
              .filter((site) => site.id !== fromSiteId)
              .map((site) => (
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
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  )
}

export default NewRequests
