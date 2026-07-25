-- 1. Profiles Table (Linked to Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Cases Table
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Gutachten' CHECK (status IN ('Gutachten', 'Rechtsanwalt', 'Abgeschlossen')),
  assistant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_token TEXT NOT NULL UNIQUE,
  accident_location TEXT,
  accident_date TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_insurance TEXT,
  client_policy_number TEXT,
  opponent_name TEXT,
  opponent_insurance TEXT,
  opponent_policy_number TEXT,
  signature TEXT,
  signature_url TEXT,
  opponent_license_plate TEXT,
  damage_number TEXT,
  opponent_insurance_name TEXT,
  opponent_insurance_number TEXT,
  is_scheckheft_maintained TEXT,
  is_accident_card_present TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Case Files Logs Table
CREATE TABLE IF NOT EXISTS public.case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  license_plate TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Enable Row Level Security (RLS) on public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- Profiles: Users can view all profiles, but only updates are managed.
CREATE POLICY "Allow public select on profiles" ON public.profiles
  FOR SELECT USING (true);

-- Cases: Admins can do anything. Assistants can view/modify cases assigned to them. Clients can view/modify using client_token.
CREATE POLICY "Allow full admin control on cases" ON public.cases
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow assistant select/update on assigned cases" ON public.cases
  FOR SELECT USING (assistant_id = auth.uid());

CREATE POLICY "Allow client token select on cases" ON public.cases
  FOR SELECT USING (true); -- Clients find their cases via client_token search

CREATE POLICY "Allow client token update on cases" ON public.cases
  FOR UPDATE USING (true); -- Clients can fill forms via client_token matching

-- Case Files: Viewable by everyone. Insertable by authed users or anonymous clients.
CREATE POLICY "Allow public select on case files" ON public.case_files
  FOR SELECT USING (true);

-- Case Files insert
CREATE POLICY "Allow insert on case files" ON public.case_files
  FOR INSERT WITH CHECK (true);

-- Notifications: Admin-only access.
CREATE POLICY "Allow admin full control on notifications" ON public.notifications
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 6. Trigger to automatically synchronize Auth signups to public.profiles (e.g. for first admin user creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Neuer Mitarbeiter'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'assistant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Storage Bucket & Policy Configuration
-- Create storage schema table inserts if missing (creates 'case-files' bucket automatically)
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-files', 'case-files', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public permission to upload (INSERT) files to 'case-files' storage bucket
DROP POLICY IF EXISTS "Allow public uploads to case-files" ON storage.objects;
CREATE POLICY "Allow public uploads to case-files" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'case-files');

-- Grant public permission to view/retrieve (SELECT) files from 'case-files' storage bucket
DROP POLICY IF EXISTS "Allow public reads from case-files" ON storage.objects;
CREATE POLICY "Allow public reads from case-files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'case-files');
