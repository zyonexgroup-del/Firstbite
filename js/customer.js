// ==========================================================
// FIRST BITE — CUSTOMER APP CONTROLLER
// Mobile-First Ordering, Realtime Tracking & Cart Animations
// ==========================================================

class CustomerApp {
    constructor() {
        this.store = window.firstBiteStore;
        this.cart = this._loadCart();
        this.activeCategory = 'all';
        this.activeDiet = 'all'; // all, veg, non-veg
        this.searchQuery = '';
        this.activeTab = 'home';
        this.currentSelectedItem = null;
        this.selectedAddons = new Set();
        this.detailQuantity = 1;
        this.appliedDiscount = 0;
        this.appliedCouponCode = '';
        this.favorites = this._loadFavorites();

        this.init();
    }

    init() {
        this.renderHeader();
        this.renderCategories();
        this.renderMenuItems();
        this.updateCartBar();
        this.setupEventListeners();
        this.setupRealtimeListeners();

        // Check for table URL query parameter (?table=3 or ?table=Table%203)
        const urlParams = new URLSearchParams(window.location.search);
        const tableParam = urlParams.get('table');
        if (tableParam) {
            const tableVal = tableParam.toLowerCase().startsWith('table') ? tableParam : `Table ${tableParam}`;
            this.tableFromQR = tableVal;
            const tableSelect = document.getElementById('checkout-table-select');
            if (tableSelect) {
                let match = false;
                for (let i = 0; i < tableSelect.options.length; i++) {
                    if (tableSelect.options[i].value.toLowerCase().includes(tableVal.toLowerCase())) {
                        tableSelect.selectedIndex = i;
                        match = true;
                        break;
                    }
                }
                if (!match) {
                    const opt = document.createElement('option');
                    opt.value = tableVal;
                    opt.textContent = `${tableVal} (QR Scanned)`;
                    opt.selected = true;
                    tableSelect.appendChild(opt);
                }
            }
            showToast(`🍽️ Connected to ${tableVal} via Table QR Code!`, 'success', 4000);
        }

        // Check if there is an active order being tracked
        const activeOrderId  = localStorage.getItem('fb_active_order_id');
        const activeOrderNum = localStorage.getItem('fb_active_order_number');
        if (activeOrderId || activeOrderNum) {
            // Immediately show from localStorage if available
            let order = activeOrderId ? this.store.getOrderById(activeOrderId) : null;
            if (!order && activeOrderNum) {
                order = this.store.getOrders().find(o => o.order_number === activeOrderNum) || null;
            }
            if (order && order.status !== 'served' && order.status !== 'cancelled') {
                this.showActiveOrderBanner(order);
            }

            // Then re-fetch from Supabase in background to get the truly latest status
            if (this.store.syncOrdersFromSupabase) {
                this.store.syncOrdersFromSupabase().then(() => {
                    let fresh = activeOrderId ? this.store.getOrderById(activeOrderId) : null;
                    if (!fresh && activeOrderNum) {
                        fresh = this.store.getOrders().find(o => o.order_number === activeOrderNum) || null;
                    }
                    if (fresh) {
                        if (fresh.status !== 'served') {
                            this.showActiveOrderBanner(fresh);
                        }
                        const modal = document.getElementById('order-tracker-modal');
                        if (modal && modal.classList.contains('active')) {
                            this._updateTrackerStatusUI(fresh);
                        }
                    }
                }).catch(() => {});
            }
        }
    }

    _loadCart() {
        try {
            return JSON.parse(localStorage.getItem('fb_customer_cart')) || [];
        } catch {
            return [];
        }
    }

    _saveCart() {
        localStorage.setItem('fb_customer_cart', JSON.stringify(this.cart));
        this.updateCartBar();
    }

    _loadFavorites() {
        try {
            return new Set(JSON.parse(localStorage.getItem('fb_customer_favs')) || []);
        } catch {
            return new Set();
        }
    }

    _saveFavorites() {
        localStorage.setItem('fb_customer_favs', JSON.stringify(Array.from(this.favorites)));
    }

    // ----------------------------------------------------
    // RENDERING
    // ----------------------------------------------------

    renderHeader() {
        const restaurant = this.store.getRestaurant();
        
        // Greeting based on current hour
        const hour = new Date().getHours();
        let greeting = 'Good morning 👋';
        if (hour >= 12 && hour < 17) greeting = 'Good afternoon 👋';
        else if (hour >= 17) greeting = 'Good evening 👋';

        const greetingEl = document.getElementById('user-greeting');
        if (greetingEl) greetingEl.textContent = greeting;

        const nameEl = document.getElementById('restaurant-name');
        if (nameEl) nameEl.textContent = restaurant.name;

        const ratingEl = document.getElementById('restaurant-rating');
        if (ratingEl) ratingEl.innerHTML = `★ ${restaurant.rating || 4.8}`;

        const statusEl = document.getElementById('restaurant-status');
        const isOpen = restaurant.is_open !== false;
        if (statusEl) {
            statusEl.innerHTML = isOpen ? 
                `<span class="pulse-dot" style="width: 6px; height: 6px;"></span> Open Now` : 
                `● Kitchen Closed`;
            statusEl.style.color = isOpen ? '#1B5E20' : '#DC2626';
            statusEl.style.background = isOpen ? '#E8F5E9' : '#FEE2E2';
        }

        const banner = document.getElementById('kitchen-closed-banner');
        if (banner) {
            banner.style.display = isOpen ? 'none' : 'block';
        }
    }

    renderCategories() {
        const categories = this.store.getCategories();
        const container = document.getElementById('categories-slider');
        if (!container) return;

        let html = `
            <div class="category-card ${this.activeCategory === 'all' ? 'active' : ''}" data-cat-id="all">
                <div class="category-icon-box">🍽️</div>
                <span class="category-name">All Items</span>
            </div>
        `;

        categories.forEach(cat => {
            html += `
                <div class="category-card ${this.activeCategory === cat.id ? 'active' : ''}" data-cat-id="${cat.id}">
                    <div class="category-icon-box">${cat.icon || '🍴'}</div>
                    <span class="category-name">${cat.name}</span>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.category-card').forEach(el => {
            el.addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.activeCategory = el.dataset.catId;
                this.renderCategories();
                this.renderMenuItems();
            });
        });
    }

    renderMenuItems() {
        const menu = this.store.getMenuItems();
        const restaurant = this.store.getRestaurant();
        const currency = restaurant.currency || '₹';

        let filtered = menu.filter(item => {
            // Category filter (matches local slug ID or Supabase cloud UUID)
            if (this.activeCategory !== 'all') {
                const itemCat = item.category_id;
                const activeCat = this.activeCategory;
                const isMatch = (itemCat === activeCat) || (this.store.getCategories().some(c => 
                    (c.id === activeCat && (c.cloud_id === itemCat || c.id === itemCat)) ||
                    (c.cloud_id === activeCat && (c.id === itemCat || c.cloud_id === itemCat))
                ));
                if (!isMatch) return false;
            }
            // Dietary filter
            if (this.activeDiet === 'veg' && !item.is_veg) return false;
            if (this.activeDiet === 'non-veg' && item.is_veg) return false;
            // Search filter
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                const matchName = item.name.toLowerCase().includes(q);
                const matchDesc = item.description && item.description.toLowerCase().includes(q);
                if (!matchName && !matchDesc) return false;
            }
            return true;
        });

        const popularContainer = document.getElementById('popular-dishes-list');
        const mainContainer = document.getElementById('main-menu-list');

        // Render Popular Section (if on Home & no search active)
        if (popularContainer) {
            if (this.searchQuery || this.activeCategory !== 'all') {
                document.getElementById('popular-section').style.display = 'none';
            } else {
                document.getElementById('popular-section').style.display = 'block';
                const popularItems = menu.filter(i => i.badge === 'Bestseller' || i.badge === 'Chef Special').slice(0, 3);
                popularContainer.innerHTML = popularItems.map(item => this._buildFoodCardHtml(item, currency)).join('');
            }
        }

        // Render Main Menu Section
        if (mainContainer) {
            if (filtered.length === 0) {
                mainContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                        <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
                        <p style="font-size: 15px; font-weight: 600; color: var(--text-secondary);">No dishes found</p>
                        <p style="font-size: 13px;">Try searching for another dish or clear your filters.</p>
                    </div>
                `;
            } else {
                mainContainer.innerHTML = filtered.map(item => this._buildFoodCardHtml(item, currency)).join('');
            }
        }

        this._bindFoodCardEvents();
    }

    _buildFoodCardHtml(item, currency) {
        const isFav = this.favorites.has(item.id);
        const hasAddons = item.add_ons && item.add_ons.length > 0;
        const isOutOfStock = !item.is_available;

        return `
            <div class="food-card ${isOutOfStock ? 'unavailable' : ''}" data-item-id="${item.id}">
                <div class="food-card-info">
                    <div class="food-tags">
                        <span class="diet-icon ${item.is_veg ? 'veg' : 'non-veg'}"></span>
                        ${item.badge ? `<span class="badge ${item.badge === 'Bestseller' ? 'badge-gold' : 'badge-primary'}">${item.badge}</span>` : ''}
                        ${isOutOfStock ? `<span class="badge" style="background:#FEE2E2; color:#B91C1C;">Sold Out</span>` : ''}
                    </div>
                    <h3 class="food-title">${item.name}</h3>
                    <p class="food-desc">${item.description || ''}</p>
                    
                    <div class="food-meta">
                        <span>★ ${item.rating || 4.8}</span>
                        ${item.prep_time ? `<span>⏱ ${item.prep_time}</span>` : ''}
                        ${item.calories ? `<span>🔥 ${item.calories}</span>` : ''}
                    </div>

                    <div class="food-price-row">
                        <span class="food-price">${formatCurrency(item.price, currency)}</span>
                    </div>
                </div>

                <div class="food-card-media">
                    <img src="${item.image_url}" alt="${item.name}" class="food-thumb" loading="lazy">
                    <button class="fav-btn ${isFav ? 'active' : ''}" data-fav-id="${item.id}" title="Save favorite">
                        ${isFav ? '❤️' : '🤍'}
                    </button>
                    ${!isOutOfStock ? `
                        <button class="add-btn" data-action-add="${item.id}">
                            ADD <span style="font-size: 14px; font-weight: 800;">+</span>
                        </button>
                    ` : ''}
                    ${hasAddons && !isOutOfStock ? `<span class="customisable-text">Customisable</span>` : ''}
                </div>
            </div>
        `;
    }

    _bindFoodCardEvents() {
        // Card click -> open detail sheet
        document.querySelectorAll('.food-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.fav-btn') || e.target.closest('.add-btn')) return;
                const itemId = card.dataset.itemId;
                this.openItemDetailSheet(itemId);
            });
        });

        // Favorite toggle
        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.sounds) window.sounds.playClick();
                const itemId = btn.dataset.favId;
                if (this.favorites.has(itemId)) {
                    this.favorites.delete(itemId);
                    showToast('Removed from favorites', 'info');
                } else {
                    this.favorites.add(itemId);
                    showToast('Saved to favorites! ❤️', 'success');
                }
                this._saveFavorites();
                this.renderMenuItems();
                if (this.activeTab === 'favorites') this.renderFavoritesView();
            });
        });

        // Quick ADD button
        document.querySelectorAll('[data-action-add]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.actionAdd;
                const item = this.store.getMenuItems().find(i => i.id === itemId);
                if (!item) return;

                if (item.add_ons && item.add_ons.length > 0) {
                    // Open detail bottom sheet so user can choose customizations
                    this.openItemDetailSheet(itemId);
                } else {
                    // Direct add without add-ons
                    this.addToCart(item, [], 1);
                    const cardMedia = btn.closest('.food-card').querySelector('.food-card-media');
                    const cartTarget = document.getElementById('floating-cart-bar') || document.getElementById('nav-cart-tab');
                    triggerFlyToCart(cardMedia, cartTarget);
                    showToast(`Added ${item.name} to cart!`, 'success');
                }
            });
        });
    }

    // ----------------------------------------------------
    // DETAIL BOTTOM SHEET
    // ----------------------------------------------------

    openItemDetailSheet(itemId) {
        const item = this.store.getMenuItems().find(i => i.id === itemId);
        if (!item) return;

        this.currentSelectedItem = item;
        this.selectedAddons.clear();
        this.detailQuantity = 1;

        const sheetOverlay = document.getElementById('item-detail-sheet');
        const currency = this.store.getRestaurant().currency || '₹';

        document.getElementById('sheet-hero-img').src = item.image_url;
        document.getElementById('sheet-food-name').textContent = item.name;
        document.getElementById('sheet-food-desc').textContent = item.description || '';
        document.getElementById('sheet-food-price').textContent = formatCurrency(item.price, currency);

        const dietEl = document.getElementById('sheet-diet-icon');
        dietEl.className = `diet-icon ${item.is_veg ? 'veg' : 'non-veg'}`;

        const addonsSection = document.getElementById('sheet-addons-container');
        if (item.add_ons && item.add_ons.length > 0) {
            addonsSection.style.display = 'block';
            let addonsHtml = '';
            item.add_ons.forEach((addon, idx) => {
                addonsHtml += `
                    <label class="addon-row" for="addon-${idx}">
                        <div class="addon-left">
                            <input type="checkbox" id="addon-${idx}" data-addon-name="${addon.name}" data-addon-price="${addon.price}">
                            <span>${addon.name}</span>
                        </div>
                        <span class="addon-price">+${formatCurrency(addon.price, currency)}</span>
                    </label>
                `;
            });
            document.getElementById('sheet-addons-list').innerHTML = addonsHtml;

            // Bind checkbox listeners
            document.querySelectorAll('#sheet-addons-list input[type="checkbox"]').forEach(input => {
                input.addEventListener('change', () => {
                    const addonObj = {
                        name: input.dataset.addonName,
                        price: Number(input.dataset.addonPrice)
                    };
                    if (input.checked) {
                        this.selectedAddons.add(addonObj);
                    } else {
                        // Remove by name
                        for (let a of this.selectedAddons) {
                            if (a.name === addonObj.name) {
                                this.selectedAddons.delete(a);
                                break;
                            }
                        }
                    }
                    this._updateSheetTotalButton();
                });
            });
        } else {
            addonsSection.style.display = 'none';
        }

        document.getElementById('sheet-qty-val').textContent = this.detailQuantity;
        this._updateSheetTotalButton();

        sheetOverlay.classList.add('active');
        if (window.sounds) window.sounds.playClick();
    }

    _updateSheetTotalButton() {
        if (!this.currentSelectedItem) return;
        const currency = this.store.getRestaurant().currency || '₹';
        const btn = document.getElementById('sheet-submit-add-btn');
        if (!btn) return;

        if (this.currentSelectedItem.is_available === false) {
            btn.disabled = true;
            btn.innerHTML = `OUT OF STOCK`;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            return;
        }

        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';

        let addonsTotal = 0;
        this.selectedAddons.forEach(a => addonsTotal += a.price);
        const singleTotal = this.currentSelectedItem.price + addonsTotal;
        const finalTotal = singleTotal * this.detailQuantity;

        btn.innerHTML = `ADD TO CART • ${formatCurrency(finalTotal, currency)}`;
    }

    closeItemDetailSheet() {
        const sheetOverlay = document.getElementById('item-detail-sheet');
        sheetOverlay.classList.remove('active');
        this.currentSelectedItem = null;
    }

    // ----------------------------------------------------
    // CART OPERATIONS
    // ----------------------------------------------------

    addToCart(item, addons = [], quantity = 1) {
        // Create unique signature based on item id and selected addon names
        const addonNames = addons.map(a => a.name).sort().join('|');
        const existingIdx = this.cart.findIndex(c => c.item.id === item.id && c.addonSignature === addonNames);

        if (existingIdx !== -1) {
            this.cart[existingIdx].quantity += quantity;
        } else {
            this.cart.push({
                item,
                addons,
                addonSignature: addonNames,
                quantity
            });
        }

        if (this.appliedCouponCode) {
            const summary = this.getCartSummary();
            const check = this.store.validateCoupon(this.appliedCouponCode, summary.subtotal);
            if (check.valid) {
                this.appliedDiscount = check.discount;
            }
        }

        this._saveCart();
    }

    updateCartQuantity(index, delta) {
        if (!this.cart[index]) return;
        this.cart[index].quantity += delta;
        if (this.cart[index].quantity <= 0) {
            this.cart.splice(index, 1);
        }
        if (this.appliedCouponCode) {
            const summary = this.getCartSummary();
            const check = this.store.validateCoupon(this.appliedCouponCode, summary.subtotal);
            if (check.valid) {
                this.appliedDiscount = check.discount;
            } else {
                this.appliedDiscount = 0;
                this.appliedCouponCode = '';
                const promoInput = document.getElementById('promo-input');
                if (promoInput) promoInput.value = '';
                showToast(`Promo removed: ${check.message}`, 'warning');
            }
        }
        this._saveCart();
        this.renderCartModal();
        this.updateCartBar();
    }

    getCartSummary() {
        const restaurant = this.store.getRestaurant();
        let subtotal = 0;
        let totalItemsCount = 0;

        this.cart.forEach(entry => {
            let itemPrice = entry.item.price;
            entry.addons.forEach(a => itemPrice += a.price);
            subtotal += itemPrice * entry.quantity;
            totalItemsCount += entry.quantity;
        });

        const taxRate = restaurant.tax_rate || 5.0; // 5% GST
        const tax = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
        const discount = this.appliedDiscount;
        const finalTotal = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);

        return {
            subtotal,
            tax,
            taxRate,
            discount,
            total: finalTotal,
            itemCount: totalItemsCount
        };
    }

    updateCartBar() {
        const bar = document.getElementById('floating-cart-bar');
        const headerCartCount = document.getElementById('header-cart-count');
        const summary = this.getCartSummary();
        const currency = this.store.getRestaurant().currency || '₹';

        if (headerCartCount) {
            headerCartCount.textContent = summary.itemCount > 0 ? summary.itemCount : '';
            headerCartCount.style.display = summary.itemCount > 0 ? 'flex' : 'none';
        }

        if (!bar) return;

        if (summary.itemCount > 0) {
            document.getElementById('cart-bar-count').textContent = `${summary.itemCount} ${summary.itemCount === 1 ? 'item' : 'items'}`;
            document.getElementById('cart-bar-total').textContent = formatCurrency(summary.total, currency);
            bar.classList.add('visible');
        } else {
            bar.classList.remove('visible');
        }
    }

    openCartModal() {
        this.renderCartModal();
        const modal = document.getElementById('cart-drawer-modal');
        modal.classList.add('active');
        if (window.sounds) window.sounds.playClick();
    }

    closeCartModal() {
        const modal = document.getElementById('cart-drawer-modal');
        modal.classList.remove('active');
    }

    renderCartModal() {
        const container = document.getElementById('cart-items-container');
        const emptyState = document.getElementById('cart-empty-state');
        const billContainer = document.getElementById('cart-bill-section');
        const summary = this.getCartSummary();
        const currency = this.store.getRestaurant().currency || '₹';

        if (this.cart.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (billContainer) billContainer.style.display = 'none';
            if (container) container.innerHTML = '';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (billContainer) billContainer.style.display = 'block';

        let html = '';
        this.cart.forEach((entry, idx) => {
            let unitPrice = entry.item.price;
            entry.addons.forEach(a => unitPrice += a.price);
            const lineTotal = unitPrice * entry.quantity;

            html += `
                <div class="cart-item-row">
                    <div style="flex: 1;">
                        <div class="cart-item-name">${entry.item.name}</div>
                        ${entry.addons.length > 0 ? `
                            <div class="cart-item-addons">+ ${entry.addons.map(a => a.name).join(', ')}</div>
                        ` : ''}
                        <div style="font-weight: 700; color: var(--primary); font-size: 13px; margin-top: 4px;">
                            ${formatCurrency(lineTotal, currency)}
                        </div>
                    </div>
                    <div class="quantity-stepper" style="height: 32px;">
                        <button class="stepper-btn" onclick="window.customerApp.updateCartQuantity(${idx}, -1)" style="width: 28px; height: 32px;">-</button>
                        <span class="stepper-val" style="width: 26px; font-size: 13px;">${entry.quantity}</span>
                        <button class="stepper-btn" onclick="window.customerApp.updateCartQuantity(${idx}, 1)" style="width: 28px; height: 32px;">+</button>
                    </div>
                </div>
            `;
        });

        if (container) container.innerHTML = html;

        // Bill details
        document.getElementById('bill-subtotal').textContent = formatCurrency(summary.subtotal, currency);
        document.getElementById('bill-tax').textContent = formatCurrency(summary.tax, currency);
        document.getElementById('bill-tax-label').textContent = `GST & Taxes (${summary.taxRate}%)`;
        document.getElementById('bill-discount').textContent = `- ${formatCurrency(summary.discount, currency)}`;
        document.getElementById('bill-total').textContent = formatCurrency(summary.total, currency);

        const discountRow = document.getElementById('bill-discount-row');
        if (discountRow) {
            discountRow.style.display = summary.discount > 0 ? 'flex' : 'none';
        }

        // Render promo hint pills from store coupons (only publicly visible coupons)
        const promoPillsContainer = document.getElementById('promo-hint-pills');
        if (promoPillsContainer) {
            const activeCoupons = this.store.getCoupons().filter(c => c.is_active && c.is_visible !== false);
            if (activeCoupons.length > 0) {
                promoPillsContainer.innerHTML = activeCoupons.map(c => {
                    const isPct = c.discount_type === 'percentage' || c.discount_type === 'percent';
                    const label = isPct ? `${c.discount_value}% OFF` : `${currency}${c.discount_value} OFF`;
                    const minAmt = Number(c.min_order_amount ?? c.min_order_value) || 0;
                    const minText = minAmt > 0 ? ` (Min ₹${minAmt})` : '';
                    const isApplied = this.appliedCouponCode && this.appliedCouponCode.toUpperCase() === c.code.toUpperCase();
                    return `
                    <button type="button" class="promo-hint-chip" onclick="window.customerApp.applyPromoCode('${c.code}')" 
                            style="font-size:11px;background:${isApplied ? '#DCFCE7' : '#ECFDF5'};color:${isApplied ? '#15803D' : '#065F46'};border:1px dashed ${isApplied ? '#16A34A' : '#6EE7B7'};border-radius:20px;padding:3px 9px;cursor:pointer;font-weight:700;">
                        🎟️ ${c.code} (${label}${minText}) ${isApplied ? '✓' : ''}
                    </button>
                    `;
                }).join('');
            } else {
                promoPillsContainer.innerHTML = '';
            }
        }

        // Render applied promo badge with clear remove button
        const appliedTag = document.getElementById('applied-promo-tag');
        if (appliedTag) {
            if (this.appliedCouponCode && summary.discount > 0) {
                appliedTag.style.display = 'block';
                appliedTag.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#F0FDF4;border:1px solid #BBF7D0;padding:8px 12px;border-radius:8px;">
                        <span style="font-weight:700;color:#16A34A;font-size:12.5px;">🎟️ <b>${this.appliedCouponCode}</b> Applied (-${formatCurrency(summary.discount, currency)})</span>
                        <button type="button" onclick="window.customerApp.removePromoCode()" style="background:none;border:none;color:#DC2626;font-size:12px;font-weight:700;cursor:pointer;padding:2px 6px;">✕ Remove</button>
                    </div>
                `;
            } else {
                appliedTag.style.display = 'none';
                appliedTag.innerHTML = '';
            }
        }
    }

    applyPromoCode(code) {
        code = (code || '').trim().toUpperCase();
        if (!code) {
            this.removePromoCode();
            return;
        }

        const summary = this.getCartSummary();
        const result = this.store.validateCoupon(code, summary.subtotal);

        if (!result.valid) {
            showToast(result.message, 'warning');
            return;
        }

        this.appliedDiscount = result.discount;
        this.appliedCouponCode = result.coupon.code;
        const promoInput = document.getElementById('promo-input');
        if (promoInput) promoInput.value = result.coupon.code;

        showToast(result.message, 'success');
        if (window.sounds) window.sounds.playClick();

        this.renderCartModal();
        this.updateCartBar();
    }

    removePromoCode() {
        this.appliedDiscount = 0;
        this.appliedCouponCode = '';
        const promoInput = document.getElementById('promo-input');
        if (promoInput) promoInput.value = '';
        showToast('Promo code removed', 'info');
        this.renderCartModal();
        this.updateCartBar();
    }

    // ----------------------------------------------------
    // CHECKOUT & ORDER CREATION
    // ----------------------------------------------------

    openCheckoutModal() {
        const restaurant = this.store.getRestaurant();
        if (restaurant.is_open === false) {
            showToast('⚠️ Kitchen is currently closed / paused. New orders cannot be placed.', 'warning', 5000);
            return;
        }

        if (this.cart.length === 0) {
            showToast('Your cart is empty', 'warning');
            return;
        }
        this.closeCartModal();

        const modal = document.getElementById('checkout-modal');
        const summary = this.getCartSummary();
        const currency = this.store.getRestaurant().currency || '₹';

        // Pre-fill customer details from storage if available
        const savedName = localStorage.getItem('fb_user_name') || '';
        const savedPhone = localStorage.getItem('fb_user_phone') || '';
        if (savedName) document.getElementById('checkout-name').value = savedName;
        if (savedPhone) document.getElementById('checkout-phone').value = savedPhone;

        document.getElementById('checkout-pay-total').textContent = formatCurrency(summary.total, currency);
        modal.classList.add('active');
        if (window.sounds) window.sounds.playClick();
    }

    closeCheckoutModal() {
        const modal = document.getElementById('checkout-modal');
        modal.classList.remove('active');
    }

    processOrder() {
        const nameInput = document.getElementById('checkout-name');
        const phoneInput = document.getElementById('checkout-phone');
        const orderType = document.querySelector('input[name="order_type"]:checked').value;
        const tableNumber = orderType === 'dine_in' ? document.getElementById('checkout-table-select').value : null;
        const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
        const instructions = document.getElementById('checkout-instructions').value;

        const customerName = nameInput.value.trim() || 'Guest Diner';
        const customerPhone = phoneInput.value.trim() || '';

        // Save customer details in storage for next time
        if (customerName) localStorage.setItem('fb_user_name', customerName);
        if (customerPhone) localStorage.setItem('fb_user_phone', customerPhone);

        const summary = this.getCartSummary();

        // Format items for order
        const formattedItems = this.cart.map(c => {
            let unitPrice = c.item.price;
            c.addons.forEach(a => unitPrice += a.price);
            return {
                name: c.item.name,
                price: unitPrice,
                quantity: c.quantity,
                selected_add_ons: c.addons,
                item_total: unitPrice * c.quantity
            };
        });

        const basePayload = {
            customer_name: customerName,
            customer_phone: customerPhone,
            order_type: orderType,
            table_number: tableNumber,
            items: formattedItems,
            subtotal: summary.subtotal,
            tax: summary.tax,
            discount: summary.discount,
            coupon_code: this.appliedCouponCode || null,
            total: summary.total,
            instructions,
            is_verified: true,
            verification_type: 'OTP Verified',
            is_qr_scanned: Boolean(this.tableFromQR)
        };

        // If online payment is selected, show simulated payment gateway dialog first
        if (paymentMethod === 'online') {
            this._showOnlinePaymentSimulator(summary.total, () => {
                this._finalizeOrder({
                    ...basePayload,
                    payment_method: 'online'
                });
            });
        } else {
            this._finalizeOrder({
                ...basePayload,
                payment_method: 'cash'
            });
        }
    }

    _showOnlinePaymentSimulator(amount, onSuccess) {
        const payModal = document.getElementById('payment-gateway-modal');
        const currency = this.store.getRestaurant().currency || '₹';
        document.getElementById('gateway-pay-amount').textContent = formatCurrency(amount, currency);

        payModal.classList.add('active');

        // Simulated auto-processing progress
        const progressBar = document.getElementById('gateway-progress-bar');
        progressBar.style.width = '0%';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 25;
            progressBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    payModal.classList.remove('active');
                    if (window.sounds) window.sounds.playCashPaid();
                    showToast('Online Payment Successful! 💳', 'success');
                    onSuccess();
                }, 400);
            }
        }, 300);
    }

    _finalizeOrder(orderData) {
        this.closeCheckoutModal();

        // Create order via Supabase Store (sub-second broadcast)
        const order = this.store.createOrder(orderData);

        // Immediately store order_number as stable tracker reference
        // (fb_active_order_id starts as temp ID; fb_active_order_number is always stable)
        localStorage.setItem('fb_active_order_number', order.order_number);

        // Clear customer cart
        this.cart = [];
        this.appliedDiscount = 0;
        this.appliedCouponCode = '';
        this._saveCart();

        // Launch celebratory confetti (sound removed per user request, animation kept)
        launchConfetti(3500);

        showToast(`Order ${order.order_number} placed successfully!`, 'success');

        // Open live order tracker
        this.openOrderTracker(order.id);
    }

    // ----------------------------------------------------
    // LIVE ORDER TRACKER
    // ----------------------------------------------------

    openOrderTracker(orderId) {
        const order = this.store.getOrderById(orderId);
        if (!order) return;

        const modal = document.getElementById('order-tracker-modal');
        const currency = this.store.getRestaurant().currency || '₹';

        document.getElementById('tracker-order-num').textContent = order.order_number;
        document.getElementById('tracker-order-type').textContent = order.order_type === 'dine_in' ? 
            `🍽️ Dine-in • ${order.table_number || 'Table Service'}` : `🛍️ Takeaway / Pickup`;

        this._updateTrackerStatusUI(order);

        // Render tracker items summary
        let itemsHtml = '';
        const orderItems = Array.isArray(order.items) ? order.items : [];
        orderItems.forEach(it => {
            itemsHtml += `
                <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0;">
                    <span>${it.quantity || 1}x ${it.name}</span>
                    <span style="font-weight: 600;">${formatCurrency(it.item_total || ((it.price || 0) * (it.quantity || 1)), currency)}</span>
                </div>
            `;
        });
        document.getElementById('tracker-items-list').innerHTML = itemsHtml;
        document.getElementById('tracker-total-amount').textContent = formatCurrency(order.total, currency);

        modal.classList.add('active');
    }

    _updateTrackerStatusUI(order) {
        const cancelledAlert = document.getElementById('tracker-cancelled-alert');
        const stepper = document.getElementById('tracker-status-stepper');

        if (order.status === 'cancelled') {
            // Show cancelled banner, dim stepper
            if (cancelledAlert) cancelledAlert.style.display = 'block';
            if (stepper) stepper.style.opacity = '0.3';

            const reasonEl = document.getElementById('tracker-cancel-reason-text');
            if (reasonEl) {
                reasonEl.textContent = order.cancellation_reason
                    ? `Reason: ${order.cancellation_reason}`
                    : 'The kitchen was unable to process your order. Please choose new items.';
            }

            const estimateEl = document.getElementById('tracker-estimate-text');
            if (estimateEl) estimateEl.innerHTML = `<span style="color:#DC2626;font-weight:700;">❌ Order Cancelled</span>`;
            return;
        }

        // Normal flow — hide cancelled banner
        if (cancelledAlert) cancelledAlert.style.display = 'none';
        if (stepper) stepper.style.opacity = '1';

        // Status progression: new -> accepted -> preparing -> ready -> served
        const steps = ['new', 'accepted', 'preparing', 'ready', 'served'];
        const currentIdx = steps.indexOf(order.status);

        const stepElements = {
            new: document.getElementById('step-placed'),
            accepted: document.getElementById('step-accepted'),
            preparing: document.getElementById('step-preparing'),
            ready: document.getElementById('step-ready'),
            served: document.getElementById('step-completed')
        };

        steps.forEach((st, idx) => {
            const el = stepElements[st];
            if (!el) return;

            el.classList.remove('active', 'completed');
            if (idx < currentIdx) {
                el.classList.add('completed');
            } else if (idx === currentIdx) {
                el.classList.add('active');
            }
        });

        const estimateEl = document.getElementById('tracker-estimate-text');
        if (order.status === 'ready') {
            estimateEl.innerHTML = `<span style="color: #16A34A; font-weight: 800; font-size: 15px;">🎉 Your Order is Ready! Pick it up or table service is on its way.</span>`;
        } else if (order.status === 'served') {
            estimateEl.innerHTML = `<span style="color: #087F5B; font-weight: 700;">Order Served • Enjoy your meal!</span>`;
        } else if (order.status === 'preparing') {
            estimateEl.innerHTML = `Chef is preparing your meal with care (~8-12 mins)`;
        } else if (order.status === 'accepted') {
            estimateEl.innerHTML = `Order accepted by kitchen. Preparation starting soon...`;
        } else {
            estimateEl.innerHTML = `Order received. Waiting for kitchen confirmation...`;
        }
    }

    showActiveOrderBanner(order) {
        let banner = document.getElementById('active-order-floating-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'active-order-floating-banner';
            banner.style.cssText = `
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                width: calc(100% - 32px);
                max-width: 440px;
                border-radius: 12px;
                padding: 10px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 13px;
                z-index: 850;
                box-shadow: 0 4px 16px rgba(0,0,0,0.25);
                cursor: pointer;
                touch-action: pan-y;
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
            `;
            document.body.appendChild(banner);

            banner.addEventListener('click', (e) => {
                if (e.target.closest('.banner-close-btn')) return;
                this.openOrderTracker(order.id);
            });

            // Swipe to dismiss floating banner
            let bStartX = 0;
            let bStartY = 0;
            let bDragging = false;

            banner.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    bStartX = e.touches[0].clientX;
                    bStartY = e.touches[0].clientY;
                    bDragging = true;
                    banner.style.transition = 'none';
                }
            }, { passive: true });

            banner.addEventListener('touchmove', (e) => {
                if (!bDragging) return;
                const dx = e.touches[0].clientX - bStartX;
                const dy = e.touches[0].clientY - bStartY;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
                    banner.style.transform = `translateX(calc(-50% + ${dx}px))`;
                    banner.style.opacity = `${Math.max(0.1, 1 - Math.abs(dx) / 200)}`;
                }
            }, { passive: true });

            banner.addEventListener('touchend', (e) => {
                if (!bDragging) return;
                bDragging = false;
                const clientX = e.changedTouches[0]?.clientX || bStartX;
                const dx = clientX - bStartX;
                if (Math.abs(dx) > 65) {
                    banner.style.transition = 'all 0.25s ease';
                    banner.style.transform = `translateX(${dx > 0 ? '120%' : '-120%'})`;
                    banner.style.opacity = '0';
                    setTimeout(() => banner.remove(), 260);
                } else {
                    banner.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
                    banner.style.transform = 'translateX(-50%)';
                    banner.style.opacity = '1';
                }
            });
        }

        const isCancelled = order.status === 'cancelled';
        banner.style.background = isCancelled ? '#FEF2F2' : '#171717';
        banner.style.color = isCancelled ? '#DC2626' : '#FFFFFF';
        banner.style.border = isCancelled ? '1.5px solid #FECACA' : 'none';

        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <span>${isCancelled ? '❌' : '<span class="pulse-dot"></span>'}</span>
                <span style="overflow:hidden;text-overflow:ellipsis;">
                    ${isCancelled ? `Order <b>${order.order_number}</b> CANCELLED` : `Active <b>${order.order_number}</b> • <span style="text-transform:capitalize;color:#4ADE80;">${order.status}</span>`}
                </span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                <span style="font-weight:700;font-size:12px;color:${isCancelled ? '#DC2626' : '#4ADE80'};">${isCancelled ? 'Details →' : 'Track →'}</span>
                <button type="button" class="banner-close-btn" onclick="event.stopPropagation(); this.closest('#active-order-floating-banner').remove();" style="background:none;border:none;color:inherit;opacity:0.6;font-size:14px;cursor:pointer;padding:2px 4px;line-height:1;font-weight:800;" title="Dismiss">✕</button>
            </div>
        `;
    }

    // ----------------------------------------------------
    // ORDERS & FAVORITES TABS
    // ----------------------------------------------------

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        const homeView = document.getElementById('view-home');
        const ordersView = document.getElementById('view-orders');
        const favsView = document.getElementById('view-favorites');

        if (homeView) homeView.style.display = tab === 'home' || tab === 'search' ? 'block' : 'none';
        if (ordersView) ordersView.style.display = tab === 'orders' ? 'block' : 'none';
        if (favsView) favsView.style.display = tab === 'favorites' ? 'block' : 'none';

        if (tab === 'search') {
            const input = document.getElementById('main-search-input');
            if (input) input.focus();
        } else if (tab === 'orders') {
            // Sync from Supabase first for fresh statuses, then render
            if (this.store && this.store.syncOrdersFromSupabase) {
                this.store.syncOrdersFromSupabase()
                    .then(() => this.renderOrdersHistoryView())
                    .catch(() => this.renderOrdersHistoryView());
            } else {
                this.renderOrdersHistoryView();
            }
        } else if (tab === 'favorites') {
            this.renderFavoritesView();
        }
    }

    renderOrdersHistoryView() {
        const container = document.getElementById('orders-history-list');
        if (!container) return;

        const allOrders = this.store.getOrders();
        const historyIds = JSON.parse(localStorage.getItem('fb_customer_history') || '[]');
        const currency = this.store.getRestaurant().currency || '₹';

        // Filter orders placed on this device, or show recent 5 demo orders if none yet
        const customerOrders = allOrders.filter(o => historyIds.includes(o.id));
        const displayOrders = customerOrders.length > 0 ? customerOrders : allOrders.slice(0, 3);

        if (displayOrders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <div style="font-size: 48px; margin-bottom: 12px;">📜</div>
                    <p style="font-size: 16px; font-weight: 700; color: var(--text-primary);">No orders yet</p>
                    <p style="font-size: 13px;">Place your first delicious meal from our menu!</p>
                </div>
            `;
            return;
        }

        let html = '';
        displayOrders.forEach(order => {
            const isCancelled = order.status === 'cancelled';
            const isServed = order.status === 'served';
            const badgeClass = isCancelled ? 'badge-red' : order.status === 'served' ? 'badge-green' : order.status === 'ready' ? 'badge-green' : order.status === 'preparing' ? 'badge-blue' : 'badge-amber';
            const badgeLabel = isCancelled ? '✕ Cancelled' : order.status.charAt(0).toUpperCase() + order.status.slice(1);

            html += `
                <div class="card-panel" style="margin-bottom: 14px; padding: 16px; border-radius: 14px; border: 1px solid ${isCancelled ? '#FECACA' : 'var(--border-light)'}; background: ${isCancelled ? '#FEF9F9' : '#FFF'};">
                    <div class="flex-between" style="margin-bottom: 8px;">
                        <span style="font-weight: 800; font-size: 15px; font-family: monospace;">${order.order_number}</span>
                        <span class="badge ${badgeClass}" style="text-transform: capitalize;">
                            ${badgeLabel}
                        </span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                        ${timeAgo(order.created_at)} • ${order.order_type === 'dine_in' ? 'Dine-in' : 'Takeaway'}
                    </div>
                    <div style="font-size: 13px; color: var(--text-primary); margin-bottom: ${isCancelled && order.cancellation_reason ? '6px' : '12px'};">
                        ${(Array.isArray(order.items) ? order.items : []).map(i => `${i.quantity || 1}x ${i.name}`).join(', ') || 'Order items'}
                    </div>
                    ${isCancelled && order.cancellation_reason ? `
                    <div style="font-size: 11.5px; color: #DC2626; background: #FEF2F2; padding: 5px 8px; border-radius: 6px; margin-bottom: 12px; border: 1px dashed #FECACA;">
                        <strong>Reason:</strong> ${order.cancellation_reason}
                    </div>` : ''}
                    ${order.coupon_code ? `
                    <div style="font-size:11.5px; margin-bottom:10px;">
                        <span style="background:#ECFDF5; color:#065F46; border:1px dashed #6EE7B7; border-radius:20px; padding:2px 8px; font-weight:700;">🎟️ ${order.coupon_code}</span>
                    </div>` : ''}
                    <div class="flex-between">
                        <span style="font-weight: 800; font-size: 15px;">${formatCurrency(order.total, currency)}</span>
                        <div style="display: flex; gap: 8px;">
                            ${!isCancelled ? `<button class="btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="window.customerApp.openOrderTracker('${order.id}')">
                                Track Live
                            </button>` : ''}
                            <button class="btn-primary" style="padding: 6px 12px; font-size: 12px; ${isCancelled ? 'background:#DC2626;border-color:#DC2626;' : ''}" onclick="window.customerApp.reorder('${order.id}')">
                                Reorder
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    reorder(orderId) {
        const order = this.store.getOrderById(orderId);
        if (!order) return;

        const menu = this.store.getMenuItems();
        let addedCount = 0;
        const orderItems = Array.isArray(order.items) ? order.items : [];

        orderItems.forEach(it => {
            const menuItem = menu.find(m => m.name === it.name);
            if (menuItem && menuItem.is_available) {
                this.addToCart(menuItem, it.selected_add_ons || [], it.quantity || 1);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            showToast(`Items from ${order.order_number} added to cart!`, 'success');
            if (window.sounds) window.sounds.playAddToCart();
            this.openCartModal();
        } else {
            showToast('Items are currently out of stock.', 'warning');
        }
    }

    renderFavoritesView() {
        const container = document.getElementById('favorites-list');
        if (!container) return;

        const menu = this.store.getMenuItems();
        const favItems = menu.filter(item => this.favorites.has(item.id));
        const currency = this.store.getRestaurant().currency || '₹';

        if (favItems.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <div style="font-size: 48px; margin-bottom: 12px;">❤️</div>
                    <p style="font-size: 16px; font-weight: 700; color: var(--text-primary);">No favorites saved</p>
                    <p style="font-size: 13px;">Tap the heart icon on any dish to save it here for fast ordering.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = favItems.map(item => this._buildFoodCardHtml(item, currency)).join('');
        this._bindFoodCardEvents();
    }

    // ----------------------------------------------------
    // REALTIME & EVENT LISTENERS
    // ----------------------------------------------------

    setupEventListeners() {
        // Dietary filter chips
        document.querySelectorAll('.diet-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                document.querySelectorAll('.diet-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.activeDiet = chip.dataset.diet;
                this.renderMenuItems();
            });
        });

        // Search input
        const searchInput = document.getElementById('main-search-input');
        const clearBtn = document.getElementById('clear-search-btn');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                if (clearBtn) clearBtn.style.display = this.searchQuery ? 'block' : 'none';
                this.renderMenuItems();
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchQuery = '';
                clearBtn.style.display = 'none';
                this.renderMenuItems();
            });
        }

        // Bottom Navigation Tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (window.sounds) window.sounds.playClick();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Floating Cart Bar click & Header Cart Icon click
        const cartBar = document.getElementById('floating-cart-bar');
        if (cartBar) {
            cartBar.addEventListener('click', () => this.openCartModal());
        }
        document.getElementById('header-cart-btn')?.addEventListener('click', () => {
            if (window.sounds) window.sounds.playClick();
            this.openCartModal();
        });

        // Stepper buttons inside food detail sheet
        document.getElementById('sheet-qty-minus')?.addEventListener('click', () => {
            if (this.detailQuantity > 1) {
                this.detailQuantity--;
                document.getElementById('sheet-qty-val').textContent = this.detailQuantity;
                this._updateSheetTotalButton();
                if (window.sounds) window.sounds.playClick();
            }
        });

        document.getElementById('sheet-qty-plus')?.addEventListener('click', () => {
            this.detailQuantity++;
            document.getElementById('sheet-qty-val').textContent = this.detailQuantity;
            this._updateSheetTotalButton();
            if (window.sounds) window.sounds.playClick();
        });

        // Detail sheet submit add to cart
        document.getElementById('sheet-submit-add-btn')?.addEventListener('click', () => {
            if (!this.currentSelectedItem) return;
            const addonsArray = Array.from(this.selectedAddons);
            this.addToCart(this.currentSelectedItem, addonsArray, this.detailQuantity);

            const sheetHero = document.getElementById('sheet-hero-img');
            const cartTarget = document.getElementById('floating-cart-bar') || document.getElementById('nav-cart-tab');
            triggerFlyToCart(sheetHero, cartTarget);

            showToast(`Added ${this.currentSelectedItem.name} to cart!`, 'success');
            this.closeItemDetailSheet();
        });

        // Detail sheet close
        document.getElementById('sheet-close-btn')?.addEventListener('click', () => this.closeItemDetailSheet());
        document.getElementById('item-detail-sheet')?.addEventListener('click', (e) => {
            if (e.target.id === 'item-detail-sheet') this.closeItemDetailSheet();
        });

        // Cart Drawer close & checkout triggers
        document.getElementById('cart-close-btn')?.addEventListener('click', () => this.closeCartModal());
        document.getElementById('cart-drawer-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'cart-drawer-modal') this.closeCartModal();
        });

        document.getElementById('cart-checkout-btn')?.addEventListener('click', () => this.openCheckoutModal());

        // Promo code apply
        document.getElementById('apply-promo-btn')?.addEventListener('click', () => {
            const input = document.getElementById('promo-input');
            this.applyPromoCode(input?.value);
        });

        document.getElementById('promo-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.applyPromoCode(e.target.value);
            }
        });

        // Checkout Modal close & submit
        document.getElementById('checkout-close-btn')?.addEventListener('click', () => this.closeCheckoutModal());
        document.getElementById('checkout-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'checkout-modal') this.closeCheckoutModal();
        });

        document.getElementById('checkout-submit-btn')?.addEventListener('click', () => this.processOrder());

        // Order Type toggle in checkout (show/hide table selector)
        document.querySelectorAll('input[name="order_type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const tableBox = document.getElementById('table-select-group');
                if (tableBox) {
                    tableBox.style.display = e.target.value === 'dine_in' ? 'block' : 'none';
                }
            });
        });

        // Live Order Tracker close
        document.getElementById('tracker-close-btn')?.addEventListener('click', () => {
            document.getElementById('order-tracker-modal').classList.remove('active');
        });

        // Cancelled order — dismiss banner & reorder
        document.getElementById('tracker-cancel-dismiss-btn')?.addEventListener('click', () => {
            localStorage.removeItem('fb_active_order_id');
            document.getElementById('order-tracker-modal').classList.remove('active');
            const banner = document.getElementById('active-order-floating-banner');
            if (banner) banner.remove();
        });

        document.getElementById('tracker-cancel-reorder-btn')?.addEventListener('click', () => {
            document.getElementById('order-tracker-modal').classList.remove('active');
            const banner = document.getElementById('active-order-floating-banner');
            if (banner) banner.remove();
            localStorage.removeItem('fb_active_order_id');
            // Scroll to menu
            const homeView = document.getElementById('view-home');
            if (homeView) {
                this.switchTab('home');
                homeView.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    setupRealtimeListeners() {
        // Sync open/closed status when staff toggles it
        this.store.subscribe('SETTINGS_UPDATED', () => {
            this.renderHeader();
        });

        // Realtime Order status change listener
        this.store.subscribe('ORDER_STATUS_CHANGED', (event) => {
            const activeId  = localStorage.getItem('fb_active_order_id');
            const activeNum = localStorage.getItem('fb_active_order_number');

            // Find active order by UUID or order_number (robust cross-device matching)
            let activeOrder = activeId ? this.store.getOrderById(activeId) : null;
            if (!activeOrder && activeNum) {
                activeOrder = this.store.getOrders().find(o => o.order_number === activeNum) || null;
            }

            const isMatch = activeOrder && (
                activeOrder.id === event.orderId ||
                activeOrder.order_number === event.orderNumber ||
                (event.order && activeOrder.order_number === event.order.order_number)
            );

            if (isMatch) {
                // Keep fb_active_order_id current if we now have the Supabase UUID
                if (event.orderId && event.orderId !== activeId && !event.orderId.startsWith('order-fb-')) {
                    localStorage.setItem('fb_active_order_id', event.orderId);
                }

                const refreshedOrder = this.store.getOrderById(activeOrder.id) ||
                    this.store.getOrders().find(o => o.order_number === activeOrder.order_number);
                if (refreshedOrder) {
                    this._updateTrackerStatusUI(refreshedOrder);
                    this.showActiveOrderBanner(refreshedOrder);

                    if (event.newStatus === 'cancelled') {
                        showToast(`❌ Order ${refreshedOrder.order_number} was CANCELLED by kitchen`, 'warning', 6000);
                        if (window.sounds) window.sounds.playClick();
                    } else if (event.newStatus === 'ready') {
                        if (window.sounds) window.sounds.playReadyFanfare();
                        launchConfetti(4000);
                        showToast(`🎉 Your Order ${refreshedOrder.order_number} is READY!`, 'success', 5000);
                    } else if (event.newStatus === 'preparing') {
                        if (window.sounds) window.sounds.playOrderAlert();
                        showToast(`👨‍🍳 Chef started preparing your order ${refreshedOrder.order_number}`, 'info');
                    } else if (event.newStatus === 'accepted') {
                        showToast(`✓ Order ${refreshedOrder.order_number} accepted by kitchen`, 'info');
                    } else if (event.newStatus === 'served') {
                        showToast(`Enjoy your meal! Order ${refreshedOrder.order_number} served.`, 'success');
                    }
                }
            }

            if (this.activeTab === 'orders') {
                this.renderOrdersHistoryView();
            }
        });

        // DATA_REFRESH: triggered by periodic Supabase sync
        this.store.subscribe('DATA_REFRESH', () => {
            const activeId  = localStorage.getItem('fb_active_order_id');
            const activeNum = localStorage.getItem('fb_active_order_number');
            let fresh = activeId ? this.store.getOrderById(activeId) : null;
            if (!fresh && activeNum) {
                fresh = this.store.getOrders().find(o => o.order_number === activeNum) || null;
            }
            if (fresh && fresh.status !== 'served') {
                this.showActiveOrderBanner(fresh);
                const modal = document.getElementById('order-tracker-modal');
                if (modal && modal.classList.contains('active')) {
                    this._updateTrackerStatusUI(fresh);
                }
            }
            if (this.activeTab === 'orders') {
                this.renderOrdersHistoryView();
            }
        });

        // Realtime Menu updates (stock availability or price changes)
        this.store.subscribe('MENU_UPDATED', () => {
            this.renderMenuItems();
            if (this.activeTab === 'favorites') this.renderFavoritesView();
        });

        // Realtime Restaurant settings updates
        this.store.subscribe('SETTINGS_UPDATED', () => {
            this.renderHeader();
            this.renderMenuItems();
            this.updateCartBar();
        });

        // Realtime Coupon updates
        this.store.subscribe('COUPONS_UPDATED', () => {
            const promoModal = document.getElementById('cart-drawer-modal');
            if (promoModal && promoModal.classList.contains('active')) {
                this.renderCartModal();
            }
        });
    }
}

// Global Customer App singleton
window.customerApp = new CustomerApp();
