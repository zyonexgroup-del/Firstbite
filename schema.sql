-- ==========================================================
-- FIRST BITE — SUPABASE POSTGRESQL SCHEMA (v3.0 Production)
-- Restaurant Ordering & Operations Platform
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/otohichqlyanmddwgofm/sql
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tagline TEXT,
    logo_url TEXT,
    cover_image TEXT,
    phone TEXT,
    address TEXT,
    currency TEXT DEFAULT '₹',
    tax_rate NUMERIC DEFAULT 5.0,
    service_charge NUMERIC DEFAULT 0.0,
    opening_time TEXT DEFAULT '10:00 AM',
    closing_time TEXT DEFAULT '11:00 PM',
    is_open BOOLEAN DEFAULT true,
    primary_color TEXT DEFAULT '#E23744',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in restaurants if table was previously created
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '₹';
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 5.0;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS service_charge NUMERIC DEFAULT 0.0;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS opening_time TEXT DEFAULT '10:00 AM';
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '11:00 PM';
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#E23744';
ALTER TABLE IF EXISTS public.restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in categories if table was previously created
ALTER TABLE IF EXISTS public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE IF EXISTS public.categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE IF EXISTS public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    is_veg BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    rating NUMERIC DEFAULT 4.8,
    prep_time TEXT DEFAULT '15-20 min',
    calories TEXT,
    badge TEXT, -- 'Bestseller', 'Chef Special', 'New'
    add_ons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in menu_items if table was previously created
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS is_veg BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 4.8;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS prep_time TEXT DEFAULT '15-20 min';
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS calories TEXT;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS add_ons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.menu_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. COUPONS TABLE (Discount Management)
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'flat'
    discount_value NUMERIC NOT NULL,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount NUMERIC,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ORDERS TABLE (Includes Date tracking, Coupon & Cancellation Reason)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    order_type TEXT NOT NULL DEFAULT 'dine_in', -- 'dine_in' or 'takeaway'
    table_number TEXT,
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'accepted', 'preparing', 'ready', 'served', 'cancelled'
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash' or 'online'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'paid'
    coupon_code TEXT,
    subtotal NUMERIC NOT NULL,
    tax NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0.0,
    total NUMERIC NOT NULL,
    instructions TEXT,
    order_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all required columns exist if table was previously created
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    selected_add_ons JSONB DEFAULT '[]'::jsonb,
    item_total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. STAFF TABLE
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'kitchen', -- 'admin', 'manager', 'kitchen', 'waiter'
    pin TEXT NOT NULL DEFAULT '1234',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Public Access Policies (Idempotent: drop before create)
DROP POLICY IF EXISTS "Public full access to restaurants" ON public.restaurants;
CREATE POLICY "Public full access to restaurants" ON public.restaurants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to categories" ON public.categories;
CREATE POLICY "Public full access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to menu_items" ON public.menu_items;
CREATE POLICY "Public full access to menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to coupons" ON public.coupons;
CREATE POLICY "Public full access to coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to orders" ON public.orders;
CREATE POLICY "Public full access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to order_items" ON public.order_items;
CREATE POLICY "Public full access to order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to staff" ON public.staff;
CREATE POLICY "Public full access to staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime safely (only adds tables if not already in publication)
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY['orders', 'order_items', 'menu_items', 'coupons', 'restaurants', 'categories'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- Auto-update updated_at on orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE PROCEDURE update_orders_updated_at();

-- Seed Sample Coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, max_discount, is_active, usage_count)
VALUES 
('FIRSTBITE20', 'percentage', 20, 200, 100, true, 28),
('FLAT50', 'flat', 50, 300, 50, true, 19),
('WELCOME10', 'percentage', 10, 100, 50, true, 42)
ON CONFLICT (code) DO NOTHING;

-- Seed Initial Restaurant Record (if not exists)
INSERT INTO public.restaurants (name, tagline, currency, tax_rate, opening_time, closing_time, is_open, primary_color)
SELECT 'First Bite Gourmet Bistro', 'Artisan Street Flavors & Continental Delicacies', '₹', 5.0, '10:00 AM', '11:30 PM', true, '#E23744'
WHERE NOT EXISTS (SELECT 1 FROM public.restaurants LIMIT 1);

-- Seed Sample Menu Items (if table is empty)
INSERT INTO public.menu_items (name, price, description, image_url, is_veg, is_available, rating, prep_time, calories, badge, add_ons)
SELECT * FROM (VALUES 
  ('Classic Crunch Chicken Burger', 180::numeric, 'Crispy fried chicken breast, melted cheddar, shredded iceberg lettuce & house garlic-dill mayo.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', false, true, 4.9::numeric, '12-15 min', '540 kcal', 'Bestseller', '[{"name":"Extra Melted Cheddar","price":30},{"name":"Double Chicken Patty","price":70}]'::jsonb),
  ('Smoked Truffle Smashed Burger', 260::numeric, 'Double smashed tender patties, caramelized balsamic onions, aged provolone & black truffle emulsion.', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', false, true, 4.8::numeric, '15 min', '680 kcal', 'Chef Special', '[{"name":"Extra Truffle Aioli","price":35}]'::jsonb),
  ('Crispy Paneer Makhani Burger', 190::numeric, 'Golden fried herb-paneer patty glazed in velvety butter makhani sauce, layered with mint mayo.', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', true, true, 4.7::numeric, '12 min', '490 kcal', 'Popular Veg', '[{"name":"Extra Paneer Layer","price":45}]'::jsonb),
  ('Wood-Fired Margherita Pizza (10")', 280::numeric, 'San Marzano plum tomatoes, fresh Buffalo fior-di-latte mozzarella, sweet garden basil & cold-pressed EVOO.', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80', true, true, 4.9::numeric, '16 min', '720 kcal', 'Bestseller', '[{"name":"Cheese Burst Crust","price":60}]'::jsonb),
  ('BBQ Smoked Chicken & Jalapeño Pizza', 360::numeric, 'Slow-smoked chicken chunks, sweet hickory BBQ swirl, spicy Mexican jalapeños & charred red onions.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', false, true, 4.8::numeric, '18 min', '840 kcal', 'Chef Special', '[{"name":"Extra Smoked Chicken","price":60}]'::jsonb),
  ('Royal Chicken Dum Biryani', 320::numeric, 'Aged fragrant basmati rice layered on dum with tender spiced bone-in chicken, caramelized birista & royal saffron.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80', false, true, 4.9::numeric, '20 min', '750 kcal', 'Signature', '[{"name":"Extra Boiled Egg","price":30}]'::jsonb),
  ('Truffle Parmesan Hand-cut Fries', 140::numeric, 'Double-fried crisp Russet potato fries tossed in aromatic Italian white truffle oil, rosemary sea salt & grated parmesan.', 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80', true, true, 4.9::numeric, '10 min', '380 kcal', 'Bestseller', '[{"name":"Warm Cheddar Sauce Dip","price":35}]'::jsonb)
) AS v(name, price, description, image_url, is_veg, is_available, rating, prep_time, calories, badge, add_ons)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items LIMIT 1);

