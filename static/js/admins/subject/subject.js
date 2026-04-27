// All data will be loaded dynamically from backend
let teachersData = {}; // Will be filled after fetching from backend
let currentAssignments = []; // Store assignments for filtering
let classroomSubjectCounts = {}; // Add this global variable
let currentAssignmentId = null;
let currentSchoolYear = null; // Store current active school year

// Add these globals for pagination
let classroomOverviewPage = 1;
const classroomOverviewPerPage = 15;
let classroomOverviewTotalPages = 1;
let classroomOverviewSortedClassrooms = [];

// Add these globals for assignment table pagination
let assignmentCurrentPage = 1;
const assignmentsPerPage = 10; // Show 10 assignments per page
let assignmentTotalPages = 1;
let assignmentFilteredData = [];

// Loading State Management
window.subjectAssignmentLoadingState = {
    assignments: false,
    overview: false,
    allLoaded: false
};

// Confirmation dialog functions
function showConfirmationDialog(title, message, confirmCallback, cancelCallback = null) {
    const dialog = document.getElementById('confirmationDialogue');
    const titleElement = document.getElementById('confirmationDialogueTitle');
    const messageElement = document.getElementById('confirmationDialogueMessage');
    const confirmBtn = document.getElementById('confirmationDialogueConfirmBtn');
    const cancelBtn = document.getElementById('confirmationDialogueCancelBtn');

    // Set dialog content
    titleElement.textContent = title;
    messageElement.textContent = message;

    // Remove previous event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Add new event listeners
    newConfirmBtn.addEventListener('click', function() {
        hideConfirmationDialog();
        confirmCallback();
    });

    newCancelBtn.addEventListener('click', function() {
        hideConfirmationDialog();
        if (cancelCallback) cancelCallback();
    });

    // Show dialog
    dialog.style.display = 'flex';
}

function hideConfirmationDialog() {
    const dialog = document.getElementById('confirmationDialogue');
    dialog.style.display = 'none';
}

/**
 * Notify other pages that classroom assignments have changed
 * This helps teacher pages refresh their student lists when new assignments are made
 */
function notifyAssignmentChanged() {
    try {
        // Method 1: Use localStorage to trigger a storage event on other tabs
        const timestamp = new Date().getTime();
        localStorage.setItem('teacherAssignmentsUpdated', timestamp.toString());
        
        // Method 2: Dispatch a custom event for same-page listeners (if any)
        const event = new CustomEvent('assignmentChanged', {
            detail: { timestamp, message: 'Teacher assignments have been updated' }
        });
        window.dispatchEvent(event);
        
        console.log('✅ Assignment change notification sent');
    } catch (error) {
        console.warn('⚠️ Could not notify other pages:', error);
        // Non-blocking - don't let this prevent the assignment from completing
    }
}

// Fetch current school year (non-blocking)
function fetchCurrentSchoolYear() {
    return fetch('/api/current-school-year')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.current_school_year) {
                currentSchoolYear = data.current_school_year;
                // Display it in the modal
                const schoolYearDisplay = document.getElementById('currentSchoolYearDisplay');
                if (schoolYearDisplay) {
                    schoolYearDisplay.textContent = currentSchoolYear;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching current school year:', error);
            // Non-blocking - don't let this error prevent other data from loading
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // Fetch current school year first (displays in modal immediately)
    fetchCurrentSchoolYear();
    
    // Fetch teachers and assignments
    fetchTeachers();
    fetchAssignments();
    fetchStats();
    renderClassroomOverview();

    // Initialize form validation
    const form = document.getElementById('assignTeacherForm');
    const teacherSelect = document.getElementById('teacherSelect');
    const gradeSelect = document.getElementById('gradeSelect');
    const sectionSelect = document.getElementById('sectionSelect');

    teacherSelect.addEventListener('change', () => {
        updateTeacherInfo();
        updatePreview();
    });
    gradeSelect.addEventListener('change', function() {
        populateSectionSelect(this.value, 'sectionSelect');
        updatePreview();
    });
    sectionSelect.addEventListener('change', updatePreview);
    form.addEventListener('submit', handleAssignment);

    document.getElementById('gradeFilter').addEventListener('change', filterTable);
    document.getElementById('sectionFilter').addEventListener('change', filterTable);

    // Close confirmation dialog when clicking outside
    document.getElementById('confirmationDialogue').addEventListener('click', function(e) {
        if (e.target === this) {
            hideConfirmationDialog();
        }
    });
});

// Loading State Functions for Subject Assignment
function showAssignmentsLoading() {
    const loadingMessage = document.getElementById('assignmentsLoadingMessage');
    const errorMessage = document.getElementById('assignmentsErrorMessage');
    const tableContainer = document.getElementById('assignmentsTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
}

function showAssignmentsError() {
    const loadingMessage = document.getElementById('assignmentsLoadingMessage');
    const errorMessage = document.getElementById('assignmentsErrorMessage');
    const tableContainer = document.getElementById('assignmentsTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    
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
                // Add event listener to retry button
                const retryButton = document.getElementById('retryButton');
                if (retryButton) {
                    retryButton.addEventListener('click', function() {
                        fetchAssignments(); // Retry loading assignments
                    });
                }
            })
            .catch(error => {
                console.error('Error loading error template:', error);
                // Fallback to basic error message
                errorMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h3 style="color: #DB2D2D;">Connection Error</h3>
                        <p>Unable to load subject assignments. Please check your connection.</p>
                        <button onclick="fetchAssignments()" style="padding: 10px 20px; background: #5e72e4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
}

function showAssignmentsContent() {
    const loadingMessage = document.getElementById('assignmentsLoadingMessage');
    const errorMessage = document.getElementById('assignmentsErrorMessage');
    const tableContainer = document.getElementById('assignmentsTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
}

function showOverviewLoading() {
    const loadingMessage = document.getElementById('overviewLoadingMessage');
    const errorMessage = document.getElementById('overviewErrorMessage');
    const overviewContainer = document.getElementById('classroomOverviewContainer');
    const paginationContainer = document.getElementById('classroomOverviewPaginationContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (overviewContainer) overviewContainer.style.display = 'none';
    if (paginationContainer) paginationContainer.style.display = 'none';
}

function showOverviewError() {
    const loadingMessage = document.getElementById('overviewLoadingMessage');
    const errorMessage = document.getElementById('overviewErrorMessage');
    const overviewContainer = document.getElementById('classroomOverviewContainer');
    const paginationContainer = document.getElementById('classroomOverviewPaginationContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (overviewContainer) overviewContainer.style.display = 'none';
    if (paginationContainer) paginationContainer.style.display = 'none';
    
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
                // Add event listener to retry button
                const retryButton = document.getElementById('retryButton');
                if (retryButton) {
                    retryButton.addEventListener('click', function() {
                        renderClassroomOverview(); // Retry loading overview
                    });
                }
            })
            .catch(error => {
                console.error('Error loading error template:', error);
                // Fallback to basic error message
                errorMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h3 style="color: #DB2D2D;">Connection Error</h3>
                        <p>Unable to load classroom overview. Please check your connection.</p>
                        <button onclick="renderClassroomOverview()" style="padding: 10px 20px; background: #5e72e4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
}

function showOverviewContent() {
    const loadingMessage = document.getElementById('overviewLoadingMessage');
    const errorMessage = document.getElementById('overviewErrorMessage');
    const overviewContainer = document.getElementById('classroomOverviewContainer');
    const paginationContainer = document.getElementById('classroomOverviewPaginationContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (overviewContainer) overviewContainer.style.display = 'block';
    if (paginationContainer) paginationContainer.style.display = 'block';
}

// Check if all data has loaded
function checkAllDataLoaded() {
    const state = window.subjectAssignmentLoadingState;
    if (!state.allLoaded && state.assignments && state.overview) {
        state.allLoaded = true;
        showToast('Subject Assignment Loaded Successfully!', 'success', 3000);
    }
}

// Function to handle loading errors
function handleDataLoadError(dataType) {
    window.subjectAssignmentLoadingState[dataType] = true; // Mark as loaded (but failed)
    checkAllDataLoaded();
}

const gradeToSections = {
    "7": ["Love", "Faith", "Hope", "Peace"],
    "8": ["Matthew", "Mark", "Luke", "John"],
    "9": ["Psalms", "Jeremiah", "Isaiah", "Proverbs"],
    "10": ["Deuteronomy", "Leviticus", "Exodus", "Genesis"]
};

function populateSectionSelect(gradeValue, selectId) {
    const sectionSelect = document.getElementById(selectId);
    sectionSelect.innerHTML = '<option value="">Select section...</option>';

    // Get the subject to check for blocking
    let subject = '';
    if (selectId === 'sectionSelect') {
        subject = document.getElementById('teacherSubject').value;
    } else if (selectId === 'reassignSectionSelect') {
        subject = document.getElementById('reassignSubject').value;
    }

    if (gradeToSections[gradeValue]) {
        gradeToSections[gradeValue].forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;

            let isDisabled = false;
            let reasons = [];

            // Check if section is already full (8 subjects)
            const classroomKey = `${gradeValue}_${section}`;
            if ((classroomSubjectCounts[classroomKey] || 0) >= 8) {
                isDisabled = true;
                reasons.push("Full");
            }

            // Check if subject is already assigned in this section
            if (subject) {
                const duplicate = currentAssignments.find(a =>
                    a.grade_level == gradeValue &&
                    a.section == section &&
                    a.subject.toUpperCase() === subject.toUpperCase()
                );
                if (duplicate) {
                    isDisabled = true;
                    reasons.push("Already assigned");
                }
            }

            if (isDisabled) {
                option.disabled = true;
                option.textContent += " (" + reasons.join(", ") + ")";
            }

            sectionSelect.appendChild(option);
        });
    }
}

// Add missing function
function updateSectionOptions() {
    const sectionFilter = document.getElementById('sectionFilter');
    const gradeFilter = document.getElementById('gradeFilter').value;
    
    sectionFilter.innerHTML = '<option value="">All Sections</option>';
    
    if (gradeFilter && gradeToSections[gradeFilter]) {
        gradeToSections[gradeFilter].forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionFilter.appendChild(option);
        });
    }
}

// When teacher or subject changes, re-populate section dropdown to block assigned sections
document.getElementById('teacherSelect').addEventListener('change', function() {
    const gradeValue = document.getElementById('gradeSelect').value;
    populateSectionSelect(gradeValue, 'sectionSelect');
    updateTeacherInfo();
    updatePreview();
});
document.getElementById('teacherSubject').addEventListener('input', function() {
    const gradeValue = document.getElementById('gradeSelect').value;
    populateSectionSelect(gradeValue, 'sectionSelect');
    updatePreview();
});
document.getElementById('gradeSelect').addEventListener('change', function() {
    populateSectionSelect(this.value, 'sectionSelect');
    updatePreview();
});

// For reassign modal
document.getElementById('reassignTeacherSelect').addEventListener('change', function() {
    const gradeValue = document.getElementById('reassignGradeSelect').value;
    populateSectionSelect(gradeValue, 'reassignSectionSelect');
    updateReassignTeacherInfo();
    updateReassignPreview();
});
document.getElementById('reassignSubject').addEventListener('input', function() {
    const gradeValue = document.getElementById('reassignGradeSelect').value;
    populateSectionSelect(gradeValue, 'reassignSectionSelect');
    updateReassignPreview();
});
document.getElementById('reassignGradeSelect').addEventListener('change', function() {
    populateSectionSelect(this.value, 'reassignSectionSelect');
    updateReassignPreview();
});

function fetchTeachers() {
    console.log('%c📡 ADMIN SUBJECT: Calling /api/teachers', 'color: #00D4FF; font-weight: bold;');
    fetch('/api/teachers')
        .then(res => {
            console.log(`📡 ADMIN SUBJECT: /api/teachers responded with status ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('%c✅ ADMIN SUBJECT: Raw /api/teachers Response:', 'color: #00FF40; font-weight: bold;', data);
            console.log('%c📊 ADMIN SUBJECT: Teachers Data Structure:', 'color: #FFC542; font-weight: bold;', {
                success: data.success,
                teachers_count: data.teachers ? data.teachers.length : 0,
                teachers_sample: data.teachers ? data.teachers.slice(0, 3) : [],
                current_school_year: data.current_school_year
            });
            
            if (data.success) {
                // Update current school year from API response
                if (data.current_school_year) {
                    currentSchoolYear = data.current_school_year;
                    console.log('Updated school year from /api/teachers:', currentSchoolYear);
                }
                
                teachersData = {};
                const teacherSelect = document.getElementById('teacherSelect');
                teacherSelect.innerHTML = '<option value="">Choose a teacher...</option>';
                
                // Group teachers by subject
                const teachersBySubject = {};
                data.teachers.forEach(teacher => {
                    teachersData[teacher.id] = teacher;
                    const subject = teacher.subject || 'Unassigned';
                    if (!teachersBySubject[subject]) {
                        teachersBySubject[subject] = [];
                    }
                    teachersBySubject[subject].push(teacher);
                });

                // Sort subjects alphabetically
                const sortedSubjects = Object.keys(teachersBySubject).sort();
                
                // Create optgroups for each subject
                sortedSubjects.forEach(subject => {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = `${subject} Teachers`;
                    
                    // Sort teachers by name within each subject
                    teachersBySubject[subject].sort((a, b) => {
                        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                    
                    // Add teachers to the optgroup
                    teachersBySubject[subject].forEach(teacher => {
                        const option = document.createElement('option');
                        option.value = teacher.id;
                        option.textContent = `${teacher.first_name} ${teacher.last_name}`;
                        option.setAttribute('data-subject', teacher.subject || '');
                        optgroup.appendChild(option);
                    });
                    
                    teacherSelect.appendChild(optgroup);
                });
            }
        })
        .catch(error => {
            console.error('%c❌ ADMIN SUBJECT: Error fetching teachers:', 'color: #FF0000; font-weight: bold;', error);
        });
}

// Also update the reassign teacher dropdown to use the same grouping
function populateReassignTeacherDropdown() {
    const reassignTeacherSelect = document.getElementById('reassignTeacherSelect');
    reassignTeacherSelect.innerHTML = '<option value="">Choose a teacher...</option>';
    
    // Group teachers by subject
    const teachersBySubject = {};
    Object.values(teachersData).forEach(teacher => {
        const subject = teacher.subject || 'Unassigned';
        if (!teachersBySubject[subject]) {
            teachersBySubject[subject] = [];
        }
        teachersBySubject[subject].push(teacher);
    });

    // Sort subjects alphabetically
    const sortedSubjects = Object.keys(teachersBySubject).sort();
    
    // Create optgroups for each subject
    sortedSubjects.forEach(subject => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `${subject} Teachers`;
        
        // Sort teachers by name within each subject
        teachersBySubject[subject].sort((a, b) => {
            const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
            const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Add teachers to the optgroup
        teachersBySubject[subject].forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = `${teacher.first_name} ${teacher.last_name}`;
            option.setAttribute('data-subject', teacher.subject || '');
            optgroup.appendChild(option);
        });
        
        reassignTeacherSelect.appendChild(optgroup);
    });
}

// Assignment Table Pagination Functions
function renderAssignmentTable(page = 1) {
    const tbody = document.getElementById('assignmentData');
    const loadingElement = document.getElementById('assignmentLoading');
    
    // Show loading if no data yet
    if (currentAssignments.length === 0) {
        loadingElement.style.display = '';
        tbody.innerHTML = '';
        return;
    }
    
    loadingElement.style.display = 'none';
    
    // Apply filters first
    applyAssignmentFilters();
    
    // Calculate pagination
    assignmentTotalPages = Math.ceil(assignmentFilteredData.length / assignmentsPerPage);
    assignmentCurrentPage = Math.max(1, Math.min(page, assignmentTotalPages));
    const startIdx = (assignmentCurrentPage - 1) * assignmentsPerPage;
    const endIdx = startIdx + assignmentsPerPage;
    const pagedAssignments = assignmentFilteredData.slice(startIdx, endIdx);
    
    // Clear and render table rows
    tbody.innerHTML = '';
    
    if (pagedAssignments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <div>No assignments found</div>
                    </div>
                </td>
            </tr>
        `;
    } else {
        pagedAssignments.forEach(assignment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center align-middle">
                    <h6 class="mb-0">Grade ${assignment.grade_level} - Section ${assignment.section}</h6>
                </td>
                <td class="text-center align-middle">
                    <div>
                        <img src="${assignment.profile_pic}" alt="Profile" class="rounded-circle me-2" style="width:32px;height:32px;object-fit:cover;"
                             onerror="this.onerror=null;this.src='/static/image/default-avatar.png';">
                        <h6 class="mb-0 d-inline">${assignment.teacher_name}</h6>
                        <small class="text-muted d-block">${assignment.subject} Teacher</small>
                    </div>
                </td>
                <td class="text-center align-middle">${assignment.teacher_email}</td>
                <td class="text-center align-middle">
                    <span class="badge bg-info">${assignment.assignment_count} Classes</span>
                </td>
                <td class="text-center align-middle">
                    <small class="text-muted">${assignment.assigned_at}</small>
                </td>
                <td class="text-center align-middle">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning" onclick="reassignTeacher('${assignment.assignment_id}', '${assignment.grade_level}', '${assignment.section}', '${assignment.teacher_id}', '${assignment.subject}')" title="Reassign">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="removeAssignmentConfirmation('${assignment.assignment_id}', '${assignment.grade_level}', '${assignment.section}', '${assignment.teacher_name}', '${assignment.subject}')" title="Remove">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // Render pagination controls
    renderAssignmentPagination();
}

function applyAssignmentFilters() {
    const gradeFilter = document.getElementById('gradeFilter').value;
    const sectionFilter = document.getElementById('sectionFilter').value;
    
    assignmentFilteredData = currentAssignments.filter(assignment => {
        let showRow = true;
        
        if (gradeFilter && assignment.grade_level != gradeFilter) {
            showRow = false;
        }
        
        if (sectionFilter && assignment.section !== sectionFilter) {
            showRow = false;
        }
        
        return showRow;
    });
}

function renderAssignmentPagination() {
    const paginationContainer = document.getElementById('assignmentPagination');
    const paginationNav = document.getElementById('assignmentPaginationNav');
    
    // Clear existing pagination
    paginationContainer.innerHTML = '';
    
    // Only show pagination if more than 1 page
    if (assignmentTotalPages <= 1) {
        paginationNav.style.display = 'none';
        return;
    }
    
    paginationNav.style.display = 'block';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item${assignmentCurrentPage === 1 ? ' disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
    </a>`;
    prevLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (assignmentCurrentPage > 1) {
            renderAssignmentTable(assignmentCurrentPage - 1);
        }
    });
    paginationContainer.appendChild(prevLi);
    
    // Page numbers - show limited pages with ellipsis
    const maxVisiblePages = 5;
    let startPage = Math.max(1, assignmentCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(assignmentTotalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page + ellipsis if needed
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#">1</a>`;
        firstLi.addEventListener('click', function(e) {
            e.preventDefault();
            renderAssignmentTable(1);
        });
        paginationContainer.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationContainer.appendChild(ellipsisLi);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item${i === assignmentCurrentPage ? ' active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', function(e) {
            e.preventDefault();
            renderAssignmentTable(i);
        });
        paginationContainer.appendChild(li);
    }
    
    // Last page + ellipsis if needed
    if (endPage < assignmentTotalPages) {
        if (endPage < assignmentTotalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationContainer.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#">${assignmentTotalPages}</a>`;
        lastLi.addEventListener('click', function(e) {
            e.preventDefault();
            renderAssignmentTable(assignmentTotalPages);
        });
        paginationContainer.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item${assignmentCurrentPage === assignmentTotalPages ? ' disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
    </a>`;
    nextLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (assignmentCurrentPage < assignmentTotalPages) {
            renderAssignmentTable(assignmentCurrentPage + 1);
        }
    });
    paginationContainer.appendChild(nextLi);
}

function fetchAssignments() {
    // Show loading state
    showAssignmentsLoading();
    
    console.log('%c📡 ADMIN SUBJECT: Calling /api/classroom-assignments', 'color: #00D4FF; font-weight: bold;');
    fetch('/api/classroom-assignments')
        .then(res => {
            console.log(`📡 ADMIN SUBJECT: /api/classroom-assignments responded with status ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('%c✅ ADMIN SUBJECT: Raw /api/classroom-assignments Response:', 'color: #00FF40; font-weight: bold;', data);
            console.log('%c📊 ADMIN SUBJECT: Assignments Data Structure:', 'color: #FFC542; font-weight: bold;', {
                success: data.success,
                assignments_count: data.assignments ? data.assignments.length : 0,
                assignments_sample: data.assignments ? data.assignments.slice(0, 3) : [],
                classroom_subject_counts: data.classroom_subject_counts,
                current_school_year: data.current_school_year
            });
            
            if (data.success) {
                window.subjectAssignmentLoadingState.assignments = true;
                checkAllDataLoaded();
                showAssignmentsContent();
                
                // Update currentSchoolYear from API response
                if (data.current_school_year) {
                    currentSchoolYear = data.current_school_year;
                    // Update the modal display
                    const schoolYearDisplay = document.getElementById('currentSchoolYearDisplay');
                    if (schoolYearDisplay) {
                        schoolYearDisplay.textContent = currentSchoolYear;
                    }
                }
                
                currentAssignments = data.assignments;
                classroomSubjectCounts = data.classroom_subject_counts || {};

                console.log(`%c📚 ADMIN SUBJECT: Loaded ${currentAssignments.length} assignments, SY: ${currentSchoolYear}`, 'color: #5E72E4; font-weight: bold;');

                // Sort assignments
                const gradeOrder = ["7", "8", "9", "10"];
                currentAssignments.sort((a, b) => {
                    const gradeIdxA = gradeOrder.indexOf(String(a.grade_level));
                    const gradeIdxB = gradeOrder.indexOf(String(b.grade_level));
                    if (gradeIdxA !== gradeIdxB) return gradeIdxA - gradeIdxB;
                    if (a.section < b.section) return -1;
                    if (a.section > b.section) return 1;
                    return 0;
                });

                // Render the table with pagination
                renderAssignmentTable(1);

                // After fetching assignments, update section options
                updateSectionOptions();
            } else {
                window.subjectAssignmentLoadingState.assignments = true;
                checkAllDataLoaded();
                showAssignmentsError();
            }
        })
        .catch(error => {
            console.error('%c❌ ADMIN SUBJECT: Error fetching assignments:', 'color: #FF0000; font-weight: bold;', error);
            window.subjectAssignmentLoadingState.assignments = true;
            checkAllDataLoaded();
            showAssignmentsError();
        });
}

function fetchStats() {
    console.log('%c📡 ADMIN SUBJECT: Calling /api/classroom-stats', 'color: #00D4FF; font-weight: bold;');
    fetch('/api/classroom-stats')
        .then(res => {
            console.log(`📡 ADMIN SUBJECT: /api/classroom-stats responded with status ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('%c✅ ADMIN SUBJECT: Raw /api/classroom-stats Response:', 'color: #00FF40; font-weight: bold;', data);
            if (data.success) {
                document.getElementById('totalAssignments').textContent = data.total_assignments;
                document.getElementById('assignedTeachers').textContent = data.assigned_teachers;
                document.getElementById('totalClassrooms').textContent = data.total_classrooms;
                document.getElementById('unassignedClassrooms').textContent = data.unassigned_classrooms;
                console.log(`%c📊 ADMIN SUBJECT: Stats - Total: ${data.total_assignments}, Assigned: ${data.assigned_teachers}, Classrooms: ${data.total_classrooms}, Unassigned: ${data.unassigned_classrooms}`, 'color: #FFC542; font-weight: bold;');
            }
        })
        .catch(error => {
            console.error('%c❌ ADMIN SUBJECT: Error fetching stats:', 'color: #FF0000; font-weight: bold;', error);
        });
}

function updateTeacherInfo() {
    const teacherSelect = document.getElementById('teacherSelect');
    const teacherId = teacherSelect.value;
    const teacherInfo = document.getElementById('teacherInfo');
    const teacherDetails = document.getElementById('teacherDetails');
    const warningDiv = document.getElementById('assignmentWarning');
    const warningMessage = document.getElementById('warningMessage');
    const teacherSubject = document.getElementById('teacherSubject');

    if (teacherId && teachersData[teacherId]) {
        const teacher = teachersData[teacherId];
        teacherInfo.classList.remove('d-none');
        
        // Build the details HTML with school year info
        let detailsHTML = `
            <strong>Name:</strong> ${teacher.first_name} ${teacher.last_name}<br>
            <strong>Subject:</strong> ${teacher.subject}<br>
            <strong>Email:</strong> ${teacher.email}<br>
            <strong>Current Assignments (${currentSchoolYear || 'Unknown'})</strong>: ${teacher.assignments} classrooms
        `;
        
        teacherDetails.innerHTML = detailsHTML;
        teacherSubject.value = teacher.subject || '';

        // Remove assignment limit and warning logic
        warningDiv.classList.add('d-none');
        document.getElementById('assignButton').disabled = false;
    } else {
        teacherInfo.classList.add('d-none');
        warningDiv.classList.add('d-none');
        teacherSubject.value = '';
        document.getElementById('assignButton').disabled = true;
    }
    updatePreview();
}

function updatePreview() {
    const teacherSelect = document.getElementById('teacherSelect');
    const gradeSelect = document.getElementById('gradeSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    const teacherSubject = document.getElementById('teacherSubject');
    const previewDiv = document.getElementById('assignmentPreview');
    const warningDiv = document.getElementById('assignmentWarning');
    const warningMessage = document.getElementById('warningMessage');

    // List of allowed subjects
    const allowedSubjects = [
        "AP", "English", "ESP", "Filipino", "Mathematics", "Science", "TLE", "MAPEH"
    ];

    // Reset warnings
    warningDiv.classList.add('d-none');
    warningMessage.textContent = '';

    if (
        teacherSelect.value &&
        gradeSelect.value &&
        sectionSelect.value &&
        teacherSubject.value &&
        teachersData[teacherSelect.value]
    ) {
        const teacher = teachersData[teacherSelect.value];
        const classroomKey = `${gradeSelect.value}_${sectionSelect.value}`;
        const classroomCount = classroomSubjectCounts[classroomKey] || 0;

        // Check if subject is allowed
        if (!allowedSubjects.includes(teacherSubject.value)) {
            warningDiv.classList.remove('d-none');
            warningMessage.textContent = `Only these subjects are allowed: ${allowedSubjects.join(", ")}`;
            document.getElementById('assignButton').disabled = true;
            previewDiv.classList.add('d-none');
            return;
        }

        // Check if classroom is already full (8 subjects)
        if (classroomCount >= 8) {
            warningDiv.classList.remove('d-none');
            warningMessage.textContent = "This classroom already has 8 subjects assigned. You cannot assign more.";
            document.getElementById('assignButton').disabled = true;
            previewDiv.classList.add('d-none');
            return;
        }

        // Check if this subject is already assigned in this classroom
        const duplicate = currentAssignments.find(a =>
            a.grade_level == gradeSelect.value &&
            a.section == sectionSelect.value &&
            a.subject.toUpperCase() === teacherSubject.value.toUpperCase()
        );
        if (duplicate) {
            warningDiv.classList.remove('d-none');
            warningMessage.textContent = `${teacherSubject.value} is already assigned in Grade ${gradeSelect.value} Section ${sectionSelect.value}.`;
            document.getElementById('assignButton').disabled = true;
            previewDiv.classList.add('d-none');
            return;
        }

        // All checks passed, show preview
        const classroom = `Grade ${gradeSelect.value} - Section ${sectionSelect.value}`;
        document.getElementById('previewTeacher').textContent = `${teacher.first_name} ${teacher.last_name}`;
        document.getElementById('previewSubject').textContent = teacherSubject.value;
        document.getElementById('previewClassroom').textContent = classroom;
        document.getElementById('previewCount').textContent = `${teacher.assignments + 1} classes`;

        previewDiv.classList.remove('d-none');
        document.getElementById('assignButton').disabled = false;
    } else {
        previewDiv.classList.add('d-none');
        document.getElementById('assignButton').disabled = true;
    }
}

function handleAssignment(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const assignmentData = {
        teacher_id: formData.get('teacher_id'),
        grade_level: formData.get('grade_level'),
        section: formData.get('section'),
        subject: formData.get('subject')
    };

    const teacher = teachersData[assignmentData.teacher_id];
    const classroom = `Grade ${assignmentData.grade_level} - Section ${assignmentData.section}`;

    // Show confirmation dialog for assignment
    showConfirmationDialog(
        'Confirm Assignment',
        `Are you sure you want to assign ${teacher.first_name} ${teacher.last_name} as ${assignmentData.subject} teacher to ${classroom}?`,
        () => {
            // If reassigning, check if classroom changed
            if (currentAssignmentId) {
                // Find the original assignment
                const original = currentAssignments.find(a => a.assignment_id == currentAssignmentId);
                if (
                    original &&
                    (original.grade_level !== assignmentData.grade_level ||
                     original.section !== assignmentData.section)
                ) {
                    // Classroom changed: remove old assignment, create new one
                    fetch(`/api/classroom-assignments/${currentAssignmentId}`, {
                        method: 'DELETE'
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            // Now create new assignment
                            fetch('/api/classroom-assignments', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(assignmentData)
                            })
                            .then(res => res.json())
                            .then(data2 => {
                                if (data2.success) {
                                    showToast('Teacher transferred successfully!', 'success');
                                    const modal = bootstrap.Modal.getInstance(document.getElementById('assignTeacherModal'));
                                    modal.hide();
                                    e.target.reset();
                                    document.getElementById('teacherInfo').classList.add('d-none');
                                    document.getElementById('assignmentWarning').classList.add('d-none');
                                    document.getElementById('assignmentPreview').classList.add('d-none');
                                    fetchAssignments();
                                    fetchStats();
                                    fetchTeachers();
                                    renderClassroomOverview();
                                    notifyAssignmentChanged(); // Notify other pages about the change
                                } else {
                                    showToast(data2.message || 'Failed to assign teacher.', 'danger');
                                }
                            });
                        } else {
                            showToast(data.message || 'Failed to remove old assignment.', 'danger');
                        }
                    });
                } else {
                    // No classroom change, just update assignment
                    fetch(`/api/classroom-assignments/${currentAssignmentId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(assignmentData)
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            showToast('Assignment updated successfully!', 'success');
                            const modal = bootstrap.Modal.getInstance(document.getElementById('assignTeacherModal'));
                            modal.hide();
                            e.target.reset();
                            document.getElementById('teacherInfo').classList.add('d-none');
                            document.getElementById('assignmentWarning').classList.add('d-none');
                            document.getElementById('assignmentPreview').classList.add('d-none');
                            fetchAssignments();
                            fetchStats();
                            fetchTeachers();
                            notifyAssignmentChanged(); // Notify other pages about the change
                        } else {
                            showToast(data.message || 'Failed to assign teacher.', 'danger');
                        }
                    });
                }
            } else {
                // Normal assignment (not reassign)
                fetch('/api/classroom-assignments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assignmentData)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast('Teacher assigned successfully!', 'success');
                        const modal = bootstrap.Modal.getInstance(document.getElementById('assignTeacherModal'));
                        modal.hide();
                        e.target.reset();
                        document.getElementById('teacherInfo').classList.add('d-none');
                        document.getElementById('assignmentWarning').classList.add('d-none');
                        document.getElementById('assignmentPreview').classList.add('d-none');
                        fetchAssignments();
                        fetchStats();
                        fetchTeachers();
                        renderClassroomOverview();
                        notifyAssignmentChanged(); // Notify other pages about the change
                    } else {
                        showToast(data.message || 'Failed to assign teacher.', 'danger');
                    }
                });
            }
            currentAssignmentId = null; // Reset after operation
        }
    );
}

function reassignTeacher(assignmentId, grade, section, teacherId = '', subject = '') {
    currentAssignmentId = assignmentId;

    // Populate teacher dropdown for reassign modal using the new grouped format
    populateReassignTeacherDropdown();

    // Fill modal fields with row data
    document.getElementById('reassignGradeSelect').value = grade;
    populateSectionSelect(grade, 'reassignSectionSelect');
    document.getElementById('reassignSectionSelect').value = section;
    document.getElementById('reassignTeacherSelect').value = teacherId || '';
    document.getElementById('reassignSubject').value = subject || '';

    // Update info and preview
    updateReassignTeacherInfo();
    updateReassignPreview();

    // Show the REASSIGN modal with viewport centering
    const modalElement = document.getElementById('reassignTeacherModal');
    const modal = new bootstrap.Modal(modalElement);

    // Add event listener to ensure modal is positioned correctly when shown
    modalElement.addEventListener('shown.bs.modal', function handler() {
        // Force modal to center in viewport
        const modalDialog = modalElement.querySelector('.modal-dialog');
        modalDialog.style.margin = '1.75rem auto';
        modalDialog.style.transform = 'none';
        modalDialog.style.top = '0';
        // Remove this handler after first run to avoid stacking
        modalElement.removeEventListener('shown.bs.modal', handler);
    });

    modal.show();
}

// Handler for reassign form submission - WITH CONFIRMATION DIALOG
document.getElementById('reassignTeacherForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const assignmentData = {
        teacher_id: formData.get('teacher_id'),
        grade_level: formData.get('grade_level'),
        section: formData.get('section'),
        subject: formData.get('subject')
    };

    const teacher = teachersData[assignmentData.teacher_id];
    const classroom = `Grade ${assignmentData.grade_level} - Section ${assignmentData.section}`;

    // Show confirmation dialog for reassignment
    showConfirmationDialog(
        'Confirm Reassignment',
        `Are you sure you want to reassign ${teacher.first_name} ${teacher.last_name} as ${assignmentData.subject} teacher to ${classroom}?`,
        () => {
            // Remove old assignment first
            fetch(`/api/classroom-assignments/${currentAssignmentId}`, {
                method: 'DELETE'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Create new assignment
                    fetch('/api/classroom-assignments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(assignmentData)
                    })
                    .then(res => res.json())
                    .then(data2 => {
                        if (data2.success) {
                            showToast('Teacher transferred successfully!', 'success');
                            const modal = bootstrap.Modal.getInstance(document.getElementById('reassignTeacherModal'));
                            modal.hide();
                            e.target.reset();
                            document.getElementById('reassignTeacherInfo').classList.add('d-none');
                            document.getElementById('reassignmentWarning').classList.add('d-none');
                            document.getElementById('reassignmentPreview').classList.add('d-none');
                            fetchAssignments();
                            fetchStats();
                            fetchTeachers();
                            renderClassroomOverview(); // <-- Add this line
                        } else {
                            showToast(data2.message || 'Failed to assign teacher.', 'danger');
                        }
                        
                    });
                } else {
                    showToast(data.message || 'Failed to remove old assignment.', 'danger');
                }
            });
            currentAssignmentId = null;
        }
    );
});

// Helper functions for reassign modal
function updateReassignTeacherInfo() {
    const teacherSelect = document.getElementById('reassignTeacherSelect');
    const teacherId = teacherSelect.value;
    const teacherInfo = document.getElementById('reassignTeacherInfo');
    const teacherDetails = document.getElementById('reassignTeacherDetails');
    const teacherSubject = document.getElementById('reassignSubject');

    if (teacherId && teachersData[teacherId]) {
        const teacher = teachersData[teacherId];
        teacherInfo.classList.remove('d-none');
        teacherDetails.innerHTML = `
            <strong>Name:</strong> ${teacher.first_name} ${teacher.last_name}<br>
            <strong>Subject:</strong> ${teacher.subject}<br>
            <strong>Email:</strong> ${teacher.email}<br>
            <strong>Current Assignments (${currentSchoolYear || 'Unknown'})</strong>: ${teacher.assignments} classrooms
        `;
        teacherSubject.value = teacher.subject || '';
        document.getElementById('reassignButton').disabled = false;
    } else {
        teacherInfo.classList.add('d-none');
        teacherSubject.value = '';
        document.getElementById('reassignButton').disabled = true;
    }
    updateReassignPreview();
}

function updateReassignPreview() {
    const teacherSelect = document.getElementById('reassignTeacherSelect');
    const gradeSelect = document.getElementById('reassignGradeSelect');
    const sectionSelect = document.getElementById('reassignSectionSelect');
    const teacherSubject = document.getElementById('reassignSubject');
    const previewDiv = document.getElementById('reassignmentPreview');

    if (
        teacherSelect.value &&
        gradeSelect.value &&
        sectionSelect.value &&
        teacherSubject.value &&
        teachersData[teacherSelect.value]
    ) {
        const teacher = teachersData[teacherSelect.value];
        const classroom = `Grade ${gradeSelect.value} - Section ${sectionSelect.value}`;

        document.getElementById('previewReassignTeacher').textContent = `${teacher.first_name} ${teacher.last_name}`;
        document.getElementById('previewReassignSubject').textContent = teacherSubject.value;
        document.getElementById('previewReassignClassroom').textContent = classroom;
        document.getElementById('previewReassignCount').textContent = `${teacher.assignments + 1} classes`;

        previewDiv.classList.remove('d-none');
        document.getElementById('reassignButton').disabled = false;
    } else {
        previewDiv.classList.add('d-none');
        document.getElementById('reassignButton').disabled = true;
    }
}

// Add event listeners for reassign modal fields
document.getElementById('reassignTeacherSelect').addEventListener('change', updateReassignTeacherInfo);
document.getElementById('reassignGradeSelect').addEventListener('change', function() {
    populateSectionSelect(this.value, 'reassignSectionSelect');
    updateReassignPreview();
});
document.getElementById('reassignSectionSelect').addEventListener('change', updateReassignPreview);

// Remove assignment with confirmation dialog
function removeAssignmentConfirmation(assignmentId, grade, section, teacherName, subject) {
    showConfirmationDialog(
        'Confirm Removal',
        `Are you sure you want to remove ${teacherName} as ${subject} teacher from Grade ${grade} Section ${section}?`,
        () => {
            removeAssignment(assignmentId);
        }
    );
}

function removeAssignment(assignmentId) {
    fetch(`/api/classroom-assignments/${assignmentId}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Assignment removed successfully!', 'success');
            fetchAssignments();
            fetchStats();
            fetchTeachers();
            renderClassroomOverview();
        } else {
            showToast(data.message || 'Failed to remove assignment.', 'danger');
        }
    });
}

// Filter and search functionality
function filterTable() {
    // Re-render the table with current filters
    renderAssignmentTable(1);
}

document.getElementById('gradeFilter').addEventListener('change', function() {
    const grade = this.value;
    const sectionFilter = document.getElementById('sectionFilter');
    sectionFilter.innerHTML = '<option value="">All Sections</option>';
    if (gradeToSections[grade]) {
        gradeToSections[grade].forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionFilter.appendChild(option);
        });
    }
    filterTable();
});

document.getElementById('sectionFilter').addEventListener('change', filterTable);

// On page load, if a grade is already selected, populate sections
document.addEventListener('DOMContentLoaded', function() {
    const gradeSelect = document.getElementById('gradeSelect');
    if (gradeSelect.value) {
        populateSectionSelect(gradeSelect.value, 'sectionSelect');
    }
    const gradeFilter = document.getElementById('gradeFilter');
    if (gradeFilter.value) {
        const sectionFilter = document.getElementById('sectionFilter');
        sectionFilter.innerHTML = '<option value="">All Sections</option>';
        if (gradeToSections[gradeFilter.value]) {
            gradeToSections[gradeFilter.value].forEach(section => {
                const option = document.createElement('option');
                option.value = section;
                option.textContent = section;
                sectionFilter.appendChild(option);
            });
        }
    }
});

// Render paginated classroom overview
function renderClassroomOverview(page = 1) {
    // Show loading state
    showOverviewLoading();
    
    console.log('%c📡 ADMIN SUBJECT: Calling /api/classroom-assignments (for overview)', 'color: #00D4FF; font-weight: bold;');
    fetch('/api/classroom-assignments')
        .then(res => {
            console.log(`📡 ADMIN SUBJECT: /api/classroom-assignments (overview) responded with status ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('%c✅ ADMIN SUBJECT: Raw /api/classroom-assignments Response (for overview):', 'color: #00FF40; font-weight: bold;', data);
            
            if (!data.success) {
                console.error('%c❌ ADMIN SUBJECT: Overview - API returned success: false', 'color: #FF0000; font-weight: bold;');
                window.subjectAssignmentLoadingState.overview = true;
                checkAllDataLoaded();
                showOverviewError();
                return;
            }
            
            window.subjectAssignmentLoadingState.overview = true;
            checkAllDataLoaded();
            
            const assignments = data.assignments;
            console.log(`%c📚 ADMIN SUBJECT: Overview - Processing ${assignments.length} assignments`, 'color: #5E72E4; font-weight: bold;');

            // Group assignments by grade_level + section
            const classrooms = {};
            assignments.forEach(a => {
                const key = `${a.grade_level}_${a.section}`;
                if (!classrooms[key]) {
                    classrooms[key] = {
                        grade_level: a.grade_level,
                        section: a.section,
                        teachers: []
                    };
                }
                classrooms[key].teachers.push({
                    name: a.teacher_name,
                    subject: a.subject,
                    profile_pic: a.profile_pic || '/static/image/default-avatar.png'
                });
            });

            // Sort classrooms by grade_level (number) and section (alphabetically)
            const gradeOrder = ["7", "8", "9", "10"];
            classroomOverviewSortedClassrooms = Object.values(classrooms).sort((a, b) => {
                const gradeIdxA = gradeOrder.indexOf(String(a.grade_level));
                const gradeIdxB = gradeOrder.indexOf(String(b.grade_level));
                if (gradeIdxA !== gradeIdxB) return gradeIdxA - gradeIdxB;
                if (a.section < b.section) return -1;
                if (a.section > b.section) return 1;
                return 0;
            });

            // Sort teachers within each classroom by subject alphabetically
            classroomOverviewSortedClassrooms.forEach(classroom => {
                classroom.teachers.sort((a, b) => {
                    const subjectA = a.subject.toUpperCase();
                    const subjectB = b.subject.toUpperCase();
                    if (subjectA < subjectB) return -1;
                    if (subjectA > subjectB) return 1;
                    return 0;
                });
            });

            console.log(`%c📊 ADMIN SUBJECT: Overview - Created ${classroomOverviewSortedClassrooms.length} classroom cards`, 'color: #FFC542; font-weight: bold;');

            // Pagination logic
            classroomOverviewTotalPages = Math.ceil(classroomOverviewSortedClassrooms.length / classroomOverviewPerPage);
            classroomOverviewPage = Math.max(1, Math.min(page, classroomOverviewTotalPages));
            const startIdx = (classroomOverviewPage - 1) * classroomOverviewPerPage;
            const endIdx = startIdx + classroomOverviewPerPage;
            const pagedClassrooms = classroomOverviewSortedClassrooms.slice(startIdx, endIdx);

            // Render cards
            const container = document.getElementById('classroomOverviewContainer');
            container.innerHTML = '';
            pagedClassrooms.forEach((classroom, idx) => {
                const collapseId = `classroom${classroom.grade_level}${classroom.section}`;
                const teacherCount = classroom.teachers.length;
                const teacherLastNames = classroom.teachers.map(t => t.name.split(' ').slice(-1)[0]).join(' · ');

                const card = document.createElement('div');
                card.className = 'card mb-4 shadow-sm';

                card.innerHTML = `
                    <div class="card-header d-flex justify-content-between align-items-center bg-white classroom-header"
                        style="cursor:pointer;">
                        <div data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}" class="w-100 d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold" style="font-size: 1.1rem;">
                                    Grade ${classroom.grade_level} ${classroom.section}
                                </span>
                                <span class="text-muted ms-2" style="font-size: 0.95rem;">
                                    (${teacherCount} Teacher${teacherCount !== 1 ? 's' : ''})
                                </span>
                                <div class="text-muted" style="font-size: 0.95rem;">
                                    ${teacherLastNames}
                                </div>
                            </div>
                            <i class="fas fa-chevron-down classroom-chevron"></i>
                        </div>
                    </div>
                    <div id="${collapseId}" class="collapse">
                        <div class="card-body bg-white">
                            <div class="row g-4 align-items-center">
                                ${classroom.teachers.map(teacher => `
                                    <div class="col-md-3 col-6 text-center">
                                        <div class="mb-2">
                                            <img src="${teacher.profile_pic}" 
                                                 alt="${teacher.name}" 
                                                 class="rounded-circle border" 
                                                 style="width: 100px; height: 100px; object-fit: cover;"
                                                 onerror="this.onerror=null;this.src='/static/image/default-avatar.png';">
                                        </div>
                                        <div class="fw-semibold" style="font-size: 1rem;">${teacher.name}</div>
                                        <div class="text-muted" style="font-size: 0.95rem;">${teacher.subject}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);

                // Chevron rotation logic
                const collapseElement = card.querySelector(`#${collapseId}`);
                const chevron = card.querySelector('.classroom-chevron');

                collapseElement.addEventListener('show.bs.collapse', function () {
                    chevron.classList.remove('fa-chevron-down');
                    chevron.classList.add('fa-chevron-up');
                });
                collapseElement.addEventListener('hide.bs.collapse', function () {
                    chevron.classList.remove('fa-chevron-up');
                    chevron.classList.add('fa-chevron-down');
                });

                // Make the whole header clickable (not just the icon/text)
                card.querySelector('.card-header').addEventListener('click', function(e) {
                    if (!e.target.closest('a,button')) {
                        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement);
                        if (collapseElement.classList.contains('show')) {
                            bsCollapse.hide();
                        } else {
                            bsCollapse.show();
                        }
                    }
                });
            });

            // Initialize all collapse elements
            const collapseElements = container.querySelectorAll('.collapse');
            collapseElements.forEach(collapseEl => {
                new bootstrap.Collapse(collapseEl, {
                    toggle: false
                });
            });

            // Show content after rendering
            showOverviewContent();

            // Render pagination controls
            renderClassroomOverviewPagination();
        })
        .catch(error => {
            console.error('Error fetching classroom overview:', error);
            window.subjectAssignmentLoadingState.overview = true;
            checkAllDataLoaded();
            showOverviewError();
        });
}

// Pagination controls for classroom overview
function renderClassroomOverviewPagination() {
    const paginationContainer = document.getElementById('classroomOverviewPaginationControls');
    const paginationNav = document.getElementById('classroomOverviewPaginationContainer');
    
    // Clear existing pagination
    if (!paginationContainer) {
        console.warn('Pagination container not found');
        return;
    }
    
    paginationContainer.innerHTML = '';
    
    // Only show pagination if more than 1 page
    if (classroomOverviewTotalPages <= 1) {
        paginationNav.style.display = 'none';
        return;
    }
    
    paginationNav.style.display = 'block';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item${classroomOverviewPage === 1 ? ' disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
    </a>`;
    prevLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (classroomOverviewPage > 1) {
            renderClassroomOverview(classroomOverviewPage - 1);
        }
    });
    paginationContainer.appendChild(prevLi);
    
    // Page numbers - show limited pages with ellipsis
    const maxVisiblePages = 5;
    let startPage = Math.max(1, classroomOverviewPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(classroomOverviewTotalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page + ellipsis if needed
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#">1</a>`;
        firstLi.addEventListener('click', function(e) {
            e.preventDefault();
            renderClassroomOverview(1);
        });
        paginationContainer.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationContainer.appendChild(ellipsisLi);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item${i === classroomOverviewPage ? ' active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', function(e) {
            e.preventDefault();
            renderClassroomOverview(i);
        });
        paginationContainer.appendChild(li);
    }
    
    // Last page + ellipsis if needed
    if (endPage < classroomOverviewTotalPages) {
        if (endPage < classroomOverviewTotalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationContainer.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#">${classroomOverviewTotalPages}</a>`;
        lastLi.addEventListener('click', function(e) {
            e.preventDefault();
            renderClassroomOverview(classroomOverviewTotalPages);
        });
        paginationContainer.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item${classroomOverviewPage === classroomOverviewTotalPages ? ' disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
    </a>`;
    nextLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (classroomOverviewPage < classroomOverviewTotalPages) {
            renderClassroomOverview(classroomOverviewPage + 1);
        }
    });
    paginationContainer.appendChild(nextLi);
}

// Add CSS for chevron rotation and improved dropdown styling
const style = document.createElement('style');
style.innerHTML = `
.classroom-chevron {
    transition: transform 0.2s;
}

/* Improved dropdown styling */
select.form-select optgroup {
    font-weight: bold;
    color: #495057;
    background-color: #f8f9fa;
}

select.form-select option {
    padding: 8px 12px;
    border-bottom: 1px solid #f0f0f0;
}

select.form-select option:hover {
    background-color: #e9ecef;
}

select.form-select optgroup option {
    padding-left: 20px;
    font-weight: normal;
    color: #6c757d;
}

/* Make dropdown wider and more readable */
#teacherSelect, #reassignTeacherSelect {
    min-width: 300px;
    position: relative;
    z-index: 1000;
}

/* Prevent dropdown from overlapping */
#teacherSelect, #reassignTeacherSelect {
    overflow: visible;
}

/* Add margin to subject input to prevent overlap */
#teacherSubject, #reassignSubject {
    margin-left: 10px;
}

/* Adjust row spacing in assign modal */
.modal-body .row {
    row-gap: 1.5rem;
}

@media (min-width: 768px) {
    #teacherSelect, #reassignTeacherSelect {
        min-width: 400px;
    }
}
`;
document.head.appendChild(style);

function showToast(message, type = 'success', duration = 5000) {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    });

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'error' || type === 'danger' ? 'error' : 'success'}`;
    
    let icon = 'fa-check-circle';
    if (type === 'error' || type === 'danger') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${icon} me-2"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => { 
        toast.classList.add('show'); 
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { 
            if (toast.parentNode) toast.parentNode.removeChild(toast); 
        }, 300);
    }, duration);
    
    // Also allow click to dismiss
    toast.addEventListener('click', function() {
        this.classList.remove('show');
        setTimeout(() => { 
            if (this.parentNode) this.parentNode.removeChild(this); 
        }, 300);
    });
}

// Fix modal scroll lock and reset after assignment
document.addEventListener('DOMContentLoaded', function() {
    const assignModal = document.getElementById('assignTeacherModal');
    if (assignModal) {
        assignModal.addEventListener('hidden.bs.modal', function () {
            // Reset modal scroll position
            assignModal.querySelector('.modal-body').scrollTop = 0;
            // Reset form fields and preview
            const form = document.getElementById('assignTeacherForm');
            if (form) form.reset();
            document.getElementById('teacherInfo').classList.add('d-none');
            document.getElementById('assignmentWarning').classList.add('d-none');
            document.getElementById('assignmentPreview').classList.add('d-none');
            // Restore body scroll (Bootstrap should do this, but force it just in case)
            document.body.style.overflow = '';
        });
    }
});

function renderAssignmentRow(assignment) {
    // Use default avatar if profile_pic is missing or empty
    const teacherPic = assignment.profile_pic && assignment.profile_pic.trim() !== ''
        ? assignment.profile_pic
        : '/static/image/default-avatar.png';

    return `
        <tr>
            <td class="text-center">${assignment.grade_level}-${assignment.section}</td>
            <td class="text-center">
                <img src="${teacherPic}" alt="Teacher Avatar" class="rounded-circle me-2" style="width:32px;height:32px;object-fit:cover;">
                ${assignment.teacher_name}
            </td>
            <td class="text-center">${assignment.teacher_email}</td>
            <td class="text-center">${assignment.assignment_count}</td>
            <td class="text-center">${assignment.assigned_at || ''}</td>
            <td class="text-center">
                <!-- Actions here -->
            </td>
        </tr>
    `;
}

function renderOverviewCard(assignment) {
    // Use default avatar if profile_pic is missing or empty
    const teacherPic = assignment.profile_pic && assignment.profile_pic.trim() !== ''
        ? assignment.profile_pic
        : '/static/image/default-avatar.png';

    return `
        <div class="card mb-3">
            <div class="card-body d-flex align-items-center">
                <img src="${teacherPic}" alt="Teacher Avatar" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                <div>
                    <h6 class="mb-1">${assignment.teacher_name}</h6>
                    <div class="text-muted">${assignment.subject}</div>
                    <div class="small">${assignment.grade_level}-${assignment.section}</div>
                </div>
            </div>
        </div>
    `;
}

// ==================== ASSIGNMENT ARCHIVES ====================

// Add event listener for archive tab
document.addEventListener('DOMContentLoaded', function() {
    // Load archives when archive tab is shown
    document.getElementById('archive-tab')?.addEventListener('click', function() {
        fetchArchivedAssignments();
        loadArchiveSchoolYears();
    });
    
    // Add event listeners for archive filters
    document.getElementById('archiveSchoolYearFilter')?.addEventListener('change', function() {
        renderArchiveTable(1); // Reset to first page when filter changes
    });
    
    document.getElementById('archiveGradeFilter')?.addEventListener('change', function() {
        updateArchiveSectionOptions(); // Update section options based on grade
        renderArchiveTable(1); // Reset to first page when filter changes
    });
    
    document.getElementById('archiveSectionFilter')?.addEventListener('change', function() {
        renderArchiveTable(1); // Reset to first page when filter changes
    });
});

let archiveCurrentPage = 1;
const archivePerPage = 10;
let archiveTotalPages = 1;
let archivedAssignmentsData = [];
let archiveFilteredData = []; // Add this for filtering
let archiveSchoolYears = []; // Store available school years for archive

function showArchiveLoading() {
    const loadingMessage = document.getElementById('archiveLoadingMessage');
    const errorMessage = document.getElementById('archiveErrorMessage');
    const tableContainer = document.getElementById('archiveTableContainer');
    const emptyMessage = document.getElementById('archiveEmptyMessage');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyMessage) emptyMessage.style.display = 'none';
}

function showArchiveError(message) {
    const loadingMessage = document.getElementById('archiveLoadingMessage');
    const errorMessage = document.getElementById('archiveErrorMessage');
    const tableContainer = document.getElementById('archiveTableContainer');
    const emptyMessage = document.getElementById('archiveEmptyMessage');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyMessage) emptyMessage.style.display = 'none';
    
    if (errorMessage) {
        errorMessage.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-circle text-danger me-3" style="font-size: 2rem;"></i>
                <div>
                    <h5>Error Loading Archives</h5>
                    <p class="mb-0">${message}</p>
                </div>
            </div>
        `;
        errorMessage.style.display = 'flex';
    }
}

function showArchiveContent() {
    const loadingMessage = document.getElementById('archiveLoadingMessage');
    const errorMessage = document.getElementById('archiveErrorMessage');
    const tableContainer = document.getElementById('archiveTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer && archivedAssignmentsData.length > 0) tableContainer.style.display = 'block';
}

function showArchiveEmpty() {
    const loadingMessage = document.getElementById('archiveLoadingMessage');
    const errorMessage = document.getElementById('archiveErrorMessage');
    const tableContainer = document.getElementById('archiveTableContainer');
    const emptyMessage = document.getElementById('archiveEmptyMessage');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyMessage) emptyMessage.style.display = 'flex';
}

function fetchArchivedAssignments() {
    showArchiveLoading();
    
    fetch('/api/classroom-assignments/archived')
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.assignments) {
                showArchiveEmpty();
                return;
            }
            
            archivedAssignmentsData = data.assignments;
            
            if (archivedAssignmentsData.length === 0) {
                showArchiveEmpty();
                return;
            }
            
            // Sort chronologically by ended_at date (newest first)
            archivedAssignmentsData.sort((a, b) => {
                const dateA = new Date(a.ended_at);
                const dateB = new Date(b.ended_at);
                return dateB - dateA; // Descending order (newest first)
            });
            
            archiveTotalPages = Math.ceil(archivedAssignmentsData.length / archivePerPage);
            archiveCurrentPage = 1;
            
            // Populate section options
            updateArchiveSectionOptions();
            
            renderArchiveTable(1);
            showArchiveContent();
        })
        .catch(error => {
            console.error('Error fetching archived assignments:', error);
            showArchiveError('Failed to load archived assignments. Please try again.');
        });
}

// Load available school years for archive filter
function loadArchiveSchoolYears() {
    fetch('/api/school-years')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.years) {
                archiveSchoolYears = data.years;
                const schoolYearSelect = document.getElementById('archiveSchoolYearFilter');
                
                if (schoolYearSelect) {
                    // Clear existing options except "All School Years"
                    const currentValue = schoolYearSelect.value;
                    schoolYearSelect.innerHTML = '<option value="">All School Years</option>';
                    
                    // Add school years
                    archiveSchoolYears.forEach(year => {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = year;
                        schoolYearSelect.appendChild(option);
                    });
                    
                    // Restore previous selection if it still exists
                    if (currentValue) {
                        schoolYearSelect.value = currentValue;
                    }
                }
            }
        })
        .catch(error => console.error('Error loading school years:', error));
}

// Function to update archive section options based on selected grade
function updateArchiveSectionOptions() {
    const gradeFilter = document.getElementById('archiveGradeFilter').value;
    const sectionFilter = document.getElementById('archiveSectionFilter');
    
    // Get unique sections for the selected grade from archived assignments
    const uniqueSections = new Set();
    
    archivedAssignmentsData.forEach(assignment => {
        if (!gradeFilter || assignment.grade_level == gradeFilter) {
            uniqueSections.add(assignment.section);
        }
    });
    
    // Sort sections
    const sortedSections = Array.from(uniqueSections).sort();
    
    // Save currently selected section
    const currentValue = sectionFilter.value;
    
    // Populate the section dropdown
    sectionFilter.innerHTML = '<option value="">All Sections</option>';
    sortedSections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        sectionFilter.appendChild(option);
    });
    
    // Restore the previously selected value if it still exists, otherwise reset
    if (sortedSections.includes(currentValue)) {
        sectionFilter.value = currentValue;
    } else {
        sectionFilter.value = '';
    }
}

function renderArchiveTable(page = 1) {
    archiveCurrentPage = page;
    
    // Apply filters first
    const schoolYearFilter = document.getElementById('archiveSchoolYearFilter').value;
    const gradeFilter = document.getElementById('archiveGradeFilter').value;
    const sectionFilter = document.getElementById('archiveSectionFilter').value;
    
    archiveFilteredData = archivedAssignmentsData.filter(assignment => {
        let showRow = true;
        
        if (schoolYearFilter && assignment.school_year !== schoolYearFilter) {
            showRow = false;
        }
        
        if (gradeFilter && assignment.grade_level != gradeFilter) {
            showRow = false;
        }
        
        if (sectionFilter && assignment.section !== sectionFilter) {
            showRow = false;
        }
        
        return showRow;
    });
    
    // Calculate pagination
    archiveTotalPages = Math.ceil(archiveFilteredData.length / archivePerPage);
    archiveCurrentPage = Math.max(1, Math.min(page, archiveTotalPages));
    const start = (archiveCurrentPage - 1) * archivePerPage;
    const end = start + archivePerPage;
    const paginatedData = archiveFilteredData.slice(start, end);
    
    const tbody = document.getElementById('archiveTableBody');
    tbody.innerHTML = '';
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <div>No archived assignments found</div>
                    </div>
                </td>
            </tr>
        `;
    } else {
        paginatedData.forEach(assignment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="align-middle">
                    <h6 class="mb-0">Grade ${assignment.grade_level} - ${assignment.section}</h6>
                </td>
                <td class="align-middle">
                    <div class="d-flex align-items-center">
                        <img src="${assignment.profile_pic || '/static/image/default-avatar.png'}" 
                             alt="Teacher" class="rounded-circle me-2" 
                             style="width:40px;height:40px;object-fit:cover;"
                             onerror="this.onerror=null;this.src='/static/image/default-avatar.png';">
                        <div>
                            <h6 class="mb-0">${assignment.teacher_name}</h6>
                            <small class="text-muted">${assignment.subject} Teacher</small>
                        </div>
                    </div>
                </td>
                <td class="align-middle">
                    <small class="text-muted">${assignment.teacher_email}</small>
                </td>
                <td class="align-middle">${assignment.subject}</td>
                <td class="align-middle">
                    <small class="text-muted">${assignment.assigned_at}</small>
                </td>
                <td class="align-middle">
                    <small class="text-muted">${assignment.ended_at || 'N/A'}</small>
                </td>
                <td class="text-center align-middle">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="viewArchiveDetails(${assignment.assignment_id})"
                            title="View details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    renderArchivePagination();
}

function renderArchivePagination() {
    const paginationContainer = document.getElementById('archivePagination');
    paginationContainer.innerHTML = '';
    
    // Return early if only 1 page or less
    if (archiveTotalPages <= 1) {
        paginationContainer.parentElement.style.display = 'none';
        return;
    }
    
    paginationContainer.parentElement.style.display = 'block';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item${archiveCurrentPage === 1 ? ' disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
    </a>`;
    prevLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (archiveCurrentPage > 1) {
            renderArchiveTable(archiveCurrentPage - 1);
        }
    });
    paginationContainer.appendChild(prevLi);
    
    // Page numbers - show limited pages with ellipsis
    const maxVisiblePages = 5;
    let startPage = Math.max(1, archiveCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(archiveTotalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page + ellipsis if needed
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#">1</a>`;
        firstLi.addEventListener('click', function(e) {
            e.preventDefault();
            renderArchiveTable(1);
        });
        paginationContainer.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationContainer.appendChild(ellipsisLi);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item${i === archiveCurrentPage ? ' active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', function(e) {
            e.preventDefault();
            renderArchiveTable(i);
        });
        paginationContainer.appendChild(li);
    }
    
    // Last page + ellipsis if needed
    if (endPage < archiveTotalPages) {
        if (endPage < archiveTotalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
            paginationContainer.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#">${archiveTotalPages}</a>`;
        lastLi.addEventListener('click', function(e) {
            e.preventDefault();
            renderArchiveTable(archiveTotalPages);
        });
        paginationContainer.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item${archiveCurrentPage === archiveTotalPages ? ' disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
    </a>`;
    nextLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (archiveCurrentPage < archiveTotalPages) {
            renderArchiveTable(archiveCurrentPage + 1);
        }
    });
    paginationContainer.appendChild(nextLi);
}

function viewArchiveDetails(assignmentId) {
    const assignment = archivedAssignmentsData.find(a => a.assignment_id === assignmentId);
    if (!assignment) return;
    
    showToast(`Viewing archive: ${assignment.teacher_name} - ${assignment.grade_level} ${assignment.section}`, 'info');
}

// ==================== DEBUG COMPARISON FUNCTION ====================
// Run this in console: debugPageState() to see loading state
function debugPageState() {
    const currentPage = window.location.pathname;
    const isAdminSubject = currentPage.includes('admin_subject') || currentPage.includes('subject');
    const isStudents = currentPage.includes('students');
    
    console.clear();
    console.log('%c════════════════════════════════════════════════════════════', 'color: #5E72E4; font-weight: bold; font-size: 14px;');
    console.log(`%cPAGE: ${isAdminSubject ? 'ADMIN SUBJECT ASSIGNMENT' : isStudents ? 'STUDENTS LIST' : 'UNKNOWN'}`, 'color: #5E72E4; font-weight: bold; font-size: 14px;');
    console.log('%c════════════════════════════════════════════════════════════', 'color: #5E72E4; font-weight: bold; font-size: 14px;');
    
    // Loading State
    if (isAdminSubject && window.subjectAssignmentLoadingState) {
        console.log('%c📊 LOADING STATE:', 'color: #25C7E0; font-weight: bold;');
        console.table(window.subjectAssignmentLoadingState);
    } else if (isStudents && window.studentsLoadingState) {
        console.log('%c📊 LOADING STATE:', 'color: #25C7E0; font-weight: bold;');
        console.table(window.studentsLoadingState);
    }
    
    // DOM Elements Visibility
    console.log('%c🎨 DOM ELEMENTS:', 'color: #FFC542; font-weight: bold;');
    
    if (isAdminSubject) {
        const assignLoading = document.getElementById('assignmentsLoadingMessage');
        const assignError = document.getElementById('assignmentsErrorMessage');
        const assignTable = document.getElementById('assignmentsTableContainer');
        const overviewLoading = document.getElementById('overviewLoadingMessage');
        const overviewError = document.getElementById('overviewErrorMessage');
        const overviewContainer = document.getElementById('classroomOverviewContainer');
        
        console.log('Assignments Tab:');
        console.log('  - Loading visible:', assignLoading?.style.display !== 'none');
        console.log('  - Error visible:', assignError?.style.display !== 'none');
        console.log('  - Table visible:', assignTable?.style.display !== 'none');
        console.log('Overview Tab:');
        console.log('  - Loading visible:', overviewLoading?.style.display !== 'none');
        console.log('  - Error visible:', overviewError?.style.display !== 'none');
        console.log('  - Container visible:', overviewContainer?.style.display !== 'none');
    } else if (isStudents) {
        const studentLoading = document.getElementById('studentsLoadingMessage');
        const studentError = document.getElementById('studentsErrorMessage');
        const studentContent = document.getElementById('studentsContent');
        const pagination = document.getElementById('studentsPaginationContainer');
        
        console.log('Students Tab:');
        console.log('  - Loading visible:', studentLoading?.style.display !== 'none');
        console.log('  - Error visible:', studentError?.style.display !== 'none');
        console.log('  - Content visible:', studentContent?.style.display !== 'none');
        console.log('  - Pagination visible:', pagination?.style.display !== 'none');
    }
    
    // Data
    console.log('%c📦 DATA:', 'color: #00D4FF; font-weight: bold;');
    
    if (isAdminSubject) {
        console.log('Teachers count:', Object.keys(teachersData).length);
        console.log('Current assignments:', currentAssignments.length);
        console.log('Current school year:', currentSchoolYear);
        console.log('Assignment filtered data:', assignmentFilteredData.length, 'rows');
    } else if (isStudents) {
        console.log('All students count:', window.allStudents?.length || 0);
        console.log('Last filtered students:', window.lastFilteredStudents?.length || 0);
    }
    
    console.log('%c════════════════════════════════════════════════════════════', 'color: #5E72E4; font-weight: bold; font-size: 14px;');
}

// Compare both pages side-by-side
window.comparePages = function() {
    console.clear();
    console.log('%c╔══════════════════════════════════════════════════════════════╗', 'color: #5E72E4; font-weight: bold; font-size: 14px;');
    console.log('%c║           PAGE COMPARISON: ADMIN SUBJECT vs STUDENTS           ║', 'color: #5E72E4; font-weight: bold; font-size: 14px;');
    console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #5E72E4; font-weight: bold; font-size: 14px;');
    
    const isAdminSubject = window.subjectAssignmentLoadingState !== undefined;
    
    // Check loading states
    console.log('%c📊 LOADING STATE COMPARISON:', 'color: #25C7E0; font-weight: bold; font-size: 12px;');
    if (isAdminSubject) {
        console.log('This page (Admin Subject):', window.subjectAssignmentLoadingState);
    } else {
        console.log('This page (Students):', window.studentsLoadingState);
    }
    
    // Check visible elements
    console.log('%c🎨 VISIBLE ELEMENTS:', 'color: #FFC542; font-weight: bold; font-size: 12px;');
    const elements = {
        'Loading messages': document.querySelectorAll('[id*="LoadingMessage"]').length,
        'Error messages': document.querySelectorAll('[id*="ErrorMessage"]').length,
        'Content containers': document.querySelectorAll('[id*="Container"], [id*="Content"]').length
    };
    console.table(elements);
    
    // Check for API calls
    console.log('%c🔗 API CALLS:', 'color: #00D4FF; font-weight: bold; font-size: 12px;');
    console.log('Check Network tab in DevTools to see actual API calls');
    
    debugPageState();
};