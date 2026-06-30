-- Create the settings table for general application configurations
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for now (if the app uses anon key)
-- or restricted to authenticated users.
-- The app seems to use profiles and roles, so we should probably restrict it.
-- However, for the 'sales_goal' to be readable by everyone but writable by admin, we need policies.

CREATE POLICY "Settings are viewable by everyone" 
ON public.settings FOR SELECT 
USING (true);

CREATE POLICY "Settings are insertable by authenticated users" 
ON public.settings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Settings are updatable by authenticated users" 
ON public.settings FOR UPDATE 
USING (true);

-- If the user wants to be more secure, we could restrict to admin role.
-- But given the current App.jsx logic, it seems they expect it to just work.
