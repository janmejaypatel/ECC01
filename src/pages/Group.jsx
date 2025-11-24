import { useDashboardData } from '../hooks/useDashboardData'
import { Users, Wallet, TrendingUp, PieChart } from 'lucide-react'

export default function Group() {
    const { data, isLoading, error } = useDashboardData()

    if (isLoading) return <div className="text-white">Loading group stats...</div>
    if (error) return <div className="text-red-500">Error: {error.message}</div>

    const { group } = data

    // Mock member count for now (or fetch if needed, but let's assume we can get it from installments unique user_ids or just fetch profiles count separately)
    // For simplicity, let's just show the financial totals which are the core request.

    const cards = [
        { title: 'Group Total Capital', value: group.totalCapital, icon: Wallet, color: 'text-blue-500' },
        { title: 'Group Cash Balance', value: group.cashBalance, icon: Wallet, color: 'text-green-500' },
        { title: 'Group Fund Value', value: group.totalCurrentValue, icon: PieChart, color: 'text-purple-500' },
        { title: 'Group Total Profit', value: group.totalProfit, icon: TrendingUp, color: group.totalProfit >= 0 ? 'text-green-400' : 'text-red-400' },
    ]

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Group Overview</h1>

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
                                ₹{card.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    )
                })}
            </div>

            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Community Stats</h3>
                <p className="text-gray-400">
                    Detailed member breakdown and contribution leaderboards coming soon.
                </p>
            </div>
        </div>
    )
}
