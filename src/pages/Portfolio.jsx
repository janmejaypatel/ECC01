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
    const successColor = '#10B981'
    const errorColor = '#EF4444'
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
    const { data: holdings, isLoading, isRefetching } = useQuery({
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

    const { data: prices, isLoading: isLoadingPrices, refetch: refetchPrices, isError: isPriceError } = useStockPrices(holdings)

    // Check if we have any real prices
    const hasLivePrices = prices && Object.keys(prices).length > 0
    // Add Holding Mutation
    const addMutation = useMutation({
        mutationFn: async (newHolding) => {
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

    const aggregatedHoldings = useMemo(() => {
        if (!holdings) return []
        const groups = {}
        holdings.forEach(h => {
            if (!groups[h.symbol]) {
                groups[h.symbol] = {
                    ...h,
                    quantity: 0,
                    totalInvested: 0,
                    count: 0
                }
            }
            groups[h.symbol].quantity += Number(h.quantity)
            groups[h.symbol].totalInvested += Number(h.quantity) * Number(h.avg_price)
            groups[h.symbol].count += 1
        })

        return Object.values(groups).map(g => ({
            ...g,
            avg_price: g.quantity > 0 ? g.totalInvested / g.quantity : 0
        }))
    }, [holdings])

    console.log('Portfolio: aggregatedHoldings:', aggregatedHoldings)
    console.log('Portfolio: prices:', prices)

    const chartData = useMemo(() => {
        return aggregatedHoldings.map(h => {
            const currentPrice = getCurrentPrice(h.symbol, h.avg_price)
            const currentValue = h.quantity * currentPrice
            const profit = currentValue - h.totalInvested
            return {
                symbol: h.fake_symbol || h.symbol,
                profit,
                isEmpty: false
            }
        })
    }, [aggregatedHoldings, prices])

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

    // Get display symbol for history view
    const selectedHolding = aggregatedHoldings.find(h => h.symbol === selectedSymbol)
    const displaySymbol = selectedHolding?.fake_symbol || selectedSymbol

    return (
        <div className="p-6 pb-24 md:pb-6 space-y-8 min-h-screen">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    {viewMode === 'history' && (
                        <button onClick={handleBack} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-primary flex-shrink-0">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-2xl md:text-3xl font-bold text-primary font-heading tracking-wide truncate">
                        {viewMode === 'aggregated' ? 'Portfolio Overview' : `${displaySymbol} History`}
                    </h1>
                    {isRefetching && <RefreshCw className="w-5 h-5 text-primary animate-spin flex-shrink-0" />}
                </div>
                {profile?.role === 'admin' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-primary text-background font-bold rounded-xl hover:bg-primary-hover transition-all shadow-gold-glow hover:shadow-gold-glow-hover whitespace-nowrap flex-shrink-0"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        <span className="hidden md:inline">Add Holding</span>
                        <span className="md:hidden">Add</span>
                    </button>
                )}
            </div>



            {/* Price Status Indicator */}
            <div className="flex items-center gap-2 mb-4 text-sm">
                <div className={`w-2 h-2 rounded-full ${isLoadingPrices ? 'bg-yellow-400 animate-pulse' : hasLivePrices ? 'bg-success' : 'bg-error'}`}></div>
                <span className="text-text-muted">
                    {isLoadingPrices ? 'Fetching live prices...' : hasLivePrices ? 'Live Market Data Active' : 'Using Mock Data (Live Data Unavailable)'}
                </span>
                {!isLoadingPrices && !hasLivePrices && (
                    <button
                        onClick={() => refetchPrices()}
                        className="ml-2 text-primary hover:underline text-xs"
                    >
                        Retry Connection
                    </button>
                )}
            </div>

            {/* Holdings Performance Chart (Only in Aggregated View) */}
            {
                viewMode === 'aggregated' && (
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
                )
            }



            {viewMode === 'aggregated' ? (
                /* Card Grid View (Aggregated) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {aggregatedHoldings.map((item) => {
                        const currentPrice = getCurrentPrice(item.symbol, item.avg_price) || 0
                        const qty = item.quantity || 0
                        const totalValue = currentPrice * qty
                        const investedValue = item.totalInvested || 0
                        const profit = totalValue - investedValue
                        const profitPercent = investedValue !== 0 ? (profit / investedValue) * 100 : 0

                        return (
                            <div
                                key={item.symbol}
                                className="bg-surface rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => handleRowClick(item.symbol)}
                            >
                                {/* Header: Symbol & Name */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-text-main">{item.fake_symbol || item.symbol}</h3>
                                        <p className="text-xs text-text-muted">{item.name}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-primary" />
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                    <div>
                                        <p className="text-text-muted text-xs">Quantity</p>
                                        <p className="font-medium text-text-main">{item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-text-muted text-xs">Avg Price</p>
                                        <p className="font-medium text-text-main">₹{item.avg_price.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-text-muted text-xs">Current Price</p>
                                        {prices && prices[item.symbol] ? (
                                            <p className="font-bold text-success">₹{prices[item.symbol]}</p>
                                        ) : (
                                            <p className="font-medium text-primary">₹{currentPrice.toFixed(2)}*</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-text-muted text-xs">Invested</p>
                                        <p className="font-medium text-text-main">₹{investedValue.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Footer: Total Value & Profit */}
                                <div className="pt-3 border-t border-border flex justify-between items-end">
                                    <div>
                                        <p className="text-text-muted text-xs mb-1">Current Value</p>
                                        <p className="text-xl font-bold text-text-main">₹{totalValue.toFixed(2)}</p>
                                    </div>
                                    <div className={`text-right ${profit >= 0 ? 'text-success' : 'text-error'}`}>
                                        <div className="flex items-center justify-end gap-1 font-bold text-sm">
                                            {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            {profitPercent.toFixed(2)}%
                                        </div>
                                        <p className="text-xs font-medium mt-1">
                                            {profit >= 0 ? '+' : ''}₹{profit.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                /* Table View (History) */
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden shadow-luxury">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-surface-hover text-primary border-b border-border font-heading">
                                    <tr>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider">Symbol</th>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider text-right">Quantity</th>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider text-right">Purchase Price</th>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider text-right">Invested</th>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50 font-body">
                                    {historyData.map((item) => {
                                        const qty = item.quantity || 0
                                        const investedValue = (item.avg_price || 0) * qty

                                        return (
                                            <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-main font-bold">
                                                    {item.fake_symbol || item.symbol}
                                                </td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-main text-right">{item.quantity}</td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-muted text-right">₹{item.avg_price.toFixed(2)}</td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-main text-right font-bold">₹{investedValue.toFixed(2)}</td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-right">
                                                    {profile?.role === 'admin' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (confirm('Are you sure?')) deleteMutation.mutate(item.id)
                                                            }}
                                                            className="text-error hover:text-red-400 p-2 hover:bg-error/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {historyData.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-text-muted">
                                                No history found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>


                    {/* Mobile Compact Card View */}
                    <div className="md:hidden space-y-2">
                        {historyData.map((item) => {
                            const qty = item.quantity || 0
                            const investedValue = (item.avg_price || 0) * qty

                            return (
                                <div key={item.id} className="bg-surface rounded-xl border border-border p-3 shadow-sm flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-bold text-text-main">{item.fake_symbol || item.symbol}</h3>
                                        <div className="text-xs text-text-muted mt-1">
                                            {item.quantity} @ ₹{item.avg_price.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-text-main">₹{investedValue.toFixed(2)}</div>
                                        {profile?.role === 'admin' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (confirm('Are you sure?')) deleteMutation.mutate(item.id)
                                                }}
                                                className="text-error hover:text-red-400 p-1 mt-1 hover:bg-error/10 rounded transition-colors inline-block"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {historyData.length === 0 && (
                            <div className="text-center text-text-muted text-sm py-4">
                                No history found.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Add Modal */}
            {
                isModalOpen && (
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
                )
            }
        </div >
    )
}
