class TimezoneClock {
    constructor() {
        this.timezones = this.loadTimezones();
        this.clockInterval = null;
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
        document.getElementById('timezoneInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTimezone();
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
        this.startClock();
        errorMsg.classList.remove('show');
    }

    removeTimezone(tz) {
        this.timezones = this.timezones.filter(t => t !== tz);
        this.saveTimezones();
        this.render();
        this.startClock();
    }

    clearAll() {
        if (confirm('Are you sure you want to remove all timezones?')) {
            this.timezones = ['UTC'];
            this.saveTimezones();
            this.render();
            this.startClock();
        }
    }

    showError(message) {
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
        setTimeout(() => errorMsg.classList.remove('show'), 3000);
    }

    getUTCOffset(timezone) {
        try {
            const date = new Date();
            
            const tzString = date.toLocaleString('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const utcString = date.toLocaleString('en-US', {
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const tzMatch = tzString.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
            const utcMatch = utcString.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);

            if (!tzMatch || !utcMatch) return 'UTC±00:00';

            const [, tzMonth, tzDay, tzYear, tzHour, tzMin, tzSec] = tzMatch;
            const [, utcMonth, utcDay, utcYear, utcHour, utcMin, utcSec] = utcMatch;

            const tzDate = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec));
            const utcDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHour, utcMin, utcSec));

            const diffMinutes = (tzDate - utcDate) / (1000 * 60);
            const sign = diffMinutes >= 0 ? '+' : '-';
            const absMinutes = Math.abs(diffMinutes);
            const hours = Math.floor(absMinutes / 60);
            const minutes = Math.round(absMinutes % 60);

            return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } catch (e) {
            return 'UTC±00:00';
        }
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

        return { time: timeString, date: dateString, offset: offset };
    }

    formatTimezoneDisplay(tz) {
        return tz.split('/').map(part => part.replace(/_/g, ' ')).join(', ');
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

        grid.innerHTML = this.timezones.map((tz, index) => {
            const data = this.getTimeData(tz);
            return `
                <div class="clock-card" data-index="${index}">
                    <div class="timezone-name">
                        <span>${this.formatTimezoneDisplay(tz)}</span>
                        <button class="remove-btn" onclick="timezoneClock.removeTimezone('${tz}')">×</button>
                    </div>
                    <div class="date-display">${data.date}</div>
                    <div class="time-display">${data.time}</div>
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
        // Clear existing interval
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        // Sync to next second boundary
        const now = new Date();
        const delay = 1000 - now.getMilliseconds();

        setTimeout(() => {
            this.updateAllClocks();
            this.clockInterval = setInterval(() => this.updateAllClocks(), 1000);
        }, delay);
    }

    updateAllClocks() {
        this.timezones.forEach((tz, index) => {
            // Use data-index to find cards - more reliable than data-tz
            const card = document.querySelector(`[data-index="${index}"]`);
            if (card) {
                const timeDisplay = card.querySelector('.time-display');
                if (timeDisplay) {
                    const data = this.getTimeData(tz);
                    timeDisplay.textContent = data.time;
                }
            }
        });
    }
}

const timezoneClock = new TimezoneClock();