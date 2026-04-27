// Loading state management for Rewards page
window.rewardsLoadingState = {
    rewards: false,
    redemptions: false,
    overview: false,
    hasError: false,
    allLoaded: false
};

// Function to check if all rewards data has loaded
function checkRewardsDataLoaded() {
    const state = window.rewardsLoadingState;
    console.log('Rewards loading state:', state);
    
    // If any data type has an error, show error state immediately
    if (state.hasError) {
        console.log('Error detected, showing error state');
        showRewardsError();
        return;
    }
    
    // Only show content if all data loaded successfully
    if (!state.allLoaded && state.rewards && state.redemptions && state.overview) {
        state.allLoaded = true;
        // Small delay to ensure DOM is updated
        setTimeout(() => {
            showRewardsContent();
            showToast('Rewards loaded successfully!', 'success');
        }, 100);
    }
}

// Function to handle rewards loading errors
function handleRewardsDataLoadError(dataType, error) {
    console.error(`Rewards ${dataType} load error:`, error);
    window.rewardsLoadingState[dataType] = true; // Mark as loaded (but failed)
    window.rewardsLoadingState.hasError = true; // Set error flag
    checkRewardsDataLoaded();
}

// Show/hide loading and content states for rewards
function showRewardsLoading() {
    const loadingMessage = document.getElementById('rewardsLoadingMessage');
    const errorMessage = document.getElementById('rewardsErrorMessage');
    const content = document.getElementById('rewardsContent');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (content) content.style.display = 'none';
}

function showRewardsError() {
    const loadingMessage = document.getElementById('rewardsLoadingMessage');
    const errorMessage = document.getElementById('rewardsErrorMessage');
    const content = document.getElementById('rewardsContent');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (content) content.style.display = 'none';
    
    if (errorMessage) {
        errorMessage.style.display = 'flex';
        errorMessage.style.alignItems = 'center';
        errorMessage.style.justifyContent = 'center';
        errorMessage.style.minHeight = '400px';
        
        // Load the error template using fetch
        fetch('/partials/showError')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load error template');
                }
                return response.text();
            })
            .then(html => {
                errorMessage.innerHTML = html;
                // Add event listener to retry button - calls location.reload() for this page
                const retryButton = document.getElementById('retryButton');
                if (retryButton) {
                    retryButton.addEventListener('click', function() {
                        location.reload(); // Reload the page to retry
                    });
                }
            })
            .catch(error => {
                console.error('Error loading error template:', error);
                // Fallback to basic error message
                errorMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h3 style="color: #DB2D2D;">Connection Error</h3>
                        <p>Unable to load rewards data. Please check your connection.</p>
                        <button onclick="location.reload()" style="padding: 10px 20px; background: #5e72e4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
}

function showRewardsContent() {
    const loadingMessage = document.getElementById('rewardsLoadingMessage');
    const errorMessage = document.getElementById('rewardsErrorMessage');
    const content = document.getElementById('rewardsContent');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (content) content.style.display = 'block';
    console.log('Rewards content shown');
}

// Toast Notification Functions
export function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'error' ? 'error' : type === 'info' ? 'info' : ''}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'info' ? 'fa-info-circle' : 'fa-check-circle'} me-2"></i>
            ${message}
        </div>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Confirmation Dialog Function
export function showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmationDialogue');
        const titleEl = document.getElementById('confirmationDialogueTitle');
        const messageEl = document.getElementById('confirmationDialogueMessage');
        const confirmBtn = document.getElementById('confirmationDialogueConfirmBtn');
        const cancelBtn = document.getElementById('confirmationDialogueCancelBtn');

        // Set dialog content
        titleEl.textContent = title;
        messageEl.textContent = message;

        // Show dialog
        dialog.style.display = 'flex';

        // Remove previous event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Add event listeners
        newConfirmBtn.addEventListener('click', () => {
            dialog.style.display = 'none';
            resolve(true);
        });

        newCancelBtn.addEventListener('click', () => {
            dialog.style.display = 'none';
            resolve(false);
        });

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.style.display = 'none';
                resolve(false);
            }
        });
    });
}

export function hideLoadingToast(toast) {
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Track initial page load
let isInitialLoad = true;

// Export all necessary functions
export function initializeAddRewardForm() {
    const form = document.getElementById('addRewardForm');
    if (!form) return;

    form.addEventListener('submit', handleAddReward);
}

export function setupEditButtonHandlers() {
    console.log('Setting up edit button handlers');
    const editButtons = document.querySelectorAll('.edit-reward-btn');
    console.log('Found edit buttons:', editButtons.length);
    
    editButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const rewardId = this.getAttribute('data-reward-id');
            console.log('Edit button clicked for reward ID:', rewardId);
            
            if (!rewardId) {
                console.error('No reward ID found on button');
                return;
            }
            
            await populateEditModal(rewardId);
            
            // Initialize the edit form submission handler
            initializeEditRewardForm();
            
            // Ensure the modal is shown
            const editModal = new bootstrap.Modal(document.getElementById('editRewardModal'));
            editModal.show();
        });
    });
}

async function populateEditModal(rewardId) {
    try {
        // Clear fields first
        document.getElementById('editRewardId').value = '';
        document.getElementById('editRewardName').value = '';
        document.getElementById('editPointCost').value = '';
        document.getElementById('editAvailableQuantity').value = '';
        document.getElementById('editCategory').value = '';
        document.getElementById('editRewardDescription').value = '';

        console.log('Fetching reward data for ID:', rewardId);
        const response = await fetch(`/api/rewards/${rewardId}`);
        const result = await response.json();
        console.log('Received reward data:', result);

        if (result.success && result.reward) {
            const reward = result.reward;
            console.log('Populating modal with reward:', reward);
            
            // Populate the edit form fields
            const editForm = document.getElementById('editRewardForm');
            if (!editForm) {
                console.error('Edit form not found in DOM');
                return;
            }

            // Set form field values
            document.getElementById('editRewardId').value = reward.reward_id;
            document.getElementById('editRewardName').value = reward.reward_name;
            document.getElementById('editPointCost').value = reward.point_cost;
            document.getElementById('editAvailableQuantity').value = reward.available_quantity;
            document.getElementById('editCategory').value = reward.category;
            document.getElementById('editRewardDescription').value = reward.description || '';

            console.log('Modal populated successfully');
            
            // Initialize the edit form submission handler
            initializeEditRewardForm();
        } else {
            console.error('Failed to load reward data:', result.message);
            showToast(result.message || 'Failed to load reward data', 'error');
        }
    } catch (error) {
        console.error('Error in populateEditModal:', error);
        showToast(`An error occurred while loading reward data: ${error.message}`, 'error');
    }
}

export function initializeEditRewardForm() {
    console.log('Initializing edit form');
    const form = document.getElementById('editRewardForm');
    if (!form) {
        console.error('Edit form not found');
        return;
    }

    // Remove any existing event listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Edit form submitted');
        
        // Show confirmation dialog before editing
        const rewardName = document.getElementById('editRewardName').value;
        const confirmed = await showConfirmationDialog(
            'Confirm Edit',
            `Are you sure you want to edit the reward "${rewardName}"?`
        );
        
        if (confirmed) {
            await handleEditReward(e);
        }
    });
}

async function handleEditReward(event) {
    event.preventDefault();
    console.log('Handle edit reward called');

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const rewardId = document.getElementById('editRewardId').value;
    
    console.log('Editing reward ID:', rewardId);

    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        const formData = new FormData(form);
        const jsonData = {
            reward_name: formData.get('reward_name'),
            point_cost: parseInt(formData.get('point_cost')),
            available_quantity: parseInt(formData.get('available_quantity')),
            category: formData.get('category'),
            description: formData.get('description') || ''
        };
        
        console.log('Submitting data:', jsonData);

        const response = await fetch(`/api/rewards/${rewardId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Response data:', result);

        if (result.success) {
            showToast(result.message || 'Reward updated successfully!', 'success');
            
            // Close modal properly
            const editModal = document.getElementById('editRewardModal');
            const modalInstance = bootstrap.Modal.getInstance(editModal);
            
            if (modalInstance) {
                modalInstance.hide();
                
                // Remove modal backdrop and restore body scrolling
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            }
            
            // Reload rewards table without page refresh
            await loadRewards();
        } else {
            throw new Error(result.message || 'Failed to update reward');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(`Error updating reward: ${error.message}`, 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
    }
}

// Add event listener for modal hidden event
document.addEventListener('DOMContentLoaded', function() {
    const editModal = document.getElementById('editRewardModal');
    if (editModal) {
        editModal.addEventListener('hidden.bs.modal', function () {
            // Clean up after modal is hidden
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        });
    }
});

export async function loadRewards(page = 1, perPage = 5) {
    try {
        const response = await fetch(`/api/rewards?page=${page}&per_page=${perPage}`);
        const result = await response.json();

        if (result.success) {
            const tableBody = document.getElementById('rewardsTableBody');
            if (tableBody) {
                if (!Array.isArray(result.rewards) || result.rewards.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No rewards found.</td></tr>`;
                    renderPagination(1, perPage, 0);
                    if (isInitialLoad) {
                        showToast('No rewards found', 'info');
                    }
                    return;
                }

                tableBody.innerHTML = result.rewards.map(reward => `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <div>
                                    <div class="reward-name">${reward.reward_name || 'Unknown Reward'}</div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center">${reward.point_cost || 0}</td>
                        <td class="text-center">${reward.available_quantity || 0}</td>
                        <td class="text-center">${getCategoryBadge(reward.category)}</td>
                        <td class="text-center">${getStatusText(reward.status)}</td>
                        <td class="text-center">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary edit-reward-btn" 
                                    data-reward-id="${reward.reward_id}" 
                                    title="Edit Reward"
                                    style="border: 1.5px solid #0d6efd; border-radius: 8px; background: #fff; color: #0d6efd; margin-right: 4px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${getDelistRelistButton(reward)}
                            </div>
                        </td>
                    </tr>
                `).join('');

                // Reinitialize edit button handlers
                setupEditButtonHandlers();

                // Add event listeners for delist/relist buttons
                tableBody.querySelectorAll('.delist-reward-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const rewardId = this.getAttribute('data-reward-id');
                        const rewardName = this.closest('tr').querySelector('.reward-name').textContent;
                        
                        const confirmed = await showConfirmationDialog(
                            'Confirm Delist',
                            `Are you sure you want to delist the reward "${rewardName}"?`
                        );
                        
                        if (confirmed) {
                            await updateRewardStatus(rewardId, 'Unavailable');
                        }
                    });
                });
                tableBody.querySelectorAll('.relist-reward-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const rewardId = this.getAttribute('data-reward-id');
                        const rewardName = this.closest('tr').querySelector('.reward-name').textContent;
                        
                        const confirmed = await showConfirmationDialog(
                            'Confirm Relist',
                            `Are you sure you want to relist the reward "${rewardName}"?`
                        );
                        
                        if (confirmed) {
                            await updateRewardStatus(rewardId, 'Available');
                        }
                    });
                });

                // Render pagination
                renderPagination(result.page, perPage, result.total);
                
                if (isInitialLoad) {
                    window.rewardsLoadingState.rewards = true;
                    checkRewardsDataLoaded();
                }
            }
        } else {
            console.error('API Error:', result.message);
            showToast(result.message || 'Failed to load rewards', 'error');
            handleRewardsDataLoadError('rewards', new Error(result.message));
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(`An error occurred while loading rewards: ${error.message}`, 'error');
        handleRewardsDataLoadError('rewards', error);
    } finally {
        hideLoadingToast(loadingToast);
    }
}

// Helper functions for badge generation
function getCategoryBadge(category) {
    if (!category) return '<span class="badge bg-secondary">Uncategorized</span>';
    return `<span class="badge bg-primary">${category}</span>`;
}

function getStatusBadge(quantity) {
    quantity = quantity || 0;
    if (quantity > 10) return '<span class="badge bg-success">Active</span>';
    if (quantity > 0) return '<span class="badge bg-warning">Limited</span>';
    return '<span class="badge bg-danger">Out of Stock</span>';
}
function getStatusText(status) {
    if (!status) return 'Unavailable';
    if (status === 'Available') return '<span class="badge bg-success">Available</span>';
    if (status === 'Unavailable') return '<span class="badge bg-danger">Unavailable</span>';
    if (status === 'Out of Stock') return '<span class="badge bg-warning text-dark">Out of Stock</span>';
    return `<span class="badge bg-secondary">${status}</span>`;
}

function getDelistRelistButton(reward) {
    if (reward.status === 'Available') {
        return `<button class="btn btn-sm delist-reward-btn" 
            data-reward-id="${reward.reward_id || reward.id}" 
            title="Delist Reward"
            style="border: none; background: none; color: #dc3545; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
            <i class="fas fa-ban"></i>
        </button>`;
    } else {
        return `<button class="btn btn-sm relist-reward-btn" 
            data-reward-id="${reward.reward_id || reward.id}" 
            title="ReList Reward"
            style="border: none; background: none; color: #198754; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
            <i class="fas fa-undo"></i>
        </button>`;
    }
}

// Function to load teacher's assigned classes
async function loadTeacherAssignedClasses() {
    try {
        const response = await fetch('/api/rewards?page=1&per_page=1');
        const result = await response.json();
        
        if (result.success) {
            const classSelect = document.getElementById('assignedClass');
            if (classSelect && result.assigned_classes) {
                // Clear existing options except the first one
                classSelect.innerHTML = '<option value="">Select Class</option>';
                
                // Add teacher's assigned classes
                result.assigned_classes.forEach(classInfo => {
                    const option = document.createElement('option');
                    option.value = classInfo.class_name;
                    option.textContent = classInfo.class_name;
                    option.setAttribute('data-grade', classInfo.grade_level);
                    option.setAttribute('data-section', classInfo.section);
                    classSelect.appendChild(option);
                });
                
                // If no classes assigned, disable the dropdown
                if (result.assigned_classes.length === 0) {
                    classSelect.innerHTML = '<option value="">No classes assigned</option>';
                    classSelect.disabled = true;
                }
            }
        }
    } catch (error) {
        console.error('Error loading teacher classes:', error);
        showToast('Error loading your assigned classes', 'error');
    }
}

// Handle add reward form submission
document.addEventListener('DOMContentLoaded', function() {
    const addForm = document.getElementById('addRewardForm');
    
    // Load teacher's assigned classes when the modal is shown
    const addRewardModal = document.getElementById('addRewardModal');
    if (addRewardModal) {
        addRewardModal.addEventListener('show.bs.modal', function() {
            loadTeacherAssignedClasses();
        });
    }
    
    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const rewardName = document.getElementById('rewardName').value;
            const assignedClass = document.getElementById('assignedClass').value;
            
            if (!assignedClass) {
                showToast('Please select a class you teach', 'error');
                return;
            }

            const confirmed = await showConfirmationDialog(
                'Confirm Add Reward',
                `Are you sure you want to add the reward "${rewardName}" for ${assignedClass}?`
            );

            if (!confirmed) {
                return;
            }

            const submitBtn = addForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            const formData = new FormData(this);

            // Parse the assigned class value (format: "Grade X - SectionName")
            const classValue = formData.get('assigned_class');
            const [gradePart, sectionPart] = classValue.split(' - ');
            const gradeLevel = gradePart.replace('Grade ', '');
            const section = sectionPart;

            // Remove the assigned_class field and add grade_level and section
            formData.delete('assigned_class');
            formData.append('grade_level', gradeLevel);
            formData.append('section', section);

            fetch('/api/rewards', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;

                if (data.success) {
                    showToast(data.message || 'Reward added successfully!', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addRewardModal'));
                    if (modal) modal.hide();
                    addForm.reset();
                    loadRewards();
                } else {
                    showToast('Error adding reward: ' + (data.message || 'Unknown error'), 'error');
                }
            })
            .catch(error => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                console.error('Error:', error);
                showToast('Error adding reward. Please try again.', 'error');
            });
        });
    }
    
    // Ensure rewards are loaded when the page loads
    showRewardsLoading();
    loadRewards();
    loadRecentRedemptions();
    loadUnusedRewardsOverview();
    startRewardsAutoRefresh(5000);
});

export function renderPagination(currentPage, perPage, total) {
    const pagination = document.getElementById('rewardsPagination');
    if (!pagination) return;

    const totalPages = Math.ceil(total / perPage);
    let html = '';

    html += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
    </li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item${i === currentPage ? ' active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
    }

    html += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
    </li>`;

    pagination.innerHTML = html;

    pagination.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (!isNaN(page) && page >= 1 && page <= totalPages && page !== currentPage) {
                loadRewards(page, perPage);
            }
        });
    });
}

// Update reward status (delist/relist)
async function updateRewardStatus(rewardId, newStatus) {
    try {
        const response = await fetch(`/api/rewards/${rewardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        if (result.success) {
            showToast(`Reward ${newStatus === 'Available' ? 'relisted' : 'delisted'} successfully!`, 'success');
            loadRewards();
        } else {
            showToast(result.message || 'Failed to update reward status', 'error');
        }
    } catch (err) {
        showToast('Error updating reward status', 'error');
    } finally {
        hideLoadingToast(loadingToast);
    }
}

export async function loadRecentRedemptions() {
    const list = document.getElementById('redemptionHistoryList');
    if (!list) return;
    list.innerHTML = `<div class="text-center text-muted py-2"><i class="fas fa-spinner fa-spin"></i> Loading...</div>`;
    try {
        const res = await fetch('/api/recent-reward-redemptions');
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load redemptions');
        if (!data.redemptions || data.redemptions.length === 0) {
            list.innerHTML = `<div class="text-center text-muted py-2">No recent redemptions.</div>`;
            return;
        }
        list.innerHTML = data.redemptions.map(r => {
            const imgSrc = r.pic && r.pic !== '' ? r.pic : '/static/image/default-avatar.png';
            const dateObj = formatDateTime(r.date);
            const dateStr = dateObj.date && dateObj.time ? `${dateObj.date} ${dateObj.time}` : '';
            return `
                <div class="list-group-item d-flex align-items-center">
                    <img src="${imgSrc}" alt="Avatar" class="rounded-circle me-2" style="width:32px;height:32px;object-fit:cover;">
                    <div class="flex-grow-1">
                        <div><strong>${r.student || 'Unknown Student'}</strong> redeemed <strong>${r.reward || 'Reward'}</strong></div>
                        <small class="text-muted">${r.points} pts &middot; ${r.status} &middot; ${dateStr}</small>
                    </div>
                </div>
            `;
        }).join('');
        
        window.rewardsLoadingState.redemptions = true;
        checkRewardsDataLoaded();
    } catch (err) {
        list.innerHTML = `<div class="text-danger text-center py-2">Error loading redemptions.</div>`;
        showToast('Error loading recent redemptions', 'error');
        handleRewardsDataLoadError('redemptions', err);
    } finally {
        hideLoadingToast(loadingToast);
    }
}

// Helper to format date/time
function formatDateTime(dt) {
    if (!dt) return {date: '', time: ''};
    const d = new Date(dt);
    if (isNaN(d)) return {date: '', time: ''};
    return {
        date: d.toLocaleDateString(undefined, { dateStyle: 'short' }),
        time: d.toLocaleTimeString(undefined, { timeStyle: 'short' })
    };
}

// --- BEGIN: Unused Rewards Overview JS ---
async function loadUnusedRewardsOverview() {
    try {
        const response = await fetch('/api/reward-redemptions?per_page=all');
        const data = await response.json();
        if (!data.success) {
            showToast('Failed to load rewards overview', 'error');
            handleRewardsDataLoadError('overview', new Error('Failed to load rewards overview'));
            return;
        }

        const studentGroups = {};
        data.redemptions.forEach(r => {
            if (r.status && r.status.toLowerCase() !== 'unused') return;
            
            const studentKey = `${r.student}_${r.grade_level}_${r.section}`;
            if (!studentGroups[studentKey]) {
                studentGroups[studentKey] = {
                    student: r.student,
                    grade: r.grade_level || 'Unassigned',
                    section: r.section || 'Unassigned',
                    pic: r.pic || '/static/image/default-avatar.png',
                    rewards: []
                };
            }
            studentGroups[studentKey].rewards.push(r);
        });

        const classroomGroups = {};
        Object.values(studentGroups).forEach(studentData => {
            const classroomKey = `${studentData.grade}_${studentData.section}`;
            if (!classroomGroups[classroomKey]) {
                classroomGroups[classroomKey] = {
                    grade: studentData.grade,
                    section: studentData.section,
                    students: []
                };
            }
            classroomGroups[classroomKey].students.push(studentData);
        });

        const sortedClassrooms = Object.values(classroomGroups).sort((a, b) => {
            const gradeA = parseInt(a.grade, 10);
            const gradeB = parseInt(b.grade, 10);
            if (gradeA !== gradeB) return gradeA - gradeB;
            return a.section.localeCompare(b.section);
        });

        const container = document.getElementById('classroomOverviewContainer');
        container.innerHTML = '';
        
        sortedClassrooms.forEach((classroom, idx) => {
            const collapseId = `classroom${classroom.grade}${classroom.section}`;
            const totalRewards = classroom.students.reduce((sum, student) => sum + student.rewards.length, 0);

            const card = document.createElement('div');
            card.className = 'card mb-4 shadow-sm';

            card.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center bg-white classroom-header"
                    data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}" style="cursor:pointer;">
                    <div>
                        <span class="fw-bold" style="font-size: 1.1rem;">
                            Grade ${classroom.grade} ${classroom.section}
                        </span>
                        <span class="text-muted ms-2" style="font-size: 0.95rem;">
                            (${totalRewards} Unused Reward${totalRewards !== 1 ? 's' : ''})
                        </span>
                    </div>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div id="${collapseId}" class="collapse">
                    <div class="card-body bg-light p-0">
                        ${totalRewards === 0 ? 
                            '<div class="p-4 text-center text-muted">No redeemed rewards in this section.</div>' : 
                            classroom.students.map((student, studentIdx) => {
                                const studentCollapseId = `student${classroom.grade}${classroom.section}${studentIdx}`;
                                return `
                                    <div class="student-rewards-group border-bottom">
                                        <div class="p-3 bg-white student-header" 
                                             data-bs-toggle="collapse" 
                                             data-bs-target="#${studentCollapseId}"
                                             aria-expanded="true"
                                             style="cursor:pointer;">
                                            <div class="d-flex align-items-center justify-content-between">
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar me-3" style="width:40px;height:40px;">
                                                        <img src="${student.pic}" alt="${student.student}" 
                                                             style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                                                    </div>
                                                    <div>
                                                        <h6 class="mb-0 fw-bold">${student.student}</h6>
                                                        <small class="text-muted">Grade ${student.grade} – Section ${student.section}</small>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center">
                                                    <span class="badge bg-primary me-2">${student.rewards.length} reward${student.rewards.length !== 1 ? 's' : ''}</span>
                                                    <i class="fas fa-chevron-down student-chevron"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="${studentCollapseId}" class="collapse">
                                            <div class="rewards-list p-3 pt-0">
                                                ${student.rewards.map((reward, rewardIdx) => `
                                                    <div class="reward-item ${rewardIdx < student.rewards.length - 1 ? 'border-bottom' : ''} py-3">
                                                        <div class="row align-items-center">
                                                            <div class="col-md-6">
                                                                <div class="fw-semibold">${reward.reward}</div>
                                                                <div class="small text-muted">
                                                                    <span class="badge bg-info">${reward.category || reward.type || '-'}</span>
                                                                    • ${formatDateTime(reward.date).date}
                                                                </div>
                                                            </div>
                                                            <div class="col-md-3 text-center">
                                                                <span class="badge bg-success">
                                                                    <i class="fas fa-minus"></i> ${reward.points}
                                                                </span>
                                                            </div>
                                                            <div class="col-md-3 text-end">
                                                                <button class="btn btn-primary btn-sm use-reward-btn"
                                                                    data-redemption='${encodeURIComponent(JSON.stringify(reward))}'>
                                                                    <i class="fas fa-check"></i> Use Reward
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                </div>
            `;
            
            card.querySelector('.classroom-header').addEventListener('click', function(e) {
                if (e.target.closest('.classroom-header')) {
                    const collapse = card.querySelector('.collapse');
                    const isShown = collapse.classList.contains('show');
                    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapse);
                    if (isShown) {
                        bsCollapse.hide();
                    } else {
                        bsCollapse.show();
                    }
                }
            });
            container.appendChild(card);
        });

        if (sortedClassrooms.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No redeemed rewards available.</div>';
        }

        container.querySelectorAll('.student-header').forEach(header => {
            header.addEventListener('click', function(e) {
                if (e.target.closest('.student-header')) {
                    const targetId = this.getAttribute('data-bs-target');
                    const collapse = document.querySelector(targetId);
                    const chevron = this.querySelector('.student-chevron');
                    const isShown = collapse.classList.contains('show');
                    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapse);
                    
                    if (isShown) {
                        bsCollapse.hide();
                        chevron.classList.remove('fa-chevron-up');
                        chevron.classList.add('fa-chevron-down');
                    } else {
                        bsCollapse.show();
                        chevron.classList.remove('fa-chevron-down');
                        chevron.classList.add('fa-chevron-up');
                    }
                }
            });
        });

        container.querySelectorAll('.student-header').forEach(header => {
            const chevron = header.querySelector('.student-chevron');
            chevron.classList.remove('fa-chevron-up');
            chevron.classList.add('fa-chevron-down');
        });

        container.querySelectorAll('.use-reward-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const redemption = JSON.parse(decodeURIComponent(this.getAttribute('data-redemption')));
                
                const confirmed = await showConfirmationDialog(
                    'Confirm Use Reward',
                    `Are you sure you want to mark "${redemption.reward}" as used for ${redemption.student}?`
                );
                
                if (confirmed) {
                    showRewardUsageModal(redemption);
                }
            });
        });

        window.rewardsLoadingState.overview = true;
        checkRewardsDataLoaded();

    } catch (e) {
        document.getElementById('classroomOverviewContainer').innerHTML = '<div class="alert alert-danger">Failed to load unused rewards.</div>';
        showToast('Failed to load unused rewards', 'error');
        handleRewardsDataLoadError('overview', e);
    } finally {
        hideLoadingToast(loadingToast);
    }
}

function showRewardUsageModal(redemption) {
    const modalId = 'rewardUsageModal';
    
    let remarksText = '';
    if (redemption.remarks && redemption.remarks.trim() !== '') {
        remarksText = redemption.remarks;
    } else if (redemption.notes && redemption.notes.trim() !== '') {
        remarksText = redemption.notes;
    } else {
        remarksText = '<span class="text-muted">No remarks provided.</span>';
    }

    const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="rewardUsageModalLabel" aria-hidden="true">
      <div class="modal-dialog" style="margin-top: 5vh; max-width: 480px;">
        <form id="useRewardForm">
          <div class="modal-content">
            <div class="modal-header bg-light py-3">
              <h5 class="modal-title mb-0">
                <i class="fas fa-check-circle text-success me-2"></i>Use Reward
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-3">
              <div class="d-flex align-items-center mb-3 p-2 bg-light rounded">
                <div class="avatar me-3" style="width:50px;height:50px;">
                  <img src="${redemption.pic || '/static/image/default-avatar.png'}" 
                       alt="${redemption.student}" 
                       style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                </div>
                <div>
                  <h6 class="mb-1 fw-bold">${redemption.student}</h6>
                  <p class="mb-0 text-muted small">Grade ${redemption.grade_level || redemption.grade || '-'} • Section ${redemption.section || '-'}</p>
                </div>
              </div>

              <div class="row g-2 mb-3">
                <div class="col-6">
                  <div class="border rounded p-2 text-center">
                    <div class="text-muted small">Reward</div>
                    <div class="fw-bold">${redemption.reward}</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded p-2 text-center">
                    <div class="text-muted small">Points</div>
                    <div class="fw-bold text-success"><i class="fas fa-minus"></i> ${redemption.points}</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded p-2 text-center">
                    <div class="text-muted small">Category</div>
                    <div><span class="badge bg-info">${redemption.category || redemption.type || '-'}</span></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="border rounded p-2 text-center">
                    <div class="text-muted small">Redeemed</div>
                    <div class="small">${formatDateTime(redemption.date).date}</div>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">
                  <i class="fas fa-comment-dots me-1"></i>Student Remarks
                </label>
                <div class="border rounded p-2 bg-light" style="min-height:40px;">
                  ${remarksText}
                </div>
              </div>

              <div class="mb-3">
                <label for="rewardNotes" class="form-label fw-bold">
                  <i class="fas fa-sticky-note me-1"></i>Notes <span class="text-danger">*</span>
                </label>
                <textarea class="form-control" id="rewardNotes" rows="3" 
                          inputmode="text"
                          placeholder="Enter notes about how this reward was used..."></textarea>
                <div class="form-text">Required to mark this reward as used.</div>
              </div>
              
              <div id="useRewardError" class="alert alert-danger py-2 small mb-0" style="display: none;"></div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i>Cancel
              </button>
              <button type="submit" class="btn btn-sm btn-success">
                <i class="fas fa-check me-1"></i>Mark as Used
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    `;

    const container = document.getElementById('rewardUsageModalContainer');
    container.innerHTML = modalHtml;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();

    document.getElementById('useRewardForm').onsubmit = async function(e) {
        e.preventDefault();
        const notes = document.getElementById('rewardNotes').value.trim();
        const errorDiv = document.getElementById('useRewardError');
        
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        if (!notes) {
            errorDiv.textContent = 'Notes are required to mark this reward as used.';
            errorDiv.style.display = 'block';
            return;
        }

        if (!redemption.redemption_id) {
            errorDiv.textContent = 'Redemption ID missing.';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const resp = await fetch(`/api/reward-redemptions/${redemption.redemption_id}/use`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({notes})
            });
            const result = await resp.json();
            
            if (result.success) {
                modal.hide();
                showToast('Reward marked as used successfully!', 'success');
                loadUnusedRewardsOverview();
            } else {
                errorDiv.textContent = result.message || 'Failed to update reward.';
                errorDiv.style.display = 'block';
                showToast(result.message || 'Failed to update reward', 'error');
            }
        } catch (err) {
            errorDiv.textContent = 'Server error. Please try again.';
            errorDiv.style.display = 'block';
            showToast('Server error. Please try again.', 'error');
        } finally {
            hideLoadingToast(loadingToast);
        }
    };
}

const style = document.createElement('style');
style.textContent = `
    .student-rewards-group {
        transition: background-color 0.2s;
    }
    .student-rewards-group:hover {
        background-color: #f8f9fa;
    }
    .student-header {
        transition: background-color 0.2s;
    }
    .student-header:hover {
        background-color: #f8f9fa !important;
    }
    .reward-item {
        transition: background-color 0.2s;
    }
    .reward-item:hover {
        background-color: #f8f9fa;
    }
    .rewards-list {
        margin-left: 0;
    }
    .student-chevron {
        transition: transform 0.3s ease;
    }
    @media (max-width: 768px) {
        .reward-item .row > div {
            margin-bottom: 0.5rem;
        }
        .reward-item .text-end {
            text-align: left !important;
        }
        .student-header .d-flex {
            flex-direction: column;
            align-items: flex-start !important;
        }
        .student-header .badge {
            margin-top: 0.5rem;
        }
    }
`;
document.head.appendChild(style);

let lastRewardsData = null;

// Polling function to auto-refresh rewards table
function startRewardsAutoRefresh(intervalMs = 5000) {
    setInterval(async () => {
        try {
            const response = await fetch('/api/rewards?page=1&per_page=5');
            const result = await response.json();
            if (result.success) {
                const newData = JSON.stringify(result.rewards);
                if (lastRewardsData !== newData) {
                    lastRewardsData = newData;
                    await loadRewards();
                }
            }
        } catch (err) {
            // Optionally handle error
        }
    }, intervalMs);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    showRewardsLoading();
    loadRewards();
    loadRecentRedemptions();
    loadUnusedRewardsOverview();
    startRewardsAutoRefresh(5000);
});