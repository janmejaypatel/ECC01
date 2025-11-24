-- Add policy to allow admins to update any profile
-- This enables the Promote/Demote functionality in the admin panel

create policy "Admins can update any profile" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
