import { useDashboardData } from '../hooks/useDashboardData'
import { Wallet, TrendingUp, DollarSign, PieChart } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardHome() {
    const { data, isLoading, error } = useDashboardData()

    if (isLoading) return <div className="text-white">Loading dashboard...</div>
    if (error) return <div className="text-red-500">Error loading data: {error.message}</div>

    const cards = [
        { title: 'Group Fund Value', value: data.group.totalCurrentValue, icon: Wallet, color: 'text-blue-500' },
        { title: 'My Contribution', value: data.personal.myCapital, icon: DollarSign, color: 'text-green-500' },
        { title: 'Invested Assets', value: data.group.investedAmount, icon: PieChart, color: 'text-purple-500' },
        { title: 'Total Returns', value: data.personal.myProfit, icon: TrendingUp, color: data.personal.myProfit >= 0 ? 'text-green-400' : 'text-red-400' },
    ]

    // Prepare chart data (group installments by date)
    const chartData = data.installments?.slice().reverse().map(item => ({
        date: new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        amount: Number(item.amount)
    })) || []

    // Calculate cumulative capital for the chart
    let cumulative = 0
    const cumulativeData = chartData.map(item => {
        cumulative += item.amount
        return { ...item, capital: cumulative }
    })

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
                <p className="text-gray-400">Welcome back! Here's your financial summary.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <div key={card.title} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-400 text-sm font-medium">{card.title}</h3>
                                <div className={`p-2 rounded-lg bg-gray-700/50 ${card.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-white">
                                ₹{card.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Capital Growth Chart */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-6">Capital Growth History</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeData}>
                            <defs>
                                <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis
                                dataKey="date"
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
                                tickFormatter={(value) => `₹${value / 1000}k`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Capital']}
                            />
                            <Area
                                type="monotone"
                                dataKey="capital"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorCapital)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
