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

            // Helper to calculate holdings with Weighted Average Cost Basis
            const calculateHoldings = (holdingsData) => {
                const groups = {}
                holdingsData.forEach(h => {
                    if (!groups[h.symbol]) groups[h.symbol] = []
                    groups[h.symbol].push(h)
                })

                let totalInvested = 0
                let totalRealizedProfit = 0
                let totalCurrentValue = 0

                Object.keys(groups).forEach(symbol => {
                    const transactions = groups[symbol].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
                    let quantity = 0
                    let costBasis = 0
                    let realizedProfit = 0

                    transactions.forEach(t => {
                        const qty = Number(t.quantity)
                        const price = Number(t.avg_price)
                        if (qty > 0) {
                            quantity += qty
                            costBasis += qty * price
                        } else {
                            const sellQty = Math.abs(qty)
                            if (quantity > 0) {
                                const avgCost = costBasis / quantity
                                const costOfSold = sellQty * avgCost
                                realizedProfit += (sellQty * price) - costOfSold
                                costBasis -= costOfSold
                                quantity -= sellQty
                            } else {
                                realizedProfit += (sellQty * price)
                                quantity -= sellQty
                            }
                        }
                    })

                    if (Math.abs(quantity) < 0.0001) {
                        quantity = 0
                        costBasis = 0
                    }

                    totalInvested += costBasis
                    totalRealizedProfit += realizedProfit

                    // Mock Current Value (Quantity * AvgPrice * 1.1) - In real app, use real price
                    // For dashboard summary, we might not have real prices easily available without extra API calls
                    // So we use the last known avg_price * 1.1 as a mock or just costBasis if conservative
                    // Let's stick to the previous mock logic: AvgPrice * 1.1
                    const mockCurrentPrice = transactions[transactions.length - 1].avg_price * 1.1
                    totalCurrentValue += quantity * mockCurrentPrice
                })

                return { totalInvested, totalRealizedProfit, totalCurrentValue }
            }

            const { totalInvested: investedAmount, totalRealizedProfit, totalCurrentValue: currentHoldingsValue } = calculateHoldings(holdings || [])

            // Cash Balance = Total Capital - Invested Amount + Realized Profit
            const cashBalance = totalCapital - investedAmount + totalRealizedProfit

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
