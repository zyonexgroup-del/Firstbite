// ==========================================================
// FIRST BITE — ADMIN CONTROLLER (Full Rewrite)
// Image Upload, Category CRUD, Date-Range Analytics, Menu CRUD
// ==========================================================

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

        this.init();
    }

    init() {
        this.renderRestaurantInfo();
        this.renderDashboard();
        this.renderOrdersTable();
        this.renderMenuTable();
        this.renderCategoriesList();
        this.renderCouponsList();
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
        if (!canvas) return;
        const ctx    = canvas.getContext('2d');
        const width  = canvas.width  = canvas.parentElement.clientWidth || 600;
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
        const catMap     = Object.fromEntries(categories.map(c => [c.id, `${c.icon} ${c.name}`]));
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
                    <span style="font-size:12px;margin-left:4px;">${catMap[item.category_id] || 'General'}</span>
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

        this._populateCategoriesDropdown('');
        this._setupImageUploader();
        document.getElementById('dish-modal').classList.add('active');
    }

    openEditDishModal(dishId) {
        const item = this.store.getMenuItems().find(i => i.id === dishId);
        if (!item) return;

        this.editingDishId    = dishId;
        this.uploadedImageB64 = null;

        document.getElementById('dish-modal-title').textContent = 'Edit Menu Item';
        this._populateCategoriesDropdown(item.category_id);

        document.getElementById('dish-name').value      = item.name;
        document.getElementById('dish-price').value     = item.price;
        document.getElementById('dish-desc').value      = item.description || '';
        document.getElementById('dish-img').value       = (!item.image_url || item.image_url.startsWith('data:')) ? '' : item.image_url;
        document.getElementById('dish-prep').value      = item.prep_time  || '15 min';
        document.getElementById('dish-calories').value  = item.calories   || '';
        document.getElementById('dish-badge').value     = item.badge      || '';

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
        select.innerHTML = categories.map(c =>
            `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>`
        ).join('');
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

        document.querySelectorAll('.sidebar-link').forEach(link =>
            link.classList.toggle('active', link.dataset.view === viewId)
        );
        document.querySelectorAll('.admin-content-view').forEach(view =>
            view.classList.toggle('active', view.id === `view-${viewId}`)
        );

        if (viewId === 'dashboard') this.renderDashboard();
        else if (viewId === 'orders')     this.renderOrdersTable();
        else if (viewId === 'menu')       this.renderMenuTable();
        else if (viewId === 'categories') this.renderCategoriesList();
        else if (viewId === 'coupons')    this.renderCouponsList();
        else if (viewId === 'qrcodes')    this.renderQrCodesView();
    }

    renderQrCodesView() {
        const sel = document.getElementById('qr-table-select');
        const tableNum = sel ? sel.value : '4';
        this.updateTableQrCode(tableNum);
    }

    updateTableQrCode(tableNum) {
        const url = `customer.html?table=${tableNum}`;
        const urlEl = document.getElementById('qr-link-url');
        const testBtn = document.getElementById('qr-test-btn');
        const imgEl = document.getElementById('qr-preview-img');
        const titleEl = document.getElementById('qr-preview-tablename');

        if (urlEl) urlEl.textContent = url;
        if (testBtn) testBtn.href = url;
        if (imgEl) imgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
        if (titleEl) titleEl.textContent = `🍽️ Table ${tableNum}`;
    }

    // ═══════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════

    setupEventListeners() {
        // Sidebar nav
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.switchView(link.dataset.view);
            });
        });

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

        document.getElementById('qr-print-btn')?.addEventListener('click', () => {
            window.print();
        });

        // ── Settings ─────────────────────────────────────────
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
    }

    setupRealtimeListeners() {
        this.store.subscribe('ORDER_CREATED', (event) => {
            this.renderDashboard();
            this.renderOrdersTable();
            if (event && event.order) {
                showToast(`🔔 New Order placed: ${event.order.order_number}`, 'warning');
            }
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
        });

        this.store.subscribe('REALTIME_CONNECTED', () => {
            if (this.store && this.store.syncAllFromSupabase) {
                this.store.syncAllFromSupabase().then(() => {
                    this.renderDashboard();
                    this.renderOrdersTable();
                });
            }
        });

        this.store.subscribe('MENU_UPDATED', () => {
            this.renderMenuTable();
        });

        this.store.subscribe('SETTINGS_UPDATED', () => {
            this.renderRestaurantInfo();
        });

        this.store.subscribe('COUPONS_UPDATED', () => {
            this.renderCouponsList();
        });
    }
}

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

    container.innerHTML = coupons.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border:1px solid ${c.is_active ? '#6EE7B7' : 'var(--border-light)'};border-radius:12px;margin-bottom:10px;background:${c.is_active ? '#F0FDF9' : 'var(--bg-soft)'}">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="font-size:28px;">🎟️</div>
                <div>
                    <div style="font-weight:800;font-size:16px;font-family:monospace;letter-spacing:1px;color:var(--text-primary);">${c.code}</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
                        ${c.discount_type === 'percent' ? c.discount_value + '% OFF' : currency + c.discount_value + ' OFF'}
                        ${c.min_order_value > 0 ? ' • Min: ' + formatCurrency(c.min_order_value, currency) : ''}
                        ${c.expires_at ? ' • Exp: ' + new Date(c.expires_at).toLocaleDateString() : ' • No expiry'}
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <label class="stock-toggle-switch" title="${c.is_active ? 'Disable' : 'Enable'}">
                    <input type="checkbox" ${c.is_active ? 'checked' : ''} onchange="window.adminApp.toggleCoupon('${c.id}', this.checked)">
                    <span class="slider-round"></span>
                </label>
                <button class="table-action-btn" onclick="window.adminApp.openEditCouponModal('${c.id}')">✏️ Edit</button>
                <button class="table-action-btn" style="color:#DC2626;" onclick="window.adminApp.deleteCoupon('${c.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
};

AdminApp.prototype.openCouponModal = function(couponId) {
    this.editingCouponId = couponId || null;
    const title = document.getElementById('coupon-modal-title');
    if (title) title.textContent = couponId ? '✏️ Edit Coupon' : '🎟️ New Coupon';

    if (couponId) {
        const c = (this.store.getCoupons ? this.store.getCoupons() : []).find(x => x.id === couponId);
        if (c) {
            document.getElementById('coupon-code-input').value = c.code;
            document.getElementById('coupon-type-select').value = c.discount_type;
            document.getElementById('coupon-value-input').value = c.discount_value;
            document.getElementById('coupon-min-order-input').value = c.min_order_value || 0;
            document.getElementById('coupon-max-discount-input').value = c.max_discount || 0;
            document.getElementById('coupon-expiry-input').value = c.expires_at ? c.expires_at.split('T')[0] : '';
            document.getElementById('coupon-active-toggle').checked = c.is_active;
        }
    } else {
        document.getElementById('coupon-code-input').value = '';
        document.getElementById('coupon-type-select').value = 'percent';
        document.getElementById('coupon-value-input').value = '';
        document.getElementById('coupon-min-order-input').value = 0;
        document.getElementById('coupon-max-discount-input').value = 0;
        document.getElementById('coupon-expiry-input').value = '';
        document.getElementById('coupon-active-toggle').checked = true;
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
    const type = document.getElementById('coupon-type-select')?.value;
    const value = Number(document.getElementById('coupon-value-input')?.value);
    const minOrder = Number(document.getElementById('coupon-min-order-input')?.value) || 0;
    const maxDiscount = Number(document.getElementById('coupon-max-discount-input')?.value) || 0;
    const expiryStr = document.getElementById('coupon-expiry-input')?.value;
    const isActive = document.getElementById('coupon-active-toggle')?.checked;

    if (!code) { showToast('Please enter a coupon code', 'warning'); return; }
    if (!value || value <= 0) { showToast('Please enter a valid discount value', 'warning'); return; }

    const couponData = {
        id: this.editingCouponId || `coupons_${Date.now()}`,
        code,
        discount_type: type,
        discount_value: value,
        min_order_value: minOrder,
        max_discount: maxDiscount,
        expires_at: expiryStr ? expiryStr + 'T23:59:59' : null,
        is_active: isActive,
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

AdminApp.prototype.deleteCoupon = function(couponId) {
    if (!confirm('Delete this coupon?')) return;
    if (this.store.deleteCoupon) this.store.deleteCoupon(couponId);
    this.renderCouponsList();
    showToast('Coupon deleted', 'info');
};

window.adminApp = new AdminApp();
