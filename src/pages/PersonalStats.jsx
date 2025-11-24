import { useDashboardData } from '../hooks/useDashboardData'
import { User, TrendingUp, PieChart, Wallet } from 'lucide-react'

export default function PersonalStats() {
    const { data, isLoading, error } = useDashboardData()

    if (isLoading) return <div className="text-white">Loading stats...</div>
    if (error) return <div className="text-red-500">Error: {error.message}</div>

    const { personal } = data

    const cards = [
        { title: 'My Total Investment', value: personal.myCapital, icon: Wallet, color: 'text-blue-500' },
        { title: 'My Current Value', value: personal.myCurrentValue, icon: PieChart, color: 'text-purple-500' },
        { title: 'My Profit', value: personal.myProfit, icon: TrendingUp, color: personal.myProfit >= 0 ? 'text-green-400' : 'text-red-400' },
        { title: 'Ownership Share', value: (personal.mySharePercentage * 100).toFixed(2) + '%', icon: User, color: 'text-yellow-500', isText: true },
    ]

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">My Performance</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                                {card.isText ? card.value : `₹${card.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Breakdown Block */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Investment Breakdown</h3>
                <p className="text-gray-400">
                    You own <span className="text-white font-bold">{(personal.mySharePercentage * 100).toFixed(2)}%</span> of the group's total assets.
                    Your current value is calculated based on this percentage of the total group fund value (Cash + Holdings).
                </p>
            </div>
        </div>
    )
}
