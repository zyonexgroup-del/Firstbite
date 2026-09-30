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
);

-- Ensure cancellation columns exist if table was previously created
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

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

-- Public Access Policies
CREATE POLICY "Public full access to restaurants" ON public.restaurants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for orders, menu, coupons, and restaurants
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

-- Seed Sample Coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, max_discount, is_active, usage_count)
VALUES 
('FIRSTBITE20', 'percentage', 20, 200, 100, true, 28),
('FLAT50', 'flat', 50, 300, 50, true, 19),
('WELCOME10', 'percentage', 10, 100, 50, true, 42)
ON CONFLICT (code) DO NOTHING;
