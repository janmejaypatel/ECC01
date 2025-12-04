import { useQuery } from '@tanstack/react-query'

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY?.trim()
const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY?.trim()

console.log('API Keys present:', {
    Finnhub: !!FINNHUB_API_KEY,
    TwelveData: !!TWELVE_DATA_API_KEY
})

const fetchTwelveDataPrice = async (symbol) => {
    if (!TWELVE_DATA_API_KEY) return null
    try {
        // Format for Indian stocks: RELIANCE -> RELIANCE:NSE
        const querySymbol = symbol.includes('.') ? symbol : `${symbol}:NSE`
        console.log(`Fetching Twelve Data for ${querySymbol}...`)

        const response = await fetch(`https://api.twelvedata.com/price?symbol=${querySymbol}&apikey=${TWELVE_DATA_API_KEY}`)
        const data = await response.json()

        if (data.price) {
            console.log(`Found Twelve Data price for ${querySymbol}: ${data.price}`)
            return parseFloat(data.price)
        } else if (data.message) {
            console.warn(`Twelve Data error for ${querySymbol}:`, data.message)
        }
        return null
    } catch (error) {
        console.error(`Twelve Data error for ${symbol}:`, error)
        return null
    }
}

const fetchYahooPrice = async (symbol) => {
    try {
        // Ensure symbol has .NS suffix for Indian stocks if not present
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`
        console.log(`Fetching Yahoo Finance for ${yahooSymbol}...`)

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`

        // List of proxies to try in order
        const proxies = [
            (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`, // Often most reliable
            (target) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
            (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        ]

        for (const createProxyUrl of proxies) {
            try {
                const proxyUrl = createProxyUrl(url)
                // console.log(`Trying proxy: ${proxyUrl}`)

                const response = await fetch(proxyUrl)
                if (!response.ok) throw new Error(`Status: ${response.status}`)

                const data = await response.json()
                let price = null

                // Handle different response structures (raw vs wrapped)
                if (data.contents && typeof data.contents === 'string') {
                    // Handle allorigins 'get' wrapper
                    const parsed = JSON.parse(data.contents)
                    price = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice
                } else {
                    // Handle raw JSON
                    price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
                }

                if (price) {
                    console.log(`Found Yahoo price for ${yahooSymbol}: ${price}`)
                    return price
                }
            } catch (err) {
                // console.warn(`Proxy failed for ${yahooSymbol}:`, err)
                // Continue to next proxy
            }
        }

        throw new Error('All proxies failed')
    } catch (error) {
        console.error(`Yahoo Finance Error for ${symbol}:`, error)
        return null
    }
}

const fetchPrice = async (symbol) => {
    // Note: Twelve Data is now handled in batch in the main hook.
    // This function is for fallbacks only.

    // 1. Try Finnhub first (if key exists)
    if (FINNHUB_API_KEY) {
        // console.log(`Fetching Finnhub for ${symbol}...`)
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

    // 3. Fallback to Yahoo Finance Proxies
    const yahooPrice = await fetchYahooPrice(symbol)
    if (yahooPrice) return yahooPrice

    console.warn(`No price found for ${symbol} from any source.`)
    return null
}

export const useStockPrices = (holdings) => {
    return useQuery({
        queryKey: ['stockPrices', (holdings || []).map(h => h.symbol).join(',')],
        queryFn: async () => {
            console.log('useStockPrices: fetching for holdings:', holdings)
            if (!holdings || holdings.length === 0) return {}

            const prices = {}
            const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))]

            // 1. Try Twelve Data Batch Fetch (Most Efficient)
            if (TWELVE_DATA_API_KEY) {
                try {
                    // Create a map of Original Symbol -> API Symbol
                    const symbolMap = uniqueSymbols.reduce((acc, symbol) => {
                        let apiSymbol = symbol;
                        // Convert .NS to :NSE for Twelve Data
                        if (symbol.endsWith('.NS')) {
                            apiSymbol = `${symbol.replace('.NS', '')}:NSE`;
                        } else if (!symbol.includes('.') && !symbol.includes(':')) {
                            // Default to NSE for plain symbols (assuming Indian context)
                            apiSymbol = `${symbol}:NSE`;
                        }
                        acc[symbol] = apiSymbol;
                        return acc;
                    }, {});

                    const apiSymbols = Object.values(symbolMap).join(',');
                    console.log(`Fetching Twelve Data Batch for: ${apiSymbols}`);

                    const response = await fetch(`https://api.twelvedata.com/price?symbol=${apiSymbols}&apikey=${TWELVE_DATA_API_KEY}`);
                    const data = await response.json();

                    if (data.code === 400 || data.code === 401 || data.code === 429) {
                        console.warn('Twelve Data Batch Error:', data.message);
                    } else {
                        // Handle single symbol response (data is object with price)
                        if (uniqueSymbols.length === 1 && data.price) {
                            prices[uniqueSymbols[0]] = parseFloat(data.price);
                        } else {
                            // Handle batch response (data is object with keys as symbols)
                            // Map back from API Symbol -> Original Symbol
                            Object.entries(symbolMap).forEach(([originalSymbol, apiSymbol]) => {
                                // The API returns keys exactly as requested (e.g. "RELIANCE:NSE")
                                const item = data[apiSymbol];
                                if (item && item.price) {
                                    prices[originalSymbol] = parseFloat(item.price);
                                }
                            });
                        }
                        console.log('Twelve Data Batch Success:', prices);
                    }
                } catch (error) {
                    console.error('Twelve Data Batch Failed:', error);
                }
            }

            // 2. Fill gaps with Fallbacks (Finnhub / Yahoo)
            for (const symbol of uniqueSymbols) {
                if (prices[symbol]) continue; // Skip if already found

                // Add a small delay for individual fallbacks
                await new Promise(resolve => setTimeout(resolve, 200))
                const price = await fetchPrice(symbol) // This uses the existing fetchPrice fallback logic (Finnhub -> Yahoo)
                if (price !== null) {
                    prices[symbol] = price
                }
            }

            return prices
        },
        enabled: !!holdings && holdings.length > 0,
        refetchInterval: 60000, // Refetch every minute
        staleTime: 55000, // Consider data fresh for 55 seconds
        retry: 1,
    })
}
