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
  UNIQUE(cart_id, id_product, id_product_attribute)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(id_customer);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(cart_status);
CREATE INDEX IF NOT EXISTS idx_carts_remote_id ON carts(remote_cart_id);
CREATE INDEX IF NOT EXISTS idx_carts_dirty ON carts(is_dirty);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(id_product);


CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core order information
  id_cart INTEGER NOT NULL UNIQUE, -- local cart id, don't use this for API calls
  id_customer INTEGER NOT NULL,
  id_carrier INTEGER NOT NULL,
  id_address_delivery INTEGER NOT NULL,
  id_address_invoice INTEGER NOT NULL,
  id_currency INTEGER DEFAULT 1,
  id_lang INTEGER DEFAULT 3,
  
  -- Payment information
  module TEXT DEFAULT 'ps_wirepayment',
  payment TEXT DEFAULT 'Manual payment',
  
  -- Totals
  total_products REAL NOT NULL,
  total_products_wt REAL NOT NULL,
  total_paid REAL NOT NULL,
  total_paid_real REAL NOT NULL,
  total_paid_tax_incl REAL NOT NULL,
  conversion_rate REAL DEFAULT 1.0,
  
  -- Shipping totals
  total_shipping REAL DEFAULT 0,
  total_shipping_tax_incl REAL DEFAULT 0,
  total_shipping_tax_excl REAL DEFAULT 0,
  
  -- Discount totals
  total_discounts REAL DEFAULT 0,
  total_discounts_tax_incl REAL DEFAULT 0,
  total_discounts_tax_excl REAL DEFAULT 0,
  
  -- Wrapping totals
  total_wrapping REAL DEFAULT 0,
  total_wrapping_tax_incl REAL DEFAULT 0,
  total_wrapping_tax_excl REAL DEFAULT 0,
  
  -- Rounding
  round_mode INTEGER DEFAULT 2,
  round_type INTEGER DEFAULT 1,
  
  -- Order options
  recyclable INTEGER DEFAULT 0,
  gift INTEGER DEFAULT 0,
  gift_message TEXT DEFAULT '',
  mobile_theme INTEGER DEFAULT 0,
  
  -- Invoice and delivery
  invoice_number INTEGER DEFAULT 0,
  delivery_number INTEGER DEFAULT 0,
  invoice_date TEXT DEFAULT '0000-00-00 00:00:00',
  delivery_date TEXT DEFAULT '0000-00-00 00:00:00',
  
  -- Status
  valid INTEGER DEFAULT 1,
  Trasmesso INTEGER DEFAULT 0,
  note TEXT DEFAULT '',
  
  -- Tax
  carrier_tax_rate REAL DEFAULT 0.000,
  
  -- Local app management
  remote_order_id INTEGER DEFAULT NULL,
  order_status TEXT DEFAULT 'pending',
  is_dirty BOOLEAN DEFAULT 1,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_error TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_synced_at DATETIME
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_cart ON orders(id_cart);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(id_customer);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_remote_id ON orders(remote_order_id);
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