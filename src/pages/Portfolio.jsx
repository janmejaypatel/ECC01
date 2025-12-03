import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useStockPrices } from '../hooks/useStockPrices'
import { Plus, Trash2, TrendingUp, TrendingDown, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Rectangle } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        if (data.isEmpty) return null

        return (
            <div className="bg-surface border border-border p-3 rounded-xl shadow-luxury">
                <p className="font-bold text-text-main mb-1">{data.symbol}</p>
                <p className="text-sm text-text-muted">
                    Return: <span className={data.profit >= 0 ? 'text-success' : 'text-error'}>
                        ₹{data.profit.toFixed(2)}
                    </span>
                </p>
            </div>
        )
    }
    return null
}

const CustomCursor = (props) => {
    const { x, y, width, height, payload } = props

    // Check if the hovered data is "empty" using the payload
    if (payload && payload.length && payload[0].payload && payload[0].payload.isEmpty) {
        return null
    }

    return <Rectangle fill="var(--color-surface-hover)" opacity={0.4} x={x} y={y} width={width} height={height} radius={[4, 4, 4, 4]} />
}

export default function Portfolio() {
    const { profile } = useAuth()
    const { theme } = useTheme()
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [viewMode, setViewMode] = useState('aggregated') // 'aggregated' | 'history'
    const [selectedSymbol, setSelectedSymbol] = useState(null)

    const [formData, setFormData] = useState({
        symbol: '',
        fake_symbol: '',
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

    // Fetch Real-time Prices
    const { data: prices, isLoading: isLoadingPrices, isRefetching } = useStockPrices(holdings || [])

    // Aggregation Logic
    const aggregatedHoldings = useMemo(() => {
        if (!holdings) return []
        const groups = {}

        holdings.forEach(h => {
            const qty = Number(h.quantity)
            const price = Number(h.avg_price)

            if (!groups[h.symbol]) {
                groups[h.symbol] = {
                    symbol: h.symbol,
                    fake_symbol: h.fake_symbol, // Use the first found fake_symbol for the group
                    name: h.name,
                    quantity: 0,
                    totalInvested: 0,
                    transactions: []
                }
            }
            groups[h.symbol].quantity += qty
            groups[h.symbol].totalInvested += (qty * price)
            groups[h.symbol].transactions.push(h)
        })

        return Object.values(groups).map(g => ({
            ...g,
            avg_price: g.totalInvested / g.quantity
        }))
    }, [holdings])

    // Add Holding Mutation
    const addMutation = useMutation({
        mutationFn: async (newHolding) => {
            // Remove empty fake_symbol to store as null if needed, or keep as empty string
            const holdingToInsert = {
                ...newHolding,
                quantity: Number(newHolding.quantity),
                avg_price: Number(newHolding.avg_price),
                fake_symbol: newHolding.fake_symbol || null
            }
            const { error } = await supabase.from('holdings').insert([holdingToInsert])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['holdings'])
            queryClient.invalidateQueries(['dashboardData'])
            setIsModalOpen(false)
            setFormData({ symbol: '', fake_symbol: '', name: '', quantity: '', avg_price: '', type: 'stock' })
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

    // Helper to get current price (Real-time > Mock)
    const getCurrentPrice = (symbol, avgPrice) => {
        if (prices && prices[symbol]) {
            return prices[symbol]
        }
        // Fallback to mock if no API data
        return avgPrice * 1.12
    }

    const handleRowClick = (symbol) => {
        setSelectedSymbol(symbol)
        setViewMode('history')
    }

    const handleBack = () => {
        setSelectedSymbol(null)
        setViewMode('aggregated')
    }

    if (isLoading) return <div className="text-text-main p-8 font-heading">Loading portfolio...</div>

    // Filter transactions for history view
    const historyData = selectedSymbol
        ? holdings?.filter(h => h.symbol === selectedSymbol)
        : []

    // Chart Colors based on Theme
    const successColor = theme === 'dark' ? '#9ED089' : '#10B981' // Light green vs Emerald
    const errorColor = theme === 'dark' ? '#F28C8C' : '#EF4444'   // Light red vs Red

    // Chart Data Preparation
    const chartData = useMemo(() => {
        if (!aggregatedHoldings) return []
        const data = aggregatedHoldings.map(h => {
            // Inline logic to ensure we use the latest prices
            let currentPrice = h.avg_price * 1.12 // Fallback
            if (prices && prices[h.symbol]) {
                currentPrice = prices[h.symbol]
            }

            const current = currentPrice * h.quantity
            const invested = h.totalInvested
            const profit = current - invested
            return {
                symbol: h.fake_symbol || h.symbol,
                profit: profit,
                invested: invested,
                isEmpty: false
            }
        })

        // Pad with empty slots to align bars to the left
        const minSlots = Math.max(data.length + 3, 8)
        while (data.length < minSlots) {
            data.push({ symbol: `_${data.length}`, profit: 0, invested: 0, isEmpty: true })
        }
        return data
    }, [aggregatedHoldings, prices])

    return (
        <div className="font-body">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    {viewMode === 'history' && (
                        <button onClick={handleBack} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-primary">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-3xl font-bold text-primary font-heading tracking-wide">
                        {viewMode === 'aggregated' ? 'Portfolio Overview' : `${selectedSymbol} History`}
                    </h1>
                    {isRefetching && <RefreshCw className="w-5 h-5 text-primary animate-spin" />}
                </div>
                {profile?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover transition-all shadow-gold-glow hover:shadow-gold-glow-hover"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Holding
                    </button>
                )}
            </div>

            {/* Holdings Performance Chart (Only in Aggregated View) */}
            {viewMode === 'aggregated' && (
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-luxury mb-8">
                    <h3 className="text-lg font-bold text-text-main mb-6 font-heading border-b border-border/30 pb-2">Total Return on Holdings</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.2} />
                                <XAxis
                                    dataKey="symbol"
                                    stroke="var(--color-text-muted)"
                                    tick={{ fill: 'var(--color-text-muted)', fontFamily: 'Inter' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.startsWith('_') ? '' : val}
                                />
                                <YAxis
                                    stroke="var(--color-text-muted)"
                                    tick={{ fill: 'var(--color-text-muted)', fontFamily: 'Inter' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `₹${val}`}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={<CustomCursor chartData={chartData} />}
                                />
                                <Legend wrapperStyle={{ fontFamily: 'Inter' }} />
                                <Bar dataKey="profit" name="Total Return" radius={[4, 4, 0, 0]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? successColor : errorColor} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table View */}
            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-luxury">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-surface-hover text-primary border-b border-border font-heading">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider">Symbol</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider">Name</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">Qty</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">Avg Price</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">
                                    Current Price
                                    {isLoadingPrices && <span className="ml-2 text-xs text-text-muted font-body">(Loading...)</span>}
                                </th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">Current Value</th>
                                <th className="px-6 py-4 text-sm font-bold tracking-wider text-right">Total Profit</th>
                                {viewMode === 'aggregated' && <th className="px-6 py-4 text-sm font-bold tracking-wider"></th>}
                                {viewMode === 'history' && <th className="px-6 py-4 text-sm font-bold tracking-wider"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-body">
                            {(viewMode === 'aggregated' ? aggregatedHoldings : historyData).map((item) => {
                                const currentPrice = getCurrentPrice(item.symbol, item.avg_price)
                                const totalValue = currentPrice * item.quantity
                                const investedValue = viewMode === 'aggregated' ? item.totalInvested : (item.avg_price * item.quantity)
                                const profit = totalValue - investedValue
                                const profitPercent = (profit / investedValue) * 100

                                return (
                                    <tr
                                        key={item.id || item.symbol}
                                        className={`hover:bg-surface-hover transition-colors ${viewMode === 'aggregated' ? 'cursor-pointer' : ''}`}
                                        onClick={() => viewMode === 'aggregated' && handleRowClick(item.symbol)}
                                    >
                                        <td className="px-6 py-4 text-text-main font-bold">
                                            {item.fake_symbol || item.symbol}
                                            {item.fake_symbol && <span className="ml-2 text-xs text-text-muted font-normal">({item.symbol})</span>}
                                        </td>
                                        <td className="px-6 py-4 text-text-muted">{item.name}</td>
                                        <td className="px-6 py-4 text-text-main text-right">{item.quantity}</td>
                                        <td className="px-6 py-4 text-text-muted text-right">₹{item.avg_price.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-text-main text-right">
                                            {prices && prices[item.symbol] ? (
                                                <span className="text-success font-bold">₹{prices[item.symbol]}</span>
                                            ) : (
                                                <span className="text-primary">
                                                    ₹{currentPrice.toFixed(2)}*
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-text-main text-right font-bold">
                                            ₹{totalValue.toFixed(2)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-medium ${profit >= 0 ? 'text-success' : 'text-error'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {profitPercent.toFixed(2)}%
                                            </div>
                                            <div className="text-xs opacity-70">₹{profit.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {viewMode === 'aggregated' ? (
                                                <ChevronRight className="w-5 h-5 text-primary ml-auto" />
                                            ) : (
                                                profile?.role === 'admin' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (confirm('Are you sure?')) deleteMutation.mutate(item.id)
                                                        }}
                                                        className="text-error hover:text-red-400 p-2 hover:bg-error/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {holdings?.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-text-muted">
                                        No holdings found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-border shadow-luxury">
                        <h2 className="text-xl font-bold text-primary mb-4 font-heading">Add New Holding</h2>
                        <form onSubmit={handleSubmit} className="space-y-4 font-body">
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Symbol (e.g., RELIANCE)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary uppercase transition-colors"
                                    value={formData.symbol}
                                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Display Symbol (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                                    placeholder="e.g. MY_STOCK"
                                    value={formData.fake_symbol}
                                    onChange={(e) => setFormData({ ...formData, fake_symbol: e.target.value })}
                                />
                                <p className="text-xs text-text-muted mt-1">If set, this will be shown in the table instead of the real symbol.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-muted mb-1">Avg Price</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
                                        value={formData.avg_price}
                                        onChange={(e) => setFormData({ ...formData, avg_price: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-1">Type</label>
                                <select
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors"
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
                                    className="px-4 py-2 text-text-muted hover:text-text-main transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addMutation.isPending}
                                    className="px-6 py-2 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all shadow-gold-glow"
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
