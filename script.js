class TimezoneClock {
    constructor() {
        this.timezones = this.loadTimezones();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
        this.startClock();
    }

    setupEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addTimezone());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        
        document.querySelectorAll('.quick-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.addTimezone(e.target.dataset.tz);
            });
        });

        document.getElementById('timezoneInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTimezone();
            }
        });
    }

    loadTimezones() {
        const stored = localStorage.getItem('timezones');
        return stored ? JSON.parse(stored) : ['UTC'];
    }

    saveTimezones() {
        localStorage.setItem('timezones', JSON.stringify(this.timezones));
    }

    addTimezone(tz = null) {
        const input = document.getElementById('timezoneInput');
        const timezone = tz || input.value.trim();
        const errorMsg = document.getElementById('errorMessage');

        if (!timezone) {
            this.showError('Please enter a timezone');
            return;
        }

        // Validate timezone
        try {
            new Date().toLocaleString('en-US', { timeZone: timezone });
        } catch (e) {
            this.showError(`Invalid timezone: ${timezone}`);
            return;
        }

        if (this.timezones.includes(timezone)) {
            this.showError(`${timezone} is already added`);
            return;
        }

        this.timezones.push(timezone);
        this.saveTimezones();
        input.value = '';
        this.render();
        errorMsg.classList.remove('show');
    }

    removeTimezone(tz) {
        this.timezones = this.timezones.filter(t => t !== tz);
        this.saveTimezones();
        this.render();
    }

    clearAll() {
        if (confirm('Are you sure you want to remove all timezones?')) {
            this.timezones = ['UTC'];
            this.saveTimezones();
            this.render();
        }
    }

    showError(message) {
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
        setTimeout(() => {
            errorMsg.classList.remove('show');
        }, 3000);
    }

    getTimeData(timezone) {
        const date = new Date();
        const timeString = date.toLocaleString('en-US', {
            timeZone: timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const dateString = date.toLocaleString('en-US', {
            timeZone: timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const offset = this.getUTCOffset(timezone);

        return {
            time: timeString,
            date: dateString,
            offset: offset
        };
    }

    getUTCOffset(timezone) {
        const date = new Date();
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
        const offset = (tzDate - utcDate) / (1000 * 60 * 60);
        const sign = offset >= 0 ? '+' : '-';
        const hours = Math.floor(Math.abs(offset));
        const minutes = Math.round((Math.abs(offset) - hours) * 60);
        return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    formatTimezoneDisplay(tz) {
        // Convert underscore to space and format nicely
        return tz.split('/').map(part => {
            return part.replace(/_/g, ' ');
        }).join(', ');
    }

    render() {
        const grid = document.getElementById('clocksGrid');
        
        if (this.timezones.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🕐</div>
                    <div class="empty-state-text">Add a timezone to get started!</div>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.timezones.map(tz => {
            const data = this.getTimeData(tz);
            return `
                <div class="clock-card">
                    <div class="timezone-name">
                        <span>${this.formatTimezoneDisplay(tz)}</span>
                        <button class="remove-btn" onclick="timezoneClock.removeTimezone('${tz}')">×</button>
                    </div>
                    <div class="date-display">${data.date}</div>
                    <div class="time-display" data-tz="${tz}">${data.time}</div>
                    <div class="utc-offset">${data.offset}</div>
                    <div class="timezone-info">
                        <div class="info-item">
                            <div class="info-label">Day of Week</div>
                            <div class="info-value">${data.date.split(',')[0]}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Time Zone ID</div>
                            <div class="info-value">${tz}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    startClock() {
        setInterval(() => {
            this.timezones.forEach(tz => {
                const timeDisplay = document.querySelector(`[data-tz="${tz}"]`);
                if (timeDisplay) {
                    const data = this.getTimeData(tz);
                    timeDisplay.textContent = data.time;
                    
                    // Add blink effect to seconds
                    timeDisplay.classList.remove('blink');
                    void timeDisplay.offsetWidth; // Trigger reflow
                    timeDisplay.classList.add('blink');
                }
            });
        }, 1000);
    }
}

// Initialize the clock app
const timezoneClock = new TimezoneClock();