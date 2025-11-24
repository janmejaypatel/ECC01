import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/AuthContext'
import { Check, Shield, ShieldAlert, User, Plus, X, Mail } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

export default function Members() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  // Fetch All Profiles
  const { data: members, isLoading } = useQuery({
    queryKey: ['allMembers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Toggle Approval Mutation
  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ id, is_approved }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMembers'])
    },
    onError: (error) => alert(error.message)
  })

  // Toggle Role Mutation
  const toggleRoleMutation = useMutation({
    mutationFn: async ({ id, role }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allMembers'])
    },
    onError: (error) => alert(error.message)
  })

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteLoading(true)

    try {
      // Create a temporary client to sign up the user without logging out the admin
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      )

      const { data: { user }, error } = await tempSupabase.auth.signUp({
        email: inviteEmail,
        password: crypto.randomUUID(), // Generate a random temp password
        options: {
          data: {
            full_name: inviteName,
          },
          emailRedirectTo: `${window.location.origin}/update-password`
        }
      })

      if (error) throw error

      // Auto-approve the invited user
      if (user) {
        // Wait a brief moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000))

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_approved: true })
          .eq('id', user.id)

        if (updateError) console.error('Error auto-approving user:', updateError)
      }

      alert('Invitation sent! User will receive an email to confirm and set their password.')
      setIsInviteModalOpen(false)
      setInviteEmail('')
      setInviteName('')
      queryClient.invalidateQueries(['allMembers'])
    } catch (error) {
      alert(error.message)
    } finally {
      setInviteLoading(false)
    }
  }

  if (profile?.role !== 'admin') {
    return <div className="text-white">Access Denied. Admin only.</div>
  }

  if (isLoading) return <div className="text-white">Loading members...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Member Management</h1>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-700 text-gray-300">
            <tr>
              <th className="px-6 py-3 text-sm font-medium">Name</th>
              <th className="px-6 py-3 text-sm font-medium">Email</th>
              <th className="px-6 py-3 text-sm font-medium">Role</th>
              <th className="px-6 py-3 text-sm font-medium">Status</th>
              <th className="px-6 py-3 text-sm font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {members?.map((member) => (
              <tr key={member.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 text-white font-medium">{member.full_name}</td>
                <td className="px-6 py-4 text-gray-400">{member.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                    {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.is_approved ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                    {member.is_approved ? 'Active' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  {/* Approve Button - Only show if NOT approved */}
                  {!member.is_approved && (
                    <button
                      onClick={() => toggleApprovalMutation.mutate({ id: member.id, is_approved: true })}
                      className="text-sm font-medium text-green-400 hover:text-green-300"
                      disabled={member.id === profile.id}
                    >
                      Approve
                    </button>
                  )}

                  {/* Make Admin/Member Button */}
                  <button
                    onClick={() => {
                      console.log('Toggling role for:', member.id, 'Current role:', member.role);
                      toggleRoleMutation.mutate({ id: member.id, role: member.role === 'admin' ? 'member' : 'admin' })
                    }}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                    disabled={member.id === profile.id}
                  >
                    {member.role === 'admin' ? 'Demote' : 'Promote'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Mail className="w-6 h-6 mr-2 text-blue-500" />
              Invite New Member
            </h2>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors mt-4 disabled:opacity-50"
              >
                {inviteLoading ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
