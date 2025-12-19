import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY?.trim()
const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY?.trim()

// Batch fetch from Twelve Data
const fetchTwelveDataBatch = async (symbols) => {
    if (!TWELVE_DATA_API_KEY || symbols.length === 0) return {}

    try {
        const symbolMap = symbols.reduce((acc, symbol) => {
            let apiSymbol = symbol
            if (symbol.endsWith('.NS')) {
                apiSymbol = `${symbol.replace('.NS', '')}:NSE`
            } else if (!symbol.includes('.') && !symbol.includes(':')) {
                apiSymbol = `${symbol}:NSE`
            }
            acc[symbol] = apiSymbol
            return acc
        }, {})

        const apiSymbols = Object.values(symbolMap).join(',')
        console.log(`Fetching Twelve Data Batch for: ${apiSymbols}`)

        const response = await fetch(`https://api.twelvedata.com/price?symbol=${apiSymbols}&apikey=${TWELVE_DATA_API_KEY}`)
        const data = await response.json()

        const results = {}

        if (data.code === 400 || data.code === 401 || data.code === 429) {
            console.warn('Twelve Data Batch Error:', data.message)
            return results
        }

        if (symbols.length === 1 && data.price) {
            results[symbols[0]] = parseFloat(data.price)
        } else {
            Object.entries(symbolMap).forEach(([originalSymbol, apiSymbol]) => {
                const item = data[apiSymbol]
                if (item && item.price) {
                    results[originalSymbol] = parseFloat(item.price)
                }
            })
        }
        return results
    } catch (error) {
        console.error('Twelve Data Batch Failed:', error)
        return {}
    }
}

// Fallback fetch (Yahoo/Finnhub)
const fetchFallbackPrice = async (symbol) => {
    // 1. Try Yahoo Finance Proxies
    try {
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`
        const proxies = [
            (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
            (target) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
            (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        ]

        for (const createProxy of proxies) {
            try {
                const response = await fetch(createProxy(url))
                if (!response.ok) continue
                const data = await response.json()

                let price = null
                if (data.contents && typeof data.contents === 'string') {
                    const parsed = JSON.parse(data.contents)
                    price = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice
                } else {
                    price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
                }

                if (price) return price
            } catch (e) {
                // Continue
            }
        }
    } catch (e) {
        console.error(`Yahoo fallback failed for ${symbol}`, e)
    }

    // 2. Try Finnhub
    if (FINNHUB_API_KEY) {
        try {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
            if (res.ok) {
                const data = await res.json()
                if (data.c) return data.c
            }
        } catch (e) {
            console.error(`Finnhub failed for ${symbol}`, e)
        }
    }

    return null
}

export const useStockPrices = (holdings) => {
    const queryClient = useQueryClient()
    const uniqueSymbols = useMemo(() => {
        if (!holdings) return []
        return [...new Set(holdings.map(h => h.symbol))]
    }, [holdings])

    // 1. Fetch from DB
    const { data: dbPrices, isLoading: isDbLoading } = useQuery({
        queryKey: ['stockPrices', 'db'],
        queryFn: async () => {
            const { data, error } = await supabase.from('stock_prices').select('*')
            if (error) {
                console.error('Error fetching stock_prices from DB (using invalid/empty cache):', error)
                return {}
            }

            const priceMap = {}
            data?.forEach(row => {
                priceMap[row.symbol] = {
                    price: Number(row.price),
                    last_updated: row.last_updated
                }
            })
            return priceMap
        },
        refetchInterval: 10000 // Poll DB every 10s for updates from other clients
    })

    // 2. Background Fetcher
    useQuery({
        queryKey: ['stockPrices', 'fetch', uniqueSymbols.join(',')],
        queryFn: async () => {
            if (uniqueSymbols.length === 0) return null

            const now = new Date()
            const staleThreshold = 5 * 60 * 1000 // 5 minutes

            // Filter symbols that need updating
            const symbolsToUpdate = uniqueSymbols.filter(symbol => {
                const entry = dbPrices?.[symbol]
                if (!entry) return true // Not in DB
                const lastUpdated = new Date(entry.last_updated)
                return (now - lastUpdated) > staleThreshold // Stale
            })

            if (symbolsToUpdate.length === 0) {
                console.log('UseStockPrices: No stale symbols to update.')
                return null
            }
            console.log('UseStockPrices: Refreshing prices for:', symbolsToUpdate)

            // Fetch new prices
            const newPrices = {}
            // Batch fetch
            const batchResults = await fetchTwelveDataBatch(symbolsToUpdate)
            Object.assign(newPrices, batchResults)

            // Fallbacks for missing
            const missing = symbolsToUpdate.filter(s => !newPrices[s])
            for (const s of missing) {
                await new Promise(r => setTimeout(r, 200))
                const p = await fetchFallbackPrice(s)
                if (p) newPrices[s] = p
            }

            // Upsert to DB
            const upsertData = Object.entries(newPrices).map(([symbol, price]) => ({
                symbol,
                price,
                last_updated: new Date().toISOString()
            }))

            if (upsertData.length > 0) {
                const { error } = await supabase.from('stock_prices').upsert(upsertData)
                if (error) console.error('Error upserting prices:', error)
                else queryClient.invalidateQueries(['stockPrices', 'db'])
            }

            return newPrices
        },
        enabled: uniqueSymbols.length > 0 && !isDbLoading, // Run once DB is attempted
        refetchInterval: 60000 // Check for stale logic every minute
    })

    // Return the prices directly usable by UI
    const finalPrices = useMemo(() => {
        if (!dbPrices) return {}
        const map = {}
        Object.keys(dbPrices).forEach(key => map[key] = dbPrices[key].price)
        return map
    }, [dbPrices])

    return {
        prices: finalPrices,
        isLoading: isDbLoading,
        refetch: () => queryClient.invalidateQueries(['stockPrices'])
    }
}

