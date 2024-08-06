document.addEventListener('DOMContentLoaded', function() {
    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    let timesheets = JSON.parse(localStorage.getItem('timesheets')) || {};
    let timers = JSON.parse(localStorage.getItem('timers')) || {};
    let activeEmployeeId = null;
    let currentInterval = null;

    const addEmployeeButton = document.getElementById('addEmployee');
    const employeeList = document.getElementById('employees');
    const employeeManagementList = document.getElementById('employeeManagementList');
    const overviewTab = document.getElementById('overviewTab');
    const dashboardButton = document.getElementById('dashboard');
    const employeeManagementButton = document.getElementById('employeeManagement');
    const dashboardContent = document.getElementById('dashboardContent');
    const overviewContent = document.getElementById('overviewContent');
    const employeeManagementContent = document.getElementById('employeeManagementContent');
    const timesheetTableBody = document.querySelector('#timesheetTable tbody');
    const dateFilter = document.getElementById('dateFilter');
    const employeeFilter = document.getElementById('employeeFilter');
    const timeFilter = document.getElementById('timeFilter');
    const calendar = document.getElementById('calendar');

    const clockInModal = document.getElementById('clockInModal');
    const employeeNameElement = document.getElementById('employeeName');
    const clockInButton = document.getElementById('clockInButton');
    const breakButton = document.getElementById('breakButton');
    const stopButton = document.getElementById('stopButton');
    const resetButton = document.getElementById('resetButton');
    const timerElement = document.getElementById('timer');
    const closeModalButtons = document.getElementsByClassName('close');

    const passwordModal = document.getElementById('passwordModal');
    const passwordInput = document.getElementById('passwordInput');
    const submitPasswordButton = document.getElementById('submitPassword');

    const editEmployeeModal = document.getElementById('editEmployeeModal');
    const editEmployeeId = document.getElementById('editEmployeeId');
    const editEmployeeName = document.getElementById('editEmployeeName');
    const editEmployeeRole = document.getElementById('editEmployeeRole');
    const editEmployeePayRate = document.getElementById('editEmployeePayRate');
    const saveEmployeeChanges = document.getElementById('saveEmployeeChanges');

    addEmployeeButton.addEventListener('click', addEmployee);
    overviewTab.addEventListener('click', showPasswordModal);
    dashboardButton.addEventListener('click', showDashboard);
    employeeManagementButton.addEventListener('click', showEmployeeManagement);
    submitPasswordButton.addEventListener('click', checkPassword);
    saveEmployeeChanges.addEventListener('click', saveEmployee);

    Array.from(closeModalButtons).forEach(button => button.addEventListener('click', () => {
        button.closest('.modal').style.display = 'none';
        clearInterval(currentInterval); // Clear interval when modal is closed
    }));

    window.addEventListener('click', (event) => {
        if (event.target == passwordModal) {
            passwordModal.style.display = 'none';
        }
        if (event.target == clockInModal) {
            clockInModal.style.display = 'none';
            clearInterval(currentInterval); // Clear interval when modal is closed
        }
        if (event.target == editEmployeeModal) {
            editEmployeeModal.style.display = 'none';
        }
    });

    dateFilter.addEventListener('change', displayTimesheet);
    employeeFilter.addEventListener('change', displayTimesheet);
    timeFilter.addEventListener('change', displayTimesheet);

    function addEmployee() {
        const name = prompt("Enter employee name:");
        const id = prompt("Enter employee ID:");
        const payRate = prompt("Enter employee pay rate (per hour):");
        const role = prompt("Enter employee role:");
        if (name && id && payRate && role) {
            employees.push({ name, id, payRate: parseFloat(payRate), role });
            timesheets[id] = [];
            timers[id] = { mainTime: 0, breakTime: 0, startTime: null, breakStartTime: null, isRunning: false, isOnBreak: false, interval: null, breakInterval: null };
            updateLocalStorage();
            updateEmployeeList();
            updateEmployeeManagementList();
            updateEmployeeFilter();
        }
    }

    function deleteEmployee(id) {
        if (confirm('Are you sure you want to delete this employee?')) {
            employees = employees.filter(employee => employee.id !== id);
            delete timesheets[id];
            delete timers[id];
            updateLocalStorage();
            updateEmployeeList();
            updateEmployeeManagementList();
            updateEmployeeFilter();
        }
    }

    function editEmployee(id) {
        const employee = employees.find(emp => emp.id === id);
        if (employee) {
            editEmployeeId.value = employee.id;
            editEmployeeName.value = employee.name;
            editEmployeeRole.value = employee.role;
            editEmployeePayRate.value = employee.payRate;
            editEmployeeModal.style.display = 'flex';
        }
    }

    function saveEmployee() {
        const id = editEmployeeId.value;
        const employee = employees.find(emp => emp.id === id);
        if (employee) {
            employee.name = editEmployeeName.value;
            employee.role = editEmployeeRole.value;
            employee.payRate = parseFloat(editEmployeePayRate.value);
            updateLocalStorage();
            updateEmployeeList();
            updateEmployeeManagementList();
            updateEmployeeFilter();
            editEmployeeModal.style.display = 'none';
        }
    }

    function updateLocalStorage() {
        localStorage.setItem('employees', JSON.stringify(employees));
        localStorage.setItem('timesheets', JSON.stringify(timesheets));
        localStorage.setItem('timers', JSON.stringify(timers));
    }

    function updateEmployeeList() {
        employeeList.innerHTML = '';
        employees.forEach(employee => {
            const li = document.createElement('li');
            li.textContent = `${employee.name} (${employee.id})`;
            li.addEventListener('click', () => showClockInModal(employee));
            employeeList.appendChild(li);
        });
    }

    function updateEmployeeManagementList() {
        employeeManagementList.innerHTML = '';
        employees.forEach(employee => {
            const li = document.createElement('li');
            li.className = 'employee-management-item';
            li.innerHTML = `
                ${employee.name} (${employee.id})
                <button onclick="editEmployee('${employee.id}')">Edit</button>
                <button onclick="deleteEmployee('${employee.id}')">Delete</button>
            `;
            employeeManagementList.appendChild(li);
        });
    }

    function updateEmployeeFilter() {
        employeeFilter.innerHTML = '<option value="">All Employees</option>';
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            employeeFilter.appendChild(option);
        });
    }

    function showClockInModal(employee) {
        const { id } = employee;
        activeEmployeeId = id;

        // Update the modal with the selected employee's details
        employeeNameElement.textContent = `${employee.name} (${employee.id})`;
        clockInModal.style.display = 'flex';

        // Update button visibility based on the timer state
        clockInButton.style.display = 'block';
        breakButton.style.display = 'none';
        stopButton.style.display = 'none';
        resetButton.style.display = 'none';

        clearInterval(currentInterval); // Clear any previous intervals

        if (timers[id].isRunning || timers[id].isOnBreak) {
            clockInButton.style.display = 'none';
            breakButton.style.display = 'inline-block';
            stopButton.style.display = 'inline-block';
            resetButton.style.display = 'inline-block';
            if (timers[id].isRunning) {
                startMainInterval(id, timerElement);
            } else if (timers[id].isOnBreak) {
                startBreakInterval(id, timerElement);
            }
        } else {
            updateTimer(timerElement, timers[id].mainTime); // Show the current main time
        }

        clockInButton.onclick = () => {
            if (!timers[id].isRunning && !timers[id].isOnBreak) {
                timers[id].startTime = Date.now();
                timers[id].isRunning = true;
                logTimesheet(id, 'clockin');
                startMainInterval(id, timerElement);
            }
            clockInButton.style.display = 'none';
            breakButton.style.display = 'inline-block';
            stopButton.style.display = 'inline-block';
            resetButton.style.display = 'inline-block';
            clockInModal.style.display = 'none';
            updateLocalStorage();
        };

        breakButton.onclick = () => {
            if (breakButton.textContent === 'Start Break') {
                timers[id].mainTime += Math.floor((Date.now() - timers[id].startTime) / 1000);
                timers[id].breakStartTime = Date.now();
                timers[id].isRunning = false;
                timers[id].isOnBreak = true;
                logTimesheet(id, 'startbreak');
                breakButton.textContent = 'End Break';
                startBreakInterval(id, timerElement);
            } else {
                timers[id].breakTime += Math.floor((Date.now() - timers[id].breakStartTime) / 1000);
                timers[id].startTime = Date.now();
                timers[id].isRunning = true;
                timers[id].isOnBreak = false;
                logTimesheet(id, 'endbreak');
                breakButton.textContent = 'Start Break';
                startMainInterval(id, timerElement);
            }
            updateLocalStorage();
        };

        stopButton.onclick = () => {
            stopActiveEmployeeTimer(id);
            logTimesheet(id, 'clockout');
            resetTimer(id);
            clockInModal.style.display = 'none';
            updateEmployeeList();
            displayTimesheet();
        };

        resetButton.onclick = () => {
            if (confirm('Are you sure you want to reset the timer?')) {
                resetTimer(id);
                updateLocalStorage();
                updateTimer(timerElement, 0);
                clockInButton.style.display = 'inline-block';
                breakButton.style.display = 'none';
                stopButton.style.display = 'none';
                resetButton.style.display = 'none';
            }
        };
    }

    function startMainInterval(id, timerElement) {
        clearInterval(currentInterval); // Clear previous interval
        currentInterval = setInterval(() => {
            const duration = Math.floor((Date.now() - timers[id].startTime) / 1000);
            updateTimer(timerElement, timers[id].mainTime + duration);
        }, 1000);
    }

    function startBreakInterval(id, timerElement) {
        clearInterval(currentInterval); // Clear previous interval
        currentInterval = setInterval(() => {
            const duration = Math.floor((Date.now() - timers[id].breakStartTime) / 1000);
            updateTimer(timerElement, timers[id].breakTime + duration);
        }, 1000);
    }

    function stopActiveEmployeeTimer(id) {
        const timer = timers[id];
        if (timer.isRunning) {
            timer.mainTime += Math.floor((Date.now() - timer.startTime) / 1000);
        } else if (timer.isOnBreak) {
            timer.breakTime += Math.floor((Date.now() - timer.breakStartTime) / 1000);
        }
        clearInterval(currentInterval);
        timer.isRunning = false;
        timer.isOnBreak = false;
        updateLocalStorage();
    }

    function resetTimer(id) {
        timers[id] = { mainTime: 0, breakTime: 0, startTime: null, breakStartTime: null, isRunning: false, isOnBreak: false, interval: null, breakInterval: null };
        updateLocalStorage();
    }

    function updateTimer(element, time) {
        element.textContent = formatTotalTime(time);
    }

    function logTimesheet(id, type) {
        const timestamp = Date.now();
        const timesheet = timesheets[id] || [];
        const entry = {
            type: type,
            timestamp: timestamp
        };
        timesheet.push(entry);
        timesheets[id] = timesheet;
        updateLocalStorage();
    }

    function displayTimesheet() {
        const selectedDate = new Date(dateFilter.value);
        const selectedEmployee = employeeFilter.value;
        const selectedTimeFrame = timeFilter.value;
        timesheetTableBody.innerHTML = '';
        
        const filteredEmployees = selectedEmployee ? employees.filter(employee => employee.id === selectedEmployee) : employees;
        
        filteredEmployees.forEach(employee => {
            const timesheet = (timesheets[employee.id] || []).filter(entry => {
                const entryDate = new Date(entry.timestamp);
                return entryDate.toDateString() === selectedDate.toDateString();
            });

            const totalWorkHours = timesheet.reduce((sum, entry, index) => {
                if (entry.type === 'clockout' && timesheet[index - 1] && timesheet[index - 1].type === 'clockin') {
                    return sum + (entry.timestamp - timesheet[index - 1].timestamp);
                }
                return sum;
            }, 0);

            const totalBreakHours = timesheet.reduce((sum, entry, index) => {
                if (entry.type === 'endbreak' && timesheet[index - 1] && timesheet[index - 1].type === 'startbreak') {
                    return sum + (entry.timestamp - timesheet[index - 1].timestamp);
                }
                return sum;
            }, 0);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.role}</td>
                <td>${employee.name}</td>
                <td>${formatTime(timesheet.find(entry => entry.type === 'clockin')?.timestamp)}</td>
                <td>${formatTime(timesheet.find(entry => entry.type === 'clockout')?.timestamp)}</td>
                <td>${formatTime(timesheet.find(entry => entry.type === 'startbreak')?.timestamp)}</td>
                <td>${formatTime(timesheet.find(entry => entry.type === 'endbreak')?.timestamp)}</td>
                <td>${(totalWorkHours / 3600000).toFixed(2)}</td>
                <td>${(totalBreakHours / 3600000).toFixed(2)}</td>
                <td>${employee.notes || ''}</td>
            `;
            timesheetTableBody.appendChild(row);
        });
    }

    function formatTime(timestamp) {
        return timestamp ? new Date(timestamp).toLocaleTimeString() : '';
    }

    function formatTotalTime(totalTime) {
        const hours = String(Math.floor(totalTime / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalTime % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalTime % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    function changeDate(offset) {
        const currentDate = new Date(dateFilter.value);
        currentDate.setDate(currentDate.getDate() + offset);
        dateFilter.value = currentDate.toISOString().split('T')[0];
        displayTimesheet();
    }

    function showOverview() {
        dashboardContent.style.display = 'none';
        employeeManagementContent.style.display = 'none';
        overviewContent.style.display = 'block';
        displayTimesheet();
        updateCalendar();
    }

    function showDashboard() {
        dashboardContent.style.display = 'block';
        employeeManagementContent.style.display = 'none';
        overviewContent.style.display = 'none';
    }

    function showEmployeeManagement() {
        dashboardContent.style.display = 'none';
        employeeManagementContent.style.display = 'block';
        overviewContent.style.display = 'none';
    }

    function showPasswordModal() {
        passwordModal.style.display = 'flex';
    }

    function checkPassword() {
        const password = passwordInput.value;
        if (password === "Pencilvester70@") {
            passwordModal.style.display = 'none';
            showOverview();
        } else {
            alert("Incorrect password. Please try again.");
        }
    }

    function updateCalendar() {
        calendar.innerHTML = '';
        const today = new Date(dateFilter.value);
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(today);
            dayDate.setDate(today.getDate() - today.getDay() + i);
            const day = dayDate.getDate();
            const dayOfWeek = daysOfWeek[dayDate.getDay()];

            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.innerHTML = `
                ${dayOfWeek} <div class="date">${day}</div>
                <div class="dot"></div>
            `;

            if (dayDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('active');
            }

            dayElement.addEventListener('click', () => {
                dateFilter.value = dayDate.toISOString().split('T')[0];
                updateCalendar();
                displayTimesheet();
            });

            calendar.appendChild(dayElement);
        }
    }

    updateEmployeeList();
    updateEmployeeManagementList();
    updateEmployeeFilter();

    Object.keys(timers).forEach(id => {
        const timer = timers[id];
        if (timer.isRunning) {
            const duration = Math.floor((Date.now() - timer.startTime) / 1000);
            timer.mainTime += duration;
            timer.startTime = Date.now();
        } else if (timer.isOnBreak) {
            const duration = Math.floor((Date.now() - timer.breakStartTime) / 1000);
            timer.breakTime += duration;
            timer.breakStartTime = Date.now();
        }
    });

    setInterval(updateLocalStorage, 1000);
    dateFilter.value = new Date().toISOString().split('T')[0]; // Set the date filter to today's date
    displayTimesheet(); // Initial display
    updateCalendar(); // Initial calendar display
});

function openPasswordModal() {
    document.getElementById('passwordModal').style.display = 'flex';
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

function openClockInModal() {
    document.getElementById('clockInModal').style.display = 'flex';
}

function closeClockInModal() {
    document.getElementById('clockInModal').style.display = 'none';
}

function printTimesheet() {
    const content = document.getElementById('overviewContent').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Timesheet</title></head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

document.querySelectorAll('#employees li').forEach(item => {
    item.addEventListener('click', openClockInModal);
});

document.querySelectorAll('.close').forEach(item => {
    item.addEventListener('click', () => {
        item.parentElement.parentElement.style.display = 'none';
        clearInterval(currentInterval); // Clear interval when modal is closed
    });
});
  