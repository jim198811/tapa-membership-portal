
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_no TEXT UNIQUE,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  full_name TEXT NOT NULL,
  gender TEXT,
  age_group TEXT,
  id_number TEXT,
  address TEXT NOT NULL,
  mailing_address TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  registered_business TEXT,
  business_name TEXT,
  business_type TEXT,
  business_description TEXT,
  categories TEXT,
  primary_group TEXT NOT NULL,
  products TEXT,
  years_business TEXT,
  credentials TEXT,
  support_needs TEXT,
  expectations TEXT,
  declaration INTEGER NOT NULL DEFAULT 0,
  signature_name TEXT,
  internal_notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  original_name TEXT,
  object_key TEXT,
  mime TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO categories(name) VALUES
('Seasonings & Sauces'),
('Confectionery'),
('Butter & Dairy Products'),
('Raw Produce'),
('Livestock'),
('Honey'),
('Artisan Products'),
('Meats & Meat Products'),
('Snacks'),
('Teas'),
('Dairy'),
('Dried & Dehydrated Foods'),
('Natural Skincare & Personal Care'),
('Beverages'),
('Bakery & Confectionery'),
('Coconut & Tropical Products'),
('Grains, Flour & Starches'),
('Herbal & Botanical Products'),
('Seafood & Aquaculture'),
('Plant-Based & Vegan Products'),
('Frozen & Ready-to-Eat Foods'),
('Preserved & Value-Added Foods'),
('Fruits & Vegetables'),
('Agro-Waste & Circular Products'),
('Other');

CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_app_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_app_no ON applications(application_no);
