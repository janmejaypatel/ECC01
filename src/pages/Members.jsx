import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/AuthContext'
import { Check, Shield, ShieldAlert, User } from 'lucide-react'

export default function Members() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

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

  if (profile?.role !== 'admin') {
    return <div className="text-white">Access Denied. Admin only.</div>
  }

  if (isLoading) return <div className="text-white">Loading members...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Member Management</h1>

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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.is_approved ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {member.is_approved ? 'Active' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  {/* Approve/Disapprove Button */}
                  <button
                    onClick={() => toggleApprovalMutation.mutate({ id: member.id, is_approved: !member.is_approved })}
                    className={`text-sm font-medium ${member.is_approved ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                    disabled={member.id === profile.id} // Cannot change own status
                  >
                    {member.is_approved ? 'Suspend' : 'Approve'}
                  </button>

                  {/* Make Admin/Member Button */}
                  <button
                    onClick={() => toggleRoleMutation.mutate({ id: member.id, role: member.role === 'admin' ? 'member' : 'admin' })}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                    disabled={member.id === profile.id} // Cannot change own role
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
  )
}
