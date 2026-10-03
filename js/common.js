// ==========================================================
// FIRST BITE — COMMON UTILITIES & TOASTS
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

function formatCurrency(amount, currency = '₹') {
    const num = Number(amount) || 0;
    return `${currency}${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function timeAgo(dateString) {
    if (!dateString) return 'Just now';
    const now = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return past.toLocaleDateString();
}

function showToast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '✓';
    if (type === 'error') icon = '✕';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `
        <span class="toast-icon" style="font-weight: 800; font-size: 16px; flex-shrink: 0;">${icon}</span>
        <div class="toast-msg" style="flex: 1; word-break: break-word;">${message}</div>
        <button type="button" class="toast-close-btn" style="background:none; border:none; color:inherit; opacity:0.6; cursor:pointer; font-size:15px; padding:2px 4px; line-height:1; font-weight:800; margin-left:6px; flex-shrink:0;" title="Dismiss">✕</button>
    `;

    container.appendChild(toast);

    let dismissTimer = null;
    let isDismissed = false;

    const dismissToast = (direction = 'right') => {
        if (isDismissed) return;
        isDismissed = true;
        if (dismissTimer) clearTimeout(dismissTimer);
        toast.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        toast.style.transform = direction === 'left' ? 'translateX(-120%)' : 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 260);
    };

    const startTimer = () => {
        if (duration > 0 && !dismissTimer && !isDismissed) {
            dismissTimer = setTimeout(() => dismissToast('right'), duration);
        }
    };

    const clearTimer = () => {
        if (dismissTimer) {
            clearTimeout(dismissTimer);
            dismissTimer = null;
        }
    };

    // Close button click
    toast.querySelector('.toast-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissToast('right');
    });

    // Pause on hover
    toast.addEventListener('mouseenter', clearTimer);
    toast.addEventListener('mouseleave', startTimer);

    // Swipe / Slide-to-dismiss (Touch & Mouse Drag)
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;

    const onDragStart = (clientX, clientY) => {
        if (isDismissed) return;
        startX = clientX;
        startY = clientY;
        currentX = clientX;
        isDragging = true;
        clearTimer();
        toast.style.transition = 'none';
    };

    const onDragMove = (clientX, clientY, e) => {
        if (!isDragging || isDismissed) return;
        const dx = clientX - startX;
        const dy = clientY - startY;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
            if (e && e.cancelable) e.preventDefault();
            toast.style.transform = `translateX(${dx}px)`;
            toast.style.opacity = `${Math.max(0.1, 1 - Math.abs(dx) / 220)}`;
        }
    };

    const onDragEnd = (clientX) => {
        if (!isDragging || isDismissed) return;
        isDragging = false;
        const dx = clientX - startX;
        const threshold = 55;

        if (Math.abs(dx) > threshold) {
            dismissToast(dx > 0 ? 'right' : 'left');
        } else {
            toast.style.transition = 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
            startTimer();
        }
    };

    // Touch listeners
    toast.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    toast.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) onDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });

    toast.addEventListener('touchend', (e) => {
        const clientX = e.changedTouches[0]?.clientX || currentX;
        onDragEnd(clientX);
    });

    toast.addEventListener('touchcancel', () => {
        if (isDragging) {
            isDragging = false;
            toast.style.transition = 'all 0.2s ease';
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
            startTimer();
        }
    });

    // Mouse drag listeners
    toast.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.closest('.toast-close-btn')) return;
        onDragStart(e.clientX, e.clientY);

        const onMouseMove = (ev) => onDragMove(ev.clientX, ev.clientY, ev);
        const onMouseUp = (ev) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            onDragEnd(ev.clientX);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Trigger entrance animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    startTimer();
}

// Confetti celebration generator
function launchConfetti(duration = 2500) {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#087F5B', '#10B981', '#F59E0B', '#38BDF8', '#EC4899', '#6366F1'];
    const particles = [];

    for (let i = 0; i < 90; i++) {
        particles.push({
            x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
            y: canvas.height * 0.4 + (Math.random() - 0.5) * 100,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 1.2) * 16,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 10,
            gravity: 0.45,
            opacity: 1
        });
    }

    const startTime = Date.now();

    function frame() {
        const elapsed = Date.now() - startTime;
        if (elapsed > duration) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.rotation += p.vRot;
            if (elapsed > duration - 800) {
                p.opacity = Math.max(0, (duration - elapsed) / 800);
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
            ctx.restore();
        });

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

// Particle fly-to-cart animation
function triggerFlyToCart(sourceElement, targetElement) {
    if (!sourceElement || !targetElement) return;

    const srcRect = sourceElement.getBoundingClientRect();
    const destRect = targetElement.getBoundingClientRect();

    const flyer = document.createElement('div');
    flyer.className = 'flying-item';
    
    // Check if source has an image or background
    const img = sourceElement.querySelector('img');
    if (img && img.src) {
        flyer.style.backgroundImage = `url(${img.src})`;
    } else {
        flyer.style.backgroundColor = '#087F5B';
    }

    flyer.style.left = `${srcRect.left + srcRect.width / 2 - 20}px`;
    flyer.style.top = `${srcRect.top + srcRect.height / 2 - 20}px`;
    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
        flyer.style.left = `${destRect.left + destRect.width / 2 - 20}px`;
        flyer.style.top = `${destRect.top + destRect.height / 2 - 20}px`;
        flyer.style.transform = 'scale(0.3)';
        flyer.style.opacity = '0.4';
    });

    setTimeout(() => {
        flyer.remove();
        if (window.sounds) window.sounds.playAddToCart();
    }, 650);
}
