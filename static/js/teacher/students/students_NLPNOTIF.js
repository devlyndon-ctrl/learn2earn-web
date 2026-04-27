// Enhanced Notes Analyzer for Teacher Students Page

class EnhancedNotesAnalyzer {
    constructor() {
        this.currentStudentId = null;
        this.currentStudentName = '';
        this.currentStudent = null;
        this.analysisHistory = [];
        this.initEventListeners();
    }

    initEventListeners() {
        // Listen for notes button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.open-notes-btn')) {
                const btn = e.target.closest('.open-notes-btn');
                this.currentStudentId = btn.getAttribute('data-student-id');
                this.currentStudentName = btn.getAttribute('data-student-name');
                
                // Store full student data if available
                if (btn.dataset.student) {
                    try {
                        this.currentStudent = JSON.parse(btn.dataset.student);
                    } catch (e) {
                        console.error('Error parsing student data:', e);
                    }
                }
                
                this.openAnalyzerModal(this.currentStudentName);
            }
        });

        // Form submission
        const form = document.getElementById('feedbackFormModal');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAnalysis(e));
        }

        // Send notification button
        const sendBtn = document.getElementById('sendNLPNotifBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendNotification());
        }

        // Wellness check button
        const wellnessBtn = document.getElementById('wellnessCheckBtn');
        if (wellnessBtn) {
            wellnessBtn.addEventListener('click', () => this.performWellnessCheck());
        }

        // Example badges
        document.querySelectorAll('.example-badge-modal').forEach(badge => {
            badge.addEventListener('click', () => {
                document.getElementById('feedbackInputModal').value = badge.dataset.example;
                document.getElementById('feedbackInputModal').focus();
                
                // Trigger input event for validation
                const event = new Event('input', { bubbles: true });
                document.getElementById('feedbackInputModal').dispatchEvent(event);
            });
        });

        // Modal hidden event to clear data
        const modal = document.getElementById('teacherFeedbackModal');
        if (modal) {
            modal.addEventListener('hidden.bs.modal', () => {
                this.clearModalData();
            });
        }

        // Real-time validation
        const feedbackInput = document.getElementById('feedbackInputModal');
        if (feedbackInput) {
            feedbackInput.addEventListener('input', this.debounce((e) => {
                this.validateFeedback(e.target.value);
            }, 500));
        }

        // Character counter
        if (feedbackInput) {
            feedbackInput.addEventListener('input', () => {
                this.updateCharCounter(feedbackInput.value.length);
            });
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    validateFeedback(text) {
        const validationEl = document.getElementById('validationIndicator');
        if (!validationEl) return;

        if (text.length < 10) {
            validationEl.innerHTML = '';
            return;
        }

        // Simple client-side validation
        const wordCount = text.trim().split(/\s+/).length;
        
        if (wordCount < 3) {
            validationEl.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>Add a few more words</span>';
        } else {
            validationEl.innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Looking good!</span>';
        }
    }

    updateCharCounter(length) {
        const counter = document.getElementById('charCount');
        if (!counter) return;

        counter.textContent = length;
        
        if (length > 900) {
            counter.className = length > 1000 ? 'text-danger' : 'text-warning';
        } else {
            counter.className = '';
        }

        // Disable submit if over limit
        const submitBtn = document.getElementById('analyzeBtnModal');
        if (submitBtn) {
            submitBtn.disabled = length > 1000;
        }
    }

    openAnalyzerModal(studentName) {
        const modalLabel = document.getElementById('teacherFeedbackModalLabel');
        modalLabel.innerHTML = `<i class="fas fa-brain me-1"></i>GentleNote for <span class="text-primary">${studentName}</span>`;
        
        // Reset modal
        document.getElementById('feedbackInputModal').value = '';
        document.getElementById('resultContainerModal').style.display = 'none';
        document.getElementById('errorAlertModal').style.display = 'none';
        
        // Reset validation
        const validationEl = document.getElementById('validationIndicator');
        if (validationEl) validationEl.innerHTML = '';
        
        // Reset char counter
        this.updateCharCounter(0);
        
        // Hide wellness check button initially
        const wellnessBtn = document.getElementById('wellnessCheckBtn');
        if (wellnessBtn) {
            wellnessBtn.style.display = 'none';
        }
        
        // Remove any existing history section
        const historySection = document.getElementById('feedbackHistorySection');
        if (historySection) {
            historySection.remove();
        }
        
        // Remove any existing insights section
        const insightsSection = document.getElementById('insightsSection');
        if (insightsSection) {
            insightsSection.remove();
        }
        
        // Remove any existing wellness alert
        const wellnessAlert = document.getElementById('wellnessAlert');
        if (wellnessAlert) {
            wellnessAlert.remove();
        }
        
        // Load feedback history for this student
        if (this.currentStudentId) {
            this.loadFeedbackHistory(this.currentStudentId);
        }
        
        // Show modal
        new bootstrap.Modal(document.getElementById('teacherFeedbackModal')).show();
    }

    async loadFeedbackHistory(studentId) {
        try {
            const response = await fetch(`/api/feedback-history/${studentId}`);
            const data = await response.json();
            
            if (data.success && data.feedback_history && data.feedback_history.length > 0) {
                this.displayFeedbackHistory(data.feedback_history, data.trend);
                
                // Show wellness check button
                const wellnessBtn = document.getElementById('wellnessCheckBtn');
                if (wellnessBtn) {
                    wellnessBtn.style.display = 'block';
                }
                
                // Store history for later use
                this.analysisHistory = data.feedback_history;
            }
        } catch (error) {
            console.error('Error loading feedback history:', error);
        }
    }

    displayFeedbackHistory(history, trend) {
        // Create history section if it doesn't exist
        let historySection = document.getElementById('feedbackHistorySection');
        if (!historySection) {
            historySection = document.createElement('div');
            historySection.id = 'feedbackHistorySection';
            historySection.className = 'mt-3 p-2 bg-light rounded';
            
            const resultContainer = document.getElementById('resultContainerModal');
            if (resultContainer) {
                resultContainer.parentNode.insertBefore(historySection, resultContainer.nextSibling);
            } else {
                const modalBody = document.querySelector('#teacherFeedbackModal .modal-body');
                modalBody.appendChild(historySection);
            }
        }
        
        // Determine trend icon and class
        let trendIcon = '📊';
        let trendClass = 'bg-secondary';
        
        if (trend.trend_direction === 'improving') {
            trendIcon = '📈';
            trendClass = 'bg-success';
        } else if (trend.trend_direction === 'declining') {
            trendIcon = '📉';
            trendClass = 'bg-warning';
        } else if (trend.trend_direction === 'insufficient_data') {
            trendIcon = '❓';
            trendClass = 'bg-secondary';
        }
        
        // Build history HTML
        let html = `
            <h6 class="mb-2"><i class="fas fa-history me-1"></i>Recent Feedback History</h6>
            <div class="small mb-2 d-flex flex-wrap gap-1">
                <span class="badge bg-success">Positive: ${trend.sentiment_distribution.positive}</span>
                <span class="badge bg-secondary">Neutral: ${trend.sentiment_distribution.neutral}</span>
                <span class="badge bg-danger">Negative: ${trend.sentiment_distribution.negative}</span>
                <span class="badge bg-info">Avg: ${trend.average_compound}</span>
                <span class="badge ${trendClass}">${trendIcon} ${trend.trend_direction}</span>
            </div>
        `;
        
        if (history.length > 0) {
            html += '<div class="list-group small" style="max-height: 200px; overflow-y: auto;">';
            history.slice(0, 5).forEach(item => {
                const date = item.formatted_date || new Date(item.created_at).toLocaleDateString();
                const sentimentClass = this.getSentimentClass(item.sentiment);
                html += `
                    <div class="list-group-item list-group-item-action p-2" style="cursor: pointer;" onclick="enhancedNotesAnalyzer.viewFeedbackDetails(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge ${sentimentClass}">${item.sentiment || 'Unknown'}</span>
                            <small class="text-muted">${date}</small>
                        </div>
                        <p class="mb-0 small text-truncate">${item.motivation || 'No feedback'}</p>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        historySection.innerHTML = html;
        historySection.style.display = 'block';
    }

    viewFeedbackDetails(item) {
        // Create a temporary alert with details
        const detailsHtml = `
            <strong>Sentiment:</strong> ${item.sentiment}<br>
            <strong>Date:</strong> ${item.formatted_date || new Date(item.created_at).toLocaleString()}<br>
            <strong>Motivation:</strong> ${item.motivation || 'N/A'}<br>
            ${item.feedback ? `<strong>Feedback:</strong> ${item.feedback}` : ''}
        `;
        
        alert(detailsHtml); // You can replace this with a custom modal
    }

    getSentimentClass(sentiment) {
        const classes = {
            'Exceptional': 'bg-primary',
            'Very Positive': 'bg-success',
            'Positive': 'bg-success',
            'Slightly Positive': 'bg-info',
            'Neutral': 'bg-secondary',
            'Slightly Negative': 'bg-warning',
            'Negative': 'bg-danger',
            'Very Negative': 'bg-dark'
        };
        return classes[sentiment] || 'bg-secondary';
    }

    async handleAnalysis(e) {
        e.preventDefault();
        
        const feedback = document.getElementById('feedbackInputModal').value.trim();
        const analyzeBtn = document.getElementById('analyzeBtnModal');
        
        if (!feedback) {
            this.showError('Please enter some feedback to analyze.');
            return;
        }
        
        // Check character limit
        if (feedback.length > 1000) {
            this.showError('Feedback exceeds 1000 characters. Please shorten your message.');
            return;
        }
        
        // Show loading state
        document.getElementById('resultContainerModal').style.display = 'none';
        document.getElementById('errorAlertModal').style.display = 'none';
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Analyzing...';
        
        // Show progress
        const progressInterval = this.showProgress();
        
        try {
            const response = await fetch('/api/analyze-enhanced', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    feedback: feedback,
                    student_id: this.currentStudentId 
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.data) {
                this.displayResults(data.data);
            } else {
                this.showError(data.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Failed to connect to the server. Please try again.');
        } finally {
            clearInterval(progressInterval);
            this.hideProgress();
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search me-1"></i>Gentle Check';
        }
    }

    showProgress() {
        const resultContainer = document.getElementById('resultContainerModal');
        const progressDiv = document.createElement('div');
        progressDiv.id = 'analysisProgress';
        progressDiv.className = 'mt-2 progress';
        progressDiv.style.height = '5px';
        progressDiv.innerHTML = '<div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" style="width: 0%"></div>';
        
        resultContainer.parentNode.insertBefore(progressDiv, resultContainer.nextSibling);
        
        let width = 0;
        const interval = setInterval(() => {
            width += 10;
            const progressBar = document.querySelector('#analysisProgress .progress-bar');
            if (progressBar && width <= 90) {
                progressBar.style.width = width + '%';
            } else {
                clearInterval(interval);
            }
        }, 100);
        
        return interval;
    }

    hideProgress() {
        const progressDiv = document.getElementById('analysisProgress');
        if (progressDiv) progressDiv.remove();
    }

    displayResults(data) {
        // Update sentiment badge
        const sentimentBadge = document.getElementById('sentimentBadgeModal');
        sentimentBadge.textContent = data.sentiment;
        sentimentBadge.className = `sentiment-badge small bg-${data.sentiment_color} text-white px-2 py-1 rounded`;
        
        // Update scores
        document.getElementById('positiveScoreModal').textContent = (data.scores.vader_positive || 0).toFixed(3);
        document.getElementById('negativeScoreModal').textContent = (data.scores.vader_negative || 0).toFixed(3);
        
        // Handle feedback display
        const feedbackDisplay = document.getElementById('feedbackDisplayModal');
        const feedbackHiddenNotice = document.getElementById('feedbackHiddenNoticeModal');
        
        if (data.feedback_hidden) {
            feedbackDisplay.style.display = 'none';
            feedbackHiddenNotice.style.display = 'block';
        } else {
            feedbackDisplay.style.display = 'block';
            feedbackHiddenNotice.style.display = 'none';
            document.getElementById('feedbackTextModal').textContent = data.feedback || '';
        }
        
        // Update motivation
        document.getElementById('motivationTextModal').textContent = data.motivation || '';
        
        // Display additional insights
        this.displayInsights(data);
        
        // Show result container
        document.getElementById('resultContainerModal').style.display = 'block';
        
        // Show send button and store data
        const sendBtn = document.getElementById('sendNLPNotifBtn');
        sendBtn.style.display = 'block';
        sendBtn.dataset.analysis = JSON.stringify(data);
        
        // Scroll to results
        document.getElementById('resultContainerModal').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    displayInsights(data) {
        // Remove existing insights section if present
        const existingInsights = document.getElementById('insightsSection');
        if (existingInsights) {
            existingInsights.remove();
        }
        
        // Create insights section
        const insightsSection = document.createElement('div');
        insightsSection.id = 'insightsSection';
        insightsSection.className = 'mt-2';
        
        const resultContainer = document.getElementById('resultContainerModal');
        resultContainer.appendChild(insightsSection);
        
        let insightsHtml = '';
        
        // Word count and complexity
        insightsHtml += `
            <div class="row g-1 mt-2">
                <div class="col-4">
                    <div class="bg-light rounded p-1 text-center">
                        <small class="text-muted">Words</small>
                        <div class="fw-bold small">${data.word_count || 0}</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="bg-light rounded p-1 text-center">
                        <small class="text-muted">Complexity</small>
                        <div class="fw-bold small">${(data.complexity_score || 0).toFixed(2)}</div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="bg-light rounded p-1 text-center">
                        <small class="text-muted">Readability</small>
                        <div class="fw-bold small">${(data.readability_score || 0).toFixed(0)}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Key phrases
        if (data.key_phrases && data.key_phrases.length > 0) {
            insightsHtml += `
                <div class="mt-2">
                    <small class="text-muted">Key Phrases:</small>
                    <div class="d-flex flex-wrap gap-1 mt-1">
                        ${data.key_phrases.map(phrase => 
                            `<span class="badge bg-light text-dark border">${phrase}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
        
        // Aspects detected
        if (data.aspects) {
            const activeAspects = Object.entries(data.aspects)
                .filter(([key, value]) => value)
                .map(([key]) => key.replace('_', ' '));
            
            if (activeAspects.length > 0) {
                insightsHtml += `
                    <div class="mt-2">
                        <small class="text-muted">Aspects Detected:</small>
                        <div class="d-flex flex-wrap gap-1 mt-1">
                            ${activeAspects.map(aspect => 
                                `<span class="badge bg-info text-white">${aspect}</span>`
                            ).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        // Improvement suggestions
        if (data.improvement_suggestions && data.improvement_suggestions.length > 0) {
            insightsHtml += `
                <div class="mt-2">
                    <small class="text-warning">Suggestions:</small>
                    <ul class="small mb-0 ps-3 mt-1">
                        ${data.improvement_suggestions.map(suggestion => 
                            `<li class="text-muted">${suggestion}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Summary for long feedback
        if (data.summary) {
            insightsHtml += `
                <div class="mt-2">
                    <small class="text-muted">Summary:</small>
                    <p class="small mb-0 mt-1 bg-light p-1 rounded">${data.summary}</p>
                </div>
            `;
        }
        
        insightsSection.innerHTML = insightsHtml;
    }

    async sendNotification() {
        const sendBtn = document.getElementById('sendNLPNotifBtn');
        
        if (!sendBtn.dataset.analysis) {
            this.showToast('No analysis data to send', 'error');
            return;
        }
        
        const analysisData = JSON.parse(sendBtn.dataset.analysis);
        
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending...';
        
        const payload = {
            student_id: this.currentStudentId,
            feedback: analysisData.feedback || '',
            sentiment: analysisData.sentiment || '',
            sentiment_color: analysisData.sentiment_color || '',
            positive_score: analysisData.scores?.vader_positive || 0,
            negative_score: analysisData.scores?.vader_negative || 0,
            neutral_score: analysisData.scores?.vader_neutral || 0,
            compound_score: analysisData.scores?.vader_compound || 0,
            motivation: analysisData.motivation || '',
            feedback_hidden: analysisData.feedback_hidden || false,
            word_count: analysisData.word_count || 0,
            complexity_score: analysisData.complexity_score || 0,
            readability_score: analysisData.readability_score || 0,
            key_phrases: analysisData.key_phrases || [],
            improvement_suggestions: analysisData.improvement_suggestions || []
        };
        
        try {
            const response = await fetch('/api/nlp-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Notification sent successfully!', 'success');
                
                // Animate button
                sendBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i>Sent!';
                
                // Close modal after delay
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('teacherFeedbackModal'));
                    if (modal) modal.hide();
                    
                    // Refresh student list if function exists
                    if (typeof loadStudents === 'function') {
                        loadStudents();
                    } else if (typeof window.loadStudents === 'function') {
                        window.loadStudents();
                    } else {
                        // Reload page as fallback
                        location.reload();
                    }
                }, 1500);
            } else {
                this.showToast(data.message || 'Failed to send notification', 'error');
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Send Notification';
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            this.showToast('Error sending notification', 'error');
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Send Notification';
        }
    }

    async performWellnessCheck() {
        if (!this.currentStudentId) return;
        
        const wellnessBtn = document.getElementById('wellnessCheckBtn');
        const originalText = wellnessBtn.innerHTML;
        
        wellnessBtn.disabled = true;
        wellnessBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Checking...';
        
        try {
            const response = await fetch(`/api/student-wellness-check/${this.currentStudentId}`);
            const data = await response.json();
            
            if (data.success) {
                let alertClass = 'alert-info';
                let icon = 'ℹ️';
                
                if (data.wellness_status === 'concerning') {
                    alertClass = 'alert-danger';
                    icon = '⚠️';
                } else if (data.wellness_status === 'declining') {
                    alertClass = 'alert-warning';
                    icon = '📉';
                } else if (data.wellness_status === 'improving') {
                    alertClass = 'alert-success';
                    icon = '📈';
                } else if (data.wellness_status === 'stable') {
                    alertClass = 'alert-success';
                    icon = '✅';
                } else {
                    alertClass = 'alert-secondary';
                    icon = '📊';
                }
                
                // Remove any existing wellness alert
                const existingAlert = document.getElementById('wellnessAlert');
                if (existingAlert) {
                    existingAlert.remove();
                }
                
                const alertHtml = `
                    <div id="wellnessAlert" class="alert ${alertClass} alert-dismissible fade show mt-2 py-2" role="alert">
                        <strong>${icon} Wellness Check:</strong> ${data.message}
                        <small class="d-block mt-1">Feedback count: ${data.feedback_count} | Very negative: ${data.very_negative_count} | Avg score: ${data.avg_compound_score}</small>
                        <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="alert"></button>
                    </div>
                `;
                
                // Add alert to modal
                const modalBody = document.querySelector('#teacherFeedbackModal .modal-body');
                modalBody.insertAdjacentHTML('afterbegin', alertHtml);
            }
        } catch (error) {
            console.error('Error performing wellness check:', error);
            this.showToast('Error performing wellness check', 'error');
        } finally {
            wellnessBtn.disabled = false;
            wellnessBtn.innerHTML = originalText;
        }
    }

    showError(message) {
        document.getElementById('errorMessageModal').textContent = message;
        document.getElementById('errorAlertModal').style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            document.getElementById('errorAlertModal').style.display = 'none';
        }, 5000);
    }

    showToast(message, type = 'success') {
        // Create toast element using base.css toast-notification style
        const toastId = 'toast-' + Date.now();
        const toastClass = type === 'success' ? '' : 'error';
        
        const toastHtml = `<div id="${toastId}" class="toast-notification ${toastClass}">${message}</div>`;
        document.body.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        
        // Trigger show animation with slight delay
        setTimeout(() => {
            toastElement.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toastElement.classList.remove('show');
            setTimeout(() => {
                if (toastElement.parentNode) {
                    toastElement.remove();
                }
            }, 300);
        }, 3000);
    }

    clearModalData() {
        this.currentStudentId = null;
        this.currentStudentName = '';
        this.currentStudent = null;
        
        // Clear any stored data
        const sendBtn = document.getElementById('sendNLPNotifBtn');
        if (sendBtn) {
            sendBtn.style.display = 'none';
            sendBtn.dataset.analysis = '';
        }
        
        // Remove history section
        const historySection = document.getElementById('feedbackHistorySection');
        if (historySection) {
            historySection.remove();
        }
        
        // Remove insights section
        const insightsSection = document.getElementById('insightsSection');
        if (insightsSection) {
            insightsSection.remove();
        }
        
        // Remove wellness alert
        const wellnessAlert = document.getElementById('wellnessAlert');
        if (wellnessAlert) {
            wellnessAlert.remove();
        }
    }

    // Export analysis as PDF
    exportAsPDF(analysisData) {
        if (!analysisData) return;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text('Feedback Analysis Report', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Student: ${this.currentStudentName || 'N/A'}`, 20, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 37);
        doc.text(`Sentiment: ${analysisData.sentiment || 'N/A'}`, 20, 44);
        
        doc.text('Scores:', 20, 54);
        doc.text(`- Positive: ${analysisData.scores?.vader_positive || 0}`, 25, 61);
        doc.text(`- Negative: ${analysisData.scores?.vader_negative || 0}`, 25, 68);
        doc.text(`- Compound: ${analysisData.scores?.vader_compound || 0}`, 25, 75);
        
        doc.text('Motivation:', 20, 85);
        const motivationLines = doc.splitTextToSize(analysisData.motivation || 'N/A', 170);
        doc.text(motivationLines, 20, 92);
        
        doc.save(`feedback-${this.currentStudentName}-${Date.now()}.pdf`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.enhancedNotesAnalyzer = new EnhancedNotesAnalyzer();
    
    // Also initialize example badges if they exist in the modal
    const modalElement = document.getElementById('teacherFeedbackModal');
    if (modalElement) {
        modalElement.addEventListener('shown.bs.modal', function() {
            // Focus on textarea when modal opens
            document.getElementById('feedbackInputModal').focus();
        });
    }
    
    // Add export functionality to send button (optional)
    const sendBtn = document.getElementById('sendNLPNotifBtn');
    if (sendBtn) {
        // Add export option as context menu or additional button
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-sm btn-outline-secondary mt-1 w-100';
        exportBtn.innerHTML = '<i class="fas fa-file-pdf me-1"></i>Export as PDF';
        exportBtn.style.display = 'none';
        exportBtn.id = 'exportPdfBtn';
        
        sendBtn.parentNode.insertBefore(exportBtn, sendBtn.nextSibling);
        
        exportBtn.addEventListener('click', function() {
            if (sendBtn.dataset.analysis) {
                window.enhancedNotesAnalyzer.exportAsPDF(JSON.parse(sendBtn.dataset.analysis));
            }
        });
        
        // Show export button when analysis is done
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (sendBtn.style.display === 'block') {
                        exportBtn.style.display = 'block';
                    } else {
                        exportBtn.style.display = 'none';
                    }
                }
            });
        });
        
        observer.observe(sendBtn, { attributes: true });
    }
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedNotesAnalyzer;
}