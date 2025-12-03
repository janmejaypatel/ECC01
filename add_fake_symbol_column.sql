-- Add fake_symbol column to holdings table
ALTER TABLE public.holdings 
ADD COLUMN fake_symbol text;

-- Comment on column
COMMENT ON COLUMN public.holdings.fake_symbol IS 'Optional display symbol to show in UI instead of real symbol';
