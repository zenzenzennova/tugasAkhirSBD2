-- ============================================================
-- Sistem Kasir Midnight Meridian — Database Schema
-- ============================================================

-- Users
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

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    watch_type VARCHAR(20) CHECK (watch_type IN ('analog', 'digital', 'smartwatch')),
    brand_origin VARCHAR(10) CHECK (brand_origin IN ('lokal', 'impor')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model_type VARCHAR(100),
    price DECIMAL(15,2) NOT NULL CHECK (price > 0),
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    warranty_months INTEGER NOT NULL DEFAULT 0 CHECK (warranty_months >= 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    product_brand VARCHAR(100),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    item_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (item_discount_percent >= 0 AND item_discount_percent <= 100),
    item_discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (item_discount_amount >= 0),
    subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0)
);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    processed_by INTEGER NOT NULL REFERENCES users(id),
    return_reason TEXT NOT NULL,
    return_type VARCHAR(10) NOT NULL CHECK (return_type IN ('refund', 'exchange')),
    total_refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_refund_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    transaction_item_id INTEGER REFERENCES transaction_items(id) ON DELETE SET NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price > 0),
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('damaged', 'unsuitable', 'other')),
    deduction_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    refund_amount DECIMAL(15,2) NOT NULL CHECK (refund_amount >= 0),
    notes TEXT
);

-- ── Views ─────────────────────────────────────────────────────────────────────

-- View: product stock by category
CREATE OR REPLACE VIEW stock_by_category_view AS
SELECT
    c.id AS category_id,
    c.name AS category_name,
    c.watch_type,
    c.brand_origin,
    COUNT(p.id) AS total_products,
    COALESCE(SUM(p.stock), 0) AS total_stock
FROM categories c
LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
GROUP BY c.id, c.name, c.watch_type, c.brand_origin;

-- ── Seed Data ─────────────────────────────────────────────────────────────────

-- Seed categories (3 only)
INSERT INTO categories (name, watch_type, brand_origin, description) VALUES
('Jam Tangan Analog', 'analog', 'impor', 'Jam tangan analog merek internasional'),
('Jam Tangan Digital', 'digital', 'impor', 'Jam tangan digital merek internasional'),
('Smartwatch', 'smartwatch', 'impor', 'Smartwatch merek internasional')
ON CONFLICT DO NOTHING;

-- Seed products (3 only)
INSERT INTO products (name, brand, model_type, price, stock, warranty_months, category_id, discount_percent) VALUES
('Seiko 5 Sports Automatic', 'Seiko', 'SNXS79K', 2500000, 8, 24, 1, 0),
('Casio F-91W Digital', 'Casio', 'F-91W', 250000, 20, 12, 2, 10),
('Samsung Galaxy Watch 6', 'Samsung', 'SM-R930', 3500000, 5, 12, 3, 0)
ON CONFLICT DO NOTHING;
