// ================================
// LOADING STATE MANAGEMENT FOR AWARD POINTS PAGE
// ================================
window.awardPointsLoadingState = {
    students: false,
    recentAwards: false,
    pointLeaders: false,
    hasError: false,
    allLoaded: false
};

// Function to check if all award points data has loaded
function checkAwardPointsDataLoaded() {
    const state = window.awardPointsLoadingState;
    console.log('Award Points loading state:', state);
    
    // If any data type has an error, show error state immediately
    if (state.hasError) {
        console.log('Error detected, showing error state');
        showAwardPointsError();
        return;
    }
    
    // Only show content if all data loaded successfully
    if (!state.allLoaded && state.students && state.recentAwards && state.pointLeaders) {
        state.allLoaded = true;
        // Small delay to ensure DOM is updated
        setTimeout(() => {
            showAwardPointsContent();
            showToast('Award Points loaded successfully!', 'success');
        }, 100);
    }
}

// Function to handle award points loading errors
function handleAwardPointsDataLoadError(dataType, error) {
    console.error(`Award Points ${dataType} load error:`, error);
    window.awardPointsLoadingState[dataType] = true; // Mark as loaded (but failed)
    window.awardPointsLoadingState.hasError = true; // Set error flag
    checkAwardPointsDataLoaded();
}

// Show/hide loading and content states for award points
function showAwardPointsLoading() {
    const loadingMessage = document.getElementById('awardPointsLoadingMessage');
    const errorMessage = document.getElementById('awardPointsErrorMessage');
    const content = document.getElementById('awardPointsContent');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (content) content.style.display = 'none';
}

function showAwardPointsError() {
    const loadingMessage = document.getElementById('awardPointsLoadingMessage');
    const errorMessage = document.getElementById('awardPointsErrorMessage');
    const content = document.getElementById('awardPointsContent');
    
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
                        <p>Unable to load award points data. Please check your connection.</p>
                        <button onclick="location.reload()" style="padding: 10px 20px; background: #5e72e4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
}

function showAwardPointsContent() {
    const loadingMessage = document.getElementById('awardPointsLoadingMessage');
    const errorMessage = document.getElementById('awardPointsErrorMessage');
    const content = document.getElementById('awardPointsContent');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (content) content.style.display = 'block';
    console.log('Award Points content shown');
}

// ================================
// TOAST NOTIFICATION FUNCTIONS (Unified)
// ================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'error' ? 'error' : type === 'info' ? 'info' : ''}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'info' ? 'fa-info-circle' : 'fa-check-circle'} me-2"></i>
            ${message}
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 5000);
}

function hideLoadingToast(toast) {
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }
}

// ================================
// GLOBAL VARIABLES
// ================================

let allStudents = [];
let allClassrooms = [];
let searchTimeout;

// ================================
// INITIALIZATION CODE
// ================================

document.addEventListener('DOMContentLoaded', function() {
    showAwardPointsLoading();
    initializeStudentsData();
    loadRecentAwards();
    loadPointLeaders();
    setupEventListeners();
    setupStudentDropdown(); // Add this line
});

// ================================
// STUDENT DROPDOWN FUNCTIONS
// ================================

function setupStudentDropdown() {
    const dropdownToggle = document.getElementById('studentDropdownToggle');
    const dropdownMenu = document.getElementById('studentDropdownMenu');
    
    if (!dropdownToggle || !dropdownMenu) return;
    
    // Toggle dropdown
    dropdownToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('open');
        dropdownToggle.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        dropdownMenu.classList.remove('open');
        dropdownToggle.classList.remove('active');
    });
    
    // Prevent dropdown from closing when clicking inside
    dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

function populateStudentDropdown(students) {
    const dropdownMenu = document.getElementById('studentDropdownMenu');
    const selectedStudentName = document.getElementById('selectedStudentName');
    const selectedStudentSubject = document.getElementById('selectedStudentSubject');
    const selectedStudentAvatar = document.getElementById('selectedStudentAvatar');
    
    if (!dropdownMenu) return;
    
    // Clear existing student options (keep "All Students" option)
    const allStudentsOption = dropdownMenu.querySelector('[data-student-id="all"]');
    dropdownMenu.innerHTML = '';
    if (allStudentsOption) {
        dropdownMenu.appendChild(allStudentsOption);
    }
    
    // Add student options
    students.forEach(student => {
        const studentOption = document.createElement('button');
        studentOption.className = 'student-dropdown-option';
        studentOption.setAttribute('data-student-id', student.id);
        
        const avatarSrc = student.pic || '/static/image/default-avatar.png';
        const streak = student.streak || 0;
        const streakBg = getStreakBgColor(streak);
        
        studentOption.innerHTML = `
            <img src="${avatarSrc}" alt="${student.name}" class="student-dropdown-avatar" style="border-color: ${streakBg}">
            <div class="student-dropdown-info">
                <span class="student-dropdown-name">${student.name}</span>
                <span class="student-dropdown-subject">Grade ${student.grade} - ${student.section}</span>
            </div>
            <span class="student-dropdown-active-badge" style="background: ${streakBg}">${student.points || 0}</span>
        `;
        
        studentOption.addEventListener('click', function() {
            const studentId = this.getAttribute('data-student-id');
            selectStudent(studentId, student);
        });
        
        dropdownMenu.appendChild(studentOption);
    });
    
    // Add event listener for "All Students" option
    if (allStudentsOption) {
        allStudentsOption.addEventListener('click', function() {
            selectStudent('all', null);
        });
    }
}

function selectStudent(studentId, student) {
    const selectedStudentName = document.getElementById('selectedStudentName');
    const selectedStudentSubject = document.getElementById('selectedStudentSubject');
    const selectedStudentAvatar = document.getElementById('selectedStudentAvatar');
    const dropdownMenu = document.getElementById('studentDropdownMenu');
    const dropdownToggle = document.getElementById('studentDropdownToggle');
    
    if (!selectedStudentName || !selectedStudentSubject || !selectedStudentAvatar) return;
    
    // Update selected student display
    if (studentId === 'all') {
        selectedStudentName.textContent = 'All Students';
        selectedStudentSubject.textContent = 'View rewards from all students';
        selectedStudentAvatar.src = '/static/image/default-avatar.png';
        selectedStudentAvatar.style.borderColor = '#e0e7ff';
    } else if (student) {
        selectedStudentName.textContent = student.name;
        selectedStudentSubject.textContent = `Grade ${student.grade} - ${student.section}`;
        selectedStudentAvatar.src = student.pic || '/static/image/default-avatar.png';
        
        // Add streak border to avatar
        const streak = student.streak || 0;
        const streakBg = getStreakBgColor(streak);
        selectedStudentAvatar.style.borderColor = streakBg;
    }
    
    // Close dropdown
    if (dropdownMenu) dropdownMenu.classList.remove('open');
    if (dropdownToggle) dropdownToggle.classList.remove('active');
    
    // Filter data based on selected student
    filterByStudent(studentId);
}

function filterByStudent(studentId) {
    // Add your filtering logic here based on the selected student
    console.log('Filtering by student:', studentId);
    // You can filter recent awards, point leaders, etc. based on the selected student
}

// ================================
// STUDENT DATA INITIALIZATION
// ================================

function initializeStudentsData(retry = 0) {
    document.getElementById('studentSelect').innerHTML = '<option>Loading...</option>';
    document.getElementById('bulkStudentCheckboxes').innerHTML = '<div class="text-center w-100 py-3"><div class="spinner-border text-primary" role="status" aria-hidden="true"></div></div>';

    fetch('/api/my-students')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allStudents = sortStudents(data.students);
                allClassrooms = data.classrooms || [];
                populateGradeSectionFilter();
                populateStudentSelect(allStudents);
                populateBulkGradeSectionFilter();
                populateBulkModalCheckboxes(allStudents);
                populateStudentDropdown(allStudents);
                setupSelectAllFunctionality();
            } else {
                document.getElementById('studentSelect').innerHTML = '<option disabled>No students found</option>';
                document.getElementById('bulkStudentCheckboxes').innerHTML = '<div class="text-danger">No students found.</div>';
                window.awardPointsLoadingState.students = true;
                handleAwardPointsDataLoadError('students', new Error(data.message || 'Failed to load students'));
            }
            window.awardPointsLoadingState.students = true;
            checkAwardPointsDataLoaded();
        })
        .catch((error) => {
            if (retry < 2) {
                setTimeout(() => initializeStudentsData(retry + 1), 1200);
            } else {
                document.getElementById('studentSelect').innerHTML = '<option disabled>Error loading students</option>';
                document.getElementById('bulkStudentCheckboxes').innerHTML = '<div class="text-danger">Error loading students.</div>';
                window.awardPointsLoadingState.students = true;
                handleAwardPointsDataLoadError('students', error);
            }
        });
}

function sortStudents(students) {
    return students.sort((a, b) => {
        // First sort by grade (numerically)
        const gradeA = parseInt(a.grade) || 0;
        const gradeB = parseInt(b.grade) || 0;
        
        if (gradeA !== gradeB) {
            return gradeA - gradeB;
        }
        
        // Then sort by section (alphabetically)
        const sectionA = a.section || '';
        const sectionB = b.section || '';
        
        if (sectionA !== sectionB) {
            return sectionA.localeCompare(sectionB);
        }
        
        // Finally sort by name (alphabetically)
        const nameA = a.name || '';
        const nameB = b.name || '';
        
        return nameA.localeCompare(nameB);
    });
}

function populateStudentSelect(students) {
    const studentSelect = document.getElementById('studentSelect');
    studentSelect.innerHTML = '';
    
    if (students.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No students available';
        option.disabled = true;
        studentSelect.appendChild(option);
        return;
    }
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        
        // Truncate very long names in dropdown
        let displayText = `${student.name} (Grade ${student.grade} - ${student.section})`;
        if (displayText.length > 60) {
            displayText = displayText.substring(0, 57) + '...';
        }
        
        option.textContent = displayText;
        option.title = `${student.name} (Grade ${student.grade} - ${student.section})`; // Full text on hover
        studentSelect.appendChild(option);
    });
}

function populateGradeSectionFilter() {
    const filter = document.getElementById('gradeSectionFilter');
    filter.innerHTML = `<option value="" selected>All Classes</option>`;
    
    // Sort classrooms by grade and section
    const sortedClassrooms = allClassrooms.sort((a, b) => {
        const gradeA = parseInt(a.grade || a.grade_level) || 0;
        const gradeB = parseInt(b.grade || b.grade_level) || 0;
        
        if (gradeA !== gradeB) {
            return gradeA - gradeB;
        }
        
        const sectionA = a.section || '';
        const sectionB = b.section || '';
        return sectionA.localeCompare(sectionB);
    });
    
    sortedClassrooms.forEach(c => {
        const grade = c.grade || c.grade_level;
        const section = c.section;
        filter.innerHTML += `<option value="${grade}-${section}">Grade ${grade} - ${section}</option>`;
    });
}

function populateBulkModalCheckboxes(students) {
    const bulkContainer = document.getElementById('bulkStudentCheckboxes');
    bulkContainer.innerHTML = '';
    
    if (students.length === 0) {
        bulkContainer.innerHTML = `
            <div class="empty-state-container empty-state-large">
                <i class="fa-solid fa-users empty-state-icon"></i>
                <p class="empty-state-title">No students available</p>
                <p class="empty-state-message">Try adjusting your filter or search criteria</p>
            </div>
        `;
        return;
    }
    
    students.forEach((student, idx) => {
        const streak = student.streak || 0;
        const streakClass = getStreakClass(streak);
        const streakBg = getStreakBgColor(streak);
        
        // Determine font size classes based on text length
        const nameLength = student.name.length;
        const detailsLength = `Grade ${student.grade} - ${student.section}`.length;
        
        let nameClass = '';
        if (nameLength > 25) {
            nameClass = 'very-long-name';
        } else if (nameLength > 18) {
            nameClass = 'long-name';
        }
        
        let detailsClass = '';
        if (detailsLength > 25) {
            detailsClass = 'very-long-details';
        } else if (detailsLength > 20) {
            detailsClass = 'long-details';
        }
        
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-0';
        col.innerHTML = `
            <div class="student-checkbox-card" data-student-id="${student.id}">
                <!-- Hidden checkbox for form data -->
                <input type="checkbox" class="d-none" id="bulkStudent${student.id}" value="${student.id}" name="bulkStudents">
                
                <div class="student-info-container">
                    <div class="avatar-container">
                        <span class="avatar ${streakClass}" style="border-color: ${streakBg}">
                            <img src="${student.pic || '/static/image/default-avatar.png'}" alt="avatar">
                        </span>
                        <span class="streak-badge" style="border-color: ${streakBg}; color: ${streakBg}">
                            ${
                                streak < 7
                                    ? `<span class="material-icons-round fire-icon">local_fire_department</span>`
                                    : `<span class="streak-lottie-bulk" data-streak="${streak}"></span>`
                            }
                            ${streak}
                        </span>
                    </div>
                    <div class="text-content">
                        <div class="student-name ${nameClass}" title="${student.name}">${student.name}</div>
                        <div class="student-details ${detailsClass}" title="Grade ${student.grade} - ${student.section}">Grade ${student.grade} - ${student.section}</div>
                        <div class="modern-mobile-points">
                            <span class="points-icon-gradient">
                                <i class="fa-solid fa-star"></i>
                            </span>
                            <span class="student-points">${student.points || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        bulkContainer.appendChild(col);
    });
    
    // Add click event listeners for border selection
    const cards = bulkContainer.querySelectorAll('.student-checkbox-card');
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on lottie animation
            if (e.target.closest('.streak-lottie-bulk')) return;
            
            const isSelected = this.classList.contains('selected');
            const studentId = this.getAttribute('data-student-id');
            const checkbox = document.getElementById(`bulkStudent${studentId}`);
            
            if (isSelected) {
                // Deselect
                this.classList.remove('selected');
                if (checkbox) checkbox.checked = false;
            } else {
                // Select
                this.classList.add('selected');
                if (checkbox) checkbox.checked = true;
            }
            
            // Update the bulk award button text
            updateBulkAwardButtonText();
        });
    });
    
    // Render streak animations after a short delay
    setTimeout(() => {
        renderStreakLottieAnimations();
    }, 300);
}

function populateBulkGradeSectionFilter() {
    const filter = document.getElementById('bulkGradeSectionFilter');
    filter.innerHTML = `<option value="" selected>All Classes</option>`;
    
    // Sort classrooms by grade and section
    const sortedClassrooms = allClassrooms.sort((a, b) => {
        const gradeA = parseInt(a.grade || a.grade_level) || 0;
        const gradeB = parseInt(b.grade || b.grade_level) || 0;
        
        if (gradeA !== gradeB) {
            return gradeA - gradeB;
        }
        
        const sectionA = a.section || '';
        const sectionB = b.section || '';
        return sectionA.localeCompare(sectionB);
    });
    
    sortedClassrooms.forEach(c => {
        const grade = c.grade || c.grade_level;
        const section = c.section;
        filter.innerHTML += `<option value="${grade}-${section}">Grade ${grade} - ${section}</option>`;
    });
}

function setupSelectAllFunctionality() {
    const selectAll = document.getElementById('selectAllStudents');
    const bulkContainer = document.getElementById('bulkStudentCheckboxes');
    
    selectAll.addEventListener('change', function() {
        const cards = bulkContainer.querySelectorAll('.student-checkbox-card');
        const checkboxes = bulkContainer.querySelectorAll('input[type="checkbox"]');
        
        if (selectAll.checked) {
            // Select all
            cards.forEach(card => {
                card.classList.add('selected');
                card.style.borderColor = '#6366f1';
                card.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                card.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)';
                card.style.transform = 'translateY(-2px)';
            });
            checkboxes.forEach(cb => cb.checked = true);
        } else {
            // Deselect all
            cards.forEach(card => {
                card.classList.remove('selected');
                card.style.borderColor = '#e9ecef';
                card.style.backgroundColor = '#fff';
                card.style.boxShadow = 'none';
                card.style.transform = 'translateY(0)';
            });
            checkboxes.forEach(cb => cb.checked = false);
        }
        
        // Update the bulk award button text
        updateBulkAwardButtonText();
    });
}

// ================================
// BULK AWARD BUTTON TEXT UPDATE FUNCTION
// ================================

function updateBulkAwardButtonText() {
    const bulkBtn = document.getElementById('bulkAwardSubmitBtn');
    const checkboxes = document.querySelectorAll('#bulkStudentCheckboxes input[type="checkbox"]:checked');
    const selectedCount = checkboxes.length;
    
    if (selectedCount === 0) {
        bulkBtn.textContent = 'Award Points';
    } else {
        bulkBtn.textContent = `Award Points to (${selectedCount}) Selected Student${selectedCount !== 1 ? 's' : ''}`;
    }
}

// ================================
// EVENT LISTENERS SETUP
// ================================

function setupEventListeners() {
    document.getElementById('awardPointsForm').addEventListener('submit', handleSingleAwardSubmission);

    const bulkBtn = document.getElementById('bulkAwardSubmitBtn');
    const newBulkBtn = bulkBtn.cloneNode(true);
    bulkBtn.parentNode.replaceChild(newBulkBtn, bulkBtn);
    newBulkBtn.addEventListener('click', handleBulkAwardSubmission);

    document.querySelectorAll('.quick-points').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = parseInt(btn.getAttribute('data-value'), 10);
            const input = btn.parentElement.querySelector('input[type="number"]');
            if (input) {
                const current = parseInt(input.value, 10) || 0;
                input.value = current + value;
            }
        });
    });

    document.querySelectorAll('#bulkAwardForm .quick-points').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = parseInt(btn.getAttribute('data-value'), 10);
            const input = document.getElementById('bulkPointsAmount');
            if (input) {
                const current = parseInt(input.value, 10) || 0;
                input.value = current + value;
            }
        });
    });

    document.getElementById('gradeSectionFilter').addEventListener('change', filterAndSearchStudents);
    document.getElementById('studentSearch').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterAndSearchStudents, 250);
    });

    document.getElementById('bulkGradeSectionFilter').addEventListener('change', filterAndSearchBulkStudents);
    document.getElementById('bulkStudentSearch').addEventListener('input', filterAndSearchBulkStudents);
}

// ================================
// FORM SUBMISSION HANDLERS (WITH CONFIRMATION DIALOGS)
// ================================

async function handleSingleAwardSubmission(e) {
    e.preventDefault();

    const studentId = document.getElementById('studentSelect').value;
    const category = document.getElementById('pointCategory').value;
    const points = document.getElementById('pointsAmount').value;
    const note = document.getElementById('awardNote').value;

    if (!studentId || !category || !points) {
        alert('Please fill in all required fields.');
        return;
    }

    // Get student name for confirmation message
    const studentSelect = document.getElementById('studentSelect');
    const selectedOption = studentSelect.options[studentSelect.selectedIndex];
    const studentName = selectedOption.textContent.split(' (')[0]; // Extract just the name

    // Show confirmation dialog
    const confirmed = await showConfirmationDialog(
        'Confirm Points Award',
        `Are you sure you want to award ${points} points to ${studentName} for ${category}?`
    );

    if (!confirmed) {
        return; // User cancelled
    }

    const btn = document.querySelector('#awardPointsForm button[type="submit"]');
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Awarding...`;

    submitSingleAward(studentId, category, points, note, function() {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    });
}

async function handleBulkAwardSubmission() {
    // Get selected students from checkboxes (which are synchronized with the visual selection)
    const checkboxes = document.querySelectorAll('#bulkStudentCheckboxes input[type="checkbox"]:checked');
    const student_ids = Array.from(checkboxes).map(cb => cb.value);
    
    const category = document.getElementById('bulkPointCategory').value;
    const points = document.getElementById('bulkPointsAmount').value;
    const note = document.getElementById('bulkAwardNote').value;

    if (!student_ids.length || !category || !points) {
        alert('Please select students and fill in all required fields.');
        return;
    }

    // Get selected student names for confirmation message
    const selectedStudents = [];
    const cards = document.querySelectorAll('.student-checkbox-card.selected');
    cards.forEach(card => {
        const nameElement = card.querySelector('.student-name');
        if (nameElement) {
            selectedStudents.push(nameElement.textContent.trim());
        }
    });

    const studentCount = student_ids.length;
    
    // Create a more sensible confirmation message
    let confirmationMessage;
    
    if (studentCount === 1) {
        // For single student, show the name
        confirmationMessage = `Are you sure you want to award ${points} points to ${selectedStudents[0]} for ${category}?`;
    } else if (studentCount <= 3) {
        // For 2-3 students, show all names
        const studentList = selectedStudents.join(', ');
        confirmationMessage = `Are you sure you want to award ${points} points to ${studentCount} students (${studentList}) for ${category}?`;
    } else if (studentCount <= 8) {
        // For 4-8 students, show first 3 names and count the rest
        const studentList = selectedStudents.slice(0, 3).join(', ');
        const remainingCount = studentCount - 3;
        confirmationMessage = `Are you sure you want to award ${points} points to ${studentCount} students (${studentList} and ${remainingCount} more) for ${category}?`;
    } else {
        // For more than 8 students, just show the count
        confirmationMessage = `Are you sure you want to award ${points} points to ${studentCount} students for ${category}?`;
    }

    // Show confirmation dialog
    const confirmed = await showConfirmationDialog(
        'Confirm Bulk Points Award',
        confirmationMessage
    );

    if (!confirmed) {
        return; // User cancelled
    }

    const btn = document.getElementById('bulkAwardSubmitBtn');
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Awarding...`;

    submitBulkAward(student_ids, category, points, note, function() {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    });
}

// ================================
// API SUBMISSION FUNCTIONS
// ================================

function submitSingleAward(studentId, category, points, note, done) {
    fetch('/api/award-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            student_id: studentId,
            category: category,
            points: points,
            note: note
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Points awarded successfully!', 'success');
            refreshDashboardData();
            initializeStudentsData();
        } else {
            showToast(data.message || 'Failed to award points.', 'error');
        }
    })
    .finally(() => {
        if (typeof done === "function") done();
    });
}

function submitBulkAward(student_ids, category, points, note, done) {
    fetch('/api/bulk-award-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            student_ids: student_ids,
            category: category,
            points: points,
            note: note
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(`Points awarded to ${student_ids.length} student${student_ids.length !== 1 ? 's' : ''}!`);
            resetBulkForm();
            closeBulkModal();
            refreshDashboardData();
            initializeStudentsData();
        } else {
            showToast(data.message || 'Failed to award points.', 'error');
        }
    })
    .finally(() => {
        if (typeof done === "function") done();
    });
}

// ================================
// DATA LOADING OPERATIONS
// ================================

function loadRecentAwards() {
    fetch('/api/recent-awards')
        .then(res => res.json())
        .then(data => { 
            const tbody = document.getElementById('recentAwardsTableBody');
            if (data.success && data.awards.length) {
                tbody.innerHTML = data.awards.map(award => {
                    const imgSrc = award.student_pic || '/static/image/default-avatar.png';
                    const streak = award.streak || 0;
                    const streakClass = getStreakClass(streak);
                    const streakBg = getStreakBgColor(streak);
                    
                    // Points display styling
                    const pillBg = "background:linear-gradient(135deg,#f5a623 0%,#f5a623 100%);";
                    const pillColor = "#fff";
                    const pointsIconHtml = `<span class="points-icon-gradient" style="margin-right:4px;font-size:0.95em;">
                        <i class="fa-solid fa-star"></i>
                    </span>`;
                    
                    const avatarHtml = `
                        <div style="position:relative;display:inline-block;width:54px;height:54px;">
                            <span class="avatar ${streakClass}" style="width:48px;height:48px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;border: 2px solid ${streakBg};">
                                <img src="${imgSrc}" alt="avatar" style="width:100%;height:100%;object-fit:cover;">
                            </span>
                            <span style="
                                position:absolute;
                                bottom:-8px;
                                left:50%;
                                transform:translateX(-50%);
                                background:#ffffff;
                                color:${streakBg};
                                font-weight:700;
                                font-size:0.75rem;
                                padding:2px 7px 2px 5px;
                                border-radius:12px;
                                box-shadow:0 2px 8px rgba(0,0,0,0.08);
                                border:2px solid ${streakBg};
                                z-index:2;
                                display:flex;
                                align-items:center;
                            ">
                                ${
                                    streak < 7
                                        ? `<span class="material-icons-round" style="font-size:1rem;margin-right:3px;">local_fire_department</span>`
                                        : `<span class="streak-lottie-table" data-streak="${streak}" style="width:22px;height:22px;display:inline-block;margin-right:3px;"></span>`
                                }
                                ${streak}
                            </span>
                        </div>
                    `;
                    return `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    ${avatarHtml}
                                    <div class="ms-3">
                                        <h6 class="mb-0 text-primary">${award.student}</h6>
                                        <small class="text-muted">Grade ${award.grade} – Section ${award.section}</small>
                                    </div>
                                </div>
                            </td>
                            <td class="text-center">
                                <div class="modern-mobile-points" style="display:inline-flex;align-items:center;justify-content:center;min-width:0;padding:2px 8px;${pillBg}border-radius:10px;border:none;font-size:0.90em;font-weight:700;letter-spacing:0.1px;">
                                    ${pointsIconHtml}
                                    <span class="student-points" style="color:${pillColor};font-weight:700;font-size:0.95em;">+${award.points}</span>
                                </div>
                            </td>
                            <td class="text-center">${getCategoryBadge(award.category)}</td>
                            <td class="text-center">You</td>
                            <td class="text-center">
                                <span class="badge bg-light text-dark">
                                    ${timeAgo(award.date)}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('');
                renderStreakLottieAnimations();
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="padding:0;border:none;">
                            <div class="empty-state-container empty-state-large">
                                <i class="fa-solid fa-star empty-state-icon"></i>
                                <p class="empty-state-title">No recent awards</p>
                                <p class="empty-state-message">Start awarding points to students to see them here</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            window.awardPointsLoadingState.recentAwards = true;
            checkAwardPointsDataLoaded();
        })
        .catch((error) => {
            handleAwardPointsDataLoadError('recentAwards', error);
        });
}

function loadPointLeaders() {
    fetch('/api/point-leaders')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('pointLeadersList');
            list.innerHTML = '';
            if (data.success && data.leaders.length > 0) {
                data.leaders.slice(0, 10).forEach((leader, idx) => {
                    let rankClass = '', pillBg = '', pillColor = '', iconHtml = '';
                    
                    if (idx === 0) {
                        rankClass = 'rank-1';
                        iconHtml = `<span class="rank-circle gold" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#F5A623,#F4B043);color:#fff;margin-right:12px;">
                            <i class="fa-solid fa-crown"></i>
                        </span>`;
                        pillBg = 'background:linear-gradient(135deg,#F5A623,#F4B043);';
                        pillColor = '#fff';
                    } else if (idx === 1) {
                        rankClass = 'rank-2';
                        iconHtml = `<span class="rank-circle silver" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg, #C0C0C0, #A9A9A9);color:#fff;margin-right:12px;">
                            <i class="fa-solid fa-ribbon"></i>
                        </span>`;
                        pillBg = 'background:linear-gradient(135deg, #C0C0C0, #A9A9A9);';
                        pillColor = '#fff';
                    } else if (idx === 2) {
                        rankClass = 'rank-3';
                        iconHtml = `<span class="rank-circle bronze" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg, #CD7F32, #8B4513);color:#fff;margin-right:12px;">
                            <i class="fa-solid fa-medal"></i>
                        </span>`;
                        pillBg = 'background:linear-gradient(135deg, #CD7F32, #8B4513);';
                        pillColor = '#fff';
                    } else {
                        rankClass = '';
                        iconHtml = `<span class="rank-circle" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#e2e8f0;color:#64748B;font-weight:700;margin-right:12px;font-size:1.1em;">
                            ${idx + 1}
                        </span>`;
                        pillBg = 'background:#F8FAFC;';
                        pillColor = '#1E293B';
                    }
                    
                    const pointsIconHtml = `
                        <span class="points-icon-gradient" style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F5A623,#F4B043);margin-right:6px;">
                            <i class="fa-solid fa-star" style="color:#fff;font-size:13px;"></i>
                        </span>
                    `;
                    
                    const imgSrc = leader.student_pic || leader.avatar || '/static/image/default-avatar.png';
                    const streak = leader.streak || 0;
                    const streakClass = getStreakClass(streak);
                    const streakBg = getStreakBgColor(streak);
                    
                    const avatarHtml = `
                        <div style="position:relative;display:inline-block;width:54px;height:54px;">
                            <span class="avatar ${streakClass}" style="width:48px;height:48px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;border: 2px solid ${streakBg};">
                                <img src="${imgSrc}" alt="${leader.name}" style="width:100%;height:100%;object-fit:cover;">
                            </span>
                            <span style="
                                position:absolute;
                                bottom:-8px;
                                left:50%;
                                transform:translateX(-50%);
                                background:#ffffff;
                                color:${streakBg};
                                font-weight:700;
                                font-size:0.75rem;
                                padding:2px 7px 2px 5px;
                                border-radius:12px;
                                box-shadow:0 2px 8px rgba(0,0,0,0.08);
                                border:2px solid ${streakBg};
                                z-index:2;
                                display:flex;
                                align-items:center;
                            ">
                                ${
                                    streak < 7
                                        ? `<span class="material-icons-round" style="font-size:1rem;margin-right:3px;">local_fire_department</span>`
                                        : `<span class="streak-lottie-table" data-streak="${streak}" style="width:22px;height:22px;display:inline-block;margin-right:3px;"></span>`
                                }
                                ${streak}
                            </span>
                        </div>
                    `;
                    
                    list.innerHTML += `
                        <div class="leaderboard-row ${rankClass}" style="display:flex;align-items:center;gap:12px;padding:18px 22px;border:none;border-radius:16px;margin-bottom:14px;background:#fff;box-shadow:0 2px 8px rgba(99,102,241,0.07);">
                            ${iconHtml}
                            ${avatarHtml}
                            <div class="student-info" style="flex:1;min-width:0;">
                                <div class="student-name" style="font-weight:700;color:#1E293B;font-size:1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">
                                    ${leader.name}
                                </div>
                                <div class="student-grade" style="color:#64748B;font-size:0.85em;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    Grade ${leader.grade}${leader.section ? ' - ' + leader.section : ''}
                                </div>
                            </div>
                            <div class="modern-mobile-points" style="display:flex;align-items:center;min-width:70px;padding:7px 16px;${pillBg}border-radius:20px;border:none;font-size:1em;font-weight:700;letter-spacing:0.1px;">
                                ${pointsIconHtml}
                                <span class="student-points" style="color:${pillColor};font-weight:700;font-size:1em;">${leader.points}</span>
                            </div>
                        </div>
                    `;
                });
                renderStreakLottieAnimations();
            } else {
                list.innerHTML = `
                    <div class="empty-state-container empty-state-large">
                        <i class="fa-solid fa-crown empty-state-icon"></i>
                        <p class="empty-state-title">No leaders yet</p>
                        <p class="empty-state-message">Leaders will appear once students receive points</p>
                    </div>
                `;
            }
            console.log('📊 Point Leaders loaded for current school year');
            window.awardPointsLoadingState.pointLeaders = true;
            checkAwardPointsDataLoaded();
        })
        .catch((error) => {
            console.error('❌ Error loading point leaders:', error);
            handleAwardPointsDataLoadError('pointLeaders', error);
        });
}

// ================================
// UTILITY FUNCTIONS
// ================================

function getStreakClass(streak) {
    if (streak < 7) return 'streak-0';
    if (streak < 15) return 'streak-7';
    if (streak < 22) return 'streak-15';
    if (streak < 29) return 'streak-22';
    if (streak < 36) return 'streak-29';
    if (streak < 50) return 'streak-36';
    return 'streak-50';
}

function getStreakBgColor(streak) {
    if (streak < 7) return '#9E9E9E';
    if (streak < 15) return '#FFD600';
    if (streak < 22) return '#FF9800';
    if (streak < 29) return '#FF1744';
    if (streak < 36) return '#00FF40';
    if (streak < 50) return '#5E72E4';
    return '#8E24AA';
}

function getStreakAnimationPath(streak) {
    if (streak < 15) return '/static/image/streak-animation/yellow_fire.json';
    else if (streak < 22) return '/static/image/streak-animation/orange.json';
    else if (streak < 29) return '/static/image/streak-animation/brightred_fire.json';
    else if (streak < 36) return '/static/image/streak-animation/green_fire.json';
    else if (streak < 50) return '/static/image/streak-animation/blue_fire.json';
    else return '/static/image/streak-animation/purple_fire.json';
}

function getCategoryBadge(category) {
    switch (category) {
        case 'Academic Achievement':
            return `<span class="badge bg-primary text-white"><i class="fas fa-graduation-cap me-1"></i> Academic</span>`;
        case 'Positive Behavior':
            return `<span class="badge bg-success text-white"><i class="fas fa-smile-beam me-1"></i> Behavior</span>`;
        case 'Class Participation':
            return `<span class="badge bg-info text-white"><i class="fas fa-users me-1"></i> Participation</span>`;
        case 'Perfect Attendance':
            return `<span class="badge bg-warning text-white"><i class="fas fa-calendar-check me-1"></i> Attendance</span>`;
        case 'Homework Completion':
            return `<span class="badge bg-secondary text-white"><i class="fas fa-book me-1"></i> Homework</span>`;
        case 'Improvement':
            return `<span class="badge bg-dark text-white"><i class="fas fa-arrow-up me-1"></i> Improvement</span>`;
        case 'Leadership':
            return `<span class="badge bg-danger text-white"><i class="fas fa-chess-king me-1"></i> Leadership</span>`;
        case 'Teamwork':
            return `<span class="badge bg-teal text-white" style="background-color:#20c997;"><i class="fas fa-handshake me-1"></i> Teamwork</span>`;
        case 'Custom':
            return `<span class="badge bg-light text-white"><i class="fas fa-star me-1"></i> Custom</span>`;
        case 'Activity':
            return `<span class="badge bg-info text-white"><i class="fas fa-tasks me-1"></i> Activity</span>`;
        default:
            return `<span class="badge bg-secondary text-white">${category}</span>`;
    }
}

function timeAgo(dateString) {
    let date = new Date(dateString);
    const phTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const seconds = Math.floor((now - phTime) / 1000);

    if (isNaN(seconds)) return '';

    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    if (days < 30) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    return phTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
}

function refreshDashboardData() {
    loadRecentAwards();
    loadPointLeaders();
}

function resetBulkForm() {
    document.getElementById('bulkAwardForm').reset();
    // Reset button text when form is reset
    updateBulkAwardButtonText();
}

function closeBulkModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkAwardModal'));
    if (modal) modal.hide();
}

// ================================
// CONFIRMATION DIALOG FUNCTIONS
// ================================

function showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmationDialogue');
        const titleElement = document.getElementById('confirmationDialogueTitle');
        const messageElement = document.getElementById('confirmationDialogueMessage');
        const confirmBtn = document.getElementById('confirmationDialogueConfirmBtn');
        const cancelBtn = document.getElementById('confirmationDialogueCancelBtn');

        // Set dialog content
        titleElement.textContent = title;
        messageElement.textContent = message;

        // Remove previous event listeners by cloning and replacing buttons
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Add new event listeners
        function handleConfirm() {
            hideConfirmationDialog();
            resolve(true);
        }

        function handleCancel() {
            hideConfirmationDialog();
            resolve(false);
        }

        newConfirmBtn.addEventListener('click', handleConfirm);
        newCancelBtn.addEventListener('click', handleCancel);

        // Show dialog
        dialog.style.display = 'flex';

        // Close when clicking outside the dialog box
        function handleOutsideClick(e) {
            if (e.target === dialog) {
                handleCancel();
            }
        }
        dialog.addEventListener('click', handleOutsideClick);

        // Store references for cleanup
        dialog._confirmHandler = handleConfirm;
        dialog._cancelHandler = handleCancel;
        dialog._outsideClickHandler = handleOutsideClick;
    });
}

function hideConfirmationDialog() {
    const dialog = document.getElementById('confirmationDialogue');
    dialog.style.display = 'none';
    
    // Clean up event listeners
    if (dialog._outsideClickHandler) {
        dialog.removeEventListener('click', dialog._outsideClickHandler);
        delete dialog._outsideClickHandler;
    }
}

// ================================
// FILTER & SEARCH FUNCTIONS (CORRECTED)
// ================================

function filterAndSearchStudents() {
    const filter = document.getElementById('gradeSectionFilter').value;
    const search = document.getElementById('studentSearch').value.trim().toLowerCase();
    let filtered = allStudents;

    // Apply grade/section filter if selected
    if (filter) {
        const [grade, section] = filter.split('-');
        filtered = filtered.filter(s => s.grade == grade && s.section == section);
    }
    
    // Apply search filter if there's search text
    if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    }
    
    // Populate the dropdown with the filtered results
    populateStudentSelect(filtered);
}

function filterAndSearchBulkStudents() {
    const filter = document.getElementById('bulkGradeSectionFilter').value;
    const search = document.getElementById('bulkStudentSearch').value.trim().toLowerCase();
    let filtered = allStudents;
    
    // Apply grade/section filter if selected
    if (filter) {
        const [grade, section] = filter.split('-');
        filtered = filtered.filter(s => s.grade == grade && s.section == section);
    }
    
    // Apply search filter if there's search text
    if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    }
    
    populateBulkModalCheckboxes(filtered);
    // Update button text after filtering
    updateBulkAwardButtonText();
}

function filterAndSearchBulkStudents() {
    const filter = document.getElementById('bulkGradeSectionFilter').value;
    const search = document.getElementById('bulkStudentSearch').value.trim().toLowerCase();
    let filtered = allStudents;
    
    if (filter) {
        const [grade, section] = filter.split('-');
        filtered = filtered.filter(s => s.grade == grade && s.section == section);
    }
    
    if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    }
    
    populateBulkModalCheckboxes(filtered);
    // Update button text after filtering
    updateBulkAwardButtonText();
}

function renderStreakLottieAnimations() {
    // Render for tables
    document.querySelectorAll('.streak-lottie-table').forEach(el => {
        if (el.dataset.lottieLoaded) return;
        el.dataset.lottieLoaded = "1";
        const streak = parseInt(el.getAttribute('data-streak'), 10);
        const animationPath = getStreakAnimationPath(streak);

        if (streak >= 7) {
            lottie.loadAnimation({
                container: el,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: animationPath
            });
        }
    });
    
    // Render for bulk modal checkboxes
    document.querySelectorAll('.streak-lottie-bulk').forEach(el => {
        if (el.dataset.lottieLoaded) return;
        el.dataset.lottieLoaded = "1";
        const streak = parseInt(el.getAttribute('data-streak'), 10);
        const animationPath = getStreakAnimationPath(streak);

        if (streak >= 7) {
            lottie.loadAnimation({
                container: el,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: animationPath
            });
        }
    });
}