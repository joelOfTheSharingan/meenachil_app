import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.ts'
import { useAuth } from '../contexts/AuthContext.tsx'

interface Tool {
  id: string
  name: string
  type: string
  condition: string
}

const MySiteTools: React.FC = () => {
  const { user } = useAuth()
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTools = async () => {
      if (!user) return

      try {
        // 1. Get the supervisor's site_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('site_id')
          .eq('auth_id', user.id) // match logged in user
          .single()

        if (userError) throw userError
        if (!userData?.site_id) {
          console.warn('No site assigned to this supervisor')
          setLoading(false)
          return
        }

        // 2. Get tools from that site
        const { data: toolsData, error: toolsError } = await supabase
          .from('tools')
          .select('id, name, type, condition')
          .eq('current_site_id', userData.site_id)

        if (toolsError) throw toolsError

        setTools(toolsData || [])
      } catch (err) {
        console.error('Error fetching tools:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTools()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Site Tools</h1>

      {tools.length === 0 ? (
        <p className="text-gray-600">No tools found for your site.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {tools.map((tool) => (
            <div key={tool.id} className="p-4 bg-white shadow rounded">
              <h2 className="font-semibold">{tool.name}</h2>
              <p>Type: {tool.type}</p>
              <p>Condition: {tool.condition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MySiteTools
