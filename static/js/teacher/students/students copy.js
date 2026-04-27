// Toast Notification Function - GLOBAL SCOPE (accessible everywhere)
function showToast(message, isError = false) {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'error' : ''}`;
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} me-2"></i>
            <span>${message}</span>
        </div>
    `;

    // Add to page
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// Loading state management for Students page
window.studentsLoadingState = {
    students: false,
    classrooms: false,
    hasError: false,
    allLoaded: false
};

// Function to check if all students data has loaded
function checkStudentsDataLoaded() {
    const state = window.studentsLoadingState;
    console.log('Students loading state:', state);
    
    // If any data type has an error, show error state immediately
    if (state.hasError) {
        console.log('Error detected, showing error state');
        showStudentsError();
        return;
    }
    
    // Only show content if all data loaded successfully
    if (!state.allLoaded && state.students && state.classrooms) {
        state.allLoaded = true;
        // Small delay to ensure DOM is updated
        setTimeout(() => {
            showStudentsContent();
            showToast('Students loaded successfully!');
        }, 100);
    }
}

// Function to handle students loading errors
function handleStudentsDataLoadError(dataType, error) {
    console.error(`Students ${dataType} load error:`, error);
    window.studentsLoadingState[dataType] = true; // Mark as loaded (but failed)
    window.studentsLoadingState.hasError = true; // Set error flag
    checkStudentsDataLoaded();
}

// Show/hide loading and content states for students
function showStudentsLoading() {
    const loadingMessage = document.getElementById('studentsLoadingMessage');
    const errorMessage = document.getElementById('studentsErrorMessage');
    const content = document.getElementById('studentsContent');
    const pagination = document.getElementById('studentsPaginationContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';
    if (content) content.style.display = 'none';
    if (pagination) pagination.style.display = 'none';
}

function showStudentsError() {
    const loadingMessage = document.getElementById('studentsLoadingMessage');
    const errorMessage = document.getElementById('studentsErrorMessage');
    const content = document.getElementById('studentsContent');
    const pagination = document.getElementById('studentsPaginationContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (content) content.style.display = 'none';
    if (pagination) pagination.style.display = 'none';
    
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
                        <p>Unable to load student data. Please check your connection.</p>
                        <button onclick="location.reload()" style="padding: 10px 20px; background: #5e72e4; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            });
    }
}

function showStudentsContent() {
    const loadingMessage = document.getElementById('studentsLoadingMessage');
    const errorMessage = document.getElementById('studentsErrorMessage');
    const content = document.getElementById('studentsContent');
    const pagination = document.getElementById('studentsPaginationContainer');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (content) content.style.display = 'block';
    if (pagination) pagination.style.display = 'block';
    console.log('Students content shown');
}

// Streak utility functions - GLOBAL SCOPE
function getStreakClass(streak) {
    if (streak < 7) return '';
    if (streak < 15) return 'streak-yellow';
    if (streak < 22) return 'streak-orange';
    if (streak < 29) return 'streak-red';
    if (streak < 36) return 'streak-green';
    if (streak < 50) return 'streak-blue';
    return 'streak-purple';
}

function getStreakBgColor(streak) {
    if (streak < 7) return '#9E9E9E';        // Grey (Beginner)
    if (streak < 15) return '#FFD600';       // Yellow (Early Streak)
    if (streak < 22) return '#FF9800';       // Orange (Consistent)
    if (streak < 29) return '#FF1744';       // Bright Red (Strong)
    if (streak < 36) return '#00FF40';       // Green (Elite)
    if (streak < 50) return '#5E72E4';       // Blue (Veteran)
    return '#8E24AA';                        // Purple (Legendary)
}

function getStreakAnimationPath(streak) {
    if (streak < 15) return '/static/image/streak-animation/yellow_fire.json';
    else if (streak < 22) return '/static/image/streak-animation/orange.json';
    else if (streak < 29) return '/static/image/streak-animation/brightred_fire.json';
    else if (streak < 36) return '/static/image/streak-animation/green_fire.json';
    else if (streak < 50) return '/static/image/streak-animation/blue_fire.json';
    else return '/static/image/streak-animation/purple_fire.json';
}

// Function to populate classroom dropdown with teacher's assigned classrooms
function populateTeacherClassroomDropdown() {
    const classroomSelect = document.getElementById('dismissalClassroom');
    if (!classroomSelect) return;
    
    // Get teacher's assigned classrooms from the backend
    fetch('/api/teacher-classrooms')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.classrooms) {
                const classrooms = data.classrooms;
                
                classroomSelect.innerHTML = '<option value="">All Classes</option>';
                
                classrooms.forEach(classroom => {
                    const displayText = `Grade ${classroom.grade_level} - ${classroom.section}`;
                    const value = `${classroom.grade_level}|${classroom.section}`;
                    classroomSelect.innerHTML += `<option value="${value}">${displayText}</option>`;
                });
                
                // Update student dropdown when classroom changes
                classroomSelect.addEventListener('change', populateStudentDropdown);
                
            } else {
                // Fallback if no classrooms found
                classroomSelect.innerHTML = '<option value="">No classrooms assigned</option>';
            }
        })
        .catch(error => {
            console.error('Failed to fetch teacher classrooms:', error);
            classroomSelect.innerHTML = '<option value="">Error loading classrooms</option>';
        });
}

// Updated function to populate student dropdown based on selected classroom
function populateStudentDropdown() {
    const classroom = document.getElementById('dismissalClassroom').value;
    const studentSelect = document.getElementById('dismissalStudent');
    if (!studentSelect) return;
    
    let filtered = window.allStudents || [];
    
    // Apply classroom filter if selected
    if (classroom) {
        const [grade, section] = classroom.split('|');
        filtered = filtered.filter(s => s.grade === grade && s.section === section);
    }
    
    studentSelect.innerHTML = '<option value="">All Students</option>';
    filtered.forEach(s => {
        studentSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Make allStudents available globally
    window.allStudents = [];
    let currentPage = 1;
    const studentsPerPage = 5;
    let lastFilteredStudents = [];
    const tableBody = document.getElementById('studentsTableBody');

    // Show loading state initially
    showStudentsLoading();
    console.log('Students loading started...');

    // Initialize everything
    function initializePage() {
        // Fetch students data - SINGLE API CALL to avoid duplicates
        fetch('/api/my-students')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('Students data received:', data);
                if (data.success) {
                    window.allStudents = data.students;
                    lastFilteredStudents = [...window.allStudents];
                    
                    // Populate teacher classrooms for dismissal modal
                    populateTeacherClassroomDropdown();
                    
                    // Initialize classroom filter for main table
                    populateClassroomFilter(data.classrooms || []);
                    
                    // Populate student dropdown for dismissal modal
                    const classroomSelect = document.getElementById('dismissalClassroom');
                    if (classroomSelect) {
                        classroomSelect.addEventListener('change', populateStudentDropdown);
                        // Initial population
                        populateStudentDropdown();
                    }
                    
                    // Load initial students table
                    filterAndPaginateStudents();
                    
                    window.studentsLoadingState.students = true;
                    window.studentsLoadingState.classrooms = true;
                    console.log('Students data loaded and rendered');
                    checkStudentsDataLoaded();
                } else {
                    throw new Error(data.message || 'Failed to load students data');
                }
            })
            .catch(error => {
                console.error('Error fetching students:', error);
                handleStudentsDataLoadError('students', error);
            });
    }

    // Filtering and pagination
    function filterAndPaginateStudents() {
        lastFilteredStudents = [...window.allStudents];
        paginateStudents(window.allStudents);
    }

    function paginateStudents(students) {
        if (!tableBody) return;

        const paginationControls = document.getElementById('studentsPagination');
        if (!paginationControls) return;

        // Clear the table and pagination controls
        tableBody.innerHTML = '';
        paginationControls.innerHTML = '';

        // Calculate total pages
        const totalPages = Math.ceil(students.length / studentsPerPage);

        // Get the students for the current page
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = startIndex + studentsPerPage;
        const studentsToDisplay = students.slice(startIndex, endIndex);

        // Render the students in the table
        if (studentsToDisplay.length > 0) {
            studentsToDisplay.forEach(student => {
                const streak = student.streak || 0;
                const streakClass = getStreakClass(streak);
                const mainColor = getStreakBgColor(streak);
                
                const pointsIconHtml = `<span class="points-icon-gradient" style="margin-right:4px;font-size:0.95em;">
                    <i class="fa-solid fa-star"></i>
                </span>`;

                const row = document.createElement('tr');
                row.setAttribute('data-grade', student.grade);
                row.setAttribute('data-section', student.section);
                row.innerHTML = `
<td class="align-middle">
    <div class="d-flex align-items-center">
        <div style="position:relative;width:54px;height:54px;margin-right:12px;">
            <span class="avatar streak-border ${streakClass}" style="width:48px;height:48px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                <img src="${student.pic || '/static/image/default-avatar.png'}" alt="avatar" style="width:100%;height:100%;object-fit:cover;">
            </span>
            <span style="
                position:absolute;
                bottom:-8px;
                left:50%;
                transform:translateX(-50%);
                background:#ffffff;
                color:${mainColor};
                font-weight:700;
                font-size:0.75rem;
                padding:2px 7px 2px 5px;
                border-radius:12px;
                box-shadow:0 2px 8px rgba(0,0,0,0.08);
                border:2px solid ${mainColor};
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
        <div>
            <h6 class="mb-0 text-primary">${student.name}</h6>
            <small class="text-muted">Grade ${student.grade} – Section ${student.section}</small>
        </div>
    </div>
</td>
<td class="text-center align-middle">
    <div class="points-badge">
        ${pointsIconHtml}
        <span class="student-points">${student.points}</span>
    </div>
</td>
<td class="text-center align-middle">
    <span class="badge rewards-badge">
        <i class="fas fa-gift me-1"></i>${student.total_rewards_redeemed || 0}
    </span>
</td>
<td class="text-center align-middle" style="white-space: pre-line;">${student.last_activity}</td>
<td class="text-center align-middle">
    <span class="badge participation-badge">
        ${typeof student.participation_percent === "number"
            ? student.participation_percent + "%"
            : (student.participation_friendly || "No data")}
    </span>
</td>
<td class="text-center align-middle">
    <button class="btn btn-sm btn-outline-secondary open-notes-btn"
        data-student-id="${student.id}"
        data-student-name="${student.name}"
        ${student.note_given_this_week ? 'disabled title="Note already given this week"' : ''}
    >
        <i class="fas fa-sticky-note"></i>
        ${student.note_given_this_week ? 'Note Sent' : 'Notes'}
    </button>
</td>
                `;
                tableBody.appendChild(row);
            });

            // Animate streaks in students table
            setTimeout(() => {
                document.querySelectorAll('.streak-lottie-table').forEach(el => {
                    const streak = parseInt(el.getAttribute('data-streak'), 10) || 0;
                    let jsonPath = getStreakAnimationPath(streak);

                    if (streak >= 7) {
                        lottie.loadAnimation({
                            container: el,
                            renderer: 'svg',
                            loop: true,
                            autoplay: true,
                            path: jsonPath
                        });
                    }
                });
            }, 300);

        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-3">No students found</td>
                </tr>
            `;
        }

        // Render pagination controls (Bootstrap style)
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item${i === currentPage ? ' active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageItem.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                paginateStudents(students);
            });
            paginationControls.appendChild(pageItem);
        }

        // Add Previous and Next buttons
        if (currentPage > 1) {
            const prevItem = document.createElement('li');
            prevItem.className = 'page-item';
            prevItem.innerHTML = `<a class="page-link" href="#">Previous</a>`;
            prevItem.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage--;
                paginateStudents(students);
            });
            paginationControls.insertBefore(prevItem, paginationControls.firstChild);
        }

        if (currentPage < totalPages) {
            const nextItem = document.createElement('li');
            nextItem.className = 'page-item';
            nextItem.innerHTML = `<a class="page-link" href="#">Next</a>`;
            nextItem.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage++;
                paginateStudents(students);
            });
            paginationControls.appendChild(nextItem);
        }
    }

    // Classroom filter for main table
    function populateClassroomFilter(classrooms) {
        const select = document.querySelector('.form-select.w-auto');
        if (!select) return;
        
        select.innerHTML = `<option selected value="">Filter by Classes</option>`;
        classrooms.forEach(c => {
            select.innerHTML += `<option value="${c.grade}|${c.section}">${c.label}</option>`;
        });
        select.disabled = classrooms.length === 0;
        
        select.onchange = function() {
            const val = this.value;
            const labelSpan = document.getElementById('classroomLabel');
            if (!val) {
                if (labelSpan) labelSpan.textContent = 'All Classes';
                // Reset filter - use the original allStudents
                currentPage = 1;
                lastFilteredStudents = [...window.allStudents];
                filterAndPaginateStudents();
            } else {
                if (labelSpan) labelSpan.textContent = this.options[this.selectedIndex].text;
                const [grade, section] = val.split('|');
                const filtered = window.allStudents.filter(row =>
                    row.grade == grade && row.section == section
                );
                currentPage = 1;
                lastFilteredStudents = [...filtered];
                paginateStudents(filtered);
            }
        };
    }

    // Excel export logic
    document.getElementById('downloadExcelBtn')?.addEventListener('click', async function() {
        if (!lastFilteredStudents.length) {
            showToast('No students to export.', true);
            return;
        }
        
        try {
            // Show loading toast
            showToast('Exporting Excel file...');
            
            // Sort alphabetically by name
            const sorted = [...lastFilteredStudents].sort((a, b) => a.name.localeCompare(b.name));
            // Get current date and time
            const now = new Date();
            const currentDate = now.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const currentTime = now.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });

            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Students');

            // Add header rows
            worksheet.addRow(['Learn2Earn']);
            worksheet.addRow(['Masico National High School']);
            worksheet.addRow([`Student Report - ${currentDate} at ${currentTime}`]);
            worksheet.addRow([]);
            worksheet.addRow(['Name', 'Grade', 'Section', 'Points', 'Rewards Redeemed', 'Last Activity', 'Participation (%)']);

            // Add student data
            sorted.forEach(s => {
                worksheet.addRow([
                    s.name,
                    s.grade,
                    s.section,
                    s.points,
                    s.total_rewards_redeemed || 0,  // Use total count
                    s.last_activity || '',
                    typeof s.participation_percent === "number"
                        ? s.participation_percent + "%"
                        : (s.participation_friendly || "No data")
                ]);
            });

            // Style: merge title rows
            worksheet.mergeCells('A1:G1');
            worksheet.mergeCells('A2:G2');
            worksheet.mergeCells('A3:G3');

            // Style: bold headers and add background color
            worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(5).alignment = { horizontal: 'center', vertical: 'middle' };
            worksheet.getRow(5).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' } // Blue header background
            };

            // Set column widths
            worksheet.columns = [
                { width: 25 }, // Name
                { width: 8 },  // Grade
                { width: 12 }, // Section
                { width: 10 }, // Points
                { width: 18 }, // Rewards Redeemed
                { width: 20 }, // Last Activity
                { width: 18 }  // Participation
            ];

            // Download the file
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Learn2Earn_Student_Report_${now.toISOString().split('T')[0]}.xlsx`);
            
            // Show success toast
            showToast('Excel file exported successfully!');
        } catch (error) {
            console.error('Excel export error:', error);
            showToast('Failed to export Excel file.', true);
        }
    });

    // Scroll to top when modals are shown
    const classSummaryModal = document.getElementById('classSummaryModal');
    if (classSummaryModal) {
        classSummaryModal.addEventListener('shown.bs.modal', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        });
    }
    const dismissClassModal = document.getElementById('dismissClassModal');
    if (dismissClassModal) {
        dismissClassModal.addEventListener('shown.bs.modal', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        });
    }

    // Export Student Excel Button
    document.getElementById('exportStudentExcelBtn')?.addEventListener('click', function() {
        // Always use lastFilteredStudents if available, otherwise allStudents
        let students = (Array.isArray(lastFilteredStudents) && lastFilteredStudents.length)
            ? lastFilteredStudents
            : (Array.isArray(window.allStudents) ? window.allStudents : []);
        // If still empty, try to use allStudents
        if (!students.length && Array.isArray(window.allStudents) && window.allStudents.length) {
            students = window.allStudents;
        }
        if (!students.length) {
            showToast('No students to export.', true);
            return;
        }

        // Show loading toast
        showToast('Exporting Excel file...');

        // Sort by section, then by name
        students = [...students].sort((a, b) => {
            if (a.section === b.section) {
                return a.name.localeCompare(b.name);
            }
            return a.section.localeCompare(b.section);
        });

        // Get current date and time
        const now = new Date();
        const currentDate = now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const currentTime = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });

        // Prepare worksheet data with headers
        const wsData = [
            ["Learn2Earn"], // Title row
            ["Masico National High School"], // School name
            ["Student Report - " + currentDate + " at " + currentTime], // Date and time row
            [], // Empty row for spacing
            ["Name", "Grade", "Section", "Points", "Rewards Redeemed", "Last Activity", "Participation (%)"] // Headers
        ];
        
        students.forEach(s => {
            wsData.push([
                s.name,
                s.grade,
                s.section,
                s.points,
                s.total_rewards_redeemed || 0,  // Use total count
                s.last_activity || '',
                typeof s.participation_percent === "number"
                    ? s.participation_percent + "%"
                    : (s.participation_friendly || "No data")
            ]);
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Define column widths
        ws['!cols'] = [
            { wch: 25 }, // Name
            { wch: 8 },  // Grade
            { wch: 12 }, // Section
            { wch: 10 }, // Points
            { wch: 18 }, // Rewards Redeemed
            { wch: 20 }, // Last Activity
            { wch: 18 }  // Participation
        ];

        // Color scheme
        const colors = {
            primary: "2E5090",    // Dark blue
            secondary: "4472C4",  // Medium blue
            accent: "5B9BD5",     // Light blue
            success: "70AD47",    // Green
            warning: "FFC000",    // Amber
            lightGray: "F2F2F2",  // Light gray for alternating rows
            white: "FFFFFF",      // White
            headerText: "FFFFFF", // White text for headers
            darkText: "1F1F1F",   // Dark text for data
            lightText: "666666"   // Gray text for secondary info
        };

        // Style the title row (row 1)
        if (ws['A1']) {
            ws['A1'].s = {
                font: { bold: true, sz: 18, color: { rgb: colors.primary } },
                fill: { fgColor: { rgb: "E6F0FF" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "medium", color: { rgb: colors.primary } },
                    bottom: { style: "medium", color: { rgb: colors.primary } },
                    left: { style: "medium", color: { rgb: colors.primary } },
                    right: { style: "medium", color: { rgb: colors.primary } }
                }
            };
        }

        // Style the school name row (row 2)
        if (ws['A2']) {
            ws['A2'].s = {
                font: { bold: true, sz: 14, color: { rgb: colors.primary } },
                fill: { fgColor: { rgb: "F0F7FF" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    left: { style: "medium", color: { rgb: colors.primary } },
                    right: { style: "medium", color: { rgb: colors.primary } }
                }
            };
        }

        // Style the date row (row 3)
        if (ws['A3']) {
            ws['A3'].s = {
                font: { sz: 11, italic: true, color: { rgb: colors.lightText } },
                fill: { fgColor: { rgb: "F0F7FF" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    bottom: { style: "medium", color: { rgb: colors.primary } },
                    left: { style: "medium", color: { rgb: colors.primary } },
                    right: { style: "medium", color: { rgb: colors.primary } }
                }
            };
        }

        // Merge cells for title, school name, and date
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // School name
            { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }  // Date
        ];

        // Style header row (row 5)
        const headerCells = ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5'];
        headerCells.forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    font: { 
                        bold: true, 
                        color: { rgb: colors.headerText }, 
                        sz: 12 
                    },
                    fill: { 
                        fgColor: { rgb: colors.secondary },
                        patternType: "solid"
                    },
                    alignment: { 
                        horizontal: "center", 
                        vertical: "center" 
                    },
                    border: {
                        top: { style: "medium", color: { rgb: colors.primary } },
                        bottom: { style: "medium", color: { rgb: colors.primary } },
                        left: { style: "thin", color: { rgb: colors.white } },
                        right: { style: "thin", color: { rgb: colors.white } }
                    }
                };
            }
        });

        // Style data rows with alternating colors and enhanced design
        for (let i = 6; i <= wsData.length; i++) {
            const isEvenRow = (i - 6) % 2 === 0;
            const bgColor = isEvenRow ? colors.lightGray : colors.white;
            
            ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
                const cellRef = col + i;
                if (ws[cellRef]) {
                    // Special formatting for points column
                    const pointsStyle = col === 'D' ? {
                        font: { bold: true, color: { rgb: colors.primary } }
                    } : {};
                    
                    // Special formatting for participation column
                    const participationStyle = col === 'G' ? {
                        font: { bold: true }
                    } : {};
                    
                    ws[cellRef].s = {
                        font: { 
                            color: { rgb: colors.darkText },
                            ...pointsStyle,
                            ...participationStyle
                        },
                        fill: { 
                            fgColor: { rgb: bgColor },
                            patternType: "solid"
                        },
                        alignment: { 
                            horizontal: col === 'A' ? "left" : "center", 
                            vertical: "center" 
                        },
                        border: {
                            top: { style: "thin", color: { rgb: "E0E0E0" } },
                            bottom: { style: "thin", color: { rgb: "E0E0E0" } },
                            left: { style: "thin", color: { rgb: "E0E0E0" } },
                            right: { style: "thin", color: { rgb: "E0E0E0" } }
                        }
                    };
                }
            });
        }

        // Add conditional formatting for participation percentages
        for (let i = 6; i <= wsData.length; i++) {
            const participationCell = 'G' + i;
            if (ws[participationCell] && ws[participationCell].v) {
                const participationValue = ws[participationCell].v;
                if (typeof participationValue === 'string' && participationValue.includes('%')) {
                    const percent = parseInt(participationValue);
                    if (percent >= 80) {
                        // High participation - green
                        ws[participationCell].s.fill = { fgColor: { rgb: "E2F0D9" } };
                        ws[participationCell].s.font.color = { rgb: "375F23" };
                    } else if (percent >= 60) {
                        // Medium participation - yellow
                        ws[participationCell].s.fill = { fgColor: { rgb: "FFF2CC" } };
                        ws[participationCell].s.font.color = { rgb: "7F6000" };
                    } else if (percent > 0) {
                        // Low participation - light red
                        ws[participationCell].s.fill = { fgColor: { rgb: "FCE4D6" } };
                        ws[participationCell].s.font.color = { rgb: "943634" };
                    }
                }
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, "Students");
        XLSX.writeFile(wb, "Learn2Earn_Student_Report_" + new Date().toISOString().split('T')[0] + ".xlsx");
        
        // Show success toast
        showToast('Excel file exported successfully!');
    });

    // Search functionality - ADD THIS SECTION
    const studentSearchInput = document.getElementById('studentSearchInput');
    const studentSearchBtn = document.getElementById('studentSearchBtn');

    if (studentSearchInput && studentSearchBtn) {
        // Search on button click
        studentSearchBtn.addEventListener('click', performSearch);
        
        // Search on Enter key press
        studentSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // Real-time search as user types
        studentSearchInput.addEventListener('input', function() {
            if (this.value.trim() === '') {
                // If search is cleared, show all filtered students
                currentPage = 1;
                paginateStudents(lastFilteredStudents);
            }
        });
    }

    function performSearch() {
        const searchTerm = studentSearchInput.value.trim().toLowerCase();
        
        if (!searchTerm) {
            // If search is empty, show all filtered students
            currentPage = 1;
            paginateStudents(lastFilteredStudents);
            showToast('Showing all students');
            return;
        }
        
        // Filter the current filtered students by search term
        const searchResults = lastFilteredStudents.filter(student => {
            const name = student.name.toLowerCase();
            const grade = student.grade.toString();
            const section = student.section.toLowerCase();
            
            return name.includes(searchTerm) || 
                   grade.includes(searchTerm) || 
                   section.includes(searchTerm);
        });
        
        if (searchResults.length === 0) {
            showToast(`No students found matching "${searchTerm}"`, true);
            currentPage = 1;
            paginateStudents([]);
        } else {
            currentPage = 1;
            paginateStudents(searchResults);
            showToast(`Found ${searchResults.length} student(s) matching "${searchTerm}"`);
        }
    }

    // UPDATED DISMISSAL NOTIFICATION FUNCTION WITH SINGLE CLASSROOM DROPDOWN
    document.getElementById('sendDismissalBtn')?.addEventListener('click', function() {
        const dismissalTime = document.getElementById('dismissalTime').value;
        const message = document.getElementById('dismissalMessage').value;
        const notifySMS = document.getElementById('notifySMS') ? document.getElementById('notifySMS').checked : false;
        const notifyEmail = document.getElementById('notifyEmail').checked;
        const classroom = document.getElementById('dismissalClassroom').value;
        const student_id = document.getElementById('dismissalStudent').value;

        // Parse grade and section from classroom value
        let grade = '';
        let section = '';
        if (classroom) {
            [grade, section] = classroom.split('|');
        }

        // Validate that at least one notification method is selected
        if (!notifyEmail && !notifySMS) {
            showToast('Please select at least one notification method (Email or SMS).', true);
            return;
        }

        // Validate dismissal time
        if (!dismissalTime) {
            showToast('Please select a dismissal time.', true);
            return;
        }

        const payload = {
            dismissal_time: dismissalTime,
            message: message,
            notify_sms: notifySMS,
            notify_email: notifyEmail,
            grade: grade,
            section: section,
            student_id: student_id
        };

        console.log('Sending dismissal payload:', payload);

        // Show loading state
        const sendBtn = document.getElementById('sendDismissalBtn');
        const originalText = sendBtn.textContent;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

        fetch('/api/send-dismissal', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log('Server response:', data);
            
            // Reset button state
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
            
            if (data.success) {
                let successMessage = `Dismissal notifications sent successfully!`;
                
                // Add detailed information if available
                if (data.email_sent_count !== undefined && data.sms_sent_count !== undefined) {
                    successMessage = `Notifications sent successfully!\n\n` +
                                   ` Emails sent: ${data.email_sent_count}\n` +
                                   ` SMS sent: ${data.sms_sent_count}`;
                    
                    if (data.students_without_contacts && data.students_without_contacts.length > 0) {
                        successMessage += `\n\n⚠️ Note: ${data.students_without_contacts.length} students have no parent contact information.`;
                    }
                }
                
                // Show success message with detailed info
                showToast(successMessage);
                
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('dismissClassModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('dismissalForm').reset();
            } else {
                showToast('❌ ' + (data.message || 'Failed to send notification.'), true);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Reset button state
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
            
            showToast('❌ An error occurred while sending the notification. Please try again.', true);
        });
    });

    // Class Summary Modal Handler - UPDATED to respect classroom filter
    document.getElementById('classSummaryModal')?.addEventListener('show.bs.modal', function () {
        const content = document.getElementById('classSummaryContent');
        content.innerHTML = '<div class="text-center text-muted">Loading summary...</div>';

        // Hide PDF button while loading
        const pdfBtn = document.getElementById('exportSummaryPdfBtn');
        if (pdfBtn) pdfBtn.style.display = 'none';

        // Get selected classroom from the main table filter
        const classroomSelect = document.querySelector('.form-select.w-auto');
        let grade = '';
        let section = '';
        let classroomLabel = 'All Classes';
        
        if (classroomSelect && classroomSelect.value) {
            [grade, section] = classroomSelect.value.split('|');
            // Get the display text for the classroom
            const selectedOption = classroomSelect.options[classroomSelect.selectedIndex];
            classroomLabel = selectedOption.text || `Grade ${grade} - Section ${section}`;
        }

        // Update modal title to show which classroom is being summarized
        const modalTitle = document.getElementById('classSummaryModalLabel');
        if (modalTitle) {
            modalTitle.textContent = `Class Summary - ${classroomLabel}`;
        }

        // Fetch summary from backend with classroom filter
        fetch(`/api/class-summary?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.summary) {
                    const s = data.summary;
                    
                    // Add classroom info to the summary
                    let html = `
                        <div class="alert alert-info mb-3 py-2">
                            <small><i class="fas fa-info-circle me-1"></i>Showing summary for: <strong>${classroomLabel}</strong></small>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <div class="stats-card card-1 text-white mb-3" style="height: 140px;">
                                    <div class="stat-label">Total Students</div>
                                    <div class="stat-value">${s.total_students}</div>
                                    <div class="icon"><i class="fas fa-users"></i></div>
                                </div>
                                <div class="stats-card card-3 text-white mb-3" style="height: 140px;">
                                    <div class="stat-label">Average Points</div>
                                    <div class="stat-value">${s.average_points}</div>
                                    <div class="icon"><i class="fas fa-star"></i></div>
                                </div>
                            </div>
                            <div class="col-md-8">
                                <div class="card shadow-sm mb-3 h-100">
                                    <div class="card-body">
                                        <h6 class="mb-3 text-primary"><i class="fas fa-trophy me-2"></i>Top 5 Students</h6>
                                        <ol class="mb-0 ps-3">
                    `;
                    
                    if (s.top_students && s.top_students.length > 0) {
                        html += s.top_students.map(stu => {
                            return `
                                <li class="mb-2 d-flex align-items-center">
                                    <span class="avatar me-2" style="width:40px;height:40px;display:inline-block;">
                                        <img src="${stu.pic || '/static/image/default-avatar.png'}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                                    </span>
                                    <span class="fw-bold">${stu.name}</span>
                                    <div class="points-badge ms-2">
                                        <span class="points-icon-gradient">
                                            <i class="fas fa-star"></i>
                                        </span>
                                        <span class="student-points">${stu.points}</span>
                                    </div>
                                    <span class="ms-2 small text-${stu.week_increase >= 0 ? 'success' : 'danger'}">
                                        (${stu.week_increase >= 0 ? '+' : ''}${stu.week_increase}% this week)
                                    </span>
                                </li>
                            `;
                        }).join('');
                    } else {
                        html += `<li class="text-muted">No student data available</li>`;
                    }
                    
                    html += `
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-12">
                                <div class="card shadow-sm">
                                    <div class="card-body">
                                        <h6 class="mb-2 text-info"><i class="fas fa-chart-line me-2"></i>Participation</h6>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <span class="fw-bold">This week:</span>
                                                <span class="badge bg-gradient-info ms-1">${s.participation?.this_week || 'N/A'}</span>
                                                <span class="ms-2 small text-${s.participation?.week_increase >= 0 ? 'success' : 'danger'}">
                                                    (${s.participation?.week_increase >= 0 ? '+' : ''}${s.participation?.week_increase || 0}% vs last week)
                                                </span>
                                            </div>
                                            <div class="col-md-6">
                                                <span class="fw-bold">This month:</span>
                                                <span class="badge bg-gradient-info ms-1">${s.participation?.this_month || 'N/A'}</span>
                                                <span class="ms-2 small text-${s.participation?.month_increase >= 0 ? 'success' : 'danger'}">
                                                    (${s.participation?.month_increase >= 0 ? '+' : ''}${s.participation?.month_increase || 0}% vs last month)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    content.innerHTML = html;

                    // Show PDF button after summary loads
                    if (pdfBtn) pdfBtn.style.display = '';
                    
                    showToast(`Class summary loaded for ${classroomLabel}!`);
                } else {
                    content.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            ${data.message || 'Failed to load summary data.'}
                        </div>
                    `;
                    showToast('Failed to load class summary.', true);
                }
            })
            .catch((error) => {
                console.error('Error loading class summary:', error);
                content.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-times-circle me-2"></i>
                        Error loading summary. Please try again.
                    </div>
                `;
                showToast('Error loading class summary.', true);
            });
    });

    // PDF Export logic for summary modal - UPDATED
    document.addEventListener('DOMContentLoaded', function() {
        const pdfBtn = document.getElementById('exportSummaryPdfBtn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', function() {
                const summaryContent = document.getElementById('classSummaryContent');
                if (!summaryContent) return;
                
                pdfBtn.disabled = true;
                
                // Get classroom info for PDF filename
                const classroomSelect = document.querySelector('.form-select.w-auto');
                let classroomSuffix = 'All_Classrooms';
                if (classroomSelect && classroomSelect.value) {
                    const selectedOption = classroomSelect.options[classroomSelect.selectedIndex];
                    classroomSuffix = selectedOption.text.replace(/[^a-zA-Z0-9]/g, '_');
                }
                
                showToast('Exporting PDF...');
                
                html2canvas(summaryContent, {backgroundColor: '#fff', scale: 2}).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new window.jspdf.jsPDF({
                        orientation: 'landscape',
                        unit: 'pt',
                        format: [canvas.width, canvas.height]
                    });
                    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                    pdf.save(`Class_Summary_${classroomSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
                    pdfBtn.disabled = false;
                    showToast('PDF exported successfully!');
                }).catch(error => {
                    pdfBtn.disabled = false;
                    showToast('Failed to export PDF.', true);
                    console.error('PDF export error:', error);
                });
            });
        }
    });

    // Initialize the page
    initializePage();
});
