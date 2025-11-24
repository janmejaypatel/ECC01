-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  role text default 'member' check (role in ('admin', 'member')),
  is_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Installments table
create table public.installments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  date date not null default current_date,
  type text check (type in ('cash', 'invested')) default 'cash',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.installments enable row level security;

-- Policies for installments
create policy "Installments viewable by everyone" on public.installments
  for select using (true);

create policy "Admins can insert installments" on public.installments
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can update installments" on public.installments
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete installments" on public.installments
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Holdings table
create table public.holdings (
  id uuid default uuid_generate_v4() primary key,
  symbol text not null,
  name text,
  quantity numeric not null,
  avg_price numeric not null,
  type text check (type in ('stock', 'mf')),
  owner_id uuid references public.profiles(id), -- null means group holding
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.holdings enable row level security;

-- Policies for holdings
create policy "Holdings viewable by everyone" on public.holdings
  for select using (true);

create policy "Admins can manage holdings" on public.holdings
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, is_approved)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'member', false);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
