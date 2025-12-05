import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/AuthContext'
import { useDashboardData } from '../hooks/useDashboardData'
import { Plus, Trash2, Wallet, TrendingUp, PieChart } from 'lucide-react'

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

    const { data: dashboardData } = useDashboardData()

    const handleSubmit = (e) => {
        e.preventDefault()
        addMutation.mutate(formData)
    }

    // Filter installments for the logged-in user (or show all for admin)
    const myInstallments = profile?.role === 'admin'
        ? (installments || [])
        : (installments?.filter(item => item.user_id === profile?.id) || [])

    const stats = [
        { title: 'Total Contribution', value: dashboardData?.personal.myCapital || 0, icon: Wallet, color: 'text-blue-500' },
        { title: 'Invested Amount', value: (dashboardData?.personal.mySharePercentage * dashboardData?.group.investedAmount) || 0, icon: PieChart, color: 'text-purple-500' },
        { title: 'Current Value', value: dashboardData?.personal.myCurrentValue || 0, icon: TrendingUp, color: 'text-green-500' },
        { title: 'My Profit', value: dashboardData?.personal.myProfit || 0, icon: TrendingUp, color: (dashboardData?.personal.myProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400' },
    ]

    if (isLoading) return <div className="text-text-main font-heading p-8">Loading installments...</div>

    return (
        <div className="space-y-8 font-body">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-primary font-heading">
                        {profile?.role === 'admin' ? 'All Installments' : 'My Contributions'}
                    </h1>
                    <p className="text-text-muted">Welcome, {profile?.full_name}</p>
                </div>
                {profile?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover transition-all shadow-gold-glow hover:shadow-gold-glow-hover"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Installment
                    </button>
                )}
            </div>

            {/* Personal Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((card) => {
                    const Icon = card.icon
                    return (
                        <div key={card.title} className="bg-surface p-6 rounded-2xl border border-border shadow-luxury hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-text-muted text-sm font-medium">{card.title}</h3>
                                <div className={`p-2 rounded-lg bg-surface-hover ${card.color.replace('text-blue-500', 'text-primary').replace('text-purple-500', 'text-primary')}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-text-main">
                                ₹{card.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden shadow-luxury">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-surface-hover text-primary border-b border-border font-heading">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider">Date</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider">Member</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider">Type</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">Amount</th>
                                {profile?.role === 'admin' && <th className="px-6 py-4 text-sm font-bold tracking-wider"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-body">
                            {myInstallments.map((item) => (
                                <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                    <td className="px-6 py-4 text-text-muted">{item.date}</td>
                                    <td className="px-6 py-4 text-text-main font-medium">{item.profiles?.full_name || 'Unknown'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${item.type === 'invested' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                                            }`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-text-main text-right">₹{item.amount}</td>
                                    {profile?.role === 'admin' && (
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure?')) deleteMutation.mutate(item.id)
                                                }}
                                                className="text-error hover:text-red-400 p-2 hover:bg-error/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {myInstallments.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-text-muted">
                                        No installments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {myInstallments.map((item) => (
                    <div key={item.id} className="bg-surface rounded-2xl border border-border p-4 shadow-luxury">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-lg font-bold text-text-main">{item.profiles?.full_name || 'Unknown'}</h3>
                                <p className="text-sm text-text-muted">{item.date}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold text-text-main">₹{item.amount}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-2">
                            <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${item.type === 'invested' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                                }`}>
                                {item.type === 'invested' ? 'Invested' : 'Cash Deposit'}
                            </span>

                            {profile?.role === 'admin' && (
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure?')) deleteMutation.mutate(item.id)
                                    }}
                                    className="text-sm font-medium text-error hover:text-red-400 flex items-center"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {myInstallments.length === 0 && (
                    <div className="text-center py-8 text-text-muted bg-surface rounded-2xl border border-border">
                        No installments found.
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
                    <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-border shadow-luxury">
                        <h2 className="text-xl font-bold text-primary mb-4 font-heading">Add New Installment</h2>
                        <form onSubmit={handleSubmit} className="space-y-4 font-body">
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Member</label>
                                <select
                                    required
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
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
                                <label className="block text-sm font-medium text-text-muted mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Type</label>
                                <select
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
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
                                    className="px-4 py-2 text-text-muted hover:text-text-main transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addMutation.isPending}
                                    className="px-6 py-2 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all shadow-gold-glow"
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
