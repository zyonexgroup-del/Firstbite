// First Bite — Web Audio API Sound Synthesizer
// Zero external audio files required, instant millisecond latency

class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.initialized = true;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    // Play a dual-tone restaurant kitchen bell alert
    playOrderAlert() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Tone 1 (High bell)
        this._playTone(880, now, 0.4, 0.35, 'triangle');
        // Tone 2 (Harmonic ringing)
        this._playTone(1320, now + 0.15, 0.5, 0.4, 'sine');
        // Tone 3 (Slightly higher echo)
        this._playTone(1760, now + 0.3, 0.6, 0.25, 'sine');
    }

    // Cheerful chime when order is ready
    playReadyFanfare() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            this._playTone(freq, now + idx * 0.12, 0.3, 0.3, 'sine');
        });
    }

    // Add to cart pop sound
    playAddToCart() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Quick crisp tactile tap
    playClick() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        this._playTone(600, now, 0.05, 0.1, 'sine');
    }

    // Cash / payment registered
    playCashPaid() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        this._playTone(987.77, now, 0.2, 0.25, 'triangle');
        this._playTone(1318.51, now + 0.12, 0.4, 0.35, 'sine');
    }

    _playTone(freq, startTime, duration, maxGain = 0.2, type = 'sine') {
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(maxGain, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        } catch (e) {
            console.warn('Audio tone error:', e);
        }
    }
}

// Global sound singleton
window.sounds = new SoundManager();

// Automatically attempt audio context resume on user's first click anywhere
window.addEventListener('click', () => {
    if (window.sounds && !window.sounds.initialized) {
        window.sounds.init();
    }
}, { once: true });
