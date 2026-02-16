document.addEventListener('DOMContentLoaded', () => {
    const attendanceForm = document.getElementById('attendanceForm');
    const batchesContainer = document.getElementById('batchesContainer');
    const addBatchBtn = document.getElementById('addBatchBtn');
    const batchTemplate = document.getElementById('batchTemplate');
    const studentTemplate = document.getElementById('studentRowTemplate');
    const dateInput = document.getElementById('date');
    const teacherNameInput = document.getElementById('teacherName');

    /**
     * Checks if it's a new year and clears data if necessary
     */
    function checkAnnualClear() {
        const currentYear = new Date().getFullYear().toString();
        const lastClearYear = localStorage.getItem('lastClearYear');
        
        if (lastClearYear && lastClearYear !== currentYear) {
            localStorage.clear();
        }
        localStorage.setItem('lastClearYear', currentYear);
    }

    /**
     * Initialization: Set current date and add first batch
     */
    function init() {
        // Annual Data Reset (January 1st check)
        checkAnnualClear();

        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        if (dateInput) dateInput.value = today;

        const teacherModal = document.getElementById('teacherModal');
        const teacherModalForm = document.getElementById('teacherModalForm');
        const modalTeacherName = document.getElementById('modalTeacherName');

        // Teacher Name Persistence
        let teacherName = localStorage.getItem('teacherName');
        if (!teacherName) {
            teacherModal.classList.remove('hidden');
            teacherModalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = modalTeacherName.value.trim();
                if (name) {
                    localStorage.setItem('teacherName', name);
                    teacherNameInput.value = name;
                    teacherModal.classList.add('hidden');
                }
            });
        }
        
        if (teacherName && teacherNameInput) {
            teacherNameInput.value = teacherName.trim();
        }

        // Update localStorage when teacher name is edited
        teacherNameInput.addEventListener('input', (e) => {
            localStorage.setItem('teacherName', e.target.value.trim());
        });

        // Initialize Suggestions
        updateSuggestions();

        // Add an initial batch
        addBatch();
    }

    /**
     * Updates the datalists with suggestions from localStorage
     */
    function updateSuggestions() {
        const batchList = document.getElementById('batchSuggestions');
        const studentList = document.getElementById('studentSuggestions');
        const timeList = document.getElementById('timeSuggestions');
        
        const savedBatches = JSON.parse(localStorage.getItem('savedBatches') || '[]');
        const savedStudents = JSON.parse(localStorage.getItem('savedStudents') || '[]');
        const savedTimes = JSON.parse(localStorage.getItem('savedTimes') || '[]');

        batchList.innerHTML = savedBatches.map(b => `<option value="${b}">`).join('');
        studentList.innerHTML = savedStudents.map(s => `<option value="${s}">`).join('');
        timeList.innerHTML = savedTimes.map(t => `<option value="${t}">`).join('');
    }

    /**
     * Saves new batch and student names to localStorage
     */
    function saveNewEntries(data) {
        const savedBatches = new Set(JSON.parse(localStorage.getItem('savedBatches') || '[]'));
        const savedStudents = new Set(JSON.parse(localStorage.getItem('savedStudents') || '[]'));
        const savedTimes = new Set(JSON.parse(localStorage.getItem('savedTimes') || '[]'));

        data.batches.forEach(batch => {
            if (batch.name) savedBatches.add(batch.name);
            if (batch.time) savedTimes.add(batch.time);
            batch.students.forEach(student => {
                if (student.name) savedStudents.add(student.name);
            });
        });

        localStorage.setItem('savedBatches', JSON.stringify([...savedBatches].sort()));
        localStorage.setItem('savedStudents', JSON.stringify([...savedStudents].sort()));
        localStorage.setItem('savedTimes', JSON.stringify([...savedTimes].sort()));
        
        updateSuggestions();
    }

    /**
     * Shows a custom styled alert modal
     */
    function showAlert(message) {
        const alertModal = document.getElementById('alertModal');
        const alertMessage = document.getElementById('alertMessage');
        const closeBtn = document.getElementById('closeAlertBtn');

        alertMessage.textContent = message;
        alertModal.classList.remove('hidden');

        const close = () => {
            alertModal.classList.add('hidden');
            closeBtn.removeEventListener('click', close);
        };
        closeBtn.addEventListener('click', close);
    }

    /**
     * Logic to add a new batch section
     */
    function addBatch() {
        const batchContent = batchTemplate.content.cloneNode(true);
        const batchSection = batchContent.querySelector('.batch-section');
        const studentsContainer = batchSection.querySelector('.students-container');
        const addStudentBtn = batchSection.querySelector('.add-student-btn');
        const removeBatchBtn = batchSection.querySelector('.remove-batch-btn');

        // Add initial student to this batch
        addStudent(studentsContainer);

        // Event listener for adding students to this batch
        addStudentBtn.addEventListener('click', () => addStudent(studentsContainer));

        // Event listener for removing this batch
        removeBatchBtn.addEventListener('click', () => {
            const sections = document.querySelectorAll('.batch-section');
            if (sections.length > 1) {
                batchSection.classList.add('animate-out');
                batchSection.addEventListener('animationend', () => batchSection.remove(), { once: true });
            } else {
                showAlert('At least one batch is required.');
            }
        });

        batchesContainer.appendChild(batchSection);
    }

    /**
     * Logic to add a student row to a specific container
     */
    function addStudent(container) {
        const studentContent = studentTemplate.content.cloneNode(true);
        const studentRow = studentContent.querySelector('.student-row');
        const statusSelect = studentRow.querySelector('.student-status');
        const reasonGroup = studentRow.querySelector('.reason-group');
        const reasonInput = studentRow.querySelector('.student-reason');
        const removeBtn = studentRow.querySelector('.remove-student-btn');

        // Toggle reason visibility
        statusSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Informed') {
                reasonGroup.classList.remove('hidden');
                reasonInput.setAttribute('required', 'true');
            } else {
                reasonGroup.classList.add('hidden');
                reasonInput.removeAttribute('required');
                reasonInput.value = '';
            }
        });

        // Removal logic
        removeBtn.addEventListener('click', () => {
            const rows = container.querySelectorAll('.student-row');
            if (rows.length > 1) {
                studentRow.classList.add('animate-out');
                studentRow.addEventListener('animationend', () => studentRow.remove(), { once: true });
            } else {
                showAlert('At least one student is required per batch.');
            }
        });

        container.appendChild(studentRow);
    }

    /**
     * Formats the final message for WhatsApp
     */
    function formatMessage(data) {
        const dateParts = data.date.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        let message = `*Attendance Report*\n`;
        message += `*Date:* ${formattedDate}\n`;
        message += `*Teacher:* ${data.teacher}\n\n`;

        data.batches.forEach((batch, bIndex) => {
            message += `*Batch:* ${batch.name}\n`;
            message += `*Time:* ${batch.time}\n`;
            message += `*Students:*\n`;

            batch.students.forEach((s, sIndex) => {
                let studentLine = `${sIndex + 1}. ${s.name} – ${s.status}`;
                if (s.status === 'Informed' && s.reason) {
                    studentLine += ` (${s.reason})`;
                }
                message += `${studentLine}\n`;
            });
            
            if (bIndex < data.batches.length - 1) {
                message += `\n-------------------\n\n`;
            }
        });

        return message;
    }

    /**
     * Form submission handler
     */
    attendanceForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = {
            date: dateInput.value,
            teacher: document.getElementById('teacherName').value,
            admin: '917736507222', // Hardcoded admin number
            batches: []
        };

        const batchSections = document.querySelectorAll('.batch-section');
        batchSections.forEach(section => {
            const batch = {
                name: section.querySelector('.batch-name').value,
                time: section.querySelector('.batch-time').value,
                students: []
            };

            const studentRows = section.querySelectorAll('.student-row');
            studentRows.forEach(row => {
                const name = row.querySelector('.student-name').value;
                const status = row.querySelector('.student-status').value;
                const reason = row.querySelector('.student-reason').value;
                
                if (name) {
                    batch.students.push({ name, status, reason });
                }
            });

            if (batch.name) {
                formData.batches.push(batch);
            }
        });

        if (formData.batches.length === 0) {
            showAlert('Please add at least one complete batch.');
            return;
        }

        // Save new entries for suggestions
        saveNewEntries(formData);

        // WhatsApp trigger
        const message = formatMessage(formData);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${formData.admin}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    });

    addBatchBtn.addEventListener('click', addBatch);
    init();
});
