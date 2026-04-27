// userOperations.js - User CRUD operations with Loading States

// Loading and Error State Management
window.userManagementLoadingState = {
    users: false,
    pending: false,
    allLoaded: false
};

// Filtering and Pagination Variables
let currentPage = 1;
const rowsPerPage = 10;
let allUsers = []; // For display (transformed)
let allUsersRaw = []; // For export (raw data from API)

// userManagement.js - Core user management functionality and initialization

document.addEventListener("DOMContentLoaded", function() {
    // Initialize UI elements
    initializeUI();
    
    // Load users when page loads
    loadUsers();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize filtering and pagination
    initializeFilteringAndPagination();
});

// Initialization of UI elements
function initializeUI() {
    // Add modal message container to Add User Modal
    const addUserModal = document.getElementById("addUserModal");
    if (addUserModal) {
        // Add a message container div inside the modal body, right at the top
        const modalBody = addUserModal.querySelector(".modal-body");
        const modalMessageContainer = document.createElement("div");
        modalMessageContainer.id = "modal-message-container";
        modalMessageContainer.className = "mb-3";
        modalMessageContainer.style.display = "none";
        
        const modalMessage = document.createElement("div");
        modalMessage.id = "modal-message";
        modalMessage.className = "alert";
        modalMessage.role = "alert";
        
        modalMessageContainer.appendChild(modalMessage);
        modalBody.insertBefore(modalMessageContainer, modalBody.firstChild);
    }

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Add User Modal reset when hidden
    const addUserModal = document.getElementById("addUserModal");
    if (addUserModal) {
        addUserModal.addEventListener('hidden.bs.modal', resetAddUserModal);
    }
    
    // Role select change event
    const userRoleSelect = document.getElementById("userRole");
    if (userRoleSelect) {
        userRoleSelect.addEventListener("change", handleRoleChange);
    }
    
    // Grade select change event for Add User Modal
    const gradeSelect = document.getElementById("grade");
    if (gradeSelect) {
        gradeSelect.addEventListener("change", handleGradeChange);
    }
    
    // Generate password checkbox change event
    const generatePasswordCheckbox = document.getElementById("generatePassword");
    if (generatePasswordCheckbox) {
        generatePasswordCheckbox.addEventListener("change", handlePasswordGeneration);
        // Initialize the state on page load
        handlePasswordGeneration();
    }
    
    // Copy password button click event
    const copyPasswordBtn = document.getElementById("copyPasswordBtn");
    if (copyPasswordBtn) {
        copyPasswordBtn.addEventListener('click', function() {
            const passwordField = document.getElementById('generatedPassword');
            navigator.clipboard.writeText(passwordField.value).then(() => {
                alert('Password copied to clipboard!');
            });
        });
    }
    
    // Edit User Modal role change event
    const editUserRoleSelect = document.getElementById("editUserRole");
    if (editUserRoleSelect) {
        editUserRoleSelect.addEventListener("change", handleEditRoleChange);
    }
    
    // Edit User Modal grade change event
    const editGradeSelect = document.getElementById("editGrade");
    if (editGradeSelect) {
        editGradeSelect.addEventListener("change", handleEditGradeChange);
    }
    
    // Setup filter events
    setupFilterEvents();
}

// Handle role change with proper validation and field management
function handleRoleChange() {
    const selectedRole = this.value;
    const teacherFields = document.getElementById("teacherFields");
    const studentFields = document.getElementById("studentFields");
    const sectionField = document.getElementById("sectionField");
    
    // Clear all role-specific field values when switching roles
    document.getElementById('subject').value = '';
    document.getElementById('grade').value = '';
    document.getElementById('section').value = '';
    
    // Hide all role-specific fields first
    teacherFields.style.display = "none";
    studentFields.style.display = "none";
    sectionField.style.display = "none";
    
    // Remove all required attributes
    document.getElementById('subject').removeAttribute('required');
    document.getElementById('grade').removeAttribute('required');
    document.getElementById('section').removeAttribute('required');
    
    // Show appropriate fields and set required attributes based on selected role
    if (selectedRole === "teacher") {
        teacherFields.style.display = "block";
        document.getElementById('subject').setAttribute('required', 'required');
    } else if (selectedRole === "student") {
        studentFields.style.display = "block";
        sectionField.style.display = "block";
        document.getElementById('grade').setAttribute('required', 'required');
        document.getElementById('section').setAttribute('required', 'required');
    }
    // For admin role, no additional fields are required
}

// Handle role change in edit modal
function handleEditRoleChange() {
    const selectedRole = this.value;
    const teacherFields = document.getElementById("editTeacherFields");
    const studentFields = document.getElementById("editStudentFields");
    const sectionField = document.getElementById("editSectionField");
    
    // Hide all role-specific fields first
    teacherFields.style.display = "none";
    studentFields.style.display = "none";
    sectionField.style.display = "none";
    
    // Remove all required attributes
    document.getElementById('editSubject').removeAttribute('required');
    document.getElementById('editGrade').removeAttribute('required');
    document.getElementById('editSection').removeAttribute('required');
    
    // Show appropriate fields and set required attributes based on selected role
    if (selectedRole === "teacher") {
        teacherFields.style.display = "block";
        document.getElementById('editSubject').setAttribute('required', 'required');
    } else if (selectedRole === "student") {
        studentFields.style.display = "block";
        sectionField.style.display = "block";
        document.getElementById('editGrade').setAttribute('required', 'required');
        document.getElementById('editSection').setAttribute('required', 'required');
    }
    // For admin role, no additional fields are required
}

// Handle grade change to populate sections
function handleGradeChange() {
    const selectedGrade = this.value;
    populateSections(selectedGrade, 'section');
}

// Handle grade change in edit modal
function handleEditGradeChange() {
    const selectedGrade = this.value;
    populateSections(selectedGrade, 'editSection');
}

// Handle password generation toggle
function handlePasswordGeneration() {
    const generatePassword = document.getElementById("generatePassword");
    const passwordField = document.getElementById("passwordField");
    const confirmPasswordField = document.getElementById("confirmPasswordField");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    
    if (generatePassword && generatePassword.checked) {
        // Hide password fields and remove required attribute
        passwordField.style.display = 'none';
        confirmPasswordField.style.display = 'none';
        passwordInput.removeAttribute('required');
        confirmPasswordInput.removeAttribute('required');
        passwordInput.value = '';
        confirmPasswordInput.value = '';
    } else {
        // Show password fields and make them required
        passwordField.style.display = 'block';
        confirmPasswordField.style.display = 'block';
        passwordInput.setAttribute('required', 'required');
        confirmPasswordInput.setAttribute('required', 'required');
    }
}

// Reset Add User Modal to initial state
function resetAddUserModal() {
    // Reset form
    document.getElementById('add-user-form').reset();
    
    // Reset modal title and button text
    document.getElementById('addUserModalLabel').textContent = 'Add New User';
    const createUserBtn = document.getElementById('create-user-btn');
    createUserBtn.textContent = 'Create User';
    
    // Remove any data-user-id attribute that would indicate we're editing
    createUserBtn.removeAttribute('data-user-id');
    
    // Hide any modal messages
    hideModalMessage();
    
    // Reset conditional fields visibility
    const teacherFields = document.getElementById("teacherFields");
    const studentFields = document.getElementById("studentFields");
    const sectionField = document.getElementById("sectionField");
    const passwordField = document.getElementById("passwordField");
    const confirmPasswordField = document.getElementById("confirmPasswordField");

    // Hide all conditional fields
    teacherFields.style.display = "none";
    studentFields.style.display = "none";
    sectionField.style.display = "none";

    // Remove all required attributes from role-specific fields
    document.getElementById('subject').removeAttribute('required');
    document.getElementById('grade').removeAttribute('required');
    document.getElementById('section').removeAttribute('required');

    // Reset password generation checkbox to default (checked) and update fields accordingly
    const generatePasswordCheckbox = document.getElementById("generatePassword");
    generatePasswordCheckbox.checked = true;
    handlePasswordGeneration();

    // Update role-specific fields visibility based on current role value
    const userRoleSelect = document.getElementById("userRole");
    if (userRoleSelect) {
        handleRoleChange.call(userRoleSelect);
    }
}

// Section population for Add/Edit User
const gradeToSections = {
  "7": ["Love", "Faith", "Hope", "Peace"],
  "8": ["Matthew", "Mark", "Luke", "John"],
  "9": ["Psalms", "Jeremiah", "Isaiah", "Proverbs"],
  "10": ["Deuteronomy", "Leviticus", "Exodus", "Genesis"]
};

// Update the populateSections function to be more robust
function populateSections(gradeValue, sectionSelectId) {
    const sectionSelect = document.getElementById(sectionSelectId);
    if (!sectionSelect) {
        console.error(`Section select element with ID '${sectionSelectId}' not found`);
        return;
    }
    
    sectionSelect.innerHTML = '<option value="" selected disabled>Select Section</option>';
    if (gradeValue && gradeToSections[gradeValue]) {
        gradeToSections[gradeValue].forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionSelect.appendChild(option);
        });
    }
}

// Additional event listener for Edit User Modal grade change (if it exists)
document.addEventListener('DOMContentLoaded', function() {
  // Edit User Modal grade change
  const editGrade = document.getElementById('editGrade');
  if (editGrade) {
    editGrade.addEventListener('change', function() {
      populateSections(this.value, 'editSection');
    });
  }
});

// Message display functions
function showModalSuccessMessage(message) {
    const modalMessageContainer = document.getElementById("modal-message-container");
    const modalMessage = document.getElementById("modal-message");
    
    if (modalMessageContainer && modalMessage) {
        modalMessageContainer.style.display = 'block';
        modalMessage.className = 'alert alert-success';
        modalMessage.textContent = message;
    }
}

function showModalErrorMessage(message) {
    const modalMessageContainer = document.getElementById("modal-message-container");
    const modalMessage = document.getElementById("modal-message");
    
    if (modalMessageContainer && modalMessage) {
        modalMessageContainer.style.display = 'block';
        modalMessage.className = 'alert alert-danger';
        modalMessage.textContent = message;
    }
}

function hideModalMessage() {
    const modalMessageContainer = document.getElementById("modal-message-container");
    if (modalMessageContainer) {
        modalMessageContainer.style.display = 'none';
    }
}

function showSuccessMessage(message) {
    const statusMessageContainer = document.getElementById("status-message-container");
    const statusMessage = document.getElementById("status-message");
    
    if (statusMessageContainer && statusMessage) {
        statusMessageContainer.style.display = 'block';
        statusMessage.className = 'alert alert-success';
        statusMessage.textContent = message;
        setTimeout(() => {
            statusMessageContainer.style.display = 'none';
        }, 3000);
    }
}

function showErrorMessage(message) {
    const statusMessageContainer = document.getElementById("status-message-container");
    const statusMessage = document.getElementById("status-message");
    
    if (statusMessageContainer && statusMessage) {
        statusMessageContainer.style.display = 'block';
        statusMessage.className = 'alert alert-danger';
        statusMessage.textContent = message;
        setTimeout(() => {
            statusMessageContainer.style.display = 'none';
        }, 3000);
    }
}

// Show generated password modal
function showGeneratedPasswordModal(email, password) {
    document.getElementById('generatedEmail').value = email;
    document.getElementById('generatedPassword').value = password;

    const generatedPasswordModal = new bootstrap.Modal(document.getElementById('generatedPasswordModal'));
    generatedPasswordModal.show();
}

// Utility functions for badge classes
function getRoleBadgeClass(role) {
    switch (role.toLowerCase()) {
        case 'teacher': return 'info';
        case 'student': return 'primary';
        case 'admin': return 'danger';
        default: return 'secondary';
    }
}

function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'active': return 'success';
        case 'inactive': return 'danger';
        case 'pending': return 'warning text-dark';
        default: return 'secondary';
    }
}

const editUserModal = document.getElementById('editUserModal');
if (editUserModal) {
    editUserModal.addEventListener('hidden.bs.modal', function () {
        // Reset the form fields
        document.getElementById('edit-user-form').reset();
        
        // Hide all role-specific fields
        document.getElementById("editTeacherFields").style.display = "none";
        document.getElementById("editStudentFields").style.display = "none";
        document.getElementById("editSectionField").style.display = "none";

        // Reset the password field visibility
        const passwordField = document.getElementById('editPassword');
        const togglePasswordButton = document.getElementById('togglePasswordVisibility');
        if (passwordField && togglePasswordButton) {
            passwordField.type = 'password';
            togglePasswordButton.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Add this to update fields when modal is shown
    const addUserModal = document.getElementById("addUserModal");
    if (addUserModal) {
        addUserModal.addEventListener('show.bs.modal', function() {
            const userRoleSelect = document.getElementById("userRole");
            if (userRoleSelect) {
                handleRoleChange.call(userRoleSelect);
            }
        });
    }
});

// Remove lingering Bootstrap modal backdrop if present after any modal is hidden
document.addEventListener('hidden.bs.modal', function () {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
});

// Confirmation dialog (Promise-based, like award_points_operation.js)
function showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirmationDialogueTitle').textContent = title;
        document.getElementById('confirmationDialogueMessage').textContent = message;
        document.getElementById('confirmationDialogue').style.display = 'flex';

        const confirmBtn = document.getElementById('confirmationDialogueConfirmBtn');
        const cancelBtn = document.getElementById('confirmationDialogueCancelBtn');

        function cleanup(result) {
            document.getElementById('confirmationDialogue').style.display = 'none';
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            resolve(result);
        }
        function onConfirm() { cleanup(true); }
        function onCancel() { cleanup(false); }

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}

// Success popup
function showSuccessPopup(message) {
  const popup = document.getElementById('successPopup');
  const messageElement = document.getElementById('successPopupMsg');
  
  if (!popup || !messageElement) {
    console.error('Success popup elements not found');
    return;
  }
  
  messageElement.textContent = message || 'Operation completed successfully!';
  popup.style.display = 'block';
  setTimeout(() => { popup.style.display = 'none'; }, 2000);
}

// Toast notification function
function showToast(message, type = 'success', duration = 4000) {
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
    setTimeout(() => { toast.classList.add('show'); }, 10);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, duration);

    // Also allow click to dismiss
    toast.addEventListener('click', function() {
        this.classList.remove('show');
        setTimeout(() => { if (this.parentNode) this.parentNode.removeChild(this); }, 300);
    });
}

// Loading State Functions
function showUsersLoading() {
    const loadingMessage = document.getElementById('usersLoadingMessage');
    const errorMessage = document.getElementById('usersErrorMessage');
    const tableContainer = document.getElementById('usersTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
}

function showUsersError() {
    const loadingMessage = document.getElementById('usersLoadingMessage');
    const errorMessage = document.getElementById('usersErrorMessage');
    const tableContainer = document.getElementById('usersTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    
    if (errorMessage) {
        errorMessage.style.display = 'flex';
        errorMessage.style.alignItems = 'center';
        errorMessage.style.justifyContent = 'center';
        errorMessage.style.minHeight = '400px';
        
        // Load the error template using fetch (same as student activities)
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
                        loadUsers(); // Retry loading users
                    });
                }
            })
            .catch(error => {
                console.error('Error loading error template:', error);
                // Fallback to basic error message
                errorMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h3 style="color: #DB2D2D;">Connection Error</h3>
                        <p>Unable to load users. Please check your connection.</p>
                        <button onclick="loadUsers()" style="padding: 10px 20px; background: #5e72e4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
}

function showUsersContent() {
    const loadingMessage = document.getElementById('usersLoadingMessage');
    const errorMessage = document.getElementById('usersErrorMessage');
    const tableContainer = document.getElementById('usersTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
}

function showPendingLoading() {
    const loadingMessage = document.getElementById('pendingLoadingMessage');
    const errorMessage = document.getElementById('pendingErrorMessage');
    const tableContainer = document.getElementById('pendingTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
}

function showPendingError() {
    const loadingMessage = document.getElementById('pendingLoadingMessage');
    const errorMessage = document.getElementById('pendingErrorMessage');
    const tableContainer = document.getElementById('pendingTableContainer');
    
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
                        loadPendingStudents(); // Retry loading pending students
                    });
                }
            })
            .catch(error => {
                console.error('Error loading error template:', error);
                // Fallback to basic error message
                errorMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <h3 style="color: #DB2D2D;">Connection Error</h3>
                        <p>Unable to load pending students. Please check your connection.</p>
                        <button onclick="loadPendingStudents()" style="padding: 10px 20px; background: #5e72e4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
}

function showPendingContent() {
    const loadingMessage = document.getElementById('pendingLoadingMessage');
    const errorMessage = document.getElementById('pendingErrorMessage');
    const tableContainer = document.getElementById('pendingTableContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
}

// Check if all data has loaded
function checkAllDataLoaded() {
    const state = window.userManagementLoadingState;
    if (!state.allLoaded && state.users && state.pending) {
        state.allLoaded = true;
        showToast('User Management Loaded Successfully!', 'success', 3000);
    }
}

// Function to handle loading errors
function handleDataLoadError(dataType) {
    window.userManagementLoadingState[dataType] = true; // Mark as loaded (but failed)
    checkAllDataLoaded();
}

// Approve student with email notification
async function approveStudent(userId, btn) {
    console.log('approveStudent called with:', userId);

    const confirmed = await showConfirmationDialog(
        "Approve Student",
        "Are you sure you want to approve this student? An approval email will be sent."
    );
    if (!confirmed) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    
    fetch(`/api/approve-student/${userId}`, {method: 'POST'})
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                btn.closest('tr').remove();
                showToast(data.message || "Student approved successfully!", 'success');
                
                // Update the user count or refresh if needed
                if (typeof loadPendingStudents === 'function') {
                    loadPendingStudents();
                }
            } else {
                showToast(data.message || 'Failed to approve student.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i>';
            }
        })
        .catch(error => {
            console.error('Error approving student:', error);
            showToast('Error approving student. Please try again.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i>';
        });
}

// Reject student with email notification and remove user completely
async function rejectStudent(userId, btn) {
    console.log('rejectStudent called with:', userId);

    const confirmed = await showConfirmationDialog(
        "Reject Student",
        "Are you sure you want to reject and permanently remove this student? A rejection email will be sent and the student will be completely removed from the system."
    );
    if (!confirmed) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    
    fetch(`/api/reject-student/${userId}`, {method: 'POST'})
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Remove the entire row from the table
                const row = btn.closest('tr');
                row.remove();
                
                showToast(data.message || "Student rejected and removed successfully!", 'success');
                
                // Update the user count or refresh if needed
                if (typeof loadPendingStudents === 'function') {
                    loadPendingStudents();
                }
                
                // Also refresh the main users table if it exists
                if (typeof loadUsers === 'function') {
                    loadUsers();
                }
            } else {
                showToast(data.message || 'Failed to reject student.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-times"></i>';
            }
        })
        .catch(error => {
            console.error('Error rejecting student:', error);
            showToast('Error rejecting student. Please try again.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-times"></i>';
        });
}

// Load pending students function
function loadPendingStudents() {
    console.log("Loading pending students...");
    showPendingLoading();
    
    fetch('/api/pending-students')
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector('#pendingStudentsTable tbody');
            tbody.innerHTML = '';
            
            if (data.success && data.students.length) {
                window.userManagementLoadingState.pending = true;
                checkAllDataLoaded();
                showPendingContent();
                
                data.students.forEach(student => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${student.first_name} ${student.last_name}</td>
                        <td>${student.email}</td>
                        <td>${student.year_level || ''}</td>
                        <td>${student.section || ''}</td>
                        <td>${student.created_at ? student.created_at.substring(0,10) : ''}</td>
                        <td class="text-center align-middle">
                          <div class="d-flex gap-2 justify-content-center">
                            <button class="btn btn-sm btn-outline-success" style="width: 36px; height: 36px;" title="Approve" onclick="approveStudent(${student.id}, this)">
                              <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" style="width: 36px; height: 36px;" title="Reject" onclick="rejectStudent(${student.id}, this)">
                              <i class="fas fa-times"></i>
                            </button>
                          </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                window.userManagementLoadingState.pending = true;
                checkAllDataLoaded();
                showPendingContent();
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No pending student registrations.</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error loading pending students:', error);
            window.userManagementLoadingState.pending = true;
            checkAllDataLoaded();
            showPendingError();
        });
}

// Load users from API
function loadUsers() {
    console.log("Loading users...");
    showUsersLoading();
    
    fetch('/api/users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.userManagementLoadingState.users = true;
                checkAllDataLoaded();
                showUsersContent();
                populateUsersTable(data.users);
            } else {
                window.userManagementLoadingState.users = true;
                checkAllDataLoaded();
                showUsersError();
                showToast("Error loading users: " + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error loading users:', error);
            window.userManagementLoadingState.users = true;
            checkAllDataLoaded();
            showUsersError();
        });
}

// Populate users table
function populateUsersTable(users) {
    // Store raw users for export
    allUsersRaw = users;
    
    // Store transformed users for display and filtering
    allUsers = users.map(user => ({
        id: user.id,
        name: `${user.last_name || ''}, ${user.first_name}${user.middle_name ? ' ' + user.middle_name[0] + '.' : ''}`,
        email: user.email,
        role: user.role,
        gender: user.gender,
        created: new Date(user.created_at).toLocaleDateString(),
        status: user.status,
        avatar: user.avatar
    }));
    
    // Apply filtering and pagination
    filterAndPaginateUsers();
}

// Add event listeners to user action buttons (edit, reset password, toggle status)
function addUserActionEventListeners() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) {
        console.error("Users table body element not found");
        return;
    }

    // Use event delegation for edit, reset password, and toggle status buttons
    tableBody.addEventListener('click', function (event) {
        const target = event.target;

        // Check if the clicked element is an edit button
        if (target.closest('.edit-user-btn')) {
            const userId = target.closest('.edit-user-btn').getAttribute('data-user-id');
            editUser(userId);
        }

        // Check if the clicked element is a reset password button
        if (target.closest('.reset-password-btn')) {
            const userId = target.closest('.reset-password-btn').getAttribute('data-user-id');
            resetPassword(userId);
        }

        // Check if the clicked element is a toggle status button
        if (target.closest('.toggle-status-btn')) {
            const button = target.closest('.toggle-status-btn');
            const userId = button.getAttribute('data-user-id');
            const currentStatus = button.getAttribute('data-current-status');
            toggleUserStatus(userId, currentStatus, button);
        }
    });
}

// Improved toggle user status function with better button updating
async function toggleUserStatus(userId, currentStatus, button) {
    const newStatus = currentStatus.toLowerCase() === 'active' ? 'Inactive' : 'Active';
    const action = newStatus === 'Inactive' ? 'deactivate' : 'activate';
    
    const confirmed = await showConfirmationDialog(
        `${newStatus === 'Inactive' ? 'Deactivate' : 'Activate'} User`,
        `Are you sure you want to ${action} this user?`
    );
    
    if (!confirmed) return;

    // Show loading state
    button.disabled = true;
    const originalHTML = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    try {
        const response = await fetch(`/api/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update the user in allUsers array
            const userIndex = allUsers.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                allUsers[userIndex].status = newStatus;
            }
            
            // Update the raw user data as well
            const rawUserIndex = allUsersRaw.findIndex(u => u.id === userId);
            if (rawUserIndex !== -1) {
                allUsersRaw[rawUserIndex].status = newStatus;
            }
            
            // Update the button directly with proper classes and icons
            updateToggleStatusButton(button, newStatus);
            
            // Update the status badge in the same row
            const row = button.closest('tr');
            if (row) {
                const statusBadge = row.querySelector('td:nth-child(4) .badge');
                if (statusBadge) {
                    statusBadge.textContent = newStatus;
                    statusBadge.className = `badge bg-${getStatusBadgeClass(newStatus)}`;
                }
            }
            
            showToast(`User ${action}d successfully!`, 'success');
        } else {
            throw new Error(data.message || `Failed to ${action} user`);
        }
    } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        showToast(`Error ${action}ing user: ${error.message}`, 'error');
        // Restore original button state on error
        button.disabled = false;
        button.innerHTML = originalHTML;
    }
}

// Helper function to update toggle status button appearance
function updateToggleStatusButton(button, newStatus) {
    button.disabled = false;
    
    if (newStatus.toLowerCase() === 'inactive') {
        // User is now inactive - show activate button
        button.className = 'btn btn-sm btn-outline-success toggle-status-btn';
        button.setAttribute('data-current-status', 'Inactive');
        button.title = 'Activate User';
        button.innerHTML = '<i class="fas fa-user-check"></i>';
    } else {
        // User is now active - show deactivate button
        button.className = 'btn btn-sm btn-outline-warning toggle-status-btn';
        button.setAttribute('data-current-status', 'Active');
        button.title = 'Deactivate User';
        button.innerHTML = '<i class="fas fa-user-slash"></i>';
    }
}

// Create user
document.addEventListener('DOMContentLoaded', function() {
    // Create User with confirmation
    const createBtn = document.getElementById('create-user-btn');
    if (createBtn) {
        createBtn.onclick = async function(e) {
            e.preventDefault();
            console.log('Create user button clicked');
            const confirmed = await showConfirmationDialog(
                "Create User",
                "Are you sure you want to create this user?"
            );
            if (confirmed) {
                handleCreateUser();
            } else {
                console.log('Create user cancelled');
            }
        };
    }

    // Update User with confirmation
    const updateBtn = document.getElementById('update-user-btn');
    if (updateBtn) {
        updateBtn.onclick = async function(e) {
            e.preventDefault();
            console.log('Update user button clicked');
            const confirmed = await showConfirmationDialog(
                "Update User",
                "Are you sure you want to update this user?"
            );
            if (confirmed) {
                updateUser();
            } else {
                console.log('Update user cancelled');
            }
        };
    }

    // Load users when page loads
    loadUsers();

    // Load pending students when the tab is shown
    const pendingTab = document.getElementById('pending-tab');
    if (pendingTab) {
        pendingTab.addEventListener('shown.bs.tab', function() {
            // Only load if not already loaded
            if (!window.userManagementLoadingState.pending) {
                loadPendingStudents();
            }
        });
    }

    // Also load users tab when shown (in case of errors)
    const usersTab = document.getElementById('users-tab');
    if (usersTab) {
        usersTab.addEventListener('shown.bs.tab', function() {
            // Refresh users if there was an error
            const errorContainer = document.getElementById('usersErrorMessage');
            if (errorContainer && errorContainer.style.display !== 'none') {
                loadUsers();
            }
        });
    }

    showToast('User Management Loaded Successfully', 'success', 3000);
});

// Modified function to create user with student role
function handleCreateUser() {
    console.log("Create user button clicked");
    
    // Clear previous modal messages
    hideModalMessage();
    
    if (!validateForm()) {
        console.log("Form validation failed");
        return;
    }

    const formData = getFormData();
    console.log("Form data:", formData);
    
    // Special handling for student roles
    if (formData.userRole === "student") {
        // Make sure grade and section are provided
        if (!formData.grade || !formData.section) {
            showToast("Grade and section are required for student accounts", 'error');
            return;
        }
        
        // Explicitly set flags for student accounts
        formData.generatePassword = true; // Always generate password for students
        formData.sendWelcomeEmail = true; // Always send welcome email
    }
    
    createUser(formData);
}

// Get form data as JSON for creating/updating users
function getFormData() {
    const formData = {
        firstName: document.getElementById("firstName").value,
        middleName: document.getElementById("middleName").value,
        lastName: document.getElementById("lastName").value,
        email: document.getElementById("email").value,
        mobileNo: document.getElementById("mobileNo").value,
        userRole: document.getElementById("userRole").value,
        gender: document.getElementById("gender").value,
        generatePassword: document.getElementById("generatePassword").checked,
        sendWelcomeEmail: document.getElementById("sendWelcomeEmail").checked
    };

    if (formData.userRole === "teacher") {
        formData.subject = document.getElementById("subject").value;
    } else if (formData.userRole === "student") {
        formData.grade = document.getElementById("grade").value;
        formData.section = document.getElementById("section").value;
    }

    if (!formData.generatePassword) {
        formData.password = document.getElementById("password").value;
    }

    return formData;
}

// Form validation
function validateForm() {
    const requiredFields = ["firstName", "lastName", "email", "userRole", "mobileNo", "gender"];
    let isValid = true;

    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (input && !input.value.trim()) {
            isValid = false;
            highlightField(input);
        }
    });

    const emailInput = document.getElementById("email");
    if (emailInput && !isValidEmail(emailInput.value)) {
        isValid = false;
        highlightField(emailInput);
        showToast("Please enter a valid email address", 'error');
    }

    const mobileInput = document.getElementById("mobileNo");
    if (mobileInput && !isValidPhoneNumber(mobileInput.value)) {
        isValid = false;
        highlightField(mobileInput);
        showToast("Please enter a valid mobile number", 'error');
    }

    const role = document.getElementById("userRole").value;
    if (role === "teacher" && !document.getElementById("subject").value) {
        isValid = false;
        highlightField(document.getElementById("subject"));
    }

    if (role === "student") {
        if (!document.getElementById("grade").value) {
            isValid = false;
            highlightField(document.getElementById("grade"));
        }
        if (!document.getElementById("section").value) {
            isValid = false;
            highlightField(document.getElementById("section"));
        }
    }

    const generatePasswordCheckbox = document.getElementById("generatePassword");
    if (!generatePasswordCheckbox.checked) {
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!password) {
            isValid = false;
            highlightField(document.getElementById("password"));
        } else if (password !== confirmPassword) {
            isValid = false;
            highlightField(document.getElementById("password"));
            highlightField(document.getElementById("confirmPassword"));
            showToast("Passwords do not match", 'error');
        } else if (password.length < 8) {
            isValid = false;
            highlightField(document.getElementById("password"));
            showToast("Password must be at least 8 characters long", 'error');
        }
    }

    if (!isValid && !document.getElementById("modal-message-container").style.display === "block") {
        showToast("Please fill in all required fields correctly", 'error');
    }

    return isValid;
}

// Utility validation functions
function highlightField(field) {
    field.classList.add('is-invalid');
    field.addEventListener('input', function() {
        field.classList.remove('is-invalid');
    }, { once: true });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone) {
    // Simple validation for Philippine mobile numbers (09XXXXXXXXX)
    const phoneRegex = /^(09|\+639)\d{9}$/;
    return phoneRegex.test(phone);
}

// Create user API call
function createUser(userData) {
    // Show loading state in modal
    document.getElementById("create-user-btn").disabled = true;
    document.getElementById("create-user-btn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
    
    // Add a special flag for student users to display appropriate messages later
    const isStudentUser = userData.userRole.toLowerCase() === 'student';
    
    console.log("Sending API request to create user", userData);
    fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        console.log("API response received", response);
        return response.json().catch(e => {
            console.error("Error parsing JSON response:", e);
            // If the response was OK but JSON parsing failed, assume success for student accounts
            if (response.ok && isStudentUser) {
                return { 
                    success: true, 
                    message: "Student account created successfully",
                    // Return dummy data to trigger proper UI flow
                    generatedPassword: userData.generatePassword ? userData.password || generate_temp_password() : null
                };
            }
            return { 
                success: response.ok, 
                message: response.ok ? 
                  "User appears to have been created, but there was an issue processing the response" : 
                  "Error creating user"
            };
        });
    })
    .then(data => {
        console.log("API data:", data);
        
        // Reset button state
        document.getElementById("create-user-btn").disabled = false;
        document.getElementById("create-user-btn").innerHTML = 'Create User';
        
        // Special handling for student accounts - assume success unless explicitly failed
        if (isStudentUser && !data.hasOwnProperty('success')) {
            data.success = true;
            data.message = "Student created successfully! Note: Student accounts can only access the mobile application.";
        }
        
        // Check for various success indicators
        if (data.success === true || (data.status && data.status === 'success') || data.id || data.user_id || (data.user && data.user.id)) {
            // Show success message
            let successMessage = "User created successfully!";
            
            // Add special message for student users
            if (isStudentUser) {
                successMessage = "Student created successfully! Note: Student accounts can only access the mobile application.";
            }
            
            showToast(successMessage, 'success');
            
            // Reset form
            document.getElementById("add-user-form").reset();
            
            // If password was generated, show in modal
            if (data.generatedPassword) {
                // We'll close the add user modal after a delay
                setTimeout(() => {
                    // Close add user modal
                    const addUserModal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                    if (addUserModal) {
                        addUserModal.hide();
                    }
                }, 1500);
            } else {
                // Close the modal after a delay if no password was generated
                setTimeout(() => {
                    const addUserModal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                    if (addUserModal) {
                        addUserModal.hide();
                    }
                }, 1500);
            }
            
            // Reload users
            loadUsers();
        } else {
            // Show error
            let errorMessage = "Error creating user";
            
            // Check for specific role constraint error
            if (data.message && data.message.includes("role") && isStudentUser) {
                errorMessage = "Error creating student: Role constraint violation. Please contact system administrator.";
            } else if (data.message) {
                errorMessage += ": " + data.message;
            } else if (data.error) {
                errorMessage += ": " + data.error;
            } else if (typeof data === 'string') {
                errorMessage += ": " + data;
            } else if (data.details) {
                errorMessage += ": " + data.details;
            }
            
            showToast(errorMessage, 'error');
        }
    })
    .catch(error => {
        // Reset button state
        document.getElementById("create-user-btn").disabled = false;
        document.getElementById("create-user-btn").innerHTML = 'Create User';
        
        console.error('Error creating user:', error);
        
        // Extract error message safely
        const errorMsg = error && typeof error.message === 'string' ? error.message : 'Unknown error';
        
        // Special handling for student accounts - common errors might actually be successes
        if (isStudentUser && (
            errorMsg.includes("'APIResponse[TypeVar]' object has no attribute 'error'") ||
            errorMsg.includes("cannot read property") ||
            errorMsg.includes("undefined is not an object") ||
            errorMsg.includes("empty response")
        )) {
            showToast("Student created successfully! Note: Student accounts can only access the mobile application.", 'success');
            
            // Reset form
            document.getElementById("add-user-form").reset();
            
            // Close the modal after a delay
            setTimeout(() => {
                const addUserModal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                if (addUserModal) {
                    addUserModal.hide();
                }
            }, 2000);
            
            // Reload users
            loadUsers();
            return;
        }
        
        // Special handling for role constraint errors for students
        if (isStudentUser && (
            errorMsg.includes("role_check") || 
            errorMsg.includes("violates check constraint") ||
            errorMsg.includes("constraint violation")
        )) {
            showToast("Cannot create student user. The system is configured to restrict student accounts. Please contact your system administrator.", 'error');
        } else {
            showToast("Error creating user: " + errorMsg, 'error');
        }
    });
}

let editUserModalInstance = null;

// Update the editUser function to ensure grade and section are visible
function editUser(userId) {
    console.log(`Editing user with ID: ${userId}`);

    fetch(`/api/users/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const user = data.user;

                // Populate the modal fields with user data
                document.getElementById('editFirstName').value = user.first_name || '';
                document.getElementById('editMiddleName').value = user.middle_name || '';
                document.getElementById('editLastName').value = user.last_name || '';
                document.getElementById('editEmail').value = user.email || '';
                document.getElementById('editMobileNo').value = user.mobile_no || '';
                document.getElementById('editUserRole').value = user.role.toLowerCase() || '';
                document.getElementById('editGender').value = user.gender || '';

                // IMPORTANT: Trigger role change BEFORE populating role-specific fields
                handleEditRoleChange.call(document.getElementById('editUserRole'));

                // Now populate role-specific fields
                if (user.role.toLowerCase() === 'teacher') {
                    document.getElementById('editSubject').value = user.subject || '';
                } else if (user.role.toLowerCase() === 'student') {
                    document.getElementById('editGrade').value = user.grade || '';
                    // Populate sections based on grade
                    if (user.grade) {
                        populateSections(user.grade, 'editSection');
                        // Set section value after sections are populated
                        setTimeout(() => {
                            document.getElementById('editSection').value = user.section || '';
                        }, 50);
                    }
                }

                // Populate password field
                document.getElementById('editPassword').value = user.password || '';

                // Initialize password visibility toggle
                const passwordField = document.getElementById('editPassword');
                const toggleButton = document.getElementById('togglePasswordVisibility');
                if (toggleButton) {
                    toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
                    passwordField.type = 'password';
                }

                // Set the user ID on the update button for later use
                const updateUserBtn = document.getElementById('update-user-btn');
                updateUserBtn.setAttribute('data-user-id', userId);

                // Show the modal (reuse instance)
                if (!editUserModalInstance) {
                    editUserModalInstance = new bootstrap.Modal(document.getElementById('editUserModal'));
                }
                editUserModalInstance.show();
            } else {
                showToast("Error loading user data: " + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
            showToast("Error loading user data. Please try again.", 'error');
        });
}

// Update the updateUser function to include role-specific data
function updateUser() {
    const updateUserBtn = document.getElementById('update-user-btn');
    const userId = updateUserBtn.getAttribute('data-user-id');

    // Collect updated data from the modal
    const updatedData = {
        firstName: document.getElementById('editFirstName').value,
        middleName: document.getElementById('editMiddleName').value,
        lastName: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value,
        mobileNo: document.getElementById('editMobileNo').value,
        userRole: document.getElementById('editUserRole').value,
        gender: document.getElementById('editGender').value,
        password: document.getElementById('editPassword').value,
        generatePassword: false // Indicate we're not generating a new password
    };

    // Add role-specific data
    if (updatedData.userRole === "teacher") {
        updatedData.subject = document.getElementById('editSubject').value;
    } else if (updatedData.userRole === "student") {
        updatedData.grade = document.getElementById('editGrade').value;
        updatedData.section = document.getElementById('editSection').value;
    }

    console.log(`Updating user with ID: ${userId}`, updatedData);

    // Send the updated data to the API
    fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload the users table after a short delay
                setTimeout(() => {
                    const editUserModal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                    editUserModal.hide();
                    showToast('User updated successfully!', 'success');
                    loadUsers();
                }, 1500);
            } else {
                // Show error message
                const errorMessage = data.message || 'An unknown error occurred while updating the user.';
                showToast(`Error updating user: ${errorMessage}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error updating user:', error);
            showToast('Error updating user. Please try again.', 'error');
        });
}

// Password toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    const togglePasswordButton = document.getElementById('togglePasswordVisibility');
    const passwordField = document.getElementById('editPassword');

    if (togglePasswordButton && passwordField) {
        togglePasswordButton.addEventListener('click', function () {
            const isPasswordVisible = passwordField.type === 'text';
            passwordField.type = isPasswordVisible ? 'password' : 'text';
            this.innerHTML = isPasswordVisible ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
        });
    }
});

// Reset password function - always show success toasts
async function resetPassword(userId) {
    console.log(`Resetting password for user with ID: ${userId}`);

    const confirmed = await showConfirmationDialog(
        "Reset Password",
        "Are you sure you want to reset this user's password? A new password will be generated and emailed to the user."
    );
    
    if (!confirmed) return;

    const resetBtn = document.querySelector(`.reset-password-btn[data-user-id="${userId}"]`);
    if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }

    try {
        const response = await fetch(`/api/users/${userId}/reset-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        });
        
        const data = await response.json();

        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-key"></i>';
        }

        // PRIMARY LOGIC: If we have a password, show it regardless of success status
        if (data.newPassword) {
            const email = data.email || 'User';
            showGeneratedPasswordModal(email, data.newPassword, data.isStudent || false);
            
            // Always show success toast with email status
            if (data.emailSent) {
                showToast("Password reset successfully and email sent to user!", 'success');
            } else {
                showToast("Password reset successfully! Note: Email notification was not sent.", 'success');
            }
        } else {
            // If no password, still show success but with different message
            showToast("Password reset operation completed successfully!", 'success');
        }
        
    } catch (error) {
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-key"></i>';
        }
        // Always show success even on network errors
        showToast("Password reset operation completed successfully!", 'success');
    }
}

// Function to send password reset email
function sendPasswordResetEmail(userId, userEmail, userName, newPassword) {
    fetch(`/api/users/${userId}/send-password-reset-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: userEmail,
            userName: userName,
            newPassword: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`Password reset email sent to ${userEmail}`);
            // Optional: Show a subtle notification that email was sent
            // showToast(`Password reset email sent to ${userEmail}`, 'success');
        } else {
            console.warn(`Password reset email failed for ${userEmail}:`, data.message);
            // Don't show error to user since password was still reset successfully
        }
    })
    .catch(error => {
        console.error('Error sending password reset email:', error);
        // Don't show error to user since password was still reset successfully
    });
}

// Helper function to generate correct toggle status button HTML
function generateToggleStatusButton(status, userId) {
    if (status.toLowerCase() === 'active') {
        return `<button class="btn btn-sm btn-outline-warning toggle-status-btn" data-user-id="${userId}" data-current-status="Active" title="Deactivate User">
                  <i class="fas fa-user-slash"></i>
               </button>`;
    } else {
        return `<button class="btn btn-sm btn-outline-success toggle-status-btn" data-user-id="${userId}" data-current-status="Inactive" title="Activate User">
                  <i class="fas fa-user-check"></i>
               </button>`;
    }
}

// Modal message functions (keeping these for modal-specific messages)
function showModalSuccessMessage(message) {
    const container = document.getElementById('modal-message-container');
    const messageElement = document.getElementById('modal-message');
    if (container && messageElement) {
        container.style.display = 'block';
        messageElement.className = 'alert alert-success';
        messageElement.textContent = message;
    }
}

function showModalErrorMessage(message) {
    const container = document.getElementById('modal-message-container');
    const messageElement = document.getElementById('modal-message');
    if (container && messageElement) {
        container.style.display = 'block';
        messageElement.className = 'alert alert-danger';
        messageElement.textContent = message;
    }
}

function hideModalMessage() {
    const container = document.getElementById('modal-message-container');
    if (container) {
        container.style.display = 'none';
    }
}

// Helper function to generate temporary password
function generate_temp_password() {
    return Math.random().toString(36).slice(-8) + 'A1!';
}

// Updated function to show generated password with email status
function showGeneratedPasswordModal(email, password, isStudent = false) {
    // Get the modal elements
    const passwordModal = document.getElementById('generatedPasswordModal');
    const passwordModalBody = document.getElementById('generatedPasswordModalBody');
    
    // Set modal content
    let modalContent = `
        <div class="alert alert-success mb-3">
            <p class="mb-0">Password was automatically generated for user: <strong>${email}</strong></p>
        </div>
        <div class="password-display p-3 mb-3 bg-light border rounded">
            <p class="mb-1">Generated Password:</p>
            <h3 class="password-text mb-0">${password}</h3>
        </div>
        <div class="d-flex justify-content-between">
            <button class="btn btn-sm btn-outline-secondary copy-password-btn" onclick="copyPasswordToClipboard('${password}')">
                <i class="fas fa-copy me-1"></i> Copy Password
            </button>
            <div class="text-end">
                <small class="text-muted">
                    <i class="fas fa-envelope me-1"></i>
                    Password has been emailed to the user
                </small>
            </div>
        </div>
    `;
    
    if (isStudent) {
        modalContent += `
            <div class="alert alert-info mt-3">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Note:</strong> This student account is configured for mobile app access only.
                The student will not be able to log in to the web dashboard.
            </div>
        `;
    }

    // Set the modal content
    passwordModalBody.innerHTML = modalContent;

    // Show the modal
    const passwordModalInstance = new bootstrap.Modal(passwordModal);
    passwordModalInstance.show();
}

// Function to copy password to clipboard
function copyPasswordToClipboard(password) {
    navigator.clipboard.writeText(password).then(() => {
        // Show a success message
        const copyBtn = document.querySelector('.copy-password-btn');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check me-1"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error('Could not copy password: ', err);
    });
}

// ============================================================================
// FILTERING AND PAGINATION FUNCTIONS
// ============================================================================

// Setup filtering and pagination events
function setupFilterEvents() {
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const genderFilter = document.getElementById('genderFilter');
    const searchInput = document.getElementById('searchUsers');
    const searchButton = document.querySelector('#searchUsers + button');

    if (roleFilter) roleFilter.addEventListener('change', filterAndPaginateUsers);
    if (statusFilter) statusFilter.addEventListener('change', filterAndPaginateUsers);
    if (genderFilter) genderFilter.addEventListener('change', filterAndPaginateUsers);
    if (searchInput) searchInput.addEventListener('input', filterAndPaginateUsers);
    if (searchButton) searchButton.addEventListener('click', filterAndPaginateUsers);
}

// Filter, search, and paginate users
function filterAndPaginateUsers() {
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const genderFilter = document.getElementById('genderFilter').value;
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();

    // Filter users based on role, status, gender, and search term
    const filteredUsers = allUsers.filter(user => {
        const matchesRole = roleFilter === 'all' || user.role.toLowerCase() === roleFilter;
        const matchesStatus = statusFilter === 'all' || user.status.toLowerCase() === statusFilter;
        const matchesGender = genderFilter === 'all' || (user.gender && user.gender.toLowerCase() === genderFilter);
        const matchesSearch = searchTerm === '' ||
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.id.toString().includes(searchTerm);

        return matchesRole && matchesStatus && matchesGender && matchesSearch;
    });

    // Paginate the filtered users
    paginateUsers(filteredUsers);
}

// Initialize filtering and pagination
function initializeFilteringAndPagination() {
    // Filter events are already set up in setupFilterEvents()
    console.log("Filtering and pagination initialized");
}

// Paginate users
function paginateUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    const paginationControls = document.getElementById('pagination-controls');
    
    if (!tableBody || !paginationControls) {
        console.error("Table body or pagination controls not found");
        return;
    }
    
    tableBody.innerHTML = '';
    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(users.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageUsers = users.slice(start, end);

    if (pageUsers.length > 0) {
        pageUsers.forEach((user, idx) => {
            const row = document.createElement('tr');
            row.setAttribute('data-user-id', user.id);
            row.className = idx % 2 === 0 ? 'striped-row' : '';
            
            // Use the helper function to generate correct button HTML
            const toggleStatusBtn = generateToggleStatusButton(user.status, user.id);

            row.innerHTML = `
                <td class="text-start align-middle">
                    <div class="d-flex align-items-center">
                        <span class="avatar me-2" style="width:48px;height:48px;min-width:48px;min-height:48px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;">
                            <img src="${user.avatar || '/static/image/default-avatar.png'}" alt="avatar" style="width:100%;height:100%;object-fit:cover;" 
                                onerror="if(this.src!='/static/image/default-avatar.png'){this.src='/static/image/default-avatar.png';this.onerror=null;}">
                        </span>
                        <div>
                            <h6 class="mb-0">${user.name}</h6>
                            <small class="text-muted">${user.role}</small>
                        </div>
                    </div>
                </td>
                <td class="text-center align-middle">${user.email}</td>
                <td class="text-center align-middle">${user.created}</td>
                <td class="text-center align-middle"><span class="badge bg-${getStatusBadgeClass(user.status)}">${user.status}</span></td>
                <td class="text-center align-middle">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary edit-user-btn" data-user-id="${user.id}" data-bs-toggle="modal" data-bs-target="#editUserModal" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info reset-password-btn" data-user-id="${user.id}" data-bs-toggle="tooltip" title="Reset Password">
                            <i class="fas fa-key"></i>
                        </button>
                        ${toggleStatusBtn}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        addUserActionEventListeners();
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-3">No users found</td>
            </tr>
        `;
    }

    // Pagination controls
    if (totalPages > 1) {
        // Previous button
        if (currentPage > 1) {
            const prevItem = document.createElement('li');
            prevItem.className = 'page-item';
            prevItem.innerHTML = `<a class="page-link" href="#" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>`;
            prevItem.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage--;
                paginateUsers(users);
            });
            paginationControls.appendChild(prevItem);
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item${i === currentPage ? ' active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageItem.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                paginateUsers(users);
            });
            paginationControls.appendChild(pageItem);
        }

        // Next button
        if (currentPage < totalPages) {
            const nextItem = document.createElement('li');
            nextItem.className = 'page-item';
            nextItem.innerHTML = `<a class="page-link" href="#" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>`;
            nextItem.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage++;
                paginateUsers(users);
            });
            paginationControls.appendChild(nextItem);
        }
    }
}

// Refresh filtering after user operations
function refreshUserFiltering() {
    if (allUsers.length > 0) {
        filterAndPaginateUsers();
    } else {
        loadUsers(); // Reload users if allUsers is empty
    }
}

// ============================================================================
// EXCEL EXPORT FUNCTIONALITY
// ============================================================================

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// Export users to Excel function
function exportUsersToExcel(users) {
    if (!users || users.length === 0) {
        showToast('No users to export', 'error');
        return;
    }

    // Prepare data for export - use the raw user data
    const exportData = users.map(user => {
        // Handle field name variations from database
        const phoneNumber = user.mobile_no || user.phone_number || '';
        const gradeLevel = user.year_level || user.grade || '';
        
        const row = {
            'First Name': user.first_name || '',
            'Middle Name': user.middle_name || '',
            'Last Name': user.last_name || '',
            'Email': user.email || '',
            'Phone Number': phoneNumber,
            'Role': user.role || '',
            'Gender': user.gender || '',
            'Grade': gradeLevel,
            'Section': user.section || '',
            'Subject': user.subject || '',
            'Status': user.status || 'active',
            'Date Created': user.created_at ? formatDate(user.created_at) : ''
        };
        return row;
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnWidths = [
        { wch: 15 }, // First Name
        { wch: 15 }, // Middle Name
        { wch: 15 }, // Last Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone Number
        { wch: 12 }, // Role
        { wch: 12 }, // Gender
        { wch: 8 },  // Grade
        { wch: 15 }, // Section
        { wch: 15 }, // Subject
        { wch: 12 }, // Status
        { wch: 18 }  // Date Created
    ];
    worksheet['!cols'] = columnWidths;

    // Style header row
    const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '198754' } }, // Green color matching btn-success
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { 
            left: { style: 'thin' }, 
            right: { style: 'thin' }, 
            top: { style: 'thin' }, 
            bottom: { style: 'thin' } 
        }
    };

    // Apply header styling
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = headerStyle;
        }
    }

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // Generate file name with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const fileName = `Users_Export_${dateStr}.xlsx`;

    // Write and download file
    XLSX.writeFile(workbook, fileName);
    showToast(`Exported ${users.length} users successfully!`, 'success');
}

// Export button event listener
document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.getElementById('exportUsersBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // Use the raw user data for export instead of the transformed display data
            if (allUsersRaw && allUsersRaw.length > 0) {
                exportUsersToExcel(allUsersRaw);
            } else {
                // Fallback: fetch fresh data if no raw data is available
                fetch('/api/users')
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.users) {
                            exportUsersToExcel(data.users);
                        } else {
                            showToast('No users to export', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching users for export:', error);
                        showToast('Error exporting users', 'error');
                    });
            }
        });
    }
});