/**
 * Unified Quarters Management System
 * Centralized quarter and school year functions for use across all pages
 * Available globally as: window.quartersManager
 */

class QuartersManager {
    constructor() {
        this.currentSchoolYear = null;
        this.currentQuarter = null;
        this.availableSchoolYears = [];
        this.quartersData = {};
        this.systemSchoolYear = null;
        this.isInitialized = false;
        this.listeners = {};
    }

    /**
     * Initialize the quarters system
     * Should be called once on page load
     */
    async initialize() {
        try {
            console.log('🔧 Initializing Quarters Manager...');
            await this.loadSystemSchoolYear();
            await this.loadSchoolYears();
            this.isInitialized = true;
            console.log('✅ Quarters Manager initialized');
            this.emit('initialized', {
                systemSchoolYear: this.systemSchoolYear,
                currentSchoolYear: this.currentSchoolYear,
                currentQuarter: this.currentQuarter
            });
        } catch (error) {
            console.error('❌ Error initializing Quarters Manager:', error);
            this.emit('error', { message: 'Failed to initialize quarters system', error });
        }
    }

    /**
     * Load the current system school year from the backend
     */
    async loadSystemSchoolYear() {
        try {
            const response = await fetch('/api/current-school-year');
            const data = await response.json();
            
            if (data.success) {
                this.systemSchoolYear = data.school_year;
                this.currentSchoolYear = data.school_year;
                this.currentQuarter = data.current_quarter || null;
                
                // Ensure status is set to 'active' if currentQuarter exists
                if (this.currentQuarter) {
                    this.currentQuarter.status = 'active';
                    console.log(`📅 System School Year: ${this.systemSchoolYear}`);
                    console.log(`📍 Current Quarter: ${this.currentQuarter.quarter_name} (${this.currentQuarter.status})`);
                    console.log(`📊 Quarter Dates: ${this.currentQuarter.start_date} to ${this.currentQuarter.end_date}`);
                } else {
                    console.log(`📅 System School Year: ${this.systemSchoolYear}`);
                    console.log(`📍 Current Quarter: None (Gap period)`);
                }
            }
        } catch (error) {
            console.error('❌ Error loading system school year:', error);
        }
    }

    /**
     * Load all available school years
     */
    async loadSchoolYears() {
        try {
            const response = await fetch('/api/school-years');
            const data = await response.json();
            
            if (data.success) {
                this.availableSchoolYears = data.school_years || [];
                console.log(`📚 Loaded ${this.availableSchoolYears.length} school years:`, this.availableSchoolYears);
                this.emit('schoolYearsLoaded', this.availableSchoolYears);
            }
        } catch (error) {
            console.error('❌ Error loading school years:', error);
        }
    }

    /**
     * Load quarters for a specific school year
     */
    async loadQuartersForYear(schoolYear) {
        try {
            console.log(`📖 Loading quarters for ${schoolYear}...`);
            const response = await fetch(`/api/quarters?school_year=${encodeURIComponent(schoolYear)}`);
            const data = await response.json();
            
            if (data.success) {
                this.quartersData[schoolYear] = data.quarters || [];
                console.log(`✅ Loaded ${this.quartersData[schoolYear].length} quarters for ${schoolYear}`);
                this.emit('quartersLoaded', { schoolYear, quarters: this.quartersData[schoolYear] });
                return this.quartersData[schoolYear];
            }
            return [];
        } catch (error) {
            console.error(`❌ Error loading quarters for ${schoolYear}:`, error);
            return [];
        }
    }

    /**
     * Switch to a different school year
     */
    async switchSchoolYear(schoolYear) {
        try {
            console.log(`🔄 Switching to school year: ${schoolYear}`);
            this.currentSchoolYear = schoolYear;
            
            // Load quarters for this year if not already loaded
            if (!this.quartersData[schoolYear]) {
                await this.loadQuartersForYear(schoolYear);
            }
            
            // Set current quarter to first active quarter or first quarter
            const quarters = this.quartersData[schoolYear] || [];
            const activeQuarter = quarters.find(q => q.status === 'active');
            this.currentQuarter = activeQuarter || quarters[0] || null;
            
            console.log(`✅ Switched to ${schoolYear}, active quarter: ${this.currentQuarter?.quarter_name || 'N/A'}`);
            this.emit('schoolYearChanged', { schoolYear, quarter: this.currentQuarter });
        } catch (error) {
            console.error('❌ Error switching school year:', error);
        }
    }

    /**
     * Select a specific quarter
     */
    selectQuarter(quarterData) {
        try {
            console.log(`📍 Selecting quarter: ${quarterData.quarter_name}`);
            this.currentQuarter = quarterData;
            this.emit('quarterChanged', quarterData);
        } catch (error) {
            console.error('❌ Error selecting quarter:', error);
        }
    }

    /**
     * Get quarters for the current school year
     */
    getCurrentYearQuarters() {
        return this.quartersData[this.currentSchoolYear] || [];
    }

    /**
     * Get quarter by ID
     */
    getQuarterById(quarterId) {
        for (const quarters of Object.values(this.quartersData)) {
            const found = quarters.find(q => q.quarter_id === quarterId);
            if (found) return found;
        }
        return null;
    }

    /**
     * Check if a quarter is active
     */
    isQuarterActive(quarter) {
        return quarter?.status === 'active';
    }

    /**
     * Get the status of a quarter
     */
    getQuarterStatus(quarter) {
        if (quarter?.status === 'active') return 'Active';
        if (quarter?.status === 'finished') return 'Finished';
        return 'Upcoming';
    }

    /**
     * Calculate days remaining in a quarter
     */
    getDaysRemaining(quarter) {
        if (!quarter?.end_date) return 0;
        const endDate = new Date(quarter.end_date);
        const now = new Date();
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysRemaining);
    }

    /**
     * Calculate progress percentage for a quarter
     */
    getQuarterProgress(quarter) {
        if (!quarter?.start_date || !quarter?.end_date) return 0;
        
        const startDate = new Date(quarter.start_date);
        const endDate = new Date(quarter.end_date);
        const now = new Date();
        
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const elapsedDays = (now - startDate) / (1000 * 60 * 60 * 24);
        
        const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
        return Math.round(progress);
    }

    /**
     * Format a date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Get days in the current period (for leaderboard calculations)
     */
    getDaysInPeriod(period) {
        const now = new Date();
        
        switch(period) {
            case 'week':
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                return Math.ceil((new Date() - weekStart) / (1000 * 60 * 60 * 24));
            case 'month':
                return now.getDate();
            case 'quarter':
                if (!this.currentQuarter?.start_date) return 0;
                const quarterStart = new Date(this.currentQuarter.start_date);
                return Math.ceil((new Date() - quarterStart) / (1000 * 60 * 60 * 24));
            case 'current': // Alias for quarter
                if (!this.currentQuarter?.start_date) return 0;
                const qStart = new Date(this.currentQuarter.start_date);
                return Math.ceil((new Date() - qStart) / (1000 * 60 * 60 * 24));
            default:
                return 0;
        }
    }

    /**
     * Update quarter dropdown in HTML element
     */
    updateQuarterDropdown(dropdownElementId, quarters = null) {
        const element = document.getElementById(dropdownElementId);
        if (!element) {
            console.warn(`⚠️ Quarter dropdown element not found: ${dropdownElementId}`);
            return;
        }

        const qData = quarters || this.getCurrentYearQuarters();
        if (!qData.length) {
            element.innerHTML = '<option value="">No quarters available</option>';
            return;
        }

        element.innerHTML = '<option value="">Select Quarter</option>';
        qData.forEach(quarter => {
            const status = this.getQuarterStatus(quarter);
            const statusBadge = status === 'Active' ? ' (Active)' : status === 'Upcoming' ? ' (Upcoming)' : ' (Finished)';
            const option = document.createElement('option');
            option.value = quarter.quarter_id;
            option.textContent = `${quarter.quarter_name}${statusBadge}`;
            if (quarter.status === 'active') {
                option.selected = true;
            }
            element.appendChild(option);
        });
    }

    /**
     * Update school year dropdown in HTML element
     */
    updateSchoolYearDropdown(dropdownElementId) {
        const element = document.getElementById(dropdownElementId);
        if (!element) {
            console.warn(`⚠️ School year dropdown element not found: ${dropdownElementId}`);
            return;
        }

        if (!this.availableSchoolYears.length) {
            element.innerHTML = '<option value="">No school years available</option>';
            return;
        }

        element.innerHTML = '';
        this.availableSchoolYears.forEach(year => {
            const isCurrent = year === this.systemSchoolYear;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}${isCurrent ? ' (Current)' : ''}`;
            if (isCurrent) {
                option.selected = true;
            }
            element.appendChild(option);
        });
    }

    /**
     * Event listener system - allow pages to listen for quarter changes
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
}

// Create global instance
window.quartersManager = new QuartersManager();

// Auto-initialize on page load (backup if not initialized by base.html)
document.addEventListener('DOMContentLoaded', function() {
    if (!window.quartersManager.isInitialized) {
        console.log('📌 Initializing Quarters Manager via DOMContentLoaded (backup)...');
        window.quartersManager.initialize();
    }
});
