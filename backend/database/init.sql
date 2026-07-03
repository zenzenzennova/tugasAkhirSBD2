-- ============================================================
-- Sistem Kasir Midnight Meridian — Database Schema
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('kasir', 'owner')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model_type VARCHAR(100),
    price DECIMAL(15,2) NOT NULL CHECK (price > 0),
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    warranty_months INTEGER NOT NULL DEFAULT 0 CHECK (warranty_months >= 0),
    category_id INTEGER NOT NULL CHECK (category_id IN (1, 2, 3)), -- 1: Analog, 2: Digital, 3: Smartwatch
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    cashier_id INTEGER NOT NULL REFERENCES users(id),
    customer_name VARCHAR(100),
    subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0),
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount >= 0),
    payment_amount DECIMAL(15,2) NOT NULL CHECK (payment_amount >= 0),
    change_amount DECIMAL(15,2) NOT NULL CHECK (change_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partially_returned', 'fully_returned')),
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of items in transaction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Returns (WEAK ENTITY dependent on transactions)
CREATE TABLE IF NOT EXISTS returns (
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    return_number VARCHAR(50) NOT NULL,
    processed_by INTEGER NOT NULL REFERENCES users(id),
    return_reason TEXT NOT NULL,
    return_type VARCHAR(10) NOT NULL CHECK (return_type IN ('refund', 'exchange')),
    total_refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_refund_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of returned items
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id, return_number)
);

-- ── Views ─────────────────────────────────────────────────────────────────────

-- View: product stock by category (using static categories CTE for backward compatibility)
CREATE OR REPLACE VIEW stock_by_category_view AS
WITH cats AS (
  SELECT 1 AS category_id, 'Jam Tangan Analog' AS category_name, 'analog'::varchar AS watch_type, 'impor'::varchar AS brand_origin
  UNION ALL
  SELECT 2 AS category_id, 'Jam Tangan Digital' AS category_name, 'digital'::varchar AS watch_type, 'impor'::varchar AS brand_origin
  UNION ALL
  SELECT 3 AS category_id, 'Smartwatch' AS category_name, 'smartwatch'::varchar AS watch_type, 'impor'::varchar AS brand_origin
)
SELECT
    c.category_id,
    c.category_name,
    c.watch_type,
    c.brand_origin,
    COUNT(p.id) AS total_products,
    COALESCE(SUM(p.stock), 0) AS total_stock
FROM cats c
LEFT JOIN products p ON c.category_id = p.category_id AND p.is_active = TRUE
GROUP BY c.category_id, c.category_name, c.watch_type, c.brand_origin;

-- View: Sales report flattening view
CREATE OR REPLACE VIEW sales_report_view AS
SELECT
    t.id AS transaction_id,
    t.transaction_number,
    t.customer_name,
    t.created_at AS transaction_date,
    u.full_name AS cashier_name,
    (item->>'product_id')::int AS product_id,
    item->>'product_name' AS product_name,
    item->>'product_brand' AS product_brand,
    (item->>'unit_price')::numeric AS unit_price,
    (item->>'quantity')::int AS quantity,
    (item->>'item_discount_percent')::numeric AS item_discount_percent,
    (item->>'item_discount_amount')::numeric AS item_discount_amount,
    (item->>'subtotal')::numeric AS item_subtotal,
    t.status AS transaction_status
FROM transactions t
JOIN users u ON t.cashier_id = u.id,
jsonb_array_elements(t.items) AS item;

-- View: Returns report flattening view
CREATE OR REPLACE VIEW returns_report_view AS
SELECT
    r.transaction_id,
    r.return_number,
    r.return_reason,
    r.return_type,
    r.total_refund_amount,
    r.status AS return_status,
    r.created_at AS return_date,
    u.full_name AS processed_by_name,
    (item->>'product_id')::int AS product_id,
    item->>'product_name' AS product_name,
    (item->>'quantity')::int AS quantity,
    (item->>'unit_price')::numeric AS unit_price,
    item->>'condition' AS condition,
    (item->>'deduction_rate')::numeric AS deduction_rate,
    (item->>'refund_amount')::numeric AS refund_amount,
    item->>'notes' AS item_notes
FROM returns r
JOIN users u ON r.processed_by = u.id,
jsonb_array_elements(r.items) AS item;

-- ── Seed Data ─────────────────────────────────────────────────────────────────

-- Seed products directly with their static category_id
INSERT INTO products (name, brand, model_type, price, stock, warranty_months, category_id, discount_percent) VALUES
('Seiko 5 Sports Automatic', 'Seiko', 'SNXS79K', 2500000, 8, 24, 1, 0),
('Casio F-91W Digital', 'Casio', 'F-91W', 250000, 20, 12, 2, 10),
('Samsung Galaxy Watch 6', 'Samsung', 'SM-R930', 3500000, 5, 12, 3, 0)
ON CONFLICT DO NOTHING;
