// ==========================================================
// FIRST BITE — STAFF APP CONTROLLER (Mobile-First Rewrite)
// Kitchen Display, Mobile Tabs, Sound Alerts, 86'd Stock
// ==========================================================

class StaffApp {
    constructor() {
        this.store = window.firstBiteStore;
        this.activeTab = 'new';     // new | preparing | ready | history
        this.searchQuery = '';
        this.tickerInterval = null;
        this.isMobile = window.innerWidth < 900;

        this.init();
    }

    async init() {
        this.renderStats();
        this.renderAll();
        this.updateKitchenStatusUI();
        this.setupEventListeners();
        this.setupRealtimeListeners();

        // Fetch fresh orders directly from Supabase on launch
        if (this.store && this.store.syncOrdersFromSupabase) {
            await this.store.syncOrdersFromSupabase();
            this.renderAll();
        }

        // Update elapsed timers every 15 seconds
        this.tickerInterval = setInterval(() => {
            document.querySelectorAll('.order-time-ticker[data-timestamp]').forEach(el => {
                el.textContent = timeAgo(el.dataset.timestamp);
            });
        }, 15000);

        // Handle resize (mobile ↔ desktop toggle)
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 900;
            if (wasMobile !== this.isMobile) this.renderAll();
        });
    }

    // ── STATS ─────────────────────────────────────────────────

    renderStats() {
        const orders = this.store.getOrders();
        const newC    = orders.filter(o => o.status === 'new').length;
        const prepC   = orders.filter(o => o.status === 'preparing' || o.status === 'accepted').length;
        const readyC  = orders.filter(o => o.status === 'ready').length;
        const servedC = orders.filter(o => o.status === 'served').length;

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('stat-count-new',    newC);
        set('stat-count-prep',   prepC);
        set('stat-count-ready',  readyC);
        set('stat-count-served', servedC);

        // Mobile bottom tab badge dots
        this._updateBadgeDot('badge-new-tab',   newC);
        this._updateBadgeDot('badge-prep-tab',  prepC);
        this._updateBadgeDot('badge-ready-tab', readyC);

        // Mobile column count badges
        set('col-badge-new',     newC);
        set('col-badge-prep',    prepC);
        set('col-badge-ready',   readyC);

        // Desktop kanban badges
        set('kanban-badge-new',  newC);
        set('kanban-badge-prep', prepC);
        set('kanban-badge-ready',readyC);
    }

    _updateBadgeDot(id, count) {
        const el = document.getElementById(id);
        if (!el) return;
        if (count > 0) {
            el.textContent = count > 9 ? '9+' : count;
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    }

    // ── RENDER ALL LISTS ──────────────────────────────────────

    renderAll() {
        const orders = this.store.getOrders();
        const currency = this.store.getRestaurant().currency || '₹';

        const filtered = orders.filter(o => {
            if (!this.searchQuery) return true;
            const q = this.searchQuery.toLowerCase();
            return (
                (o.order_number && o.order_number.toLowerCase().includes(q)) ||
                (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
                (o.table_number  && o.table_number.toLowerCase().includes(q))
            );
        });

        const byStatus = (s) => filtered.filter(o =>
            s === 'preparing' ? (o.status === 'preparing' || o.status === 'accepted') : o.status === s
        );
        const historyOrders = filtered.filter(o => o.status === 'served' || o.status === 'cancelled');

        const newOrders   = byStatus('new');
        const prepOrders  = byStatus('preparing');
        const readyOrders = byStatus('ready');

        // Mobile columns
        this._renderColumn('mobile-list-new',     newOrders,    currency, false);
        this._renderColumn('mobile-list-prep',    prepOrders,   currency, false);
        this._renderColumn('mobile-list-ready',   readyOrders,  currency, false);
        this._renderHistory('mobile-list-history', historyOrders, currency);

        // Desktop kanban columns
        this._renderColumn('kanban-list-new',       newOrders,    currency, true);
        this._renderColumn('kanban-list-prep',      prepOrders,   currency, true);
        this._renderColumn('kanban-list-ready-desk',readyOrders,  currency, true);

        this.renderStats();
        this._bindCardActions();
    }

    _renderColumn(containerId, orders, currency, isDesktop) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-col-state">
                    <div class="empty-col-icon">✨</div>
                    <p>No orders here right now</p>
                </div>`;
            return;
        }

        container.innerHTML = orders.map(o => this._buildCard(o, currency)).join('');
    }

    _renderHistory(containerId, orders, currency) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const el = document.getElementById('col-badge-history');
        if (el) el.textContent = orders.length;

        if (orders.length === 0) {
            container.innerHTML = `<div class="empty-col-state"><div class="empty-col-icon">📜</div><p>No completed or cancelled orders yet</p></div>`;
            return;
        }

        container.innerHTML = orders.map(o => {
            const isCancelled = o.status === 'cancelled';
            const items = Array.isArray(o.items) ? o.items : [];
            return `
            <div class="history-card ${isCancelled ? 'is-cancelled' : ''}">
                <div class="flex-between" style="margin-bottom:6px;">
                    <span style="font-weight:800;color:#0F172A;font-family:monospace;font-size:15px;">${o.order_number}</span>
                    <span class="history-status-pill ${o.status}">${isCancelled ? 'CANCELLED ✕' : 'SERVED ✓'}</span>
                </div>
                <div style="font-size:12px;color:#64748B;margin-bottom:6px;">
                    ${o.customer_name} • ${timeAgo(o.created_at)} • ${o.order_type === 'dine_in' ? (o.table_number || 'Dine-in') : 'Takeaway'}
                </div>
                <div style="font-size:13px;color:#1E293B;margin-bottom:6px;">
                    ${items.length > 0 ? items.map(i => `${i.quantity || 1}x ${i.name}`).join(', ') : 'Order items'}
                </div>
                ${isCancelled && o.cancellation_reason ? `
                    <div style="font-size:11.5px;color:#DC2626;background:#FEF2F2;padding:4px 8px;border-radius:4px;margin-bottom:6px;border:1px dashed #FECACA;">
                        <strong>Cancellation Reason:</strong> ${o.cancellation_reason}
                    </div>` : ''}
                ${o.coupon_code ? `
                    <div style="margin-bottom:6px;">
                        <span class="coupon-applied-tag">🎟️ Coupon: ${o.coupon_code} (-${formatCurrency(o.discount || 0, currency)})</span>
                    </div>` : ''}
                <div class="flex-between" style="border-top:1px solid #E2E8F0;padding-top:6px;">
                    <span style="font-weight:800;color:#0F172A;">${formatCurrency(o.total, currency)}</span>
                    <span class="pay-badge ${o.payment_status}">${o.payment_status === 'paid' ? 'PAID ✓' : 'CASH PENDING'}</span>
                </div>
            </div>
            `;
        }).join('');
    }

    _buildCard(order, currency) {
        const isNew   = order.status === 'new';
        const isPrep  = order.status === 'preparing' || order.status === 'accepted';
        const isReady = order.status === 'ready';

        const hasPhone = Boolean(order.customer_phone);
        const isVerified = Boolean(order.is_verified || hasPhone);
        const items = Array.isArray(order.items) ? order.items : [];

        // Prep time elapsed ticker badge
        const createdMs = new Date(order.created_at).getTime();
        const elapsedMins = Math.max(0, Math.floor((Date.now() - createdMs) / 60000));

        return `
        <div class="staff-card ${isNew ? 'new-order-pulse' : ''}" id="staff-card-${order.id}">
            <div class="card-top-row">
                <span class="order-number">${order.order_number}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                    ${isPrep ? `<span class="cook-timer-badge">👨‍🍳 ${elapsedMins}m in kitchen</span>` : ''}
                    <span class="order-time-ticker" data-timestamp="${order.created_at}">${timeAgo(order.created_at)}</span>
                </div>
            </div>

            <!-- Customer & Table Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 8px 0;flex-wrap:wrap;gap:6px;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-weight:800;font-size:14.5px;color:#0F172A;">${order.customer_name || 'Customer'}</span>
                    ${isVerified ? `
                        <span class="customer-verified-badge" title="Customer Phone Verified">
                            ✓ Verified
                        </span>
                    ` : ''}
                    ${hasPhone ? `
                        <a href="tel:${order.customer_phone}" class="call-customer-btn" title="Call customer to verify">
                            📞 ${order.customer_phone}
                        </a>
                    ` : ''}
                </div>
                <span class="${order.order_type === 'dine_in' ? 'table-highlight-badge' : 'takeaway-highlight-badge'}">
                    ${order.order_type === 'dine_in' ? `🍽️ ${order.table_number || 'Dine-in'}` : '🛍️ TAKEAWAY'}
                </span>
            </div>

            <div class="order-items-table">
                ${items.map(it => `
                    <div class="order-item-row">
                        <div>
                            <span class="item-qty-name">${it.quantity || 1}× ${it.name}</span>
                            ${it.selected_add_ons && it.selected_add_ons.length > 0 ?
                                `<div class="item-addons-tag">+ ${it.selected_add_ons.map(a => a.name).join(', ')}</div>` : ''}
                        </div>
                        <span style="font-weight:700;color:#64748B;">${formatCurrency(it.item_total || ((it.price || 0) * (it.quantity || 1)), currency)}</span>
                    </div>
                `).join('')}
            </div>

            ${order.instructions ? `<div class="instructions-box">📝 <b>Note:</b> ${order.instructions}</div>` : ''}
            ${order.coupon_code ? `<div style="margin-bottom:8px;"><span class="coupon-applied-tag">🎟️ Coupon: ${order.coupon_code} (-${formatCurrency(order.discount || 0, currency)})</span></div>` : ''}

            <div class="payment-row">
                <div>
                    <span style="font-size:12px;color:#64748B;">Total:</span>
                    <span style="font-weight:800;font-size:16px;color:#0F172A;margin-left:4px;">${formatCurrency(order.total, currency)}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="pay-badge ${order.payment_status}">${order.payment_status === 'paid' ? 'PAID ONLINE ✓' : 'CASH PENDING'}</span>
                    ${order.payment_status !== 'paid' ?
                        `<button class="mark-paid-btn" data-action-pay="${order.id}">Mark Paid</button>` : ''}
                </div>
            </div>

            <div class="staff-card-actions">
                ${isNew ? `
                    <button class="btn-staff-action btn-reject" data-cancel-order="${order.id}" data-order-num="${order.order_number}" title="Decline order">
                        ✕ Decline
                    </button>
                    <button class="btn-kot" data-action-kot="${order.id}" title="Print Kitchen Order Ticket">
                        🖨️ KOT
                    </button>
                    <button class="btn-staff-action btn-accept" data-action-status="preparing" data-order-id="${order.id}">
                        ✓ Accept & Cook 👨‍🍳
                    </button>
                ` : ''}
                ${isPrep ? `
                    <button class="btn-kot" data-action-kot="${order.id}" title="Print Kitchen Order Ticket">
                        🖨️ KOT
                    </button>
                    <button class="btn-staff-action btn-ready" data-action-status="ready" data-order-id="${order.id}">
                        📦 Mark Ready
                    </button>
                    <button class="btn-staff-action btn-cancel-any" title="Cancel this order" data-cancel-order="${order.id}" data-order-num="${order.order_number}">
                        ✕
                    </button>
                ` : ''}
                ${isReady ? `
                    <button class="btn-kot" data-action-kot="${order.id}" title="Print Kitchen Order Ticket">
                        🖨️ KOT
                    </button>
                    <button class="btn-staff-action btn-serve" data-action-status="served" data-order-id="${order.id}">
                        ✓ Deliver / Served
                    </button>
                    <button class="btn-staff-action btn-cancel-any" title="Cancel this order" data-cancel-order="${order.id}" data-order-num="${order.order_number}">
                        ✕
                    </button>
                ` : ''}
            </div>
        </div>`;
    }

    printKOT(orderId) {
        const order = this.store.getOrderById(orderId);
        if (!order) return;
        const currency = this.store.getRestaurant().currency || '₹';
        const items = Array.isArray(order.items) ? order.items : [];

        let printDiv = document.getElementById('kot-print-area');
        if (!printDiv) {
            printDiv = document.createElement('div');
            printDiv.id = 'kot-print-area';
            document.body.appendChild(printDiv);
        }

        printDiv.innerHTML = `
            <div style="font-family:'Courier New', monospace; width: 280px; margin: 0 auto; padding: 12px 6px; font-size: 13px; color: #000; line-height: 1.35;">
                <div style="text-align: center; border-bottom: 1.5px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
                    <div style="font-size: 17px; font-weight: 900; letter-spacing: 1px;">FIRST BITE BISTRO</div>
                    <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">*** KITCHEN ORDER TICKET (KOT) ***</div>
                </div>
                <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px;">
                    <div style="display:flex;justify-content:space-between;font-weight:900;font-size:15px;">
                        <span>ORDER: ${order.order_number}</span>
                        <span>${order.order_type === 'dine_in' ? (order.table_number || 'DINE-IN') : 'TAKEAWAY'}</span>
                    </div>
                    <div style="margin-top: 4px; font-size: 11.5px;">
                        <div>Customer: <b>${order.customer_name || 'Guest'}</b></div>
                        <div>Phone: <b>${order.customer_phone || 'N/A'}</b> ${order.is_verified ? '(VERIFIED ✓)' : ''}</div>
                        <div>Time: ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div>Payment: <b>${order.payment_method === 'online' ? 'PAID ONLINE ✓' : 'PAY AT COUNTER'}</b></div>
                    </div>
                </div>
                <div style="border-bottom: 1.5px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #000;">
                                <th style="padding: 2px 0;">QTY</th>
                                <th style="padding: 2px 0;">ITEM</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(it => `
                                <tr>
                                    <td style="font-weight: 900; font-size: 15px; vertical-align: top; width: 34px; padding: 4px 0;">${it.quantity || 1}×</td>
                                    <td style="padding: 4px 0;">
                                        <div style="font-weight: 800; font-size: 14px;">${it.name}</div>
                                        ${it.selected_add_ons && it.selected_add_ons.length > 0 ?
                                            `<div style="font-size: 11px; color: #333;">+ ${it.selected_add_ons.map(a => a.name).join(', ')}</div>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${order.instructions ? `
                    <div style="background: #F4F4F4; border: 1px dashed #000; padding: 6px; margin-bottom: 8px; font-size: 12px;">
                        <b>KITCHEN NOTE:</b><br>${order.instructions}
                    </div>
                ` : ''}
                <div style="text-align: center; font-size: 11px; margin-top: 6px;">
                    --- End of KOT ---
                </div>
            </div>
        `;

        window.print();
    }

    _bindCardActions() {
        // KOT Print buttons
        document.querySelectorAll('[data-action-kot]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.printKOT(btn.dataset.actionKot);
            });
        });

        // Status progression buttons
        document.querySelectorAll('[data-action-status]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId   = btn.dataset.orderId;
                const newStatus = btn.dataset.actionStatus;

                this.store.updateOrderStatus(orderId, newStatus);

                if (window.sounds) {
                    if (newStatus === 'ready') window.sounds.playReadyFanfare();
                    else window.sounds.playClick();
                }

                if (this.isMobile) {
                    if (newStatus === 'preparing') this.switchTab('preparing');
                    else if (newStatus === 'ready') this.switchTab('ready');
                    else if (newStatus === 'served') this.switchTab('history');
                }

                showToast(`Order ${newStatus.toUpperCase()} ✓`, 'success');
                this.renderAll();
            });
        });

        // Cancel order buttons
        document.querySelectorAll('[data-cancel-order]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCancelModal(btn.dataset.cancelOrder, btn.dataset.orderNum);
            });
        });

        // Mark paid buttons
        document.querySelectorAll('[data-action-pay]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.store.updatePaymentStatus(btn.dataset.actionPay, 'paid');
                if (window.sounds) window.sounds.playCashPaid();
                showToast('Payment collected ✓', 'success');
                this.renderAll();
            });
        });
    }

    // ── TAB SWITCHING (mobile) ────────────────────────────────

    switchTab(tab) {
        this.activeTab = tab;

        // Update bottom nav active state
        document.querySelectorAll('.staff-nav-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Show/hide column views
        const tabToView = {
            new:       'view-new',
            preparing: 'view-preparing',
            ready:     'view-ready',
            history:   'view-history'
        };

        document.querySelectorAll('.staff-column-view').forEach(v => {
            v.classList.toggle('active', v.id === tabToView[tab]);
        });
    }

    // ── STOCK MODAL ───────────────────────────────────────────

    openStockModal() {
        const container = document.getElementById('stock-items-list');
        const menu = this.store.getMenuItems();
        const currency = this.store.getRestaurant().currency || '₹';

        container.innerHTML = menu.map(item => `
            <div class="stock-toggle-item">
                <div class="stock-item-info">
                    <span class="diet-icon ${item.is_veg ? 'veg' : 'non-veg'}"></span>
                    <div>
                        <div style="font-weight:700;font-size:13.5px;color:#0F172A;">${item.name}</div>
                        <div style="font-size:12px;color:#64748B;">${formatCurrency(item.price, currency)}</div>
                    </div>
                </div>
                <label class="stock-toggle-switch">
                    <input type="checkbox" ${item.is_available ? 'checked' : ''} data-item-toggle="${item.id}">
                    <span class="slider-round"></span>
                </label>
            </div>
        `).join('');

        container.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
            toggle.addEventListener('change', () => {
                const itemId = toggle.dataset.itemToggle;
                this.store.toggleItemAvailability(itemId, toggle.checked);
                if (window.sounds) window.sounds.playClick();
                showToast(`Item is now ${toggle.checked ? 'IN STOCK ✓' : 'OUT OF STOCK (86)'}`,
                    toggle.checked ? 'success' : 'warning');
            });
        });

        document.getElementById('menu-stock-modal').classList.add('active');
    }

    closeStockModal() {
        document.getElementById('menu-stock-modal')?.classList.remove('active');
    }

    updateKitchenStatusUI() {
        const restaurant = this.store.getRestaurant();
        const isOpen = restaurant.is_open !== false;
        const btn = document.getElementById('kitchen-status-btn');
        const text = document.getElementById('kitchen-status-text');
        const dot = document.getElementById('kitchen-status-dot');

        if (btn) btn.classList.toggle('closed', !isOpen);
        if (text) text.textContent = isOpen ? 'Open' : 'Closed / Paused';
        if (dot) {
            dot.style.background = isOpen ? '#10B981' : '#EF4444';
        }
    }

    // ── CANCEL ORDER MODAL ────────────────────────────────────

    openCancelModal(orderId, orderNum) {
        this.orderToCancel = { id: orderId, number: orderNum };
        const numEl = document.getElementById('cancel-modal-ordernum');
        if (numEl) numEl.textContent = orderNum || '';
        const customInput = document.getElementById('cancel-custom-reason');
        if (customInput) customInput.value = '';
        const reasonSelect = document.getElementById('cancel-reason-select');
        if (reasonSelect) reasonSelect.selectedIndex = 0;

        document.getElementById('cancel-order-modal')?.classList.add('active');
    }

    closeCancelModal() {
        this.orderToCancel = null;
        document.getElementById('cancel-order-modal')?.classList.remove('active');
    }

    confirmCancelOrder() {
        if (!this.orderToCancel) return;
        const reasonSelect = document.getElementById('cancel-reason-select');
        const customInput = document.getElementById('cancel-custom-reason');
        let reason = reasonSelect ? reasonSelect.value : 'Cancelled by kitchen';
        if (customInput && customInput.value.trim()) {
            reason = `${reason}: ${customInput.value.trim()}`;
        }

        const cancelledOrderNum = this.orderToCancel.number || 'Order';
        this.store.updateOrderStatus(this.orderToCancel.id, 'cancelled', reason);
        if (window.sounds) window.sounds.playClick();
        showToast(`Order ${cancelledOrderNum} cancelled ✕`, 'warning');
        this.closeCancelModal();
        this.renderAll();
    }

    // ── EVENT LISTENERS ───────────────────────────────────────

    setupEventListeners() {
        // Mobile bottom nav tabs
        document.querySelectorAll('.staff-nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const muted = window.sounds.toggleMute();
                soundBtn.classList.toggle('muted', muted);
                const label = soundBtn.querySelector('.btn-label');
                if (label) label.textContent = muted ? 'Off' : 'Sound';
                soundBtn.childNodes[0].textContent = muted ? '🔇 ' : '🔊 ';
                showToast(muted ? 'Sound muted 🔇' : 'Sound on 🔊', 'info');
                if (!muted) window.sounds.playOrderAlert();
            });
        }

        // Stock modal open / close
        document.getElementById('open-stock-btn')?.addEventListener('click', () => this.openStockModal());
        document.getElementById('stock-modal-close-btn')?.addEventListener('click', () => this.closeStockModal());
        document.getElementById('menu-stock-modal')?.addEventListener('click', e => {
            if (e.target.id === 'menu-stock-modal') this.closeStockModal();
        });

        // Cancel modal events
        document.getElementById('cancel-modal-close-btn')?.addEventListener('click', () => this.closeCancelModal());
        document.getElementById('cancel-modal-back-btn')?.addEventListener('click', () => this.closeCancelModal());
        document.getElementById('cancel-modal-confirm-btn')?.addEventListener('click', () => this.confirmCancelOrder());
        document.getElementById('cancel-order-modal')?.addEventListener('click', e => {
            if (e.target.id === 'cancel-order-modal') this.closeCancelModal();
        });

        // Kitchen Open / Closed status toggle
        document.getElementById('kitchen-status-btn')?.addEventListener('click', () => {
            const updated = this.store.toggleRestaurantOpen();
            this.updateKitchenStatusUI();
            if (window.sounds) window.sounds.playClick();
            showToast(updated.is_open ? 'Kitchen is now OPEN (Accepting Orders) 🟢' : 'Kitchen is now CLOSED / PAUSED (New Orders Blocked) 🔴', updated.is_open ? 'success' : 'warning');
        });

        // Search
        document.getElementById('staff-search-input')?.addEventListener('input', e => {
            this.searchQuery = e.target.value.trim();
            this.renderAll();
        });
    }

    setupRealtimeListeners() {
        this.store.subscribe('ORDER_CREATED', (event) => {
            if (window.sounds) window.sounds.playOrderAlert();
            if (event && event.order && event.order.order_number) {
                showToast(`🔔 NEW ORDER: ${event.order.order_number} — ${event.order.customer_name || 'Guest'}`, 'warning', 6000);
            }
            this.renderAll();
        });

        this.store.subscribe('ORDER_STATUS_CHANGED', () => this.renderAll());
        this.store.subscribe('ORDER_PAID',           () => this.renderAll());
        this.store.subscribe('DATA_REFRESH',         () => this.renderAll());
        this.store.subscribe('SETTINGS_UPDATED',     () => this.updateKitchenStatusUI());
        this.store.subscribe('MENU_UPDATED',         () => {
            const modal = document.getElementById('menu-stock-modal');
            if (modal?.classList.contains('active')) this.openStockModal();
        });
    }
}

window.staffApp = new StaffApp();
