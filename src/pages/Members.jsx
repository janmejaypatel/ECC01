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
          emailRedirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/update-password`
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
    return <div className="text-error font-heading p-8">Access Denied. Admin only.</div>
  }

  if (isLoading) return <div className="text-text-main font-heading p-8">Loading members...</div>

  return (
    <div className="font-body">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-primary font-heading">Member Management</h1>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center bg-primary text-background font-bold px-4 py-2 rounded-xl hover:bg-primary-hover transition-all shadow-gold-glow hover:shadow-gold-glow-hover"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-surface-hover text-primary border-b border-border font-heading">
              <tr>
                <th className="px-6 py-4 text-sm font-bold tracking-wider">Name</th>
                <th className="px-6 py-4 text-sm font-bold tracking-wider">Email</th>
                <th className="px-6 py-4 text-sm font-bold tracking-wider">Role</th>
                <th className="px-6 py-4 text-sm font-bold tracking-wider">Status</th>
                <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-body">
              {members?.map((member) => (
                <tr key={member.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 text-text-main font-medium">{member.full_name}</td>
                  <td className="px-6 py-4 text-text-muted">{member.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-text-muted/10 text-text-muted'
                      }`}>
                      {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.is_approved ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                      }`}>
                      {member.is_approved ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    {/* Approve Button - Only show if NOT approved */}
                    {!member.is_approved && (
                      <button
                        onClick={() => toggleApprovalMutation.mutate({ id: member.id, is_approved: true })}
                        className="text-sm font-medium text-success hover:text-green-400"
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
                      className="text-sm font-medium text-primary hover:text-primary-hover"
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
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {members?.map((member) => (
          <div key={member.id} className="bg-surface rounded-2xl border border-border p-4 shadow-luxury">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-text-main">{member.full_name}</h3>
                <p className="text-sm text-text-muted">{member.email}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.is_approved ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                }`}>
                {member.is_approved ? 'Active' : 'Pending'}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-text-muted/10 text-text-muted'
                }`}>
                {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                {member.role}
              </span>

              <div className="flex gap-3">
                {!member.is_approved && (
                  <button
                    onClick={() => toggleApprovalMutation.mutate({ id: member.id, is_approved: true })}
                    className="text-sm font-medium text-success hover:text-green-400"
                    disabled={member.id === profile.id}
                  >
                    Approve
                  </button>
                )}

                <button
                  onClick={() => {
                    toggleRoleMutation.mutate({ id: member.id, role: member.role === 'admin' ? 'member' : 'admin' })
                  }}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                  disabled={member.id === profile.id}
                >
                  {member.role === 'admin' ? 'Demote' : 'Promote'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-md p-6 relative shadow-luxury">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-primary mb-6 flex items-center font-heading">
              <Mail className="w-6 h-6 mr-2" />
              Invite New Member
            </h2>

            <form onSubmit={handleInvite} className="space-y-4 font-body">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={inviteLoading}
                className="w-full bg-primary text-background font-bold py-3 rounded-xl hover:bg-primary-hover transition-all shadow-gold-glow disabled:opacity-50"
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
