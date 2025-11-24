import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/AuthContext'
import { Plus, Trash2 } from 'lucide-react'

export default function Installments() {
    const { profile } = useAuth()
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({
        user_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'cash'
    })

    // Fetch Installments with User Details
    const { data: installments, isLoading } = useQuery({
        queryKey: ['installments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('installments')
                .select(`
          *,
          profiles (full_name, email)
        `)
                .order('date', { ascending: false })
            if (error) throw error
            return data
        }
    })

    // Fetch Members for Dropdown
    const { data: members } = useQuery({
        queryKey: ['members'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name')
            if (error) throw error
            return data
        }
    })

    // Add Installment Mutation
    const addMutation = useMutation({
        mutationFn: async (newInstallment) => {
            const { error } = await supabase.from('installments').insert([newInstallment])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['installments'])
            queryClient.invalidateQueries(['dashboardData'])
            setIsModalOpen(false)
            setFormData({ ...formData, amount: '' })
        },
        onError: (error) => {
            alert('Error adding installment: ' + error.message)
        }
    })

    // Delete Installment Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('installments').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['installments'])
            queryClient.invalidateQueries(['dashboardData'])
        },
        onError: (error) => {
            alert('Error deleting installment: ' + error.message)
        }
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        addMutation.mutate(formData)
    }

    if (isLoading) return <div className="text-white">Loading installments...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Installments</h1>
                {profile?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Installment
                    </button>
                )}
            </div>

            {/* Installments Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-700 text-gray-300">
                        <tr>
                            <th className="px-6 py-3 text-sm font-medium">Date</th>
                            <th className="px-6 py-3 text-sm font-medium">Member</th>
                            <th className="px-6 py-3 text-sm font-medium">Type</th>
                            <th className="px-6 py-3 text-sm font-medium text-right">Amount</th>
                            {profile?.role === 'admin' && <th className="px-6 py-3 text-sm font-medium"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {installments?.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-750">
                                <td className="px-6 py-4 text-gray-300">{item.date}</td>
                                <td className="px-6 py-4 text-white font-medium">{item.profiles?.full_name || 'Unknown'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${item.type === 'invested' ? 'bg-purple-500/10 text-purple-400' : 'bg-green-500/10 text-green-400'
                                        }`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-white text-right">₹{item.amount}</td>
                                {profile?.role === 'admin' && (
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure?')) deleteMutation.mutate(item.id)
                                            }}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {installments?.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    No installments found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">Add New Installment</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Member</label>
                                <select
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={formData.user_id}
                                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                                >
                                    <option value="">Select Member</option>
                                    {members?.map((m) => (
                                        <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                                <select
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="cash">Cash (Deposit)</option>
                                    <option value="invested">Invested (Direct)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {addMutation.isPending ? 'Adding...' : 'Add Installment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
