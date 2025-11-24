import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/AuthContext'
import { Plus, Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

export default function Portfolio() {
    const { profile } = useAuth()
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [expandedRow, setExpandedRow] = useState(null)
    const [formData, setFormData] = useState({
        symbol: '',
        name: '',
        quantity: '',
        avg_price: '',
        type: 'stock'
    })

    // Fetch Holdings
    const { data: holdings, isLoading } = useQuery({
        queryKey: ['holdings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('holdings')
                .select('*')
                .order('symbol')
            if (error) throw error
            return data
        }
    })

    // Add Holding Mutation
    const addMutation = useMutation({
        mutationFn: async (newHolding) => {
            const { error } = await supabase.from('holdings').insert([newHolding])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['holdings'])
            queryClient.invalidateQueries(['dashboardData'])
            setIsModalOpen(false)
            setFormData({ symbol: '', name: '', quantity: '', avg_price: '', type: 'stock' })
        },
        onError: (error) => {
            alert('Error adding holding: ' + error.message)
        }
    })

    // Delete Holding Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('holdings').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['holdings'])
            queryClient.invalidateQueries(['dashboardData'])
        },
        onError: (error) => {
            alert('Error deleting holding: ' + error.message)
        }
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        addMutation.mutate(formData)
    }

    // Mock current price calculation
    const getMockCurrentPrice = (avgPrice) => {
        return avgPrice * 1.12 // Fixed 12% profit for demo consistency
    }

    // Mock Chart Data Generator
    const getMockChartData = (basePrice) => {
        const data = []
        let current = basePrice * 0.8
        for (let i = 0; i < 30; i++) {
            current = current * (1 + (Math.random() * 0.04 - 0.015))
            data.push({ date: `Day ${i + 1}`, price: current })
        }
        return data
    }

    if (isLoading) return <div className="text-white">Loading portfolio...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Portfolio</h1>
                {profile?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Holding
                    </button>
                )}
            </div>

            {/* Holdings Performance Chart */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mb-8">
                <h3 className="text-lg font-bold text-white mb-6">Total Return on Holdings</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={holdings?.map(h => {
                             const current = getMockCurrentPrice(h.avg_price) * h.quantity
                             const invested = h.avg_price * h.quantity
                             const profit = current - invested
                             return {
                                 symbol: h.symbol,
                                 profit: profit,
                                 invested: invested
                             }
                        }) || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis 
                                dataKey="symbol" 
                                stroke="#9ca3af" 
                                tick={{ fill: '#9ca3af' }} 
                                tickLine={false} 
                                axisLine={false}
                            />
                            <YAxis 
                                stroke="#9ca3af" 
                                tick={{ fill: '#9ca3af' }} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(val) => `₹${val}`}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                cursor={{fill: '#374151', opacity: 0.4}}
                                formatter={(value) => [`₹${value.toFixed(2)}`, 'Profit/Loss']}
                            />
                            <Legend />
                            <Bar dataKey="profit" name="Total Return" radius={[4, 4, 0, 0]}>
                                {holdings?.map((entry, index) => {
                                    const current = getMockCurrentPrice(entry.avg_price) * entry.quantity
                                    const invested = entry.avg_price * entry.quantity
                                    const profit = current - invested
                                    return <Cell key={`cell-${index}`} fill={profit >= 0 ? '#10b981' : '#ef4444'} />
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Holdings Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-700 text-gray-300">
                        <tr>
                            <th className="px-6 py-3 text-sm font-medium">Symbol</th>
                            <th className="px-6 py-3 text-sm font-medium">Name</th>
                            <th className="px-6 py-3 text-sm font-medium text-right">Qty</th>
                            <th className="px-6 py-3 text-sm font-medium text-right">Avg Price</th>
                            <th className="px-6 py-3 text-sm font-medium text-right">Current Price</th>
                            <th className="px-6 py-3 text-sm font-medium text-right">P/L</th>
                            <th className="px-6 py-3 text-sm font-medium"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {holdings?.map((item) => {
                            const currentPrice = getMockCurrentPrice(item.avg_price)
                            const totalValue = currentPrice * item.quantity
                            const investedValue = item.avg_price * item.quantity
                            const profit = totalValue - investedValue
                            const profitPercent = (profit / investedValue) * 100
                            const isExpanded = expandedRow === item.id

                            return (
                                <>
                                    <tr
                                        key={item.id}
                                        className="hover:bg-gray-750 cursor-pointer transition-colors"
                                        onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                                    >
                                        <td className="px-6 py-4 text-white font-bold flex items-center">
                                            {isExpanded ? <ChevronUp className="w-4 h-4 mr-2 text-gray-400" /> : <ChevronDown className="w-4 h-4 mr-2 text-gray-400" />}
                                            {item.symbol}
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">{item.name}</td>
                                        <td className="px-6 py-4 text-white text-right">{item.quantity}</td>
                                        <td className="px-6 py-4 text-gray-300 text-right">₹{item.avg_price}</td>
                                        <td className="px-6 py-4 text-white text-right">₹{currentPrice.toFixed(2)}</td>
                                        <td className={`px-6 py-4 text-right font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {profitPercent.toFixed(2)}%
                                            </div>
                                            <div className="text-xs opacity-70">₹{profit.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            {profile?.role === 'admin' && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure?')) deleteMutation.mutate(item.id)
                                                    }}
                                                    className="text-red-400 hover:text-red-300 p-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-900/50">
                                            <td colSpan="7" className="p-6">
                                                <div className="h-[250px] w-full">
                                                    <h4 className="text-sm font-medium text-gray-400 mb-4">Price History (30 Days)</h4>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={getMockChartData(item.avg_price)}>
                                                            <defs>
                                                                <linearGradient id={`colorPrice-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                                            <XAxis hide dataKey="date" />
                                                            <YAxis
                                                                domain={['auto', 'auto']}
                                                                stroke="#9ca3af"
                                                                tick={{ fill: '#9ca3af' }}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickFormatter={(val) => `₹${val.toFixed(0)}`}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                                                itemStyle={{ color: '#fff' }}
                                                                formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                                                            />
                                                            <Area
                                                                type="monotone"
                                                                dataKey="price"
                                                                stroke="#10b981"
                                                                strokeWidth={2}
                                                                fillOpacity={1}
                                                                fill={`url(#colorPrice-${item.id})`}
                                                            />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )
                        })}
                        {holdings?.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                    No holdings found.
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
                        <h2 className="text-xl font-bold text-white mb-4">Add New Holding</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Symbol (e.g., RELIANCE)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 uppercase"
                                    value={formData.symbol}
                                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Avg Price</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                        value={formData.avg_price}
                                        onChange={(e) => setFormData({ ...formData, avg_price: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                                <select
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="stock">Stock</option>
                                    <option value="mf">Mutual Fund</option>
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
                                    {addMutation.isPending ? 'Adding...' : 'Add Holding'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
