-- Main cart table - stores cart metadata
CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core cart information (matches your API)
  id_currency INTEGER DEFAULT 1,
  id_lang INTEGER DEFAULT 3,
  id_customer INTEGER NOT NULL,
  id_address_delivery INTEGER NOT NULL,
  id_address_invoice INTEGER NOT NULL,
  
  -- Shop information (from your API)
  id_shop_group INTEGER DEFAULT 1,
  id_shop INTEGER DEFAULT 1,
  id_guest INTEGER DEFAULT 0,
  
  -- Local app management
  local_cart_id TEXT UNIQUE, -- For tracking local vs remote carts
  remote_cart_id INTEGER, -- ID from PrestaShop API response
  cart_status TEXT DEFAULT 'active', -- active, submitted, abandoned
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME, -- When last synced with server
  
  -- Sync management
  is_dirty BOOLEAN DEFAULT 1, -- Needs sync with server
  sync_attempts INTEGER DEFAULT 0,
  last_sync_error TEXT,
  
  -- Constraints
  CHECK (cart_status IN ('active', 'submitted', 'abandoned'))
);

-- Cart items table - stores products in cart (one-to-many relationship)
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL,
  
  -- Product information (matches your API)
  id_product INTEGER NOT NULL,
  id_product_attribute INTEGER DEFAULT 0,
  id_address_delivery INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
  
  -- Ensure unique product in cart
  UNIQUE(cart_id, id_product)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(id_customer);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(cart_status);
CREATE INDEX IF NOT EXISTS idx_carts_remote_id ON carts(remote_cart_id);
CREATE INDEX IF NOT EXISTS idx_carts_dirty ON carts(is_dirty);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(id_product);

CREATE TABLE IF NOT EXISTS server_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT,
  firstname TEXT,
  lastname TEXT,
  id_order INTEGER,
  reference TEXT,
  total_paid REAL NOT NULL,
  date_add DATETIME,

  UNIQUE(id_order)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Core order info
  id_cart INTEGER NOT NULL UNIQUE,
  id_employee INTEGER DEFAULT NULL,
  id_customer INTEGER NOT NULL,
  id_carrier INTEGER NOT NULL,
  id_address_delivery INTEGER NOT NULL,
  id_address_invoice INTEGER NOT NULL,
  id_currency INTEGER DEFAULT 1,
  id_lang INTEGER DEFAULT 3,

  -- Payment
  module TEXT DEFAULT 'ps_wirepayment',
  payment TEXT DEFAULT 'Manual payment',

  -- Totals
  total_products REAL NOT NULL,
  total_products_wt REAL NOT NULL,
  total_paid REAL NOT NULL,
  total_paid_real REAL NOT NULL,
  total_shipping REAL DEFAULT 0,
  total_shipping_tax_incl REAL DEFAULT 0,
  total_shipping_tax_excl REAL DEFAULT 0,
  conversion_rate REAL DEFAULT 1.0,

  -- Local sync management
  is_dirty BOOLEAN DEFAULT 1,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_error TEXT,
  order_status TEXT DEFAULT 'pending',
  remote_order_id INTEGER DEFAULT NULL,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_cart ON orders(id_cart);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(id_customer);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_dirty ON orders(is_dirty);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);


CREATE TABLE IF NOT EXISTS carriers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  is_free INTEGER DEFAULT 0,
  delay TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY,
  id_carrier INTEGER NOT NULL,
  id_zone INTEGER NOT NULL,
  price REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_carrier) REFERENCES carriers (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deliveries_carrier ON deliveries(id_carrier);
CREATE INDEX IF NOT EXISTS idx_deliveries_zone ON deliveries(id_zone);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  id_customer INTEGER,
  firstname TEXT,
  lastname TEXT,
  email TEXT,
  codice_cmnr TEXT,
  company Text,
  numero_ordinale TEXT,
  postcode TEXT,
  address1 TEXT,
  city TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(id_customer)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  id_default_image INTEGER,
  minimal_quantity INTEGER,
  price REAL,
  name TEXT
);

CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY,
    id_customer INTEGER,
    id_manufacturer INTEGER,
    id_supplier INTEGER,
    id_warehouse INTEGER,
    id_country INTEGER,
    id_state INTEGER,
    alias TEXT,
    company TEXT,
    lastname TEXT,
    firstname TEXT,
    vat_number TEXT,
    address1 TEXT,
    address2 TEXT,
    postcode TEXT,
    city TEXT,
    other TEXT,
    phone TEXT,
    phone_mobile TEXT,
    dni TEXT,
    deleted TEXT,
    date_add TEXT,
    date_upd TEXT,
    numero_esercizio TEXT,
    codice_cmnr TEXT,
    numero_ordinale TEXT
);

CREATE TABLE IF NOT EXISTS agent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_employee INTEGER,
  token TEXT,
  email TEXT,
  id_profile INTEGER,
  UNIQUE (id_employee)
);

CREATE TABLE IF NOT EXISTS product_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_product INTEGER,
  depends_on_stock TEXT,
  id_product_attribute INTEGER,
  out_of_stock INTEGER,
  quantity INTEGER,
  UNIQUE (id_product)
);