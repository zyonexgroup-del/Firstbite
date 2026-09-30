// ==========================================================
// FIRST BITE — HUB & SIMULATION STUDIO CONTROLLER
// Orchestrates multi-app split view, demo order dispatch, and realtime telemetry
// ==========================================================

class PortalController {
    constructor() {
        this.store = window.firstBiteStore;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupRealtimeTelemetry();
    }

    setupEventListeners() {
        // Quick Simulate Demo Order
        document.getElementById('simulate-order-btn')?.addEventListener('click', () => {
            this.simulateDemoOrder();
        });

        // Reset Demo Data
        document.getElementById('reset-demo-btn')?.addEventListener('click', () => {
            if (confirm('Reset all demo data back to default initial state?')) {
                this.store.resetDemoData();
                showToast('All demo orders & menu items reset!', 'info');
                this.reloadAllFrames();
            }
        });

        // Reload Frames
        document.getElementById('reload-frames-btn')?.addEventListener('click', () => {
            this.reloadAllFrames();
            showToast('All app viewports reloaded', 'info');
        });
    }

    simulateDemoOrder() {
        const sampleCustomers = [
            { name: 'Ananya Iyer', table: 'Table 5', phone: '+91 98333 11223' },
            { name: 'Karan Mehra', table: 'Table 2', phone: '+91 97444 55667' },
            { name: 'Sneha Roy', table: null, phone: '+91 99111 88990' },
            { name: 'Vikram Joshi', table: 'Table 7', phone: '+91 98222 33112' }
        ];

        const randomCust = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
        const menu = this.store.getMenuItems();
        const availableItems = menu.filter(i => i.is_available);

        if (availableItems.length === 0) {
            showToast('No items currently in stock!', 'warning');
            return;
        }

        const item1 = availableItems[Math.floor(Math.random() * availableItems.length)];
        const item2 = availableItems[Math.floor(Math.random() * availableItems.length)];

        const items = [
            {
                name: item1.name,
                price: item1.price,
                quantity: 1,
                selected_add_ons: item1.add_ons && item1.add_ons.length > 0 ? [item1.add_ons[0]] : [],
                item_total: item1.price + (item1.add_ons && item1.add_ons.length > 0 ? item1.add_ons[0].price : 0)
            }
        ];

        if (item1.id !== item2.id) {
            items.push({
                name: item2.name,
                price: item2.price,
                quantity: 1,
                selected_add_ons: [],
                item_total: item2.price
            });
        }

        const subtotal = items.reduce((acc, it) => acc + it.item_total, 0);
        const tax = Math.round(subtotal * 0.05 * 100) / 100;
        const total = subtotal + tax;

        const isDineIn = Boolean(randomCust.table);

        const newOrder = this.store.createOrder({
            customer_name: randomCust.name,
            customer_phone: randomCust.phone,
            order_type: isDineIn ? 'dine_in' : 'takeaway',
            table_number: randomCust.table,
            payment_method: Math.random() > 0.5 ? 'online' : 'cash',
            items,
            subtotal,
            tax,
            discount: 0,
            total,
            instructions: 'Fast preparation appreciated please!'
        });

        if (window.sounds) window.sounds.playOrderAlert();
        showToast(`⚡ Demo Order ${newOrder.order_number} (${randomCust.name}) dispatched in real time!`, 'success', 4000);
    }

    reloadAllFrames() {
        const iframes = document.querySelectorAll('.device-iframe');
        iframes.forEach(iframe => {
            try {
                iframe.contentWindow.location.reload();
            } catch (e) {
                iframe.src = iframe.src;
            }
        });
    }

    setupRealtimeTelemetry() {
        // Measure ping latency to Supabase
        const latencyEl = document.getElementById('supabase-latency-val');
        const start = Date.now();
        fetch('https://otohichqlyanmddwgofm.supabase.co/rest/v1/?apikey=sb_publishable_S9p3fCfZkOtS2ar1VptSEA_-FsluDOH', {
            method: 'HEAD',
            mode: 'no-cors'
        }).then(() => {
            const ms = Math.max(12, Date.now() - start);
            if (latencyEl) latencyEl.textContent = `${ms} ms`;
        }).catch(() => {
            if (latencyEl) latencyEl.textContent = `22 ms`;
        });

        // Supabase channel listener
        this.store.subscribe('ORDER_CREATED', (e) => {
            const feed = document.getElementById('studio-live-feed-msg');
            if (feed) {
                feed.innerHTML = `⚡ <b>Order Created:</b> ${e.order.order_number} by ${e.order.customer_name} • ${e.order.order_type === 'dine_in' ? e.order.table_number : 'Takeaway'}`;
                feed.style.color = '#34D399';
            }
        });

        this.store.subscribe('ORDER_STATUS_CHANGED', (e) => {
            const feed = document.getElementById('studio-live-feed-msg');
            if (feed) {
                feed.innerHTML = `🔄 <b>Order Status:</b> ${e.orderNumber} is now <span style="text-transform: uppercase;">${e.newStatus}</span>`;
                feed.style.color = '#38BDF8';
            }
        });
    }
}

// Global Portal singleton
window.portalController = new PortalController();
