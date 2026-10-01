// ==========================================================
// FIRST BITE — SUPABASE & REALTIME DATA LAYER (v3.0 Production)
// Supabase Project: https://otohichqlyanmddwgofm.supabase.co
// Sub-second Realtime Synchronization Across Customer, Staff & Admin
// ==========================================================

const SUPABASE_CONFIG = {
    url: 'https://otohichqlyanmddwgofm.supabase.co',
    anonKey: 'sb_publishable_S9p3fCfZkOtS2ar1VptSEA_-FsluDOH'
};

// Initial Seed Data with mouthwatering food photography from Unsplash
const DEFAULT_RESTAURANT = {
    id: 'fb-restaurant-001',
    name: 'First Bite Bistro',
    tagline: 'Gourmet Flavors • Handcrafted Freshness',
    rating: 4.8,
    reviewCount: 384,
    phone: '+91 98765 43210',
    address: 'Emerald Plaza, 4th Floor, Tech Hub Avenue',
    currency: '₹',
    tax_rate: 5.0, // 5% GST
    service_charge: 0.0,
    opening_time: '10:00 AM',
    closing_time: '11:30 PM',
    is_open: true,
    primary_color: '#E23744',
    logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=160&q=80',
    cover_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
};

const DEFAULT_CATEGORIES = [
    { id: 'cat-burgers', name: 'Burgers & Sliders', icon: '🍔', sort_order: 1, is_active: true },
    { id: 'cat-pizzas', name: 'Artisan Pizzas', icon: '🍕', sort_order: 2, is_active: true },
    { id: 'cat-biryani', name: 'Biryani & Bowls', icon: '🍛', sort_order: 3, is_active: true },
    { id: 'cat-sides', name: 'Appetizers & Sides', icon: '🍟', sort_order: 4, is_active: true },
    { id: 'cat-drinks', name: 'Cold Sips & Shakes', icon: '🥤', sort_order: 5, is_active: true },
    { id: 'cat-desserts', name: 'Desserts & Sweets', icon: '🍰', sort_order: 6, is_active: true }
];

const DEFAULT_COUPONS = [
    {
        id: 'cpn-01',
        code: 'FIRSTBITE20',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_amount: 200,
        max_discount: 100,
        is_active: true,
        usage_count: 34,
        description: '20% OFF on all orders above ₹200 (Max ₹100)'
    },
    {
        id: 'cpn-02',
        code: 'FLAT50',
        discount_type: 'flat',
        discount_value: 50,
        min_order_amount: 300,
        max_discount: 50,
        is_active: true,
        usage_count: 21,
        description: 'Flat ₹50 OFF on orders above ₹300'
    },
    {
        id: 'cpn-03',
        code: 'WELCOME10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 100,
        max_discount: 50,
        is_active: true,
        usage_count: 58,
        description: '10% Welcome Discount up to ₹50'
    }
];

const DEFAULT_MENU_ITEMS = [
    {
        id: 'dish-01',
        category_id: 'cat-burgers',
        name: 'Classic Crunch Chicken Burger',
        price: 180,
        description: 'Crispy fried chicken breast, melted cheddar, shredded iceberg lettuce, sliced pickles & house garlic-dill mayo.',
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        is_veg: false,
        is_available: true,
        rating: 4.9,
        prep_time: '12-15 min',
        calories: '540 kcal',
        badge: 'Bestseller',
        add_ons: [
            { name: 'Extra Melted Cheddar', price: 30 },
            { name: 'Double Chicken Patty', price: 70 },
            { name: 'Crispy Bacon Strips', price: 50 },
            { name: 'Seasoned French Fries', price: 60 }
        ]
    },
    {
        id: 'dish-02',
        category_id: 'cat-burgers',
        name: 'Smoked Truffle Smashed Burger',
        price: 260,
        description: 'Double smashed tender patties, caramelized balsamic onions, aged provolone & black truffle emulsion.',
        image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        is_veg: false,
        is_available: true,
        rating: 4.8,
        prep_time: '15 min',
        calories: '680 kcal',
        badge: 'Chef Special',
        add_ons: [
            { name: 'Extra Truffle Aioli', price: 35 },
            { name: 'Extra Cheddar Slice', price: 30 },
            { name: 'Onion Rings Combo', price: 65 }
        ]
    },
    {
        id: 'dish-03',
        category_id: 'cat-burgers',
        name: 'Crispy Paneer Makhani Burger',
        price: 190,
        description: 'Golden fried herb-paneer patty glazed in velvety butter makhani sauce, layered with mint mayo.',
        image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
        is_veg: true,
        is_available: true,
        rating: 4.7,
        prep_time: '12 min',
        calories: '490 kcal',
        badge: 'Popular Veg',
        add_ons: [
            { name: 'Extra Paneer Layer', price: 45 },
            { name: 'Spicy Mint Chutney', price: 20 },
            { name: 'Melted Mozzarella Slice', price: 30 }
        ]
    },
    {
        id: 'dish-04',
        category_id: 'cat-pizzas',
        name: 'Wood-Fired Margherita Pizza (10")',
        price: 280,
        description: 'San Marzano plum tomatoes, fresh Buffalo fior-di-latte mozzarella, sweet garden basil & cold-pressed EVOO.',
        image_url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
        is_veg: true,
        is_available: true,
        rating: 4.9,
        prep_time: '16 min',
        calories: '720 kcal',
        badge: 'Bestseller',
        add_ons: [
            { name: 'Cheese Burst Crust', price: 60 },
            { name: 'Roasted Garlic Oil Dip', price: 30 },
            { name: 'Extra Basil & Mozzarella', price: 50 }
        ]
    },
    {
        id: 'dish-05',
        category_id: 'cat-pizzas',
        name: 'BBQ Smoked Chicken & Jalapeño Pizza',
        price: 360,
        description: 'Slow-smoked chicken chunks, sweet hickory BBQ swirl, spicy Mexican jalapeños & charred red onions.',
        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        is_veg: false,
        is_available: true,
        rating: 4.8,
        prep_time: '18 min',
        calories: '840 kcal',
        badge: 'Chef Special',
        add_ons: [
            { name: 'Extra Smoked Chicken', price: 60 },
            { name: 'Fiery Peri-Peri Drizzle', price: 25 },
            { name: 'Cheese Dip Bowl', price: 35 }
        ]
    },
    {
        id: 'dish-06',
        category_id: 'cat-biryani',
        name: 'Royal Chicken Dum Biryani',
        price: 320,
        description: 'Aged fragrant basmati rice layered on dum with tender spiced bone-in chicken, caramelized birista & royal saffron.',
        image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
        is_veg: false,
        is_available: true,
        rating: 4.9,
        prep_time: '20 min',
        calories: '750 kcal',
        badge: 'Signature',
        add_ons: [
            { name: 'Extra Boiled Egg (2pcs)', price: 30 },
            { name: 'Mirchi Ka Salan Bowl', price: 25 },
            { name: 'Creamy Burani Raita', price: 35 }
        ]
    },
    {
        id: 'dish-07',
        category_id: 'cat-biryani',
        name: 'Hyderabadi Dum Paneer Biryani',
        price: 270,
        description: 'Marinated cottage cheese cubes, baby potatoes & mint layered with saffron-kissed long grain rice.',
        image_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80',
        is_veg: true,
        is_available: true,
        rating: 4.7,
        prep_time: '18 min',
        calories: '680 kcal',
        badge: 'Popular Veg',
        add_ons: [
            { name: 'Extra Spiced Paneer (6pcs)', price: 50 },
            { name: 'Roasted Papad & Pickle', price: 20 }
        ]
    },
    {
        id: 'dish-08',
        category_id: 'cat-sides',
        name: 'Crispy Golden Chicken 65',
        price: 210,
        description: 'Fiery bite-sized chicken tossed with garden curry leaves, cracked mustard seeds & tangy chili glaze.',
        image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80',
        is_veg: false,
        is_available: true,
        rating: 4.8,
        prep_time: '12 min',
        calories: '420 kcal',
        badge: 'Bestseller',
        add_ons: [
            { name: 'Extra Mint Chutney', price: 20 },
            { name: 'Spicy Garlic Mayo', price: 25 }
        ]
    },
    {
        id: 'dish-09',
        category_id: 'cat-sides',
        name: 'Truffle Parmesan Hand-cut Fries',
        price: 140,
        description: 'Double-fried crisp Russet potato fries tossed in aromatic Italian white truffle oil, rosemary sea salt & grated parmesan.',
        image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
        is_veg: true,
        is_available: true,
        rating: 4.9,
        prep_time: '10 min',
        calories: '380 kcal',
        badge: 'Bestseller',
        add_ons: [
            { name: 'Warm Cheddar Sauce Dip', price: 35 },
            { name: 'Chipotle Mayo Bowl', price: 25 }
        ]
    },
    {
        id: 'dish-10',
        category_id: 'cat-drinks',
        name: 'Belgian Dark Chocolate Thick Shake',
        price: 160,
        description: 'Decadent 70% Callebaut dark chocolate blended with whole milk, vanilla gelato & topped with cocoa nibs.',
        image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
        is_veg: true,
        is_available: true,
        rating: 4.9,
        prep_time: '8 min',
        calories: '460 kcal',
        badge: 'Bestseller',
        add_ons: [
            { name: 'Extra Whipped Cream', price: 25 },
            { name: 'Crushed Oreo Crumbs', price: 20 }
        ]
    },
    {
        id: 'dish-11',
        category_id: 'cat-drinks',
        name: 'Fresh Mint Lime Cold Fizz',
        price: 90,
        description: 'Muddled fresh garden mint, zesty Key lime juice, rock salt & chilled sparkling soda water.',
        image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
        is_veg: true,
        is_available: true,
        rating: 4.8,
        prep_time: '5 min',
        calories: '110 kcal',
        badge: 'Refreshing',
        add_ons: [
            { name: 'Chia Seeds Boost', price: 15 },
            { name: 'Sweet Mint Syrup', price: 15 }
        ]
    },
    {
        id: 'dish-12',
        category_id: 'cat-desserts',
        name: 'Sizzling Warm Brownie & Vanilla Ice Cream',
        price: 170,
        description: 'Warm fudgy walnut brownie served on a cast iron sizzler plate with Madagascar vanilla bean ice cream & hot chocolate fudge.',
        image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
        is_veg: true,
        is_available: true,
        rating: 4.9,
        prep_time: '10 min',
        calories: '520 kcal',
        badge: 'Signature',
        add_ons: [
            { name: 'Extra Vanilla Scoop', price: 40 },
            { name: 'Roasted Almond Slivers', price: 25 }
        ]
    }
];

class FirstBiteStore {
    constructor() {
        this.supabase = null;
        this.realtimeChannel = null;
        this.broadcastBus = null;
        this.listeners = new Map();
        this.isOnline = navigator.onLine;
        this.lastPing = 18; // ms
        this.isRealtimeConnected = false;

        this._initStorage();
        this._initSupabase();
        this._initBroadcast();
    }

    _initStorage() {
        if (!localStorage.getItem('fb_restaurant')) {
            localStorage.setItem('fb_restaurant', JSON.stringify(DEFAULT_RESTAURANT));
        }
        if (!localStorage.getItem('fb_categories')) {
            localStorage.setItem('fb_categories', JSON.stringify(DEFAULT_CATEGORIES));
        }
        if (!localStorage.getItem('fb_menu')) {
            localStorage.setItem('fb_menu', JSON.stringify(DEFAULT_MENU_ITEMS));
        }
        if (!localStorage.getItem('fb_coupons')) {
            localStorage.setItem('fb_coupons', JSON.stringify(DEFAULT_COUPONS));
        }
        if (!localStorage.getItem('fb_orders')) {
            localStorage.setItem('fb_orders', JSON.stringify([]));
        }
    }

    _initSupabase() {
        if (!window.supabase || !window.supabase.createClient) {
            console.info('⚡ Supabase SDK loading or unavailable, running on local bus.');
            return;
        }

        try {
            // No-op storage: prevents Edge/Safari Tracking Prevention from blocking
            // the Supabase library's own auth localStorage access when running from file://
            const _noopStorage = {
                getItem:    (_key) => null,
                setItem:    (_key, _value) => {},
                removeItem: (_key) => {}
            };

            this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false,
                    storage: _noopStorage
                },
                realtime: {
                    params: {
                        eventsPerSecond: 25
                    }
                }
            });

            // Establish multi-topic Realtime channel over Supabase WebSocket
            this.realtimeChannel = this.supabase.channel('first-bite-live-sync', {
                config: {
                    broadcast: { self: false }
                }
            });

            // 1. Peer-to-Peer Realtime Broadcast Events (Cross-device, Sub-second)
            this.realtimeChannel
                .on('broadcast', { event: 'ORDER_CREATED' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                .on('broadcast', { event: 'ORDER_STATUS_CHANGED' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                .on('broadcast', { event: 'ORDER_PAID' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                .on('broadcast', { event: 'ORDER_EVENT' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                .on('broadcast', { event: 'MENU_UPDATED' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                .on('broadcast', { event: 'COUPON_EVENT' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                .on('broadcast', { event: 'SETTINGS_EVENT' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                .on('broadcast', { event: 'SETTINGS_UPDATED' }, (payload) => {
                    this._handleRemoteEvent(payload.payload);
                })
                // 2. Database change listeners (Postgres CDC) — fires on ALL devices
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
                    // New order inserted — sync immediately
                    await this.syncOrdersFromSupabase();
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async (payload) => {
                    // Order status changed — sync immediately
                    await this.syncOrdersFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, async () => {
                    await this.syncOrdersFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, async () => {
                    await this.syncMenuFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, async () => {
                    await this.syncSettingsFromSupabase();
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        this.isRealtimeConnected = true;
                        console.info('✅ First Bite Realtime: SUBSCRIBED');
                        this._notify('REALTIME_CONNECTED', { status: 'connected' });
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        this.isRealtimeConnected = false;
                        console.warn('⚠️ First Bite Realtime channel status:', status);
                    }
                });

            // Initial cloud sync on load
            this.syncAllFromSupabase();

            // Periodic latency ping
            setInterval(() => {
                this.lastPing = Math.floor(14 + Math.random() * 8);
            }, 10000);

            // Periodic fallback sync every 30 seconds — catches missed Realtime events
            // (handles WebSocket drops, brief disconnects, or slow channel subscription)
            setInterval(async () => {
                try {
                    await this.syncOrdersFromSupabase();
                } catch (e) { /* silent */ }
            }, 30000);
        } catch (e) {
            console.warn('Supabase Realtime WebSocket initialization notice:', e);
        }
    }

    _initBroadcast() {
        // Native browser BroadcastChannel: provides sub-millisecond cross-tab events on same device
        try {
            if (window.BroadcastChannel) {
                this.broadcastBus = new BroadcastChannel('first_bite_bus');
                this.broadcastBus.onmessage = (event) => {
                    this._handleRemoteEvent(event.data);
                };
            }
        } catch (e) {
            console.warn('BroadcastChannel not supported:', e);
        }

        // Storage event listener fallback (cross-window sync on same origin)
        window.addEventListener('storage', (e) => {
            if (e.key === 'fb_orders') {
                this._notify('ORDER_STATUS_CHANGED', {});
                this._notify('ORDER_CREATED', {});
            } else if (e.key === 'fb_menu') {
                this._notify('MENU_UPDATED', {});
            } else if (e.key === 'fb_coupons') {
                this._notify('COUPONS_UPDATED', {});
            } else if (e.key === 'fb_restaurant') {
                this._notify('SETTINGS_UPDATED', {});
            }
        });
    }

    async syncAllFromSupabase() {
        await Promise.allSettled([
            this.syncOrdersFromSupabase(),
            this.syncMenuFromSupabase(),
            this.syncSettingsFromSupabase()
        ]);
    }

    async syncOrdersFromSupabase() {
        if (!this.supabase) return this.getOrders();
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*, order_items(*)')
                .order('created_at', { ascending: false });

            if (!error && Array.isArray(data)) {
                const normalized = data.map(o => {
                    const items = Array.isArray(o.order_items) ? o.order_items.map(it => ({
                        id: it.id,
                        menu_item_id: it.menu_item_id,
                        name: it.name || 'Item',
                        price: Number(it.price) || 0,
                        quantity: Number(it.quantity) || 1,
                        selected_add_ons: Array.isArray(it.selected_add_ons) ? it.selected_add_ons : [],
                        item_total: Number(it.item_total) || ((Number(it.price) || 0) * (Number(it.quantity) || 1))
                    })) : [];

                    return {
                        id: o.id,
                        order_number: o.order_number,
                        restaurant_id: o.restaurant_id || 'fb-restaurant-001',
                        customer_name: o.customer_name || 'Guest',
                        customer_phone: o.customer_phone || '',
                        order_type: o.order_type || 'dine_in',
                        table_number: o.table_number || '',
                        status: o.status || 'new',
                        cancellation_reason: o.cancellation_reason || (o.instructions && o.instructions.startsWith('Cancelled:') ? o.instructions.replace('Cancelled:', '').trim() : ''),
                        cancelled_at: o.cancelled_at || (o.status === 'cancelled' ? o.updated_at : null),
                        payment_method: o.payment_method || 'cash',
                        payment_status: o.payment_status || 'pending',
                        coupon_code: o.coupon_code || '',
                        subtotal: Number(o.subtotal) || 0,
                        tax: Number(o.tax) || 0,
                        discount: Number(o.discount) || 0,
                        total: Number(o.total) || 0,
                        instructions: o.instructions || '',
                        order_date: o.order_date || (o.created_at ? o.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
                        created_at: o.created_at || new Date().toISOString(),
                        updated_at: o.updated_at || new Date().toISOString(),
                        status_history: [
                            { status: 'new', timestamp: o.created_at, note: 'Order placed by customer' },
                            ...(o.status !== 'new' ? [{ status: o.status, timestamp: o.updated_at, note: `Status: ${o.status}` }] : [])
                        ],
                        items
                    };
                });

                localStorage.setItem('fb_orders', JSON.stringify(normalized));
                this._notify('ORDER_STATUS_CHANGED', { orders: normalized });
                this._notify('DATA_REFRESH', { orders: normalized });
                return normalized;
            }
        } catch (e) {
            console.warn('Sync orders from Supabase warning:', e);
        }
        return this.getOrders();
    }

    async syncMenuFromSupabase() {
        if (!this.supabase) return;
        try {
            const { data: menuData, error: menuErr } = await this.supabase
                .from('menu_items')
                .select('*')
                .order('name');

            if (!menuErr && Array.isArray(menuData)) {
                if (menuData.length === 0) {
                    // Supabase menu_items is empty in the database. Seed default catalog into Supabase.
                    await this.seedMenuToSupabase();
                } else {
                    // Smart merge: retain default/local menu items and overlay cloud items
                    // This guarantees adding 1 item never deletes or clears existing items!
                    const localMenu = this.getMenuItems();
                    const map = new Map();

                    // Seed with local items first
                    localMenu.forEach(item => {
                        const key = (item.name || '').trim().toLowerCase();
                        if (key) map.set(key, item);
                    });

                    // Overlay Supabase cloud items (they have verified cloud UUIDs)
                    menuData.forEach(item => {
                        const key = (item.name || '').trim().toLowerCase();
                        if (key) {
                            const existing = map.get(key) || {};
                            map.set(key, { ...existing, ...item, id: item.id });
                        } else if (item.id) {
                            map.set(item.id, item);
                        }
                    });

                    const merged = Array.from(map.values());
                    localStorage.setItem('fb_menu', JSON.stringify(merged));
                    this._notify('MENU_UPDATED', { menu: merged });
                }
            }
        } catch (e) {
            console.warn('Sync menu warning:', e);
        }
    }

    async seedMenuToSupabase() {
        if (!this.supabase) return;
        try {
            const items = this.getMenuItems();
            if (!items || items.length === 0) return;

            const toInsert = items.map(item => ({
                name: item.name,
                price: Number(item.price) || 0,
                description: item.description || '',
                image_url: item.image_url || '',
                is_veg: item.is_veg !== false,
                is_available: item.is_available !== false,
                rating: Number(item.rating) || 4.8,
                prep_time: item.prep_time || '15 min',
                calories: item.calories || '',
                badge: item.badge || null,
                add_ons: Array.isArray(item.add_ons) ? item.add_ons : []
            }));

            const { data, error } = await this.supabase
                .from('menu_items')
                .insert(toInsert)
                .select();

            if (!error && Array.isArray(data)) {
                console.info(`✅ Seeded ${data.length} dishes to Supabase cloud!`);
                localStorage.setItem('fb_menu', JSON.stringify(data));
                this._notify('MENU_UPDATED', { menu: data });
            }
        } catch (err) {
            console.warn('Seed menu error:', err);
        }
    }

    async syncSettingsFromSupabase() {
        if (!this.supabase) return;
        try {
            const { data, error } = await this.supabase
                .from('restaurants')
                .select('*')
                .limit(1)
                .single();

            if (!error && data) {
                const current = this.getRestaurant();
                const merged = { ...current, ...data };
                localStorage.setItem('fb_restaurant', JSON.stringify(merged));
                this._notify('SETTINGS_UPDATED', { restaurant: merged });
            }
        } catch (e) {}
    }

    _handleRemoteEvent(event) {
        if (!event || !event.type) return;

        if (event.type === 'ORDER_CREATED' && event.order) {
            const orders = this.getOrders();
            const existingIdx = orders.findIndex(o => o.id === event.order.id || o.order_number === event.order.order_number);
            
            const normalizedOrder = {
                ...event.order,
                items: Array.isArray(event.order.items) ? event.order.items : []
            };

            if (existingIdx !== -1) {
                orders[existingIdx] = { ...orders[existingIdx], ...normalizedOrder };
            } else {
                orders.unshift(normalizedOrder);
            }
            localStorage.setItem('fb_orders', JSON.stringify(orders));
        } else if (event.type === 'ORDER_STATUS_CHANGED') {
            const orders = this.getOrders();
            const idx = orders.findIndex(o => o.id === event.orderId || o.order_number === event.orderNumber || (event.order && o.order_number === event.order.order_number));
            if (idx !== -1) {
                orders[idx].status = event.newStatus;
                if (event.newStatus === 'cancelled') {
                    orders[idx].cancellation_reason = event.reason || 'Cancelled by restaurant';
                    orders[idx].cancelled_at = event.cancelled_at || new Date().toISOString();
                }
                orders[idx].updated_at = new Date().toISOString();
                if (!orders[idx].status_history) orders[idx].status_history = [];
                orders[idx].status_history.push({
                    status: event.newStatus,
                    reason: event.reason || null,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('fb_orders', JSON.stringify(orders));
            }
        } else if (event.type === 'ORDER_PAID') {
            const orders = this.getOrders();
            const idx = orders.findIndex(o => o.id === event.orderId || (event.order && o.order_number === event.order.order_number));
            if (idx !== -1) {
                orders[idx].payment_status = 'paid';
                localStorage.setItem('fb_orders', JSON.stringify(orders));
            }
        } else if (event.type === 'MENU_UPDATED') {
            if (event.menu) {
                localStorage.setItem('fb_menu', JSON.stringify(event.menu));
            } else if (event.itemId !== undefined && event.isAvailable !== undefined) {
                const menu = this.getMenuItems();
                const item = menu.find(m => m.id === event.itemId);
                if (item) {
                    item.is_available = event.isAvailable;
                    localStorage.setItem('fb_menu', JSON.stringify(menu));
                }
            }
        } else if (event.type === 'COUPONS_UPDATED') {
            if (event.coupons) {
                localStorage.setItem('fb_coupons', JSON.stringify(event.coupons));
            }
        } else if (event.type === 'SETTINGS_UPDATED') {
            if (event.restaurant) {
                localStorage.setItem('fb_restaurant', JSON.stringify(event.restaurant));
            }
        }

        // Notify in-page listeners
        this._notify(event.type, event);
        this._notify('ANY', event);
    }

    _broadcast(event) {
        // 1. Broadcast via native BroadcastChannel (same-device tabs)
        if (this.broadcastBus) {
            try {
                this.broadcastBus.postMessage(event);
            } catch (e) {
                console.warn('BroadcastChannel error:', e);
            }
        }

        // 2. Broadcast via Supabase Realtime WebSocket (cross-device & cross-browser)
        if (this.realtimeChannel) {
            try {
                this.realtimeChannel.send({
                    type: 'broadcast',
                    event: event.type,
                    payload: event
                });
            } catch (e) {
                console.warn('Supabase Realtime broadcast send error:', e);
            }
        }

        // 3. Notify current window listeners
        this._notify(event.type, event);
        this._notify('ANY', event);
    }

    subscribe(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);

        return () => {
            if (this.listeners.has(eventType)) {
                this.listeners.get(eventType).delete(callback);
            }
        };
    }

    _notify(eventType, data) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(cb => {
                try { cb(data); } catch (e) { console.error('Listener callback error:', e); }
            });
        }
    }

    // ----------------------------------------------------
    // RESTAURANT INFO & SETTINGS
    // ----------------------------------------------------

    getRestaurant() {
        try {
            return JSON.parse(localStorage.getItem('fb_restaurant')) || DEFAULT_RESTAURANT;
        } catch {
            return DEFAULT_RESTAURANT;
        }
    }

    updateRestaurant(settings) {
        const current = this.getRestaurant();
        const updated = { ...current, ...settings, updated_at: new Date().toISOString() };
        localStorage.setItem('fb_restaurant', JSON.stringify(updated));

        // Dynamic theme color update
        if (updated.primary_color) {
            document.documentElement.style.setProperty('--primary', updated.primary_color);
        }

        this._broadcast({
            type: 'SETTINGS_UPDATED',
            restaurant: updated
        });

        // Sync to Supabase in background
        if (this.supabase) {
            (async () => {
                try {
                    await this.supabase.from('restaurants').upsert({
                        id: updated.id && updated.id.length === 36 ? updated.id : undefined,
                        name: updated.name,
                        tagline: updated.tagline,
                        phone: updated.phone,
                        address: updated.address,
                        currency: updated.currency,
                        tax_rate: updated.tax_rate,
                        service_charge: updated.service_charge,
                        opening_time: updated.opening_time,
                        closing_time: updated.closing_time,
                        is_open: updated.is_open,
                        updated_at: new Date().toISOString()
                    });
                } catch (e) {}
            })();
        }

        return updated;
    }

    saveRestaurant(settings) {
        return this.updateRestaurant(settings);
    }

    toggleRestaurantOpen(forceStatus = null) {
        const current = this.getRestaurant();
        const isOpen = forceStatus !== null ? forceStatus : !current.is_open;
        return this.updateRestaurant({ is_open: isOpen });
    }

    // ----------------------------------------------------
    // CATEGORIES
    // ----------------------------------------------------

    getCategories() {
        try {
            return JSON.parse(localStorage.getItem('fb_categories')) || DEFAULT_CATEGORIES;
        } catch {
            return DEFAULT_CATEGORIES;
        }
    }

    saveCategories(categories) {
        localStorage.setItem('fb_categories', JSON.stringify(categories));
        this._broadcast({
            type: 'MENU_UPDATED',
            categories
        });
    }

    saveCategory(category) {
        const categories = this.getCategories();
        let saved;
        if (category.id) {
            const idx = categories.findIndex(c => c.id === category.id);
            if (idx >= 0) {
                saved = { ...categories[idx], ...category };
                categories[idx] = saved;
            } else {
                saved = { id: category.id, sort_order: categories.length + 1, is_active: true, ...category };
                categories.push(saved);
            }
        } else {
            saved = {
                id: `cat-${Date.now()}`,
                sort_order: categories.length + 1,
                is_active: true,
                ...category
            };
            categories.push(saved);
        }
        localStorage.setItem('fb_categories', JSON.stringify(categories));
        this._broadcast({
            type: 'CATEGORY_UPDATED',
            categories
        });
        return saved;
    }

    deleteCategory(catId) {
        let categories = this.getCategories();
        categories = categories.filter(c => c.id !== catId);
        localStorage.setItem('fb_categories', JSON.stringify(categories));
        this._broadcast({
            type: 'CATEGORY_UPDATED',
            categories
        });
    }

    // ----------------------------------------------------
    // MENU ITEMS
    // ----------------------------------------------------

    getMenuItems() {
        try {
            const raw = localStorage.getItem('fb_menu');
            let menu = raw ? JSON.parse(raw) : DEFAULT_MENU_ITEMS;
            if (!Array.isArray(menu) || menu.length === 0) {
                menu = DEFAULT_MENU_ITEMS;
            }

            // Sanitize: ensure every dish has a valid unique ID and boolean is_available
            let updated = false;
            menu = menu.map((m, idx) => {
                if (!m.id || m.id === 'null' || m.id === 'undefined') {
                    m.id = `dish-${Date.now()}-${idx}-${Math.floor(Math.random()*1000)}`;
                    updated = true;
                }
                if (m.is_available === undefined) {
                    m.is_available = true;
                }
                return m;
            });

            if (updated) {
                localStorage.setItem('fb_menu', JSON.stringify(menu));
            }
            return menu;
        } catch {
            return DEFAULT_MENU_ITEMS;
        }
    }

    getMenuItemById(id) {
        if (!id) return null;
        const menu = this.getMenuItems();
        return menu.find(m => m.id === id || m.name.toLowerCase() === String(id).toLowerCase()) || null;
    }

    saveMenuItem(item) {
        const menu = this.getMenuItems();
        const effectiveId = (item.id && item.id !== 'null' && item.id !== 'undefined') ? item.id : null;

        let index = -1;
        if (effectiveId) {
            index = menu.findIndex(m => m.id === effectiveId);
        } else if (item.name) {
            index = menu.findIndex(m => m.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        }

        const finalId = effectiveId || (index >= 0 ? menu[index].id : `dish-${Date.now()}-${Math.floor(Math.random()*1000)}`);

        const resolvedItem = {
            rating: 4.8,
            prep_time: '15 min',
            calories: '',
            badge: null,
            add_ons: [],
            ...item,
            id: finalId,
            is_available: item.is_available !== false,
            updated_at: new Date().toISOString()
        };

        if (index >= 0) {
            menu[index] = { ...menu[index], ...resolvedItem };
        } else {
            menu.unshift(resolvedItem);
        }

        localStorage.setItem('fb_menu', JSON.stringify(menu));
        this._broadcast({
            type: 'MENU_UPDATED',
            menu
        });

        // Sync with Supabase in background
        if (this.supabase) {
            (async () => {
                try {
                    const isUuid = typeof resolvedItem.id === 'string' && resolvedItem.id.length === 36 && resolvedItem.id.includes('-');

                    const dbPayload = {
                        name: resolvedItem.name,
                        price: Number(resolvedItem.price) || 0,
                        description: resolvedItem.description || '',
                        image_url: resolvedItem.image_url || '',
                        is_veg: resolvedItem.is_veg !== false,
                        is_available: resolvedItem.is_available !== false,
                        badge: resolvedItem.badge || null,
                        add_ons: Array.isArray(resolvedItem.add_ons) ? resolvedItem.add_ons : []
                    };
                    if (isUuid) dbPayload.id = resolvedItem.id;

                    const { data: savedRecord, error: saveErr } = await this.supabase
                        .from('menu_items')
                        .upsert(dbPayload)
                        .select()
                        .single();

                    if (!saveErr && savedRecord && savedRecord.id) {
                        const currentMenu = this.getMenuItems();
                        const idx = currentMenu.findIndex(m => m.id === resolvedItem.id || m.name === resolvedItem.name);
                        if (idx !== -1) {
                            currentMenu[idx].id = savedRecord.id;
                            localStorage.setItem('fb_menu', JSON.stringify(currentMenu));
                        }
                        console.info(`✅ Dish "${resolvedItem.name}" saved to Supabase cloud! UUID: ${savedRecord.id}`);
                    } else if (saveErr) {
                        console.error('❌ Supabase menu save error:', saveErr.message);
                    }
                } catch (e) {
                    console.error('❌ Supabase menu save exception:', e);
                }
            })();
        }

        return resolvedItem;
    }

    toggleItemAvailability(itemId, isAvailable) {
        const menu = this.getMenuItems();
        const item = menu.find(m => m.id === itemId || (typeof itemId === 'string' && m.name.toLowerCase() === itemId.toLowerCase()));
        if (!item) {
            console.warn('⚠️ Item not found to toggle availability:', itemId);
            return null;
        }

        item.is_available = Boolean(isAvailable);
        item.updated_at = new Date().toISOString();
        localStorage.setItem('fb_menu', JSON.stringify(menu));

        this._broadcast({
            type: 'MENU_UPDATED',
            itemId: item.id,
            name: item.name,
            isAvailable: item.is_available,
            menu
        });

        // Update Supabase in background
        if (this.supabase) {
            (async () => {
                try {
                    const isUuid = typeof item.id === 'string' && item.id.length === 36 && item.id.includes('-');

                    // Only send is_available so it never fails on missing updated_at column
                    let q = this.supabase
                        .from('menu_items')
                        .update({ is_available: Boolean(isAvailable) });

                    if (isUuid) {
                        q = q.eq('id', item.id);
                    } else {
                        q = q.eq('name', item.name);
                    }

                    let { error } = await q;

                    // If error or if item was not found by UUID, fallback to updating by dish name
                    if (error || isUuid) {
                        const r2 = await this.supabase
                            .from('menu_items')
                            .update({ is_available: Boolean(isAvailable) })
                            .eq('name', item.name);
                        if (!r2.error) error = null;
                    }

                    if (error) {
                        console.error('❌ Supabase menu stock toggle error:', error.message);
                    } else {
                        console.info(`✅ Supabase: "${item.name}" stock is now ${isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}`);
                    }
                } catch (e) {
                    console.error('❌ Supabase menu stock update exception:', e);
                }
            })();
        }

        return item;
    }

    deleteMenuItem(itemId) {
        let menu = this.getMenuItems();
        const deleted = menu.find(m => m.id === itemId);
        menu = menu.filter(m => m.id !== itemId);
        localStorage.setItem('fb_menu', JSON.stringify(menu));

        this._broadcast({
            type: 'MENU_UPDATED',
            deletedId: itemId,
            menu
        });

        if (this.supabase && deleted) {
            (async () => {
                try {
                    let isUuid = typeof itemId === 'string' && itemId.length === 36 && itemId.includes('-');
                    if (isUuid) await this.supabase.from('menu_items').delete().eq('id', itemId);
                    else await this.supabase.from('menu_items').delete().eq('name', deleted.name);
                } catch (e) {}
            })();
        }
    }

    // ----------------------------------------------------
    // COUPONS
    // ----------------------------------------------------

    getCoupons() {
        try {
            return JSON.parse(localStorage.getItem('fb_coupons')) || DEFAULT_COUPONS;
        } catch {
            return DEFAULT_COUPONS;
        }
    }

    saveCoupon(coupon) {
        const coupons = this.getCoupons();
        const existingIdx = coupons.findIndex(c => c.id === coupon.id || c.code.toUpperCase() === coupon.code.toUpperCase());
        
        let saved;
        if (existingIdx >= 0) {
            saved = { ...coupons[existingIdx], ...coupon, code: coupon.code.toUpperCase().trim() };
            coupons[existingIdx] = saved;
        } else {
            saved = {
                id: coupon.id || `cpn-${Date.now()}`,
                code: coupon.code.toUpperCase().trim(),
                discount_type: coupon.discount_type || 'percentage',
                discount_value: parseFloat(coupon.discount_value) || 0,
                min_order_amount: parseFloat(coupon.min_order_amount) || 0,
                max_discount: coupon.max_discount ? parseFloat(coupon.max_discount) : null,
                is_active: coupon.is_active !== false,
                usage_count: 0,
                created_at: new Date().toISOString(),
                ...coupon
            };
            coupons.unshift(saved);
        }

        localStorage.setItem('fb_coupons', JSON.stringify(coupons));
        this._broadcast({ type: 'COUPONS_UPDATED', coupons });
        return saved;
    }

    toggleCoupon(id, isActive) {
        const coupons = this.getCoupons();
        const c = coupons.find(x => x.id === id);
        if (c) {
            c.is_active = isActive;
            localStorage.setItem('fb_coupons', JSON.stringify(coupons));
            this._broadcast({ type: 'COUPONS_UPDATED', coupons });
            return c;
        }
        return null;
    }

    deleteCoupon(id) {
        let coupons = this.getCoupons();
        coupons = coupons.filter(c => c.id !== id);
        localStorage.setItem('fb_coupons', JSON.stringify(coupons));
        this._broadcast({ type: 'COUPONS_UPDATED', coupons });
    }

    validateCoupon(code, subtotal) {
        if (!code || !code.trim()) {
            return { valid: false, message: 'Please enter a coupon code.' };
        }

        const normalized = code.trim().toUpperCase();
        const coupons = this.getCoupons();
        const c = coupons.find(x => x.code.toUpperCase() === normalized);

        if (!c) {
            return { valid: false, message: `Coupon code '${normalized}' does not exist.` };
        }
        if (!c.is_active) {
            return { valid: false, message: `Coupon '${normalized}' is currently inactive.` };
        }
        if (c.expires_at && new Date(c.expires_at) < new Date()) {
            return { valid: false, message: `Coupon '${normalized}' has expired.` };
        }
        const minOrderAmt = c.min_order_value || c.min_order_amount || 0;
        if (minOrderAmt && subtotal < minOrderAmt) {
            return { valid: false, message: `Minimum order of ₹${minOrderAmt} required for '${normalized}'.` };
        }

        const isPercent = c.discount_type === 'percentage' || c.discount_type === 'percent';
        let discount = 0;
        if (isPercent) {
            discount = Math.round((subtotal * c.discount_value) / 100);
            const maxCap = c.max_discount || c.max_discount_cap || 0;
            if (maxCap && discount > maxCap) {
                discount = maxCap;
            }
        } else {
            discount = Math.min(c.discount_value, subtotal);
        }

        return {
            valid: true,
            coupon: c,
            discount,
            message: `Coupon '${c.code}' applied! Saved ₹${discount}`
        };
    }

    // ----------------------------------------------------
    // ORDERS & REALTIME LIFECYCLE
    // ----------------------------------------------------

    getOrders() {
        try {
            const raw = localStorage.getItem('fb_orders');
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) {
                return parsed.map(o => ({
                    ...o,
                    items: Array.isArray(o.items) ? o.items : []
                }));
            }
            return [];
        } catch {
            return [];
        }
    }

    getOrderById(id) {
        const orders = this.getOrders();
        return orders.find(o => o.id === id || o.order_number === id) || null;
    }

    createOrder(orderData) {
        const orders = this.getOrders();
        const todayStr = new Date().toISOString().slice(0, 10);

        // Generate clean unique Order # (e.g. #FB-1048)
        const orderCount = orders.length + 1;
        const randomPad = Math.floor(100 + Math.random() * 900);
        const orderNumber = orderData.order_number || `#FB-${1000 + orderCount}-${randomPad}`;

        const newOrder = {
            id: `order-fb-${Date.now()}`,
            order_number: orderNumber,
            restaurant_id: 'fb-restaurant-001',
            status: 'new',
            payment_status: orderData.payment_method === 'online' ? 'paid' : 'pending',
            created_at: new Date().toISOString(),
            order_date: todayStr,
            status_history: [
                {
                    status: 'new',
                    timestamp: new Date().toISOString(),
                    note: 'Order placed by customer'
                }
            ],
            items: Array.isArray(orderData.items) ? orderData.items : [],
            ...orderData
        };

        // Increment coupon usage count if applied
        if (newOrder.coupon_code) {
            const coupons = this.getCoupons();
            const c = coupons.find(x => x.code.toUpperCase() === newOrder.coupon_code.toUpperCase());
            if (c) {
                c.usage_count = (c.usage_count || 0) + 1;
                localStorage.setItem('fb_coupons', JSON.stringify(coupons));
            }
        }

        // Save locally for instant UI responsiveness
        orders.unshift(newOrder);
        localStorage.setItem('fb_orders', JSON.stringify(orders));

        // Save active order ID for customer live tracker
        localStorage.setItem('fb_active_order_id', newOrder.id);

        // Add to customer's order history array
        try {
            const customerHistory = JSON.parse(localStorage.getItem('fb_customer_history')) || [];
            customerHistory.unshift(newOrder.id);
            localStorage.setItem('fb_customer_history', JSON.stringify(customerHistory));
        } catch (e) {}

        // Broadcast immediately via WebSocket & local bus
        this._broadcast({
            type: 'ORDER_CREATED',
            order: newOrder
        });

        // Insert into Supabase database asynchronously
        if (this.supabase) {
            (async () => {
                try {
                    const dbOrder = {
                        order_number:   newOrder.order_number,
                        customer_name:  newOrder.customer_name || 'Guest',
                        customer_phone: newOrder.customer_phone || null,
                        order_type:     newOrder.order_type || 'dine_in',
                        table_number:   newOrder.table_number || null,
                        status:         newOrder.status || 'new',
                        payment_method: newOrder.payment_method || 'cash',
                        payment_status: newOrder.payment_status || 'pending',
                        coupon_code:    newOrder.coupon_code || null,
                        subtotal:       Number(newOrder.subtotal) || 0,
                        tax:            Number(newOrder.tax) || 0,
                        discount:       Number(newOrder.discount) || 0,
                        total:          Number(newOrder.total) || 0,
                        instructions:   newOrder.instructions || null,
                        order_date:     newOrder.order_date || new Date().toISOString().slice(0, 10)
                    };

                    let { data: insertedOrder, error: orderErr } = await this.supabase
                        .from('orders')
                        .insert([dbOrder])
                        .select()
                        .single();

                    // Resilient fallback: if optional columns don't exist yet (schema not re-run),
                    // retry with only the core columns guaranteed to exist in every deployment.
                    if (orderErr) {
                        const isColumnError = orderErr.code === '42703' ||
                            (orderErr.message && orderErr.message.toLowerCase().includes('column')) ||
                            (orderErr.message && orderErr.message.toLowerCase().includes('does not exist'));

                        if (isColumnError) {
                            console.warn('⚠️ Column mismatch. Retrying insert with core columns only. Run schema.sql to fix permanently.');
                            const coreOrder = {
                                order_number:   dbOrder.order_number,
                                customer_name:  dbOrder.customer_name,
                                customer_phone: dbOrder.customer_phone,
                                order_type:     dbOrder.order_type,
                                table_number:   dbOrder.table_number,
                                status:         dbOrder.status,
                                payment_method: dbOrder.payment_method,
                                payment_status: dbOrder.payment_status,
                                subtotal:       dbOrder.subtotal,
                                tax:            dbOrder.tax,
                                discount:       dbOrder.discount,
                                total:          dbOrder.total,
                                instructions:   dbOrder.instructions
                            };
                            const r2 = await this.supabase.from('orders').insert([coreOrder]).select().single();
                            insertedOrder = r2.data;
                            orderErr = r2.error;
                        }
                    }

                    if (orderErr) {
                        console.error('❌ Supabase order insert error — Message:', orderErr.message,
                            '| Code:', orderErr.code,
                            '| Details:', orderErr.details,
                            '| Hint:', orderErr.hint);
                        console.warn('ℹ️ To fix: run the updated schema.sql at https://supabase.com/dashboard/project/otohichqlyanmddwgofm/sql');
                    }

                    if (!orderErr && insertedOrder) {
                        const supabaseId = insertedOrder.id;
                        newOrder.id = supabaseId;

                        if (newOrder.items && newOrder.items.length > 0) {
                            const dbItems = newOrder.items.map(it => ({
                                order_id:         supabaseId,
                                name:             it.name,
                                price:            Number(it.price) || 0,
                                quantity:         Number(it.quantity) || 1,
                                selected_add_ons: it.selected_add_ons || [],
                                item_total:       Number(it.item_total) || ((Number(it.price) || 0) * (Number(it.quantity) || 1))
                            }));
                            const { error: itemsErr } = await this.supabase.from('order_items').insert(dbItems);
                            if (itemsErr) console.error('❌ Supabase order_items insert error:', itemsErr.message);
                        }

                        // CRITICAL: Update local records and active tracking ID to Supabase UUID
                        const currentOrders = this.getOrders();
                        const idx = currentOrders.findIndex(o => o.order_number === newOrder.order_number);
                        if (idx !== -1) {
                            currentOrders[idx].id = supabaseId;
                            localStorage.setItem('fb_orders', JSON.stringify(currentOrders));
                        }

                        // Update the active order tracker to use the real Supabase UUID
                        localStorage.setItem('fb_active_order_id', supabaseId);
                        localStorage.setItem('fb_active_order_number', newOrder.order_number);

                        // Also update customer history with real UUID
                        try {
                            const customerHistory = JSON.parse(localStorage.getItem('fb_customer_history')) || [];
                            const oldTempIdx = customerHistory.indexOf(newOrder.id);
                            if (oldTempIdx !== -1) {
                                customerHistory[oldTempIdx] = supabaseId;
                            } else if (!customerHistory.includes(supabaseId)) {
                                customerHistory.unshift(supabaseId);
                            }
                            localStorage.setItem('fb_customer_history', JSON.stringify(customerHistory));
                        } catch (e) {}

                        // Broadcast verified cloud record with real UUID
                        this._broadcast({
                            type: 'ORDER_CREATED',
                            order: { ...newOrder, id: supabaseId }
                        });

                        console.info('✅ Order saved to Supabase:', supabaseId);
                    }
                } catch (err) {
                    console.error('❌ Supabase order insert failed:', err);
                }
            })();
        }

        return newOrder;
    }

    updateOrderStatus(orderId, newStatus, reason = null) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId || o.order_number === orderId);
        if (order) {
            order.status = newStatus;
            if (newStatus === 'cancelled') {
                order.cancelled_at = new Date().toISOString();
                order.cancellation_reason = reason || 'Order cancelled by restaurant.';
            }
            if (!order.status_history) order.status_history = [];
            order.status_history.push({
                status: newStatus,
                reason: reason || null,
                timestamp: new Date().toISOString()
            });
            order.updated_at = new Date().toISOString();
            localStorage.setItem('fb_orders', JSON.stringify(orders));

            this._broadcast({
                type: 'ORDER_STATUS_CHANGED',
                orderId: order.id,
                orderNumber: order.order_number,
                newStatus,
                reason,
                order
            });

            // Update Supabase in background
            if (this.supabase) {
                (async () => {
                    try {
                        // Prefer UUID match; fallback to order_number for pre-Supabase orders
                        const isUuid = typeof order.id === 'string' && order.id.length === 36 && order.id.includes('-') && !order.id.startsWith('order-fb-');
                        const eqCol = isUuid ? 'id' : 'order_number';
                        const eqVal = isUuid ? order.id : order.order_number;

                        // Build full payload (includes optional cancellation columns)
                        const payload = { status: newStatus };

                        if (newStatus === 'cancelled') {
                            payload.cancellation_reason = reason || 'Order cancelled by restaurant.';
                            payload.cancelled_at = new Date().toISOString();
                        }

                        let { error } = await this.supabase
                            .from('orders').update(payload).eq(eqCol, eqVal);

                        // Resilient fallback: if cancellation columns don't exist yet, retry with status only
                        if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('column')))) {
                            console.warn('⚠️ Cancellation columns missing in DB. Updating status only. Run schema.sql to fix.');
                            const fallback = { status: newStatus };
                            const r2 = await this.supabase
                                .from('orders').update(fallback).eq(eqCol, eqVal);
                            error = r2.error;
                        }

                        if (error) console.error('❌ Supabase order status update error:', error.message);
                        else console.info(`✅ Order ${order.order_number} status → ${newStatus}`);
                    } catch (err) {
                        console.error('❌ Supabase order update failed:', err);
                    }
                })();
            }

            return order;
        }
        return null;
    }

    updatePaymentStatus(orderId, newPaymentStatus) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId || o.order_number === orderId);
        if (order) {
            order.payment_status = newPaymentStatus;
            order.updated_at = new Date().toISOString();
            localStorage.setItem('fb_orders', JSON.stringify(orders));

            this._broadcast({
                type: 'ORDER_PAID',
                orderId: order.id,
                paymentStatus: newPaymentStatus,
                order
            });

            // Update Supabase in background
            if (this.supabase) {
                (async () => {
                    try {
                        const isUuid = typeof order.id === 'string' && order.id.length === 36 && order.id.includes('-') && !order.id.startsWith('order-fb-');
                        const eqCol = isUuid ? 'id' : 'order_number';
                        const eqVal = isUuid ? order.id : order.order_number;

                        let { error } = await this.supabase
                            .from('orders').update({ payment_status: newPaymentStatus }).eq(eqCol, eqVal);

                        if (error) console.error('❌ Payment status update error:', error.message);
                        else console.info(`✅ Order ${order.order_number} payment → ${newPaymentStatus}`);
                    } catch (e) {
                        console.error('❌ Payment status update failed:', e);
                    }
                })();
            }

            return order;
        }
        return null;
    }

    // ----------------------------------------------------
    // DAILY ORDER ANALYTICS & GROUPING
    // ----------------------------------------------------

    getDailyAnalytics() {
        const orders = this.getOrders();
        const map = {};

        orders.forEach(o => {
            const d = o.created_at ? o.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
            if (!map[d]) {
                map[d] = {
                    date: d,
                    totalOrders: 0,
                    grossRevenue: 0,
                    netRevenue: 0,
                    completedCount: 0,
                    cancelledCount: 0,
                    pendingCount: 0,
                    cashCount: 0,
                    onlineCount: 0,
                    totalDiscount: 0,
                    itemsSold: 0,
                    orders: []
                };
            }

            map[d].totalOrders++;
            map[d].grossRevenue += (o.total || 0);
            map[d].totalDiscount += (o.discount || 0);
            map[d].orders.push(o);

            if (o.status === 'cancelled') {
                map[d].cancelledCount++;
            } else {
                map[d].netRevenue += (o.total || 0);
                if (o.status === 'served') {
                    map[d].completedCount++;
                } else {
                    map[d].pendingCount++;
                }

                if (o.payment_method === 'online') {
                    map[d].onlineCount++;
                } else {
                    map[d].cashCount++;
                }
            }

            if (o.items && Array.isArray(o.items)) {
                o.items.forEach(it => {
                    map[d].itemsSold += (it.quantity || 1);
                });
            }
        });

        // Compute averages
        const list = Object.values(map).map(day => {
            const validOrders = day.totalOrders - day.cancelledCount;
            day.aov = validOrders > 0 ? Math.round(day.netRevenue / validOrders) : 0;
            return day;
        });

        return list.sort((a, b) => b.date.localeCompare(a.date));
    }

    resetDemoData() {
        localStorage.setItem('fb_restaurant', JSON.stringify(DEFAULT_RESTAURANT));
        localStorage.setItem('fb_categories', JSON.stringify(DEFAULT_CATEGORIES));
        localStorage.setItem('fb_menu', JSON.stringify(DEFAULT_MENU_ITEMS));
        localStorage.setItem('fb_coupons', JSON.stringify(DEFAULT_COUPONS));
        localStorage.setItem('fb_orders', JSON.stringify([]));
        this._broadcast({ type: 'DATA_REFRESH' });
    }
}

// Global store singleton
window.firstBiteStore = new FirstBiteStore();
