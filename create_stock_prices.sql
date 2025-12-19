-- Create stock_prices table
create table public.stock_prices (
  symbol text primary key,
  price numeric not null,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.stock_prices enable row level security;

-- Policies
create policy "Stock prices viewable by everyone" on public.stock_prices
  for select using (true);

create policy "Authenticated users can update stock prices" on public.stock_prices
  for all using (auth.role() = 'authenticated');
