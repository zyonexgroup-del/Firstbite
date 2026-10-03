// ==========================================================
// FIRST BITE — ADMIN CONTROLLER (Full Rewrite)
// Image Upload, Category CRUD, Date-Range Analytics, Menu CRUD
// ==========================================================

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

class AdminApp {
    constructor() {
        this.store = window.firstBiteStore;
        this.currentView = 'dashboard';

        // Orders page state
        this.orderFilterStatus = 'all';
        this.orderSearchQuery  = '';

        // Menu page state
        this.menuSearchQuery = '';
        this.editingDishId   = null;
        this.uploadedImageB64 = null;  // base64 from file upload

        // Analytics date range
        this.analyticsRange = 'today';   // today | yesterday | week | month | last_month | custom
        this.customDateFrom = '';
        this.customDateTo   = '';

        // Category editing
        this.editingCatId = null;

        // Coupon editing
        this.editingCouponId = null;

        // Deduplication set for alerts
        this.alertedOrders = new Set();

        this.init();
    }

    init() {
        this.checkAdminAuth();
        this.renderRestaurantInfo();
        this.renderDashboard();
        this.renderOrdersTable();
        this.renderMenuTable();
        this.renderCategoriesList();
        this.renderCouponsList();
        this.renderStaffList();
        this.renderSettingsForm();
        this.setupEventListeners();
        this.setupRealtimeListeners();

        // Sync fresh data from Supabase on load
        if (this.store && this.store.syncAllFromSupabase) {
            this.store.syncAllFromSupabase().then(() => {
                this.renderDashboard();
                this.renderOrdersTable();
                this.renderMenuTable();
                this.renderRestaurantInfo();
            }).catch(e => console.warn('Admin Supabase sync on init:', e));

            // Continuous 10s auto-refresh so Admin stats & orders stay live across devices
            setInterval(() => {
                this.store.syncAllFromSupabase().catch(() => {});
            }, 10000);
        }
    }

    renderRestaurantInfo() {
        const r = this.store.getRestaurant();
        const el1 = document.getElementById('admin-restaurant-name');
        const el2 = document.getElementById('admin-restaurant-tagline');
        if (el1) el1.textContent = r.name;
        if (el2) el2.textContent = r.tagline;

        const qrRes = document.getElementById('qr-preview-resname');
        if (qrRes) qrRes.textContent = r.name;

        const btn = document.getElementById('admin-kitchen-toggle-btn');
        const text = document.getElementById('admin-kitchen-text');
        const dot = document.getElementById('admin-kitchen-dot');
        const isOpen = r.is_open !== false;
        if (btn) {
            btn.style.background = isOpen ? '#ECFDF5' : '#FEE2E2';
            btn.style.color = isOpen ? '#065F46' : '#991B1B';
            btn.style.borderColor = isOpen ? '#A7F3D0' : '#FECACA';
        }
        if (text) text.textContent = isOpen ? 'Kitchen Open' : 'Kitchen Closed';
        if (dot) dot.style.background = isOpen ? '#10B981' : '#EF4444';
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD & ANALYTICS
    // ═══════════════════════════════════════════════════════════

    _getDateRange() {
        const now = new Date();

        switch (this.analyticsRange) {
            case 'today': {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                return { from: start, to: end };
            }
            case 'yesterday': {
                const yDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                const start = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 0, 0, 0, 0);
                const end   = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 23, 59, 59, 999);
                return { from: start, to: end };
            }
            case 'week': {
                const dow   = now.getDay();
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow, 0, 0, 0, 0);
                const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                return { from: start, to: end };
            }
            case 'month': {
                const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return { from: start, to: end };
            }
            case 'last_month': {
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
                const end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                return { from: start, to: end };
            }
            case 'custom': {
                const from = this.customDateFrom ? new Date(this.customDateFrom + 'T00:00:00') : new Date(0);
                const to   = this.customDateTo   ? new Date(this.customDateTo + 'T23:59:59.999') : new Date();
                return { from, to };
            }
            case 'all':
            default:
                return { from: new Date(0), to: new Date(8640000000000000) };
        }
    }

    _filterOrdersByRange(orders) {
        const { from, to } = this._getDateRange();
        return orders.filter(o => {
            let orderDate = null;
            if (o.created_at) {
                orderDate = new Date(o.created_at);
            } else if (o.order_date) {
                orderDate = new Date(o.order_date + 'T12:00:00');
            }
            if (!orderDate || isNaN(orderDate.getTime())) return false;
            return orderDate >= from && orderDate <= to;
        });
    }

    renderDashboard() {
        const allOrders     = this.store.getOrders();
        const orders        = this._filterOrdersByRange(allOrders);
        const restaurant    = this.store.getRestaurant();
        const currency      = restaurant.currency || '₹';

        let totalSales = 0, completedCount = 0, pendingCount = 0;
        orders.forEach(o => {
            if (o.status !== 'cancelled') totalSales += (Number(o.total) || 0);
            if (o.status === 'served')    completedCount++;
            if (['new','accepted','preparing','ready'].includes(o.status)) pendingCount++;
        });

        const totalCount = orders.length;
        const aov = totalCount > 0 ? Math.round(totalSales / totalCount) : 0;

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('metric-sales',     formatCurrency(totalSales, currency));
        set('metric-orders',    totalCount);
        set('metric-pending',   pendingCount);
        set('metric-completed', completedCount);
        set('metric-aov',       formatCurrency(aov, currency));

        this.renderSalesChart(allOrders);
        this.renderTopItems(orders, currency);
        this.renderDailyAnalytics();
    }

    renderSalesChart(orders) {
        const canvas = document.getElementById('sales-canvas');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx    = canvas.getContext('2d');
        if (!ctx) return;
        const width  = canvas.width  = (canvas.parentElement && canvas.parentElement.clientWidth) || 600;
        const height = canvas.height = 220;

        ctx.clearRect(0, 0, width, height);

        // Build last 7 days labels & real totals from actual order records
        const days   = [];
        const values = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const label = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            const dayTotal = orders
                .filter(o => {
                    if (o.status === 'cancelled') return false;
                    const od = o.created_at ? new Date(o.created_at) : (o.order_date ? new Date(o.order_date + 'T12:00:00') : null);
                    return od && !isNaN(od.getTime()) && od >= start && od <= end;
                })
                .reduce((s, o) => s + (Number(o.total) || 0), 0);
            days.push(label);
            values.push(dayTotal);
        }

        const padding    = 40;
        const chartWidth = width  - padding * 2;
        const chartHeight= height - padding * 2;
        const maxVal     = Math.max(...values, 1000) * 1.15;

        // Grid lines
        ctx.strokeStyle = '#F1F5F9'; ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
        }

        const stepX = chartWidth / (days.length - 1);
        const points = values.map((v, i) => ({
            x: padding + i * stepX,
            y: padding + chartHeight - (v / maxVal) * chartHeight
        }));

        // Gradient fill
        const grad = ctx.createLinearGradient(0, padding, 0, height - padding);
        grad.addColorStop(0,   'rgba(8, 127, 91, 0.28)');
        grad.addColorStop(1,   'rgba(8, 127, 91, 0.0)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const mx = (points[i-1].x + points[i].x) / 2;
            const my = (points[i-1].y + points[i].y) / 2;
            ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, mx, my);
        }
        ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
        ctx.lineTo(points[points.length-1].x, height - padding);
        ctx.lineTo(points[0].x, height - padding);
        ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const mx = (points[i-1].x + points[i].x) / 2;
            const my = (points[i-1].y + points[i].y) / 2;
            ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, mx, my);
        }
        ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
        ctx.strokeStyle = '#087F5B'; ctx.lineWidth = 3; ctx.stroke();

        // Points & labels
        points.forEach((pt, i) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFF'; ctx.fill();
            ctx.strokeStyle = '#087F5B'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.fillStyle = '#64748B';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(days[i], pt.x, height - 10);
        });
    }

    renderTopItems(orders, currency) {
        const container = document.getElementById('dashboard-top-items');
        if (!container) return;

        const stats = {};
        orders.forEach(o => {
            if (o.status !== 'cancelled') {
                const items = Array.isArray(o.items) ? o.items : [];
                items.forEach(it => {
                    if (!stats[it.name]) stats[it.name] = { qty: 0, revenue: 0 };
                    stats[it.name].qty     += (it.quantity || 1);
                    stats[it.name].revenue += (it.item_total || ((it.price || 0) * (it.quantity || 1)));
                });
            }
        });

        const sorted = Object.entries(stats)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5);

        if (!sorted.length) {
            container.innerHTML = `<div style="color:var(--text-muted);padding:20px 0;text-align:center;font-size:13px;">No orders in selected period</div>`;
            return;
        }

        container.innerHTML = sorted.map(([name, s], i) => `
            <div class="top-item-row">
                <div class="top-item-left">
                    <span class="item-rank-num">#${i+1}</span>
                    <div>
                        <div class="top-item-name">${name}</div>
                        <div class="top-item-orders">${s.qty} units sold</div>
                    </div>
                </div>
                <div class="top-item-revenue">${formatCurrency(s.revenue, currency)}</div>
            </div>
        `).join('');
    }

    renderDailyAnalytics() {
        const tbody = document.getElementById('daily-analytics-tbody');
        if (!tbody) return;

        const data = this.store.getDailyAnalytics ? this.store.getDailyAnalytics() : [];
        const currency = this.store.getRestaurant().currency || '₹';

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">No data yet — orders will appear here once placed.</td></tr>`;
            return;
        }

        // Compute cash/online revenue from order-level data
        tbody.innerHTML = data.map(row => {
            const cashRev = row.orders
                ? row.orders.filter(o => o.status !== 'cancelled' && o.payment_method !== 'online').reduce((s,o)=>s+o.total,0)
                : 0;
            const onlineRev = row.orders
                ? row.orders.filter(o => o.status !== 'cancelled' && o.payment_method === 'online').reduce((s,o)=>s+o.total,0)
                : 0;
            return `
            <tr>
                <td><b>${row.date}</b></td>
                <td>${row.totalOrders}</td>
                <td style="color:#15803D;font-weight:700;">${row.completedCount}</td>
                <td style="color:#DC2626;font-weight:700;">${row.cancelledCount}</td>
                <td>${formatCurrency(row.grossRevenue, currency)}</td>
                <td><b style="color:var(--primary);">${formatCurrency(row.netRevenue, currency)}</b></td>
                <td style="font-size:12px;color:var(--text-secondary);">${formatCurrency(cashRev, currency)}</td>
                <td style="font-size:12px;color:var(--text-secondary);">${formatCurrency(onlineRev, currency)}</td>
                <td>${formatCurrency(row.aov, currency)}</td>
            </tr>`;
        }).join('');
    }

    // ═══════════════════════════════════════════════════════════
    // ORDERS MASTER LOG + RECEIPT
    // ═══════════════════════════════════════════════════════════

    renderOrdersTable() {
        const container = document.getElementById('orders-table-tbody');
        if (!container) return;

        const allOrders = this.store.getOrders();
        const currency  = this.store.getRestaurant().currency || '₹';

        const filtered = allOrders.filter(o => {
            if (this.orderFilterStatus !== 'all' && o.status !== this.orderFilterStatus) return false;
            if (this.orderSearchQuery) {
                const q = this.orderSearchQuery.toLowerCase();
                return o.order_number.toLowerCase().includes(q) ||
                    (o.customer_name && o.customer_name.toLowerCase().includes(q));
            }
            return true;
        });

        if (!filtered.length) {
            container.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">No matching orders found</td></tr>`;
            return;
        }

        const statusColors = {
            new:       'badge-amber',
            accepted:  'badge-blue',
            preparing: 'badge-blue',
            ready:     'badge-green',
            served:    'badge-gray',
            cancelled: 'badge-red'
        };

        const statusLabel = (s) => s === 'cancelled' ? '✕ Cancelled' : s.charAt(0).toUpperCase() + s.slice(1);

        container.innerHTML = filtered.map(o => `
            <tr>
                <td><b style="font-family:monospace;">${o.order_number}</b></td>
                <td>
                    <div style="font-weight:700;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                        ${o.customer_name}
                        ${o.is_verified || o.customer_phone ? `<span class="badge badge-green" style="font-size:9.5px;padding:2px 5px;" title="Customer verified">✓ Verified</span>` : ''}
                    </div>
                    <div style="font-size:11.5px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;margin-top:2px;">
                        ${o.customer_phone ? `<span>${o.customer_phone}</span> <a href="tel:${o.customer_phone}" style="color:#2563EB;text-decoration:none;font-weight:700;">📞 Call</a>` : 'Walk-in / N/A'}
                    </div>
                </td>
                <td>
                    <span class="badge ${o.order_type === 'dine_in' ? 'badge-blue' : 'badge-amber'}">
                        ${o.order_type === 'dine_in' ? `🍽️ ${o.table_number || 'Dine-in'}` : '🛍️ Takeaway'}
                    </span>
                </td>
                <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${(Array.isArray(o.items) ? o.items : []).map(i => `${i.quantity || 1}× ${i.name}`).join(', ') || 'No items'}
                </td>
                <td>
                    <span class="badge ${statusColors[o.status] || 'badge-gray'}" style="text-transform:capitalize;">
                        ${statusLabel(o.status)}
                    </span>
                    ${o.status === 'cancelled' && o.cancellation_reason ? `<div style="font-size:10.5px;color:#DC2626;margin-top:2px;">${o.cancellation_reason}</div>` : ''}
                </td>
                <td>
                    <b>${formatCurrency(o.total, currency)}</b>
                    <span class="badge ${o.payment_status === 'paid' ? 'badge-green' : 'badge-amber'}" style="font-size:10px;margin-left:4px;">
                        ${o.payment_status}
                    </span>
                </td>
                <td>
                    ${o.coupon_code ? `<span class="badge badge-green" style="font-size:10px;display:block;margin-bottom:3px;">🎟️ ${o.coupon_code}</span>` : ''}
                    <button class="table-action-btn" onclick="window.adminApp.openReceiptModal('${o.id}')">🧾 Receipt</button>
                </td>
            </tr>
        `).join('');
    }

    openReceiptModal(orderId) {
        const order      = this.store.getOrderById(orderId);
        const restaurant = this.store.getRestaurant();
        if (!order) return;
        const currency = restaurant.currency || '₹';

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('receipt-rest-name',    restaurant.name);
        set('receipt-rest-address', restaurant.address);
        set('receipt-rest-phone',   `Tel: ${restaurant.phone}`);
        set('receipt-order-no',     `ORDER: ${order.order_number}`);
        set('receipt-date-time',    new Date(order.created_at).toLocaleString());
        set('receipt-customer',     `Customer: ${order.customer_name} (${order.order_type === 'dine_in' ? order.table_number || 'Dine-in' : 'Takeaway'})`);

        const items = Array.isArray(order.items) ? order.items : [];
        document.getElementById('receipt-items-rows').innerHTML = items.map(it => `
            <div class="receipt-item-row">
                <span>${it.quantity || 1}× ${it.name}</span>
                <span>${formatCurrency(it.item_total || ((it.price || 0) * (it.quantity || 1)), currency)}</span>
            </div>
        `).join('');

        set('receipt-subtotal',    formatCurrency(order.subtotal, currency));
        set('receipt-tax',         formatCurrency(order.tax, currency));
        set('receipt-discount',    `- ${formatCurrency(order.discount || 0, currency)}`);
        set('receipt-grand-total', formatCurrency(order.total, currency));

        document.getElementById('receipt-modal').classList.add('active');
    }

    closeReceiptModal()  { document.getElementById('receipt-modal').classList.remove('active'); }
    printReceipt()       { window.print(); }

    // ═══════════════════════════════════════════════════════════
    // MENU CRUD
    // ═══════════════════════════════════════════════════════════

    renderMenuTable() {
        const container  = document.getElementById('menu-table-tbody');
        if (!container) return;

        const menu       = this.store.getMenuItems();
        const categories = this.store.getCategories();
        const catMap     = {};
        categories.forEach(c => {
            const label = `${c.icon || '🍽️'} ${c.name}`;
            if (c.id) catMap[c.id] = label;
            if (c.cloud_id) catMap[c.cloud_id] = label;
            if (c.name) catMap[c.name.trim().toLowerCase()] = label;
        });
        const currency   = this.store.getRestaurant().currency || '₹';

        const filtered = menu.filter(item => {
            if (!this.menuSearchQuery) return true;
            const q = this.menuSearchQuery.toLowerCase();
            return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
        });

        if (!filtered.length) {
            container.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No items match your search</td></tr>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            // Decide which src to show — base64 data URL, http URL, or placeholder
            const imgSrc = item.image_url && item.image_url.startsWith('data:')
                ? item.image_url
                : (item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=80&q=60');

            const itemCatLabel = catMap[item.category_id] || (item.category_id && catMap[item.category_id.toLowerCase()]) || 'General';

            return `
            <tr>
                <td>
                    <img src="${imgSrc}" alt="${item.name}"
                        style="width:52px;height:52px;border-radius:10px;object-fit:cover;border:1px solid var(--border-light);"
                        onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=80&q=60'">
                </td>
                <td>
                    <div style="font-weight:700;">${item.name}</div>
                    <div style="font-size:11.5px;color:var(--text-secondary);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${item.description || ''}
                    </div>
                </td>
                <td>
                    <span class="diet-icon ${item.is_veg ? 'veg' : 'non-veg'}"></span>
                    <span style="font-size:12px;margin-left:4px;font-weight:600;">${itemCatLabel}</span>
                </td>
                <td><b>${formatCurrency(item.price, currency)}</b></td>
                <td>
                    <label class="stock-toggle-switch" style="width:40px;height:22px;">
                        <input type="checkbox" ${item.is_available ? 'checked' : ''} onchange="window.adminApp.toggleStock('${item.id}', this.checked)">
                        <span class="slider-round"></span>
                    </label>
                </td>
                <td>
                    <div style="display:flex;gap:6px;">
                        <button class="table-action-btn" onclick="window.adminApp.openEditDishModal('${item.id}')">✏️ Edit</button>
                        <button class="table-action-btn" style="color:#DC2626;" onclick="window.adminApp.deleteDish('${item.id}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    toggleStock(itemId, isAvailable) {
        this.store.toggleItemAvailability(itemId, isAvailable);
        showToast(`Stock: ${isAvailable ? 'In Stock ✓' : 'Out of Stock (86)'}`, 'info');
    }

    // IMAGE UPLOAD HELPER ─────────────────────────────────────

    _setupImageUploader() {
        this.uploadedImageB64 = null;
        const fileInput    = document.getElementById('dish-img-file');
        const urlInput     = document.getElementById('dish-img');
        const preview      = document.getElementById('dish-img-preview');
        const switchToFile = document.getElementById('switch-to-upload');
        const switchToUrl  = document.getElementById('switch-to-url');
        const fileArea     = document.getElementById('img-file-area');
        const urlArea      = document.getElementById('img-url-area');

        const showPreview = (src) => {
            if (!preview) return;
            if (src) {
                preview.src = src;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        };

        if (switchToFile) {
            switchToFile.onclick = () => {
                fileArea.style.display = 'block';
                urlArea.style.display  = 'none';
            };
        }
        if (switchToUrl) {
            switchToUrl.onclick = () => {
                fileArea.style.display = 'none';
                urlArea.style.display  = 'block';
            };
        }

        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.uploadedImageB64 = ev.target.result;
                    showPreview(this.uploadedImageB64);
                };
                reader.readAsDataURL(file);
            };
        }

        if (urlInput) {
            urlInput.oninput = () => {
                this.uploadedImageB64 = null;  // URL takes priority when typed
                showPreview(urlInput.value);
            };
        }
    }

    openAddDishModal() {
        this.editingDishId    = null;
        this.uploadedImageB64 = null;
        document.getElementById('dish-modal-title').textContent = 'Add New Menu Item';
        document.getElementById('dish-form').reset();
        const preview = document.getElementById('dish-img-preview');
        if (preview) preview.style.display = 'none';

        // Start with URL tab visible
        const fileArea = document.getElementById('img-file-area');
        const urlArea  = document.getElementById('img-url-area');
        if (fileArea) fileArea.style.display = 'none';
        if (urlArea)  urlArea.style.display  = 'block';

        const categories = this.store.getCategories();
        const firstCatId = categories.length > 0 ? categories[0].id : '';
        this._populateCategoriesDropdown(firstCatId);
        this._setupImageUploader();
        document.getElementById('dish-modal').classList.add('active');
    }

    openEditDishModal(dishId) {
        const item = this.store.getMenuItems().find(i => i.id === dishId);
        if (!item) return;

        this.editingDishId    = dishId;
        this.uploadedImageB64 = null;

        document.getElementById('dish-modal-title').textContent = 'Edit Menu Item';
        
        // Find matching category ID from item
        const categories = this.store.getCategories();
        const matchedCat = categories.find(c => c.id === item.category_id || c.cloud_id === item.category_id || (c.name && item.category_id && c.name.toLowerCase() === item.category_id.toLowerCase()));
        const selectedCatId = matchedCat ? matchedCat.id : (item.category_id || (categories[0] ? categories[0].id : ''));
        
        this._populateCategoriesDropdown(selectedCatId);

        document.getElementById('dish-name').value      = item.name;
        document.getElementById('dish-price').value     = item.price;
        document.getElementById('dish-desc').value      = item.description || '';
        document.getElementById('dish-img').value       = (!item.image_url || item.image_url.startsWith('data:')) ? '' : item.image_url;
        document.getElementById('dish-prep').value      = item.prep_time  || '15 min';
        document.getElementById('dish-calories').value  = item.calories   || '';
        document.getElementById('dish-badge').value     = item.badge      || '';
        const selectEl = document.getElementById('dish-category');
        if (selectEl) selectEl.value = selectedCatId;

        const vegRadio = document.querySelector(`input[name="dish_veg"][value="${item.is_veg ? 'true' : 'false'}"]`);
        if (vegRadio) vegRadio.checked = true;

        // Show existing image preview
        const preview = document.getElementById('dish-img-preview');
        if (preview && item.image_url) {
            preview.src = item.image_url;
            preview.style.display = 'block';
        } else if (preview) {
            preview.style.display = 'none';
        }

        // If existing image is base64, store it
        if (item.image_url && item.image_url.startsWith('data:')) {
            this.uploadedImageB64 = item.image_url;
        }

        const fileArea = document.getElementById('img-file-area');
        const urlArea  = document.getElementById('img-url-area');
        if (fileArea) fileArea.style.display = 'none';
        if (urlArea)  urlArea.style.display  = 'block';

        this._setupImageUploader();
        document.getElementById('dish-modal').classList.add('active');
    }

    _populateCategoriesDropdown(selectedId) {
        const select = document.getElementById('dish-category');
        if (!select) return;
        const categories = this.store.getCategories();
        if (!categories.length) {
            select.innerHTML = '<option value="">No categories available</option>';
            return;
        }

        const matched = categories.find(c => c.id === selectedId || c.cloud_id === selectedId || (c.name && selectedId && c.name.toLowerCase() === selectedId.toLowerCase()));
        const activeId = matched ? matched.id : (selectedId || categories[0].id);

        select.innerHTML = categories.map(c =>
            `<option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>${c.icon || '🍽️'} ${c.name}</option>`
        ).join('');
        select.value = activeId;
    }

    saveDish() {
        const name       = document.getElementById('dish-name').value.trim();
        const price      = Number(document.getElementById('dish-price').value);
        const category_id= document.getElementById('dish-category').value;
        const description= document.getElementById('dish-desc').value.trim();
        const urlInput   = document.getElementById('dish-img').value.trim();
        const prep_time  = document.getElementById('dish-prep').value.trim();
        const calories   = document.getElementById('dish-calories').value.trim();
        const badge      = document.getElementById('dish-badge').value.trim();
        const is_veg     = document.querySelector('input[name="dish_veg"]:checked')?.value === 'true';

        if (!name || isNaN(price) || price <= 0) {
            showToast('Please enter a dish name and a valid price', 'warning');
            return;
        }

        // Priority: uploaded file → URL field → existing or placeholder
        let image_url = this.uploadedImageB64 || urlInput || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

        this.store.saveMenuItem({
            id: this.editingDishId,
            name, price, category_id, description, image_url,
            prep_time, calories, badge, is_veg, is_available: true
        });

        showToast(this.editingDishId ? 'Dish updated! ✓' : 'New dish added to menu! ✓', 'success');
        this.closeDishModal();
        this.renderMenuTable();
    }

    deleteDish(dishId) {
        if (!confirm('Delete this menu item? This cannot be undone.')) return;
        this.store.deleteMenuItem(dishId);
        showToast('Item removed from menu', 'info');
        this.renderMenuTable();
    }

    closeDishModal() {
        document.getElementById('dish-modal').classList.remove('active');
        this.editingDishId    = null;
        this.uploadedImageB64 = null;
    }

    // ═══════════════════════════════════════════════════════════
    // CATEGORY CRUD
    // ═══════════════════════════════════════════════════════════

    renderCategoriesList() {
        const container  = document.getElementById('categories-table-tbody');
        if (!container) return;

        const categories = this.store.getCategories();
        const menu       = this.store.getMenuItems();

        if (!categories.length) {
            container.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">No categories yet. Add one!</td></tr>`;
            return;
        }

        container.innerHTML = categories.map(cat => {
            const itemCount = menu.filter(m => m.category_id === cat.id).length;
            return `
            <tr>
                <td style="font-size:24px;">${cat.icon}</td>
                <td><b>${cat.name}</b></td>
                <td><span class="badge badge-gray">${itemCount} items</span></td>
                <td>
                    <span class="badge ${cat.is_active !== false ? 'badge-green' : 'badge-gray'}">
                        ${cat.is_active !== false ? 'Active' : 'Hidden'}
                    </span>
                </td>
                <td>
                    <div style="display:flex;gap:6px;">
                        <button class="table-action-btn" onclick="window.adminApp.openEditCatModal('${cat.id}')">✏️ Edit</button>
                        <button class="table-action-btn" style="color:#DC2626;" onclick="window.adminApp.deleteCategory('${cat.id}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    openAddCategoryModal() {
        this.editingCatId = null;
        document.getElementById('cat-modal-title').textContent = 'Add New Category';
        document.getElementById('cat-name-input').value = '';
        document.getElementById('cat-icon-input').value = '🍽️';
        document.getElementById('category-modal').classList.add('active');
    }

    openEditCatModal(catId) {
        const cat = this.store.getCategories().find(c => c.id === catId);
        if (!cat) return;
        this.editingCatId = catId;
        document.getElementById('cat-modal-title').textContent = 'Edit Category';
        document.getElementById('cat-name-input').value = cat.name;
        document.getElementById('cat-icon-input').value = cat.icon || '🍽️';
        document.getElementById('category-modal').classList.add('active');
    }

    saveCategory() {
        const name = document.getElementById('cat-name-input').value.trim();
        const icon = document.getElementById('cat-icon-input').value.trim() || '🍽️';

        if (!name) { showToast('Please enter a category name', 'warning'); return; }

        if (this.editingCatId) {
            const cats = this.store.getCategories();
            const cat  = cats.find(c => c.id === this.editingCatId);
            if (cat) {
                cat.name = name;
                cat.icon = icon;
                localStorage.setItem('fb_categories', JSON.stringify(cats));
                window.firstBiteStore._broadcast({ type: 'CATEGORY_UPDATED', categories: cats });
            }
        } else {
            this.store.saveCategory({ name, icon, is_active: true });
        }

        showToast(this.editingCatId ? 'Category updated!' : 'Category added!', 'success');
        document.getElementById('category-modal').classList.remove('active');
        this.editingCatId = null;
        this.renderCategoriesList();
    }

    deleteCategory(catId) {
        const cats    = this.store.getCategories();
        const cat     = cats.find(c => c.id === catId);
        const menu    = this.store.getMenuItems();
        const inUse   = menu.filter(m => m.category_id === catId).length;

        if (inUse > 0) {
            if (!confirm(`"${cat?.name}" has ${inUse} menu item(s). Delete anyway? Items will become uncategorised.`)) return;
        } else {
            if (!confirm(`Delete category "${cat?.name}"?`)) return;
        }

        const updated = cats.filter(c => c.id !== catId);
        localStorage.setItem('fb_categories', JSON.stringify(updated));
        window.firstBiteStore._broadcast({ type: 'CATEGORY_UPDATED', categories: updated });
        showToast('Category deleted', 'info');
        this.renderCategoriesList();
    }

    closeCategoryModal() {
        document.getElementById('category-modal').classList.remove('active');
        this.editingCatId = null;
    }

    // ═══════════════════════════════════════════════════════════
    // RESTAURANT SETTINGS
    // ═══════════════════════════════════════════════════════════

    renderSettingsForm() {
        const r = this.store.getRestaurant();
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        s('settings-name',     r.name);
        s('settings-tagline',  r.tagline  || '');
        s('settings-phone',    r.phone    || '');
        s('settings-address',  r.address  || '');
        s('settings-currency', r.currency || '₹');
        s('settings-tax',      r.tax_rate || 5);
        const openEl = document.getElementById('settings-open');
        if (openEl) openEl.checked = r.is_open;
    }

    saveSettings() {
        const g = (id) => document.getElementById(id)?.value?.trim();
        this.store.saveRestaurant({
            name:      g('settings-name'),
            tagline:   g('settings-tagline'),
            phone:     g('settings-phone'),
            address:   g('settings-address'),
            currency:  g('settings-currency'),
            tax_rate:  Number(g('settings-tax')),
            is_open:   document.getElementById('settings-open')?.checked
        });
        this.renderRestaurantInfo();
        showToast('Settings saved & broadcast to all apps! ⚡', 'success');
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW SWITCHING
    // ═══════════════════════════════════════════════════════════

    switchView(viewId) {
        this.currentView = viewId;
        if (window.sounds) window.sounds.playClick();

        document.querySelectorAll('.sidebar-link').forEach(link =>
            link.classList.toggle('active', link.dataset.view === viewId)
        );
        document.querySelectorAll('.admin-content-view').forEach(view =>
            view.classList.toggle('active', view.id === `view-${viewId}`)
        );

        if (viewId === 'dashboard')       this.renderDashboard();
        else if (viewId === 'orders')     this.renderOrdersTable();
        else if (viewId === 'menu')       this.renderMenuTable();
        else if (viewId === 'categories') this.renderCategoriesList();
        else if (viewId === 'coupons')    this.renderCouponsList();
        else if (viewId === 'qrcodes')    this.renderQrCodesView();
        else if (viewId === 'staff')      this.renderStaffList();
        else if (viewId === 'settings')   this.renderSettingsForm();
    }

    getQrBaseUrl() {
        let saved = localStorage.getItem('fb_qr_base_domain');
        if (saved && saved.trim()) {
            return saved.trim().replace(/\/+$/, '');
        }
        const loc = window.location;
        if (loc.protocol === 'file:') {
            return 'http://localhost:8080';
        }
        const path = loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1);
        return (loc.origin + path).replace(/\/+$/, '');
    }

    renderQrCodesView() {
        const domainInput = document.getElementById('qr-domain-input');
        if (domainInput) {
            domainInput.value = this.getQrBaseUrl();
        }
        const sel = document.getElementById('qr-table-select');
        const tableNum = sel ? sel.value : '4';
        this.updateTableQrCode(tableNum);
    }

    updateTableQrCode(tableNum) {
        const baseUrl = this.getQrBaseUrl();
        const fullUrl = `${baseUrl}/index.html?table=${encodeURIComponent(tableNum)}`;
        const urlEl = document.getElementById('qr-link-url');
        const testBtn = document.getElementById('qr-test-btn');
        const imgEl = document.getElementById('qr-preview-img');
        const titleEl = document.getElementById('qr-preview-tablename');

        if (urlEl) urlEl.textContent = fullUrl;
        if (testBtn) testBtn.href = fullUrl;
        if (imgEl) imgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(fullUrl)}`;
        if (titleEl) titleEl.textContent = `🍽️ Table ${tableNum}`;
    }

    // ═══════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════

    setupEventListeners() {
        // Sidebar nav is handled via inline onclick in HTML (calls switchView directly)

        // ── Analytics date range picker ──────────────────────
        document.getElementById('analytics-range-select')?.addEventListener('change', e => {
            this.analyticsRange = e.target.value;
            const customRow = document.getElementById('custom-date-row');
            if (customRow) customRow.style.display = this.analyticsRange === 'custom' ? 'flex' : 'none';
            this.renderDashboard();
        });

        document.getElementById('custom-date-from')?.addEventListener('change', e => {
            this.customDateFrom = e.target.value;
            if (this.analyticsRange === 'custom') this.renderDashboard();
        });
        document.getElementById('custom-date-to')?.addEventListener('change', e => {
            this.customDateTo = e.target.value;
            if (this.analyticsRange === 'custom') this.renderDashboard();
        });

        // ── Orders table ─────────────────────────────────────
        document.getElementById('orders-search-input')?.addEventListener('input', e => {
            this.orderSearchQuery = e.target.value.trim();
            this.renderOrdersTable();
        });
        document.getElementById('orders-status-filter')?.addEventListener('change', e => {
            this.orderFilterStatus = e.target.value;
            this.renderOrdersTable();
        });

        // ── Menu table ───────────────────────────────────────
        document.getElementById('menu-search-input')?.addEventListener('input', e => {
            this.menuSearchQuery = e.target.value.trim();
            this.renderMenuTable();
        });
        document.getElementById('add-dish-btn')?.addEventListener('click', () => this.openAddDishModal());
        document.getElementById('dish-modal-close-btn')?.addEventListener('click', () => this.closeDishModal());
        document.getElementById('dish-save-btn')?.addEventListener('click', () => this.saveDish());

        // ── Receipt ──────────────────────────────────────────
        document.getElementById('receipt-close-btn')?.addEventListener('click', () => this.closeReceiptModal());
        document.getElementById('receipt-print-btn')?.addEventListener('click', () => this.printReceipt());

        // ── Category modal ───────────────────────────────────
        document.getElementById('add-cat-btn')?.addEventListener('click',       () => this.openAddCategoryModal());
        document.getElementById('cat-save-btn')?.addEventListener('click',      () => this.saveCategory());
        document.getElementById('cat-modal-close-btn')?.addEventListener('click', () => this.closeCategoryModal());
        document.getElementById('category-modal')?.addEventListener('click', e => {
            if (e.target.id === 'category-modal') this.closeCategoryModal();
        });

        // ── Coupon modal ─────────────────────────────────────
        document.getElementById('add-coupon-btn')?.addEventListener('click',         () => this.openCouponModal());
        document.getElementById('coupon-save-btn')?.addEventListener('click',        () => this.saveCoupon());
        document.getElementById('coupon-modal-close-btn')?.addEventListener('click', () => this.closeCouponModal());
        document.getElementById('coupon-modal')?.addEventListener('click', e => {
            if (e.target.id === 'coupon-modal') this.closeCouponModal();
        });

        // ── Kitchen Open / Closed Toggle ─────────────────────
        document.getElementById('admin-kitchen-toggle-btn')?.addEventListener('click', () => {
            const updated = this.store.toggleRestaurantOpen();
            this.renderRestaurantInfo();
            if (window.sounds) window.sounds.playClick();
            showToast(updated.is_open ? 'Kitchen is now OPEN (Accepting Orders) 🟢' : 'Kitchen is now CLOSED / PAUSED (New Orders Blocked) 🔴', updated.is_open ? 'success' : 'warning');
        });

        // ── Table QR Code Controls ───────────────────────────
        document.getElementById('qr-table-select')?.addEventListener('change', e => {
            this.updateTableQrCode(e.target.value);
        });

        document.getElementById('qr-save-domain-btn')?.addEventListener('click', () => {
            const input = document.getElementById('qr-domain-input');
            let val = input ? input.value.trim() : '';
            if (val) {
                if (!val.startsWith('http://') && !val.startsWith('https://')) {
                    val = 'https://' + val;
                }
                val = val.replace(/\/+$/, '');
                localStorage.setItem('fb_qr_base_domain', val);
                if (input) input.value = val;
                showToast(`Permanent domain saved: ${val} ✓`, 'success');
            } else {
                localStorage.removeItem('fb_qr_base_domain');
                if (input) input.value = this.getQrBaseUrl();
                showToast('Reset to default auto-detected domain', 'info');
            }
            const sel = document.getElementById('qr-table-select');
            this.updateTableQrCode(sel ? sel.value : '4');
        });

        document.getElementById('qr-reset-domain-btn')?.addEventListener('click', () => {
            localStorage.removeItem('fb_qr_base_domain');
            const domainInput = document.getElementById('qr-domain-input');
            if (domainInput) domainInput.value = this.getQrBaseUrl();
            const sel = document.getElementById('qr-table-select');
            this.updateTableQrCode(sel ? sel.value : '4');
            showToast('Domain reset to current browser URL ✓', 'info');
        });

        document.getElementById('qr-copy-url-btn')?.addEventListener('click', () => {
            const sel = document.getElementById('qr-table-select');
            const tableNum = sel ? sel.value : '4';
            const fullUrl = `${this.getQrBaseUrl()}/index.html?table=${encodeURIComponent(tableNum)}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(fullUrl).then(() => {
                    showToast(`Copied Table ${tableNum} URL to clipboard! 📋`, 'success');
                }).catch(() => {
                    showToast(fullUrl, 'info', 6000);
                });
            } else {
                showToast(fullUrl, 'info', 6000);
            }
        });

        document.getElementById('qr-download-btn')?.addEventListener('click', () => {
            const sel = document.getElementById('qr-table-select');
            const tableNum = sel ? sel.value : '4';
            const fullUrl = `${this.getQrBaseUrl()}/index.html?table=${encodeURIComponent(tableNum)}`;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(fullUrl)}`;
            const link = document.createElement('a');
            link.href = qrApiUrl;
            link.target = '_blank';
            link.download = `table-${tableNum}-qr.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast(`Downloading Table ${tableNum} QR Code Image ⬇️`, 'success');
        });

        document.getElementById('qr-print-btn')?.addEventListener('click', () => {
            window.print();
        });

        // ── Settings ─────────────────────────────────────────
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-orders-btn')?.addEventListener('click',  () => this.clearAllOrders());
        document.getElementById('reset-demo-btn')?.addEventListener('click',    () => this.factoryResetDemo());
        document.getElementById('wipe-catalog-btn')?.addEventListener('click',  () => this.wipeCatalog());

        // ── Admin Login & Security ───────────────────────────
        // Form submit covers Enter key press (inline onclick on button covers click)
        document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });
        // change-admin-pass-btn does not have inline onclick so keep its listener
        document.getElementById('change-admin-pass-btn')?.addEventListener('click', () => this.handleChangeMasterPassword());

        // ── Staff Management ─────────────────────────────────
        // Buttons have inline onclick in HTML; only keep listeners for ones without inline onclick
        // (launch-handover-wizard-btn, handover-modal-close-btn, handover-cancel-btn, execute-handover-btn)

        // ── Handover Wizard ───────────────────────────────────
        document.getElementById('launch-handover-wizard-btn')?.addEventListener('click', () => this.openHandoverWizard());
        document.getElementById('handover-modal-close-btn')?.addEventListener('click', () => this.closeHandoverModal());
        document.getElementById('handover-cancel-btn')?.addEventListener('click', () => this.closeHandoverModal());
        document.getElementById('execute-handover-btn')?.addEventListener('click', () => this.executeHandover());
    }

    setupRealtimeListeners() {
        this.store.subscribe('ORDER_CREATED', (event) => {
            this.renderDashboard();
            this.renderOrdersTable();
            const order = event && event.order;
            const orderKey = order ? (order.order_number || order.id) : null;
            if (orderKey) {
                if (this.alertedOrders.has(orderKey)) return;
                this.alertedOrders.add(orderKey);
                showToast(`🔔 New Order placed: ${order.order_number}`, 'warning');
            }
        });

        this.store.subscribe('ORDER_SYNCED', () => {
            this.renderDashboard();
            this.renderOrdersTable();
        });

        this.store.subscribe('ORDER_STATUS_CHANGED', () => {
            this.renderDashboard();
            this.renderOrdersTable();
        });

        this.store.subscribe('ORDER_PAID', () => {
            this.renderDashboard();
            this.renderOrdersTable();
        });

        this.store.subscribe('DATA_REFRESH', () => {
            this.renderDashboard();
            this.renderOrdersTable();
            this.renderMenuTable();
            this.renderCategoriesList();
            this.renderCouponsList();
            this.renderStaffList();
            this.renderRestaurantInfo();
        });

        this.store.subscribe('REALTIME_CONNECTED', () => {
            if (this.store && this.store.syncAllFromSupabase) {
                this.store.syncAllFromSupabase().then(() => {
                    this.renderDashboard();
                    this.renderOrdersTable();
                    this.renderMenuTable();
                    this.renderCategoriesList();
                    this.renderStaffList();
                });
            }
        });

        this.store.subscribe('MENU_UPDATED', () => {
            this.renderMenuTable();
        });

        this.store.subscribe('CATEGORY_UPDATED', () => {
            this.renderCategoriesList();
            this.renderMenuTable();
        });

        this.store.subscribe('SETTINGS_UPDATED', () => {
            this.renderRestaurantInfo();
        });

        this.store.subscribe('COUPONS_UPDATED', () => {
            this.renderCouponsList();
        });

        this.store.subscribe('STAFF_UPDATED', () => {
            this.renderStaffList();
        });

        this.store.subscribe('ADMIN_AUTH_UPDATED', () => {
            this.checkAdminAuth();
        });

        this.store.subscribe('ADMIN_SESSION_CHANGED', () => {
            this.checkAdminAuth();
        });
    }
}

AdminApp.prototype.clearAllOrders = function() {
    if (!confirm('⚠️ Are you sure you want to clear ALL orders and sales history? This action cannot be undone.')) return;
    this.store.clearAllOrders();
    this.renderDashboard();
    this.renderOrdersTable();
    showToast('All orders & sales cleared! ✓', 'info');
};

AdminApp.prototype.factoryResetDemo = function() {
    if (!confirm('🔄 Restore full sample catalog? This will reset all demo dishes, categories, coupons and clear orders.')) return;
    this.store.resetDemoData();
    this.renderDashboard();
    this.renderOrdersTable();
    this.renderMenuTable();
    this.renderCategoriesList();
    this.renderCouponsList();
    this.renderRestaurantInfo();
    showToast('Factory demo data restored! ✓', 'success');
};

AdminApp.prototype.wipeCatalog = function() {
    if (!confirm('✨ Wipe entire catalog? All menu items and categories will be cleared so you can build from a clean slate for a new restaurant client.')) return;
    this.store.wipeCatalog();
    this.renderMenuTable();
    this.renderCategoriesList();
    showToast('Catalog wiped! Clean slate ready for new client ✓', 'warning');
};

// ═══════════════════════════════════════════════════════════
// COUPON MANAGEMENT
// ═══════════════════════════════════════════════════════════

AdminApp.prototype.renderCouponsList = function() {
    const container = document.getElementById('coupons-list-container');
    if (!container) return;

    const coupons = this.store.getCoupons ? this.store.getCoupons() : [];
    const currency = this.store.getRestaurant().currency || '₹';

    if (!coupons.length) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--text-muted);"><div style="font-size:40px;margin-bottom:12px;">🎟️</div><p>No coupons yet. Create your first promo!</p></div>`;
        return;
    }

    container.innerHTML = coupons.map(c => {
        const isPct = c.discount_type === 'percentage' || c.discount_type === 'percent';
        const discountLabel = isPct ? `${c.discount_value}% OFF` : `${currency}${c.discount_value} OFF`;
        const minAmt = Number(c.min_order_amount ?? c.min_order_value) || 0;
        const maxCap = Number(c.max_discount) || 0;
        const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
        const isActive = c.is_active !== false;
        const isVisible = c.is_visible !== false;

        return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border:1px solid ${isActive && !isExpired ? '#6EE7B7' : 'var(--border-light)'};border-radius:12px;margin-bottom:10px;background:${isActive && !isExpired ? '#F0FDF9' : 'var(--bg-soft)'};flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:14px;min-width:260px;">
                <div style="font-size:28px;">🎟️</div>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-weight:800;font-size:16px;font-family:monospace;letter-spacing:1px;color:var(--text-primary);">${c.code}</span>
                        ${isExpired ? `<span style="font-size:10.5px;background:#FEE2E2;color:#DC2626;padding:2px 7px;border-radius:10px;font-weight:700;">EXPIRED</span>` : ''}
                        ${isActive ? `<span style="font-size:10.5px;background:#DCFCE7;color:#15803D;padding:2px 7px;border-radius:10px;font-weight:700;">🟢 Active</span>` : `<span style="font-size:10.5px;background:#F3F4F6;color:#6B7280;padding:2px 7px;border-radius:10px;font-weight:700;">⚪ Inactive</span>`}
                        ${isVisible ? `<span style="font-size:10.5px;background:#E0F2FE;color:#0369A1;padding:2px 7px;border-radius:10px;font-weight:700;">👁️ Public</span>` : `<span style="font-size:10.5px;background:#FEF3C7;color:#B45309;padding:2px 7px;border-radius:10px;font-weight:700;" title="Hidden from customer cart menu; redeemable when typed manually">🔒 Secret / Hidden</span>`}
                        ${c.usage_count > 0 ? `<span style="font-size:11px;color:var(--text-secondary);background:var(--bg-card);padding:2px 7px;border-radius:10px;border:1px solid var(--border-light);">Used ${c.usage_count}x</span>` : ''}
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
                        <span style="font-weight:700;color:var(--primary);">${discountLabel}</span>
                        ${maxCap > 0 ? ` (up to ${currency}${maxCap})` : ''}
                        ${minAmt > 0 ? ` • Min: ${formatCurrency(minAmt, currency)}` : ' • No min order'}
                        ${c.expires_at ? ' • Exp: ' + new Date(c.expires_at).toLocaleDateString() : ' • Never expires'}
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <button type="button" class="table-action-btn" style="background:${isVisible ? 'var(--bg-card)' : '#FEF3C7'};color:${isVisible ? 'var(--text-secondary)' : '#B45309'};font-weight:700;border:1px solid ${isVisible ? 'var(--border-light)' : '#FCD34D'};" 
                    title="${isVisible ? 'Click to hide from customer promo chips (make secret)' : 'Click to make publicly visible in customer cart'}" 
                    onclick="window.adminApp.toggleCouponVisibility('${c.id}', ${!isVisible})">
                    ${isVisible ? '👁️ Public' : '🔒 Hidden'}
                </button>
                <label class="stock-toggle-switch" title="${isActive ? 'Click to deactivate coupon completely' : 'Click to activate coupon'}">
                    <input type="checkbox" ${isActive ? 'checked' : ''} onchange="window.adminApp.toggleCoupon('${c.id}', this.checked)">
                    <span class="slider-round"></span>
                </label>
                <button class="table-action-btn" onclick="window.adminApp.openEditCouponModal('${c.id}')">✏️ Edit</button>
                <button class="table-action-btn" style="color:#DC2626;" onclick="window.adminApp.deleteCoupon('${c.id}')">🗑️</button>
            </div>
        </div>
        `;
    }).join('');
};

AdminApp.prototype.openCouponModal = function(couponId) {
    this.editingCouponId = couponId || null;
    const title = document.getElementById('coupon-modal-title');
    if (title) title.textContent = couponId ? '✏️ Edit Coupon' : '🎟️ New Coupon';

    if (couponId) {
        const c = (this.store.getCoupons ? this.store.getCoupons() : []).find(x => x.id === couponId || x.code === couponId);
        if (c) {
            document.getElementById('coupon-code-input').value = c.code || '';
            const isPct = c.discount_type === 'percentage' || c.discount_type === 'percent';
            document.getElementById('coupon-type-select').value = isPct ? 'percent' : 'flat';
            document.getElementById('coupon-value-input').value = c.discount_value || '';
            document.getElementById('coupon-min-order-input').value = c.min_order_amount ?? c.min_order_value ?? 0;
            document.getElementById('coupon-max-discount-input').value = c.max_discount || 0;
            document.getElementById('coupon-expiry-input').value = c.expires_at ? c.expires_at.split('T')[0] : '';
            document.getElementById('coupon-active-toggle').checked = c.is_active !== false;
            document.getElementById('coupon-visible-toggle').checked = c.is_visible !== false;
        }
    } else {
        document.getElementById('coupon-code-input').value = '';
        document.getElementById('coupon-type-select').value = 'percent';
        document.getElementById('coupon-value-input').value = '';
        document.getElementById('coupon-min-order-input').value = 0;
        document.getElementById('coupon-max-discount-input').value = 0;
        document.getElementById('coupon-expiry-input').value = '';
        document.getElementById('coupon-active-toggle').checked = true;
        document.getElementById('coupon-visible-toggle').checked = true;
    }

    document.getElementById('coupon-modal').classList.add('active');
};

AdminApp.prototype.openEditCouponModal = function(couponId) {
    this.openCouponModal(couponId);
};

AdminApp.prototype.closeCouponModal = function() {
    this.editingCouponId = null;
    document.getElementById('coupon-modal').classList.remove('active');
};

AdminApp.prototype.saveCoupon = function() {
    const code = document.getElementById('coupon-code-input')?.value?.trim().toUpperCase();
    const type = document.getElementById('coupon-type-select')?.value; // 'percent' or 'flat'
    const value = Number(document.getElementById('coupon-value-input')?.value);
    const minOrder = Number(document.getElementById('coupon-min-order-input')?.value) || 0;
    const maxDiscount = Number(document.getElementById('coupon-max-discount-input')?.value) || 0;
    const expiryStr = document.getElementById('coupon-expiry-input')?.value;
    const isActive = document.getElementById('coupon-active-toggle')?.checked !== false;
    const isVisible = document.getElementById('coupon-visible-toggle')?.checked !== false;

    if (!code) { showToast('Please enter a coupon code', 'warning'); return; }
    if (!value || value <= 0) { showToast('Please enter a valid discount value', 'warning'); return; }

    const isPct = type === 'percent' || type === 'percentage';
    const couponData = {
        id: this.editingCouponId || `cpn-${Date.now()}`,
        code,
        discount_type: isPct ? 'percentage' : 'fixed',
        discount_value: value,
        min_order_amount: minOrder,
        min_order_value: minOrder,
        max_discount: maxDiscount > 0 ? maxDiscount : null,
        expires_at: expiryStr ? expiryStr + 'T23:59:59' : null,
        is_active: isActive,
        is_visible: isVisible,
        created_at: new Date().toISOString()
    };

    if (this.store.saveCoupon) this.store.saveCoupon(couponData);
    this.closeCouponModal();
    this.renderCouponsList();
    showToast(`Coupon ${code} ${this.editingCouponId ? 'updated' : 'created'} ✓`, 'success');
};

AdminApp.prototype.toggleCoupon = function(couponId, isActive) {
    if (this.store.toggleCoupon) this.store.toggleCoupon(couponId, isActive);
    this.renderCouponsList();
    showToast(`Coupon ${isActive ? 'activated' : 'deactivated'}`, 'info');
};

AdminApp.prototype.toggleCouponVisibility = function(couponId, isVisible) {
    if (this.store.toggleCouponVisibility) this.store.toggleCouponVisibility(couponId, isVisible);
    this.renderCouponsList();
    showToast(`Coupon is now ${isVisible ? 'publicly visible' : 'hidden (secret code)'}`, 'info');
};

AdminApp.prototype.deleteCoupon = function(couponId) {
    if (!confirm('Delete this coupon?')) return;
    if (this.store.deleteCoupon) this.store.deleteCoupon(couponId);
    this.renderCouponsList();
    showToast('Coupon deleted', 'info');
};

// ══════════════════════════════════════════════════════════════
// ADMIN AUTHENTICATION & ACCESS CONTROL
// ══════════════════════════════════════════════════════════════

AdminApp.prototype.checkAdminAuth = function() {
    const overlay = document.getElementById('admin-login-overlay');
    const badge = document.getElementById('admin-user-badge');
    const auth = this.store.getAdminAuth();

    if (badge) {
        badge.textContent = auth.ownerName || 'Admin';
    }

    if (this.store.isAdminLoggedIn()) {
        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
    } else {
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.add('active');
            const passInput = document.getElementById('admin-login-password');
            if (passInput) setTimeout(() => passInput.focus(), 100);
        }
    }
};

AdminApp.prototype.handleAdminLogin = function() {
    const userEl = document.getElementById('admin-login-username');
    const passEl = document.getElementById('admin-login-password');
    const errEl = document.getElementById('admin-login-error');

    const username = userEl ? userEl.value.trim() : '';
    const password = passEl ? passEl.value : '';

    const res = this.store.loginAdmin(username, password);
    if (res.success) {
        if (errEl) errEl.style.display = 'none';
        if (passEl) passEl.value = '';
        this.checkAdminAuth();
        showToast('Welcome to First Bite Operations Dashboard! 🛡️', 'success');
    } else {
        if (errEl) {
            errEl.textContent = res.error || 'Invalid credentials';
            errEl.style.display = 'block';
        }
    }
};

AdminApp.prototype.handleAdminLogout = function() {
    if (!confirm('Sign out of Admin Operations?')) return;
    this.store.logoutAdmin();
    this.checkAdminAuth();
    showToast('Signed out successfully', 'info');
};

AdminApp.prototype.handleChangeMasterPassword = function() {
    const curEl = document.getElementById('admin-current-pass');
    const newEl = document.getElementById('admin-new-pass');
    const curPass = curEl ? curEl.value : '';
    const newPass = newEl ? newEl.value : '';

    if (!curPass || !newPass) {
        showToast('Please fill in both current and new password', 'warning');
        return;
    }

    const res = this.store.changeMasterPassword(curPass, newPass);
    if (res.success) {
        if (curEl) curEl.value = '';
        if (newEl) newEl.value = '';
        showToast('Master password successfully updated! 🔒', 'success');
    } else {
        showToast(res.error || 'Failed to update password', 'error');
    }
};

// ══════════════════════════════════════════════════════════════
// STAFF ROSTER & TERMINAL ACCESS (CRUD)
// ══════════════════════════════════════════════════════════════

AdminApp.prototype.renderStaffList = function() {
    const staff = this.store.getStaffMembers();

    // Stats
    const totalEl    = document.getElementById('staff-stat-total');
    const chefsEl    = document.getElementById('staff-stat-chefs');
    const waitersEl  = document.getElementById('staff-stat-waiters');
    const cashiersEl = document.getElementById('staff-stat-cashiers');

    if (totalEl) totalEl.textContent = staff.length;
    if (chefsEl) chefsEl.textContent = staff.filter(s => s.role && s.role.toLowerCase().includes('chef')).length;
    if (waitersEl) waitersEl.textContent = staff.filter(s => s.role && (s.role.toLowerCase().includes('waiter') || s.role.toLowerCase().includes('captain'))).length;
    if (cashiersEl) cashiersEl.textContent = staff.filter(s => s.role && (s.role.toLowerCase().includes('cashier') || s.role.toLowerCase().includes('pos'))).length;

    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;

    if (staff.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No staff members found. Click "+ Add Staff Member" to add kitchen chefs or floor captains.</td></tr>`;
        return;
    }

    tbody.innerHTML = staff.map(s => {
        let roleIcon = '👤';
        const rLower = (s.role || '').toLowerCase();
        if (rLower.includes('chef')) roleIcon = '👨‍🍳';
        else if (rLower.includes('waiter') || rLower.includes('captain')) roleIcon = '🤵';
        else if (rLower.includes('cashier') || rLower.includes('pos')) roleIcon = '💵';
        else if (rLower.includes('manager')) roleIcon = '🛡️';

        const statusPill = s.active !== false
            ? `<span style="background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;">● Active</span>`
            : `<span style="background:#F1F5F9;color:#64748B;border:1px solid #CBD5E1;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;">○ Inactive</span>`;

        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:34px;height:34px;border-radius:50%;background:var(--bg-soft);border:1px solid var(--border-light);display:flex;align-items:center;justify-content:center;font-size:16px;">
                            ${roleIcon}
                        </div>
                        <div>
                            <div style="font-weight:700;color:var(--text-primary);font-size:13.5px;">${escapeHtml(s.name)}</div>
                            <div style="font-size:11px;color:var(--text-muted);">${s.id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;">
                        ${escapeHtml(s.role || 'Staff')}
                    </span>
                </td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span id="pin-val-${s.id}" style="font-family:monospace;letter-spacing:3px;font-size:14px;font-weight:800;background:var(--bg-soft);border:1px solid var(--border-light);padding:2px 8px;border-radius:6px;min-width:54px;text-align:center;">••••</span>
                        <button type="button" class="btn-secondary" style="padding:2px 7px;font-size:11px;border-radius:6px;" onclick="window.adminApp.togglePinVisibility('${s.id}', '${s.pin}')" title="Show/Hide PIN">👁️</button>
                    </div>
                </td>
                <td style="font-size:12.5px;color:var(--text-secondary);">
                    ${escapeHtml(s.phone || '—')}
                </td>
                <td>
                    ${statusPill}
                </td>
                <td style="text-align:right;">
                    <div style="display:inline-flex;gap:6px;">
                        <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="window.adminApp.openStaffModal('${s.id}')">✏️ Edit</button>
                        <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="window.adminApp.toggleStaffStatus('${s.id}')">${s.active !== false ? 'Deactivate' : 'Activate'}</button>
                        <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:12px;color:#DC2626;border-color:#FCA5A5;" onclick="window.adminApp.deleteStaffMember('${s.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

AdminApp.prototype.openStaffModal = function(id = null) {
    this.editingStaffId = id;
    const titleEl = document.getElementById('staff-modal-title');
    const nameEl  = document.getElementById('staff-name-input');
    const roleEl  = document.getElementById('staff-role-select');
    const pinEl   = document.getElementById('staff-pin-input');
    const phoneEl = document.getElementById('staff-phone-input');
    const actEl   = document.getElementById('staff-active-checkbox');

    if (id) {
        if (titleEl) titleEl.textContent = 'Edit Staff Member';
        const staffList = this.store.getStaffMembers();
        const member = staffList.find(s => s.id === id);
        if (member) {
            if (nameEl)  nameEl.value = member.name || '';
            if (roleEl)  roleEl.value = member.role || 'Head Chef';
            if (pinEl)   pinEl.value = member.pin || '';
            if (phoneEl) phoneEl.value = member.phone || '';
            if (actEl)   actEl.checked = member.active !== false;
        }
    } else {
        if (titleEl) titleEl.textContent = 'Add Staff Member';
        if (nameEl)  nameEl.value = '';
        if (roleEl)  roleEl.value = 'Head Chef';
        if (pinEl)   pinEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (actEl)   actEl.checked = true;
    }

    const modal = document.getElementById('staff-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
    if (nameEl) setTimeout(() => nameEl.focus(), 100);
};

AdminApp.prototype.closeStaffModal = function() {
    const modal = document.getElementById('staff-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    this.editingStaffId = null;
};

AdminApp.prototype.saveStaffMember = function() {
    const nameEl  = document.getElementById('staff-name-input');
    const roleEl  = document.getElementById('staff-role-select');
    const pinEl   = document.getElementById('staff-pin-input');
    const phoneEl = document.getElementById('staff-phone-input');
    const actEl   = document.getElementById('staff-active-checkbox');

    const name  = nameEl ? nameEl.value.trim() : '';
    const role  = roleEl ? roleEl.value : 'Head Chef';
    const pin   = pinEl ? pinEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const active = actEl ? actEl.checked : true;

    if (!name) {
        showToast('Please enter staff name', 'warning');
        if (nameEl) nameEl.focus();
        return;
    }

    if (!/^\d{4}$/.test(pin)) {
        showToast('PIN must be exactly 4 digits (e.g. 1234)', 'warning');
        if (pinEl) pinEl.focus();
        return;
    }

    try {
        this.store.saveStaffMember({
            id: this.editingStaffId,
            name,
            role,
            pin,
            phone,
            active
        });
        this.closeStaffModal();
        this.renderStaffList();
        showToast(`Staff member "${name}" saved successfully ✓`, 'success');
    } catch(err) {
        showToast(err.message || 'Error saving staff member', 'error');
    }
};

AdminApp.prototype.toggleStaffStatus = function(id) {
    const list = this.store.getStaffMembers();
    const member = list.find(s => s.id === id);
    if (!member) return;

    member.active = !member.active;
    try {
        this.store.saveStaffMember(member);
        this.renderStaffList();
        showToast(`Staff member ${member.active ? 'activated' : 'deactivated'}`, 'info');
    } catch(err) {
        showToast(err.message, 'error');
    }
};

AdminApp.prototype.deleteStaffMember = function(id) {
    const list = this.store.getStaffMembers();
    const member = list.find(s => s.id === id);
    const name = member ? member.name : 'this staff member';

    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
        this.store.deleteStaffMember(id);
        this.renderStaffList();
        showToast(`Staff member "${name}" removed`, 'info');
    } catch (err) {
        showToast(err.message, 'warning');
    }
};

AdminApp.prototype.togglePinVisibility = function(id, pin) {
    const el = document.getElementById(`pin-val-${id}`);
    if (!el) return;
    if (el.textContent === '••••') {
        el.textContent = pin;
    } else {
        el.textContent = '••••';
    }
};

// ══════════════════════════════════════════════════════════════
// RESTAURANT OWNER HANDOVER & SETUP WIZARD
// ══════════════════════════════════════════════════════════════

AdminApp.prototype.openHandoverWizard = function() {
    const rest = this.store.getRestaurant();
    const nameEl    = document.getElementById('hw-name');
    const tagEl     = document.getElementById('hw-tagline');
    const phoneEl   = document.getElementById('hw-phone');
    const addrEl    = document.getElementById('hw-address');
    const currEl    = document.getElementById('hw-currency');
    const taxEl     = document.getElementById('hw-tax');
    const ownerEl   = document.getElementById('hw-owner-name');
    const passEl    = document.getElementById('hw-new-password');
    const ordersEl  = document.getElementById('hw-clear-orders');
    const wipeEl    = document.getElementById('hw-wipe-catalog');

    if (nameEl)  nameEl.value = rest.name || '';
    if (tagEl)   tagEl.value = rest.tagline || '';
    if (phoneEl) phoneEl.value = rest.phone || '';
    if (addrEl)  addrEl.value = rest.address || '';
    if (currEl)  currEl.value = rest.currency || '₹';
    if (taxEl)   taxEl.value = rest.tax_rate !== undefined ? rest.tax_rate : 5;
    if (ownerEl) ownerEl.value = '';
    if (passEl)  passEl.value = '';
    if (ordersEl) ordersEl.checked = true;
    if (wipeEl)  wipeEl.checked = false;

    const modal = document.getElementById('handover-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
    if (nameEl) setTimeout(() => nameEl.focus(), 100);
};

AdminApp.prototype.closeHandoverModal = function() {
    const modal = document.getElementById('handover-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
};

AdminApp.prototype.executeHandover = function() {
    const nameEl    = document.getElementById('hw-name');
    const tagEl     = document.getElementById('hw-tagline');
    const phoneEl   = document.getElementById('hw-phone');
    const addrEl    = document.getElementById('hw-address');
    const currEl    = document.getElementById('hw-currency');
    const taxEl     = document.getElementById('hw-tax');
    const ownerEl   = document.getElementById('hw-owner-name');
    const passEl    = document.getElementById('hw-new-password');
    const ordersEl  = document.getElementById('hw-clear-orders');
    const wipeEl    = document.getElementById('hw-wipe-catalog');

    const restName = nameEl ? nameEl.value.trim() : '';
    const newPass  = passEl ? passEl.value.trim() : '';

    if (!restName) {
        showToast('Please enter restaurant name', 'warning');
        if (nameEl) nameEl.focus();
        return;
    }

    if (!newPass || newPass.length < 4) {
        showToast('Please set a master admin password (min 4 characters)', 'warning');
        if (passEl) passEl.focus();
        return;
    }

    const confirmMsg = `🚀 CONFIRM HANDOVER & CLIENT INITIALIZATION:\n\nYou are configuring First Bite for "${restName}".\n` +
        `• Master Admin Password will be updated\n` +
        (ordersEl && ordersEl.checked ? `• All past orders and sales history will be reset to 0\n` : '') +
        (wipeEl && wipeEl.checked ? `• Menu and categories will be wiped to blank slate\n` : `• Menu and categories will be preserved as templates\n`) +
        `\nDo you want to complete this handover now?`;

    if (!confirm(confirmMsg)) return;

    this.store.executeOwnerHandover({
        restaurantName: restName,
        tagline: tagEl ? tagEl.value : '',
        phone: phoneEl ? phoneEl.value : '',
        address: addrEl ? addrEl.value : '',
        currency: currEl ? currEl.value : '₹',
        taxRate: taxEl ? taxEl.value : 5,
        ownerName: ownerEl ? ownerEl.value : 'Restaurant Owner',
        newAdminPassword: newPass,
        resetOrders: ordersEl ? ordersEl.checked : true,
        wipeCatalog: wipeEl ? wipeEl.checked : false
    });

    this.closeHandoverModal();
    this.renderRestaurantInfo();
    this.renderDashboard();
    this.renderOrdersTable();
    this.renderMenuTable();
    this.renderCategoriesList();
    this.renderStaffList();
    this.checkAdminAuth();

    showToast(`🎉 Restaurant setup complete for "${restName}"! Master credentials updated.`, 'success', 6000);
};

window.adminApp = new AdminApp();
