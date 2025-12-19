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
        type: 'stock',
        transactionType: 'buy',
        date: new Date().toISOString().split('T')[0]
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

    const { prices, isLoading: isLoadingPrices, refetch: refetchPrices } = useStockPrices(holdings)

    // Check if we have any real prices
    const hasLivePrices = prices && Object.keys(prices).length > 0
    // Add Holding Mutation
    const addMutation = useMutation({
        mutationFn: async (newHolding) => {
            const quantity = Number(newHolding.quantity)
            const finalQuantity = newHolding.transactionType === 'sell' ? -quantity : quantity

            const holdingToInsert = {
                symbol: newHolding.symbol,
                fake_symbol: newHolding.fake_symbol || null,
                name: newHolding.name,
                quantity: finalQuantity,
                avg_price: Number(newHolding.avg_price),
                type: newHolding.type,
                date: newHolding.date
            }
            const { error } = await supabase.from('holdings').insert([holdingToInsert])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['holdings'])
            queryClient.invalidateQueries(['dashboardData'])
            setIsModalOpen(false)
            setFormData({
                symbol: '',
                fake_symbol: '',
                name: '',
                quantity: '',
                avg_price: '',
                type: 'stock',
                transactionType: 'buy',
                date: new Date().toISOString().split('T')[0]
            })
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
        // If DB price is missing, fallback to avgPrice to avoid showing 0 or bad data
        // But strictly, we should rely on what useStockPrices returns (which handles fallback fetching)
        return avgPrice
    }

    const aggregatedHoldings = useMemo(() => {
        if (!holdings) return []
        const groups = {}

        // Group by symbol first
        holdings.forEach(h => {
            if (!groups[h.symbol]) {
                groups[h.symbol] = []
            }
            groups[h.symbol].push(h)
        })

        return Object.keys(groups).map(symbol => {
            const transactions = groups[symbol].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))

            let quantity = 0
            let costBasis = 0
            let realizedProfit = 0
            let name = transactions[0]?.name || ''
            let fake_symbol = transactions[0]?.fake_symbol || ''

            transactions.forEach(t => {
                const qty = Number(t.quantity)
                const price = Number(t.avg_price)

                if (qty > 0) {
                    // BUY
                    quantity += qty
                    costBasis += qty * price
                } else {
                    // SELL
                    const sellQty = Math.abs(qty)
                    if (quantity > 0) {
                        const avgCost = costBasis / quantity
                        const costOfSoldShares = sellQty * avgCost

                        realizedProfit += (sellQty * price) - costOfSoldShares
                        costBasis -= costOfSoldShares
                        quantity -= sellQty
                    } else {
                        // Selling without holdings (shouldn't happen normally, but handle gracefully)
                        realizedProfit += (sellQty * price)
                        quantity -= sellQty
                    }
                }
                // Update metadata if available
                if (t.name) name = t.name
                if (t.fake_symbol) fake_symbol = t.fake_symbol
            })

            // Avoid negative zero or tiny floating point errors
            if (Math.abs(quantity) < 0.0001) {
                quantity = 0
                costBasis = 0
            }

            return {
                symbol,
                fake_symbol,
                name,
                quantity,
                totalInvested: costBasis, // This is now the remaining cost basis
                realizedProfit,
                avg_price: quantity > 0 ? costBasis / quantity : 0
            }
        })
    }, [holdings])

    console.log('Portfolio: aggregatedHoldings:', aggregatedHoldings)
    console.log('Portfolio: prices:', prices)

    const chartData = useMemo(() => {
        return aggregatedHoldings.map(h => {
            const currentPrice = getCurrentPrice(h.symbol, h.avg_price)
            const currentValue = h.quantity * currentPrice
            // Total Profit = (Current Value - Remaining Cost Basis) + Realized Profit
            const profit = (currentValue - h.totalInvested) + h.realizedProfit
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
                    {isLoadingPrices ? 'Syncing prices...' : hasLivePrices ? 'Prices Up to Date' : 'Using Last Known Prices'}
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
                        const realizedProfit = item.realizedProfit || 0

                        // Unrealized Profit = Current Value - Remaining Cost Basis
                        const unrealizedProfit = totalValue - investedValue

                        // Total Profit for display
                        const totalProfit = unrealizedProfit + realizedProfit

                        // Profit Percent (based on original investment + current investment)
                        // This is tricky with realized profit. Simplified: (Total Profit / (Invested + Cost of Sold))
                        // But we don't track "Cost of Sold" easily here. 
                        // Let's just show absolute profit and maybe % return on *current* invested if qty > 0

                        const profitPercent = investedValue > 0 ? (unrealizedProfit / investedValue) * 100 : 0

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
                                    <div className={`text-right ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
                                        <div className="flex items-center justify-end gap-1 font-bold text-sm">
                                            {totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            {qty > 0 ? profitPercent.toFixed(2) + '%' : 'Sold'}
                                        </div>
                                        <p className="text-xs font-medium mt-1">
                                            {totalProfit >= 0 ? '+' : ''}₹{totalProfit.toFixed(2)}
                                        </p>
                                        {realizedProfit !== 0 && (
                                            <p className="text-[10px] text-text-muted mt-0.5">
                                                (Realized: {realizedProfit >= 0 ? '+' : ''}₹{realizedProfit.toFixed(0)})
                                            </p>
                                        )}
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
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider">Date</th>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider">Symbol</th>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider text-right">Quantity</th>
                                        <th className="px-3 py-2 md:px-6 md:py-4 text-sm font-bold tracking-wider text-right">Price</th>
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
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-muted text-sm">
                                                    {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                                                </td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-main font-bold">
                                                    {item.fake_symbol || item.symbol}
                                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${item.quantity < 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                                                        {item.quantity < 0 ? 'SELL' : 'BUY'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-main text-right">{Math.abs(item.quantity)}</td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-muted text-right">₹{item.avg_price.toFixed(2)}</td>
                                                <td className="px-3 py-2 md:px-6 md:py-4 text-text-main text-right font-bold">₹{Math.abs(investedValue).toFixed(2)}</td>
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
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-text-main">{item.fake_symbol || item.symbol}</h3>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${item.quantity < 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                                                {item.quantity < 0 ? 'SELL' : 'BUY'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-text-muted mt-1">
                                            {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} • {Math.abs(item.quantity)} @ ₹{item.avg_price.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-text-main">₹{Math.abs(investedValue).toFixed(2)}</div>
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
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
                        <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-border shadow-luxury">
                            <h2 className="text-xl font-bold text-primary mb-4 font-heading">
                                {formData.transactionType === 'buy' ? 'Add New Holding' : 'Sell Holding'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4 font-body">
                                {/* Transaction Type Toggle */}
                                <div className="flex bg-background rounded-xl p-1 border border-border mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transactionType: 'buy' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.transactionType === 'buy'
                                            ? 'bg-success text-white shadow-md'
                                            : 'text-text-muted hover:text-text-main'
                                            }`}
                                    >
                                        Buy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transactionType: 'sell' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.transactionType === 'sell'
                                            ? 'bg-error text-white shadow-md'
                                            : 'text-text-muted hover:text-text-main'
                                            }`}
                                    >
                                        Sell
                                    </button>
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
                                        {addMutation.isPending ? 'Processing...' : (formData.transactionType === 'buy' ? 'Add Holding' : 'Sell Holding')}
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
