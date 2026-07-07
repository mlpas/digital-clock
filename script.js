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
                this.addTimezone(e.currentTarget.dataset.tz);
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
        this.startClock();
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
        try {
            const date = new Date();
            
            // Get the time in the target timezone
            const tzFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const tzParts = tzFormatter.formatToParts(date);
            const tzObject = {};
            tzParts.forEach(part => {
                if (part.type !== 'literal') {
                    tzObject[part.type] = part.value;
                }
            });

            // Create a date object from the parts
            const tzDate = new Date(
                `${tzObject.year}-${tzObject.month}-${tzObject.day}T${tzObject.hour}:${tzObject.minute}:${tzObject.second}Z`
            );

            // Get UTC time
            const utcDate = new Date(date.toLocaleString('en-US', { 
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }));

            // Calculate the difference
            let diffMinutes = (tzDate - utcDate) / (1000 * 60);
            
            // For more accuracy, use the actual time difference
            // by checking what UTC time corresponds to this timezone time
            const testDate = new Date('2026-01-15T12:00:00Z');
            const testTzString = testDate.toLocaleString('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            // Parse the test timezone string
            const testTzParts = testTzString.match(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/);
            if (testTzParts) {
                const [, month, day, year, hour, min, sec] = testTzParts;
                const testLocalDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
                diffMinutes = (testLocalDate - testDate) / (1000 * 60);
            }

            const sign = diffMinutes >= 0 ? '+' : '-';
            const hours = Math.floor(Math.abs(diffMinutes) / 60);
            const minutes = Math.abs(diffMinutes) % 60;
            return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } catch (e) {
            return 'UTC±00:00';
        }
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

        grid.innerHTML = this.timezones.map((tz, index) => {
            const data = this.getTimeData(tz);
            return `
                <div class="clock-card" data-index="${index}">
                    <div class="timezone-name">
                        <span>${this.formatTimezoneDisplay(tz)}</span>
                        <button class="remove-btn" data-tz="${tz}">×</button>
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

        // Re-attach remove button listeners
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeTimezone(e.target.dataset.tz);
            });
        });
    }

    startClock() {
        // Clear any existing intervals
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }

        this.clockInterval = setInterval(() => {
            this.timezones.forEach((tz, index) => {
                const card = document.querySelector(`[data-index="${index}"]`);
                if (card) {
                    const timeDisplay = card.querySelector('.time-display');
                    if (timeDisplay) {
                        const data = this.getTimeData(tz);
                        timeDisplay.textContent = data.time;
                    }
                }
            });
        }, 1000);
    }
}

// Initialize the clock app
const timezoneClock = new TimezoneClock();