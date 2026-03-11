-- Migration Script: Renovation Progress App
-- Copy and paste this to your Supabase SQL Editor

-- Create Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- Create Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status_type TEXT -- (optional, unneeded right now as progress is weekly)
);

-- Create Progress Reports Table
CREATE TYPE report_status AS ENUM ('not_started', 'in_progress', 'done');

CREATE TABLE progress_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 6),
  status report_status DEFAULT 'not_started',
  proof_image_url TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, week)
);

-- Create Expenses Table
CREATE TYPE expense_type AS ENUM ('material_purchase', 'labor_cost');

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type expense_type NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  receipt_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Tambah kolom user_id ke semua tabel utama (Jalankan ini di SQL Editor)
ALTER TABLE categories ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE progress_reports ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Berikan semua data yang sudah ada ke user spesifik (Contoh)
-- UPDATE categories SET user_id = 'UUID_ADDRESS' WHERE user_id IS NULL;

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan Keamanan (Policies)
CREATE POLICY "Users can only manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own progress_reports" ON progress_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only manage their own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);

-- 5. Storage Security (Bucket Policies)
-- Ganti kebijakan "Allow public access" dengan yang lebih ketat:
-- Policy untuk bucket 'work_proofs' & 'receipts':
-- CREATE POLICY "User Storage Access" ON storage.objects FOR ALL USING (bucket_id = 'bucket_name' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Enable Realtime
alter publication supabase_realtime add table progress_reports;
alter publication supabase_realtime add table expenses;

-- Create Storage Buckets
insert into storage.buckets (id, name, public) values ('work_proofs', 'work_proofs', true);
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true);

-- Enable public access to buckets
CREATE POLICY "Allow public access to work_proofs" ON storage.objects FOR ALL USING (bucket_id = 'work_proofs');
CREATE POLICY "Allow public access to receipts" ON storage.objects FOR ALL USING (bucket_id = 'receipts');

-- INITIAL DATA SEEDING (Based on prd.md)
INSERT INTO categories (id, title, order_index) VALUES 
  ('c1000000-0000-0000-0000-000000000001', '1. PERSIAPAN & PERBAIKAN FATAL', 1),
  ('c2000000-0000-0000-0000-000000000002', '2. PLAFON & DINDING', 2),
  ('c3000000-0000-0000-0000-000000000003', '3. PEKERJAAN LANTAI & KAMAR MANDI', 3),
  ('c4000000-0000-0000-0000-000000000004', '4. KUSEN, PINTU & PENGECATAN AKHIR', 4),
  ('c5000000-0000-0000-0000-000000000005', '5. INSTALASI MEP & SANITARI', 5),
  ('c6000000-0000-0000-0000-000000000006', '6. AREA EKSTERIOR (CARPORT & SANGGAH)', 6),
  ('c7000000-0000-0000-0000-000000000007', '7. FINISHING LUAR & SERAH TERIMA', 7);

INSERT INTO tasks (title, category_id) VALUES
  ('Perbaikan sumber bocor atap/luar', 'c1000000-0000-0000-0000-000000000001'),
  ('Kerok & aci ulang dinding rembes', 'c1000000-0000-0000-0000-000000000001'),
  ('Acian dinding interior (area aman)', 'c1000000-0000-0000-0000-000000000001'),
  ('Waterproofing dak atap & talang', 'c1000000-0000-0000-0000-000000000001'),
  ('Pembuatan pondasi Sanggah', 'c1000000-0000-0000-0000-000000000001'),
  ('Pembuatan separator area dapur', 'c1000000-0000-0000-0000-000000000001'),
  ('Instalasi glass block', 'c1000000-0000-0000-0000-000000000001'),
  ('Compound & amplas plafon gypsum', 'c2000000-0000-0000-0000-000000000002'),
  ('Pengecatan dasar (sealer) dalam', 'c2000000-0000-0000-0000-000000000002'),
  ('Granit lantai interior (80x80)', 'c3000000-0000-0000-0000-000000000003'),
  ('Granit & keramik Kamar Mandi', 'c3000000-0000-0000-0000-000000000003'),
  ('Pembuatan tembok pagar fasad', 'c3000000-0000-0000-0000-000000000003'),
  ('Pemasangan roster pagar depan', 'c3000000-0000-0000-0000-000000000003'),
  ('Cat akhir dinding & plafon', 'c4000000-0000-0000-0000-000000000004'),
  ('Pasang pintu kamper & sliding', 'c4000000-0000-0000-0000-000000000004'),
  ('Finishing pintu (Impra/Melamik)', 'c4000000-0000-0000-0000-000000000004'),
  ('Pasang stop kontak, saklar, lampu', 'c5000000-0000-0000-0000-000000000005'),
  ('Pasang closet, shower, wastafel', 'c5000000-0000-0000-0000-000000000005'),
  ('Keramik teras & turus lumbung', 'c6000000-0000-0000-0000-000000000006'),
  ('Pemasangan Paving Block Carport', 'c6000000-0000-0000-0000-000000000006'),
  ('Pemasangan Kanopi Carport', 'c6000000-0000-0000-0000-000000000006'),
  ('Waterproofing/sealer tembok luar', 'c7000000-0000-0000-0000-000000000007'),
  ('Pengecatan pagar & eksterior', 'c7000000-0000-0000-0000-000000000007'),
  ('Retouch cat lecet & cek MEP', 'c7000000-0000-0000-0000-000000000007'),
  ('Deep cleaning (Pembersihan total)', 'c7000000-0000-0000-0000-000000000007');
