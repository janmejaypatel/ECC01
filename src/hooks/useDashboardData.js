import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useDashboardData() {
    return useQuery({
        queryKey: ['dashboardData'],
        queryFn: async () => {
            // 1. Fetch Installments
            const { data: installments, error: instError } = await supabase
                .from('installments')
                .select('*')

            if (instError) throw instError

            // 2. Fetch Holdings
            const { data: holdings, error: holdError } = await supabase
                .from('holdings')
                .select('*')

            if (holdError) throw holdError

            // 3. Calculate Totals (Group)
            const totalCapital = installments?.reduce((sum, item) => sum + Number(item.amount), 0) || 0
            const investedAmount = holdings?.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.avg_price)), 0) || 0
            const cashBalance = totalCapital - investedAmount

            // 4. Calculate Current Value (Mocked)
            const currentHoldingsValue = holdings?.reduce((sum, item) => {
                const currentPrice = Number(item.avg_price) * 1.1 // Mock 10% profit
                return sum + (Number(item.quantity) * currentPrice)
            }, 0) || 0

            const totalCurrentValue = cashBalance + currentHoldingsValue
            const totalProfit = totalCurrentValue - totalCapital

            // 5. Calculate Personal Stats
            const { data: { user } } = await supabase.auth.getUser()
            const myInstallments = installments?.filter(i => i.user_id === user?.id) || []
            const myCapital = myInstallments.reduce((sum, item) => sum + Number(item.amount), 0) || 0

            // Personal Share Logic: (My Capital / Total Capital) * Total Current Value
            const mySharePercentage = totalCapital > 0 ? (myCapital / totalCapital) : 0
            const myCurrentValue = totalCurrentValue * mySharePercentage
            const myProfit = myCurrentValue - myCapital

            return {
                group: {
                    totalCapital,
                    cashBalance,
                    investedAmount,
                    currentHoldingsValue,
                    totalProfit,
                    totalCurrentValue
                },
                personal: {
                    myCapital,
                    myCurrentValue,
                    myProfit,
                    mySharePercentage
                },
                installments,
                holdings
            }
        }
    })
}
