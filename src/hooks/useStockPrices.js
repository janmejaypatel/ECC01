import { useQuery } from '@tanstack/react-query'

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY?.trim()

const fetchYahooPrice = async (symbol) => {
    try {
        // Ensure symbol has .NS suffix for Indian stocks if not present
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`
        console.log(`Fetching Yahoo Finance for ${yahooSymbol}...`)
        
        // Use allorigins as CORS proxy (returns JSON with 'contents' string)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        
        const response = await fetch(proxyUrl)
        if (!response.ok) throw new Error(`Proxy Status: ${response.status}`)
        
        const data = await response.json()
        const contents = JSON.parse(data.contents)
        const price = contents?.chart?.result?.[0]?.meta?.regularMarketPrice
        
        if (price) {
            console.log(`Found Yahoo price for ${yahooSymbol}: ${price}`)
            return price
        }
        return null
    } catch (error) {
        console.error(`Yahoo Finance Error for ${symbol}:`, error)
        return null
    }
}

const fetchPrice = async (symbol) => {
    // 1. Try Finnhub first (if key exists)
    if (FINNHUB_API_KEY) {
        console.log(`Fetching Finnhub for ${symbol}...`)
        try {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
            if (response.ok) {
                const data = await response.json()
                // If valid price found
                if (data.c && data.c !== 0) {
                    console.log(`Found Finnhub price for ${symbol}: ${data.c}`)
                    return data.c
                }
            } else {
                console.warn(`Finnhub failed for ${symbol} (${response.status}). Switching to fallback...`)
            }
        } catch (error) {
            console.error(`Finnhub error for ${symbol}:`, error)
        }
    }

    // 2. Fallback to Yahoo Finance (Good for Indian stocks)
    const yahooPrice = await fetchYahooPrice(symbol)
    if (yahooPrice) return yahooPrice

    console.warn(`No price found for ${symbol} from any source.`)
    return null
}

export const useStockPrices = (holdings) => {
    return useQuery({
        queryKey: ['stockPrices', holdings?.map(h => h.symbol).join(',')],
        queryFn: async () => {
            if (!holdings || holdings.length === 0) return {}

            const prices = {}
            const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))]
            
            for (const symbol of uniqueSymbols) {
                // Add a small delay to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 200)) 
                const price = await fetchPrice(symbol)
                if (price !== null) {
                    prices[symbol] = price
                }
            }
            
            return prices
        },
        enabled: !!holdings && holdings.length > 0,
        refetchInterval: 60000, // Refetch every minute
        staleTime: 55000, // Consider data fresh for 55 seconds
    })
}
