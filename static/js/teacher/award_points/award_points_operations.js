// ================================
// GLOBAL VARIABLES
// ================================
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>

let allStudents = [];
let allClassrooms = [];
let searchTimeout;

// ================================
// INITIALIZATION CODE
// ================================

document.addEventListener('DOMContentLoaded', function() {
    initializeStudentsData();
    loadRecentAwards();
    loadPointLeaders();
    setupEventListeners();
});

// ================================
// STUDENT DATA INITIALIZATION
// ================================

function initializeStudentsData(retry = 0) {
    document.getElementById('studentSelect').innerHTML = '<option>Loading...</option>';
    document.getElementById('bulkStudentCheckboxes').innerHTML = '<div class="text-center w-100 py-3"><div class="spinner-border text-primary" role="status"></div></div>';

    fetch('/api/my-students')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allStudents = data.students;
                allClassrooms = data.classrooms || [];
                populateGradeSectionFilter();
                populateStudentSelect(allStudents);
                populateBulkGradeSectionFilter();
                populateBulkModalCheckboxes(allStudents);
                setupSelectAllFunctionality();
            } else {
                document.getElementById('studentSelect').innerHTML = '<option disabled>No students found</option>';
                document.getElementById('bulkStudentCheckboxes').innerHTML = '<div class="text-danger">No students found.</div>';
            }
        })
        .catch(() => {
            if (retry < 2) {
                setTimeout(() => initializeStudentsData(retry + 1), 1200);
            } else {
                document.getElementById('studentSelect').innerHTML = '<option disabled>Error loading students</option>';
                document.getElementById('bulkStudentCheckboxes').innerHTML = '<div class="text-danger">Error loading students.</div>';
            }
        });
}

function populateStudentSelect(students) {
    const studentSelect = document.getElementById('studentSelect');
    studentSelect.innerHTML = '';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.name} (Grade ${student.grade} - ${student.section})`;
        studentSelect.appendChild(option);
    });
}

function populateGradeSectionFilter() {
    const filter = document.getElementById('gradeSectionFilter');
    filter.innerHTML = `<option value="" selected>All Classes</option>`;
    allClassrooms.forEach(c => {
        const grade = c.grade || c.grade_level;
        const section = c.section;
        filter.innerHTML += `<option value="${grade}-${section}">Grade ${grade} - ${section}</option>`;
    });
}

function populateBulkModalCheckboxes(students) {
    const bulkContainer = document.getElementById('bulkStudentCheckboxes');
    bulkContainer.innerHTML = '';
    students.forEach((student, idx) => {
        const streak = student.streak || 0;
        const streakClass = getStreakClass(streak);
        const streakBg = getStreakBgColor(streak);
        
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-2';
        col.innerHTML = `
            <div class="form-check d-flex align-items-center">
                <input class="form-check-input" type="checkbox" id="bulkStudent${student.id}" value="${student.id}">
                <label class="form-check-label d-flex align-items-center" for="bulkStudent${student.id}" style="flex:1;">
                    <div style="position:relative;width:40px;height:40px;margin-right:10px;">
                        <span class="avatar streak-border ${streakClass}" style="width:36px;height:36px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                            <img src="${student.pic || '/static/image/default-avatar.png'}" alt="avatar" style="width:100%;height:100%;object-fit:cover;">
                        </span>
                        <span style="
                            position:absolute;
                            bottom:-6px;
                            left:50%;
                            transform:translateX(-50%);
                            background:#ffffff;
                            color:${streakBg};
                            font-weight:700;
                            font-size:0.60rem;
                            padding:1px 4px 1px 3px;
                            border-radius:8px;
                            box-shadow:0 1px 4px rgba(0,0,0,0.08);
                            border:1.5px solid ${streakBg};
                            z-index:2;
                            display:flex;
                            align-items:center;
                            white-space:nowrap;
                        ">
                            ${
                                streak < 7
                                    ? `<span class="material-icons-round" style="font-size:0.8rem;margin-right:1px;">local_fire_department</span>`
                                    : `<span class="streak-lottie-bulk" data-streak="${streak}" style="width:16px;height:16px;display:inline-block;margin-right:1px;"></span>`
                            }
                            ${streak}
                        </span>
                    </div>
                    <div>
                        <div style="font-weight:600;font-size:0.9rem;">${student.name}</div>
                        <small class="text-muted">Grade ${student.grade} - ${student.section}</small>
                    </div>
                </label>
            </div>
        `;
        bulkContainer.appendChild(col);
    });
    
    // Render streak animations after a short delay
    setTimeout(() => {
        renderStreakLottieAnimations();
    }, 300);
}

function populateBulkGradeSectionFilter() {
    const filter = document.getElementById('bulkGradeSectionFilter');
    filter.innerHTML = `<option value="" selected>All Classes</option>`;
    allClassrooms.forEach(c => {
        const grade = c.grade || c.grade_level;
        const section = c.section;
        filter.innerHTML += `<option value="${grade}-${section}">Grade ${grade} - ${section}</option>`;
    });
}

function setupSelectAllFunctionality() {
    const selectAll = document.getElementById('selectAllStudents');
    const bulkContainer = document.getElementById('bulkStudentCheckboxes');
    
    selectAll.addEventListener('change', function() {
        const checkboxes = bulkContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
    });
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
// FORM SUBMISSION HANDLERS
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
    checkboxes.forEach(cb => {
        const label = document.querySelector(`label[for="${cb.id}"]`);
        if (label) {
            const nameElement = label.querySelector('div > div:first-child');
            if (nameElement) {
                selectedStudents.push(nameElement.textContent.trim());
            }
        }
    });

    const studentCount = student_ids.length;
    const studentList = selectedStudents.slice(0, 3).join(', ');
    const moreText = studentCount > 3 ? ` and ${studentCount - 3} more students` : '';

    // Show confirmation dialog
    const confirmed = await showConfirmationDialog(
        'Confirm Bulk Points Award',
        `Are you sure you want to award ${points} points to ${studentCount} student${studentCount !== 1 ? 's' : ''} (${studentList}${moreText}) for ${category}?`
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
            showTopRightNotification('Points awarded successfully!');
            refreshDashboardData();
            initializeStudentsData();
        } else {
            showTopRightNotification(data.message || 'Failed to award points.', 'danger');
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
            showTopRightNotification(`Points awarded to ${student_ids.length} student${student_ids.length !== 1 ? 's' : ''}!`);
            resetBulkForm();
            closeBulkModal();
            refreshDashboardData();
            initializeStudentsData();
        } else {
            showTopRightNotification(data.message || 'Failed to award points.', 'danger');
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
                            <span class="avatar streak-border ${streakClass}" style="width:48px;height:48px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;">
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
                                    <div>
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
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No recent awards.</td></tr>`;
            }
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
                            <i class="fa-solid fa-trophy"></i>
                        </span>`;
                        pillBg = 'background:linear-gradient(135deg,#F5A623,#F4B043);';
                        pillColor = '#fff';
                    } else if (idx === 1) {
                        rankClass = 'rank-2';
                        iconHtml = `<span class="rank-circle silver" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#64748B,#94A3B8);color:#fff;margin-right:12px;">
                            <i class="fa-solid fa-medal"></i>
                        </span>`;
                        pillBg = 'background:linear-gradient(135deg,#64748B,#94A3B8);';
                        pillColor = '#fff';
                    } else if (idx === 2) {
                        rankClass = 'rank-3';
                        iconHtml = `<span class="rank-circle bronze" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:#fff;margin-right:12px;">
                            <i class="fa-solid fa-star"></i>
                        </span>`;
                        pillBg = 'background:linear-gradient(135deg,#8B5CF6,#A78BFA);';
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
                            <span class="avatar streak-border ${streakClass}" style="width:48px;height:48px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;">
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
                list.innerHTML = '<div class="list-group-item text-center text-muted">No leaders yet.</div>';
            }
        });
}

// ================================
// UTILITY FUNCTIONS
// ================================

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

function getCategoryBadge(category) {
    const badges = {
        'academic': `<span class="badge bg-primary"><i class="fas fa-graduation-cap me-1"></i> Academic</span>`,
        'behavior': `<span class="badge bg-success"><i class="fas fa-smile-beam me-1"></i> Behavior</span>`,
        'participation': `<span class="badge bg-info"><i class="fas fa-users me-1"></i> Participation</span>`,
        'attendance': `<span class="badge bg-warning text-dark"><i class="fas fa-calendar-check me-1"></i> Attendance</span>`,
        'homework': `<span class="badge bg-secondary"><i class="fas fa-book me-1"></i> Homework</span>`,
        'improvement': `<span class="badge bg-dark"><i class="fas fa-arrow-up me-1"></i> Improvement</span>`,
        'leadership': `<span class="badge bg-danger"><i class="fas fa-chess-king me-1"></i> Leadership</span>`,
        'teamwork': `<span class="badge bg-teal" style="background-color:#20c997;"><i class="fas fa-handshake me-1"></i> Teamwork</span>`,
        'custom': `<span class="badge bg-light text-dark"><i class="fas fa-star me-1"></i> Custom</span>`,
        'Task': `<span class="badge bg-info text-dark"><i class="fas fa-tasks me-1"></i> Task</span>`
    };
    return badges[category] || `<span class="badge bg-secondary">${category}</span>`;
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
}

function closeBulkModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkAwardModal'));
    if (modal) modal.hide();
}

function showTopRightNotification(message, type = 'success') {
    const notif = document.getElementById('topRightNotification');
    const notifMsg = document.getElementById('topRightNotificationMsg');
    notifMsg.textContent = message;
    notifMsg.className = `alert alert-${type} mb-0`;
    notif.style.display = 'block';
    setTimeout(() => { notif.style.display = 'none'; }, 2500);
}

// ================================
// CONFIRMATION DIALOG FUNCTION
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
// FILTER & SEARCH FUNCTIONS
// ================================

function filterAndSearchStudents() {
    const filter = document.getElementById('gradeSectionFilter').value;
    const search = document.getElementById('studentSearch').value.trim().toLowerCase();
    let filtered = allStudents;

    if (filter) {
        const [grade, section] = filter.split('-');
        filtered = filtered.filter(s => s.grade == grade && s.section == section);
    }
    
    if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    }
    
    if (!filter) {
        filtered = allStudents;
    }
    
    populateStudentSelect(filtered);
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