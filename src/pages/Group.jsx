import { useDashboardData } from '../hooks/useDashboardData'
import { Users, Wallet, TrendingUp, PieChart, DollarSign } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export default function Group() {
    const { data, isLoading, error } = useDashboardData()

    // Fetch Members
    const { data: members, isLoading: isMembersLoading } = useQuery({
        queryKey: ['groupMembers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role, created_at')
                .order('full_name')
            if (error) throw error
            return data
        }
    })

    if (isLoading) return <div className="text-white">Loading group stats...</div>
    if (error) return <div className="text-red-500">Error: {error.message}</div>

    const { group } = data

    const cards = [
        { title: 'Group Total Capital', value: group.totalCapital, icon: Wallet, color: 'text-blue-500' },
        { title: 'Group Cash Balance', value: group.cashBalance, icon: DollarSign, color: 'text-green-500' },
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

            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <Users className="w-8 h-8 text-blue-500" />
                    <h3 className="text-2xl font-bold text-white">Community Members</h3>
                </div>

                {isMembersLoading ? (
                    <div className="text-gray-400">Loading members...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {members?.map((member) => (
                            <div key={member.id} className="bg-gray-750 p-4 rounded-lg border border-gray-700 flex items-center gap-4 hover:bg-gray-700 transition-colors">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg border border-gray-600">
                                    {member.full_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{member.full_name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {member.role}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Joined {new Date(member.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
