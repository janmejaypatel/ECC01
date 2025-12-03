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

    if (isLoading) return <div className="text-text-main font-heading p-8">Loading group stats...</div>
    if (error) return <div className="text-error p-8">Error: {error.message}</div>

    const { group } = data

    const cards = [
        { title: 'Group Total Capital', value: group.totalCapital, icon: Wallet, color: 'text-primary' },
        { title: 'Group Cash Balance', value: group.cashBalance, icon: DollarSign, color: 'text-success' },
        { title: 'Group Fund Value', value: group.totalCurrentValue, icon: PieChart, color: 'text-primary' },
        { title: 'Group Total Profit', value: group.totalProfit, icon: TrendingUp, color: group.totalProfit >= 0 ? 'text-success' : 'text-error' },
    ]

    return (
        <div className="font-body">
            <h1 className="text-3xl font-bold text-primary mb-8 font-heading">Group Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <div key={card.title} className="bg-surface p-6 rounded-2xl border border-border shadow-luxury hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-text-muted text-sm font-medium">{card.title}</h3>
                                <div className={`p-2 rounded-lg bg-surface-hover ${card.color}`}>
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

            <div className="bg-surface p-8 rounded-2xl border border-border shadow-luxury">
                <div className="flex items-center gap-3 mb-6">
                    <Users className="w-8 h-8 text-primary" />
                    <h3 className="text-2xl font-bold text-text-main font-heading">Community Members</h3>
                </div>

                {isMembersLoading ? (
                    <div className="text-text-muted">Loading members...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {members?.map((member) => (
                            <div key={member.id} className="bg-surface-hover p-4 rounded-xl border border-border flex items-center gap-4 hover:bg-background transition-colors shadow-sm">
                                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-background font-bold text-lg shadow-gold-glow">
                                    {member.full_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="text-text-main font-bold">{member.full_name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-text-muted/20 text-text-muted'}`}>
                                            {member.role}
                                        </span>
                                        <span className="text-xs text-text-muted">
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
