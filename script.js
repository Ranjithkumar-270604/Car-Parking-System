// Data Storage Structure
let parkingData = {
    slots: [],
    activeSessions: [],
    history: [],
    settings: {
        slotCount: 10,
        hourlyRate: 5.00
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    loadParkingData();
    initializeSlots();
    updateUI();
    setupEventListeners();
});

// Initialize Parking Slots
function initializeSlots() {
    const slotCount = parkingData.settings.slotCount;
    parkingData.slots = [];
    
    for (let i = 1; i <= slotCount; i++) {
        parkingData.slots.push({
            id: i,
            isOccupied: false,
            vehicleNumber: null
        });
    }
    
    renderSlots();
}

// Render Parking Slots
function renderSlots() {
    const slotsGrid = document.getElementById('slotsGrid');
    slotsGrid.innerHTML = '';
    
    parkingData.slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `slot ${slot.isOccupied ? 'occupied' : 'available'}`;
        
        // Make available slots clickable
        if (!slot.isOccupied) {
            slotElement.addEventListener('click', function() {
                showEntryForm(slot.id);
            });
        }
        
        const slotNumber = document.createElement('div');
        slotNumber.className = 'slot-number';
        slotNumber.textContent = `Slot ${slot.id}`;
        
        const slotVehicle = document.createElement('div');
        slotVehicle.className = 'slot-vehicle';
        slotVehicle.textContent = slot.isOccupied ? slot.vehicleNumber : 'Available - Click to Park';
        
        slotElement.appendChild(slotNumber);
        slotElement.appendChild(slotVehicle);
        
        slotsGrid.appendChild(slotElement);
    });
    
    updateSlotSelect();
    updateStatistics();
}

// Show Entry Form when slot is clicked
function showEntryForm(slotNumber) {
    const entryFormCard = document.getElementById('entryFormCard');
    const slotSelect = document.getElementById('slotSelect');
    const vehicleNumberInput = document.getElementById('vehicleNumber');
    
    // Show entry form
    entryFormCard.style.display = 'block';
    
    // Scroll to entry form
    entryFormCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Pre-select the clicked slot
    updateSlotSelect();
    slotSelect.value = slotNumber;
    
    // Focus on vehicle number input
    vehicleNumberInput.focus();
}

// Update Slot Select Dropdown
function updateSlotSelect() {
    const slotSelect = document.getElementById('slotSelect');
    const currentValue = slotSelect.value; // Preserve current selection
    
    slotSelect.innerHTML = '<option value="">-- Select a slot --</option>';
    
    parkingData.slots.forEach(slot => {
        if (!slot.isOccupied) {
            const option = document.createElement('option');
            option.value = slot.id;
            option.textContent = `Slot ${slot.id}`;
            slotSelect.appendChild(option);
        }
    });
    
    // Restore selection if it's still valid
    if (currentValue && slotSelect.querySelector(`option[value="${currentValue}"]`)) {
        slotSelect.value = currentValue;
    }
}

// Add Vehicle (Entry)
function addVehicle(vehicleNumber, slotNumber) {
    // Check if vehicle is already parked
    const existingSession = parkingData.activeSessions.find(
        session => session.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase()
    );
    
    if (existingSession) {
        alert(`Vehicle ${vehicleNumber} is already parked in Slot ${existingSession.slotNumber}!`);
        return false;
    }
    
    // Check if slot is available
    const slot = parkingData.slots.find(s => s.id === slotNumber);
    if (!slot || slot.isOccupied) {
        alert(`Slot ${slotNumber} is not available!`);
        return false;
    }
    
    // Assign vehicle to slot
    slot.isOccupied = true;
    slot.vehicleNumber = vehicleNumber;
    
    // Create parking session
    const session = {
        vehicleNumber: vehicleNumber.toUpperCase(),
        slotNumber: slotNumber,
        entryTime: new Date(),
        sessionId: Date.now()
    };
    
    parkingData.activeSessions.push(session);
    saveParkingData();
    renderSlots();
    updateActiveSessionsTable();
    updateStatistics();
    
    return true;
}

// Remove Vehicle (Exit)
function removeVehicle(vehicleNumber) {
    const sessionIndex = parkingData.activeSessions.findIndex(
        session => session.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase()
    );
    
    if (sessionIndex === -1) {
        alert(`Vehicle ${vehicleNumber} is not found in active sessions!`);
        return null;
    }
    
    const session = parkingData.activeSessions[sessionIndex];
    const slot = parkingData.slots.find(s => s.id === session.slotNumber);
    
    if (!slot) {
        return null;
    }
    
    // Calculate payment
    const exitTime = new Date();
    const payment = calculatePayment(session.entryTime, exitTime, parkingData.settings.hourlyRate);
    
    // Free the slot
    slot.isOccupied = false;
    slot.vehicleNumber = null;
    
    // Move to history
    const historyEntry = {
        vehicleNumber: session.vehicleNumber,
        slotNumber: session.slotNumber,
        entryTime: session.entryTime,
        exitTime: exitTime,
        duration: formatDuration(exitTime - session.entryTime),
        payment: payment
    };
    
    parkingData.history.push(historyEntry);
    parkingData.activeSessions.splice(sessionIndex, 1);
    
    saveParkingData();
    renderSlots();
    updateActiveSessionsTable();
    updateHistoryTable();
    updateStatistics();
    updateLastExitedDisplay(historyEntry);
    
    return historyEntry;
}

// Calculate Payment
function calculatePayment(entryTime, exitTime, hourlyRate) {
    const durationMs = exitTime - entryTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    
    // Round up to nearest hour
    const hours = Math.ceil(durationHours);
    // Minimum charge: 1 hour
    const chargeableHours = Math.max(1, hours);
    
    return (chargeableHours * hourlyRate).toFixed(2);
}

// Format Duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Update Active Sessions Table
function updateActiveSessionsTable() {
    const tbody = document.getElementById('activeSessionsBody');
    tbody.innerHTML = '';
    
    if (parkingData.activeSessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No active sessions</td></tr>';
        return;
    }
    
    parkingData.activeSessions.forEach(session => {
        const row = document.createElement('tr');
        const duration = formatDuration(new Date() - session.entryTime);
        const entryTime = new Date(session.entryTime).toLocaleString();
        
        row.innerHTML = `
            <td>${session.vehicleNumber}</td>
            <td>${session.slotNumber}</td>
            <td>${entryTime}</td>
            <td>${duration}</td>
            <td><button class="btn btn-danger btn-sm" onclick="exitVehicleDirect('${session.vehicleNumber}')">Exit</button></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update History Table
function updateHistoryTable() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    
    if (parkingData.history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No history available</td></tr>';
        return;
    }
    
    // Show most recent first
    const sortedHistory = [...parkingData.history].reverse();
    
    sortedHistory.forEach(entry => {
        const row = document.createElement('tr');
        const entryTime = new Date(entry.entryTime).toLocaleString();
        const exitTime = new Date(entry.exitTime).toLocaleString();
        
        row.innerHTML = `
            <td>${entry.vehicleNumber}</td>
            <td>${entry.slotNumber}</td>
            <td>${entryTime}</td>
            <td>${exitTime}</td>
            <td>${entry.duration}</td>
            <td>₹${entry.payment}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update Statistics
function updateStatistics() {
    // Calculate total revenue
    const totalRevenue = parkingData.history.reduce((sum, entry) => {
        return sum + parseFloat(entry.payment);
    }, 0);
    
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    
    // Calculate occupancy rate
    const occupiedSlots = parkingData.slots.filter(slot => slot.isOccupied).length;
    const totalSlots = parkingData.slots.length;
    const occupancyRate = totalSlots > 0 ? ((occupiedSlots / totalSlots) * 100).toFixed(1) : 0;
    
    document.getElementById('occupancyRate').textContent = `${occupancyRate}%`;
    document.getElementById('availableSlots').textContent = `${totalSlots - occupiedSlots}`;
}

// Update UI
function updateUI() {
    renderSlots();
    updateActiveSessionsTable();
    updateHistoryTable();
    updateStatistics();
    
    // Update settings inputs
    document.getElementById('slotCount').value = parkingData.settings.slotCount;
    document.getElementById('hourlyRate').value = parkingData.settings.hourlyRate;
    
    // Update last exited display
    if (parkingData.history.length > 0) {
        const lastExited = parkingData.history[parkingData.history.length - 1];
        updateLastExitedDisplay(lastExited);
    } else {
        updateLastExitedDisplay(null);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Vehicle Number Input - Convert to uppercase while typing
    document.getElementById('vehicleNumber').addEventListener('input', function(e) {
        this.value = this.value.toUpperCase();
    });         

    // Entry Form
    document.getElementById('entryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const vehicleNumber = document.getElementById('vehicleNumber').value.trim();
        const slotNumber = parseInt(document.getElementById('slotSelect').value);
        
        if (vehicleNumber && slotNumber) {
            if (addVehicle(vehicleNumber, slotNumber)) {
                document.getElementById('entryForm').reset();
                document.getElementById('entryFormCard').style.display = 'none';
                alert(`Vehicle ${vehicleNumber} parked successfully in Slot ${slotNumber}!`);
            }
        }
    });
    
    // Exit form removed - now using direct exit from active sessions table
    
    // Update Slots
    document.getElementById('updateSlotsBtn').addEventListener('click', function() {
        const slotCount = parseInt(document.getElementById('slotCount').value);
        if (slotCount > 0 && slotCount <= 100) {
            if (confirm(`This will reset all slots. Continue?`)) {
                parkingData.settings.slotCount = slotCount;
                initializeSlots();
                parkingData.activeSessions = [];
                parkingData.history = [];
                saveParkingData();
                updateUI();
                alert(`Parking slots updated to ${slotCount}!`);
            }
        } else {
            alert('Please enter a valid number between 1 and 50');
        }
    });
    
    // Update Rate
    document.getElementById('updateRateBtn').addEventListener('click', function() {
        const hourlyRate = parseFloat(document.getElementById('hourlyRate').value);
        if (hourlyRate >= 0) {
            parkingData.settings.hourlyRate = hourlyRate;
            saveParkingData();
            alert(`Hourly rate updated to ₹${hourlyRate.toFixed(2)}!`);
        } else {
            alert('Please enter a valid hourly rate');
        }
    });
    
    // Export to PDF
    document.getElementById('exportBtn').addEventListener('click', function() {
        exportToPDF();
    });
    
    // Clear All Data
    document.getElementById('clearBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
            if (confirm('This will delete all active sessions and history. Final confirmation?')) {
                parkingData.activeSessions = [];
                parkingData.history = [];
                parkingData.slots.forEach(slot => {
                    slot.isOccupied = false;
                    slot.vehicleNumber = null;
                });
                saveParkingData();
                updateUI();
                alert('All data cleared successfully!');
            }
        }
    });
    
    // Cancel Entry Form
    document.getElementById('cancelEntryBtn').addEventListener('click', function() {
        document.getElementById('entryForm').reset();
        document.getElementById('entryFormCard').style.display = 'none';
    });
    
    // Update active sessions duration in real-time
    setInterval(function() {
        if (parkingData.activeSessions.length > 0) {
            updateActiveSessionsTable();
        }
    }, 1000); // Update every second
}

// Exit Vehicle Direct (for table buttons)
function exitVehicleDirect(vehicleNumber) {
    const exitFormCard = document.getElementById('exitFormCard');
    const historyEntry = removeVehicle(vehicleNumber);
    
    if (historyEntry) {
        // Scroll to last exited display with smooth behavior
        exitFormCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the exit form card
        exitFormCard.style.transition = 'all 0.3s ease';
        exitFormCard.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.6), 0 12px 40px rgba(0, 0, 0, 0.2)';
        exitFormCard.style.transform = 'scale(1.02)';
        exitFormCard.style.border = '2px solid #667eea';
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
            exitFormCard.style.boxShadow = '';
            exitFormCard.style.transform = '';
            exitFormCard.style.border = '';
        }, 3000);
        
        alert(`Vehicle ${historyEntry.vehicleNumber} exited successfully!\nPayment: ₹${historyEntry.payment}`);
    }
}

// Update Last Exited Display
function updateLastExitedDisplay(historyEntry) {
    const lastExitedDisplay = document.getElementById('lastExitedDisplay');
    
    if (historyEntry) {
        const entryTime = new Date(historyEntry.entryTime).toLocaleString();
        const exitTime = new Date(historyEntry.exitTime).toLocaleString();
        
        lastExitedDisplay.innerHTML = `
            <div class="last-exited-content">
                <div class="exited-header">
                    <h3>${historyEntry.vehicleNumber}</h3>
                    <span class="exited-badge">Exited</span>
                </div>
                <div class="exited-details">
                    <p><strong>Slot Number:</strong> ${historyEntry.slotNumber}</p>
                    <p><strong>Entry Time:</strong> ${entryTime}</p>
                    <p><strong>Exit Time:</strong> ${exitTime}</p>
                    <p><strong>Duration:</strong> ${historyEntry.duration}</p>
                    <p class="payment-amount"><strong>Total Payment:</strong> ₹${historyEntry.payment}</p>
                </div>
            </div>
        `;
    } else {
        lastExitedDisplay.innerHTML = '<p class="no-exit-message">No vehicle has exited yet.</p>';
    }
}

// LocalStorage Operations
function saveParkingData() {
    try {
        localStorage.setItem('carParkingData', JSON.stringify(parkingData));
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Error saving data to localStorage');
    }
}

function loadParkingData() {
    try {
        const savedData = localStorage.getItem('carParkingData');
        if (savedData) {
            parkingData = JSON.parse(savedData);
            
            // Convert date strings back to Date objects
            parkingData.activeSessions.forEach(session => {
                session.entryTime = new Date(session.entryTime);
            });
            
            parkingData.history.forEach(entry => {
                entry.entryTime = new Date(entry.entryTime);
                entry.exitTime = new Date(entry.exitTime);
            });
            
            // Ensure settings exist
            if (!parkingData.settings) {
                parkingData.settings = {
                    slotCount: 10,
                    hourlyRate: 5.00
                };
            }
            
            // Initialize slots if empty
            if (!parkingData.slots || parkingData.slots.length === 0) {
                initializeSlots();
            }
        } else {
            // First time - initialize with defaults
            initializeSlots();
            saveParkingData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data from localStorage');
        initializeSlots();
    }
}

// Export to PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const lineHeight = 7;
    
    // Helper function to check if new page is needed
    function checkNewPage(space) {
        if (yPos + space > pageHeight - margin) {
            doc.addPage();
            yPos = 20;
        }
    }
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Car Parking Management System', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Statistics Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistics Overview', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const totalRevenue = parkingData.history.reduce((sum, entry) => {
        return sum + parseFloat(entry.payment);
    }, 0);
    
    const occupiedSlots = parkingData.slots.filter(slot => slot.isOccupied).length;
    const totalSlots = parkingData.slots.length;
    const occupancyRate = totalSlots > 0 ? ((occupiedSlots / totalSlots) * 100).toFixed(1) : 0;
    const availableSlots = totalSlots - occupiedSlots;
    
    doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Occupancy Rate: ${occupancyRate}%`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Available Slots: ${availableSlots}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Total Slots: ${totalSlots}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Hourly Rate: ₹${parkingData.settings.hourlyRate.toFixed(2)}`, margin, yPos);
    yPos += 12;
    
    // Parking Slots Status
    checkNewPage(20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Parking Slots Status', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const occupiedSlotsList = parkingData.slots.filter(slot => slot.isOccupied);
    const availableSlotsList = parkingData.slots.filter(slot => !slot.isOccupied);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Occupied Slots:', margin, yPos);
    yPos += lineHeight;
    doc.setFont('helvetica', 'normal');
    
    if (occupiedSlotsList.length > 0) {
        occupiedSlotsList.forEach(slot => {
            checkNewPage(lineHeight + 2);
            doc.text(`  Slot ${slot.id}: ${slot.vehicleNumber}`, margin + 5, yPos);
            yPos += lineHeight;
        });
    } else {
        doc.text('  No occupied slots', margin + 5, yPos);
        yPos += lineHeight;
    }
    
    yPos += 3;
    checkNewPage(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Available Slots:', margin, yPos);
    yPos += lineHeight;
    doc.setFont('helvetica', 'normal');
    
    if (availableSlotsList.length > 0) {
        const availableNumbers = availableSlotsList.map(slot => slot.id).join(', ');
        // Split into multiple lines if too long
        const maxChars = 50;
        if (availableNumbers.length > maxChars) {
            const parts = availableNumbers.match(/.{1,50}/g);
            parts.forEach((part, index) => {
                checkNewPage(lineHeight + 2);
                doc.text(`  ${part}${index < parts.length - 1 ? ',' : ''}`, margin + 5, yPos);
                yPos += lineHeight;
            });
        } else {
            doc.text(`  ${availableNumbers}`, margin + 5, yPos);
            yPos += lineHeight;
        }
    } else {
        doc.text('  No available slots', margin + 5, yPos);
        yPos += lineHeight;
    }
    
    yPos += 12;
    
    // Active Sessions
    checkNewPage(25);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Active Parking Sessions', margin, yPos);
    yPos += 8;
    
    if (parkingData.activeSessions.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        
        // Table headers
        doc.text('Vehicle', margin, yPos);
        doc.text('Slot', margin + 35, yPos);
        doc.text('Entry Time', margin + 50, yPos);
        doc.text('Duration', margin + 100, yPos);
        yPos += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        
        parkingData.activeSessions.forEach(session => {
            checkNewPage(lineHeight + 3);
            const entryTime = new Date(session.entryTime).toLocaleString();
            const duration = formatDuration(new Date() - session.entryTime);
            
            doc.text(session.vehicleNumber, margin, yPos);
            doc.text(session.slotNumber.toString(), margin + 35, yPos);
            doc.text(entryTime.substring(0, 16), margin + 50, yPos);
            doc.text(duration, margin + 100, yPos);
            yPos += lineHeight;
        });
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('No active sessions', margin, yPos);
        yPos += lineHeight;
    }
    
    yPos += 12;
    
    // Parking History
    checkNewPage(25);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Parking History', margin, yPos);
    yPos += 8;
    
    if (parkingData.history.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        // Table headers
        doc.text('Vehicle', margin, yPos);
        doc.text('Slot', margin + 28, yPos);
        doc.text('Entry', margin + 35, yPos);
        doc.text('Exit', margin + 75, yPos);
        doc.text('Duration', margin + 115, yPos);
        doc.text('Payment', margin + 145, yPos);
        yPos += lineHeight + 2;
        
        doc.setFont('helvetica', 'normal');
        
        // Show most recent first
        const sortedHistory = [...parkingData.history].reverse();
        
        sortedHistory.forEach(entry => {
            checkNewPage(lineHeight + 3);
            const entryTime = new Date(entry.entryTime).toLocaleString();
            const exitTime = new Date(entry.exitTime).toLocaleString();
            
            doc.text(entry.vehicleNumber, margin, yPos);
            doc.text(entry.slotNumber.toString(), margin + 28, yPos);
            doc.text(entryTime.substring(0, 12), margin + 35, yPos);
            doc.text(exitTime.substring(0, 12), margin + 75, yPos);
            doc.text(entry.duration, margin + 115, yPos);
            doc.text(`₹${entry.payment}`, margin + 145, yPos);
            yPos += lineHeight;
        });
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('No history available', margin, yPos);
        yPos += lineHeight;
    }
    
    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // Save PDF
    const fileName = `car-parking-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    alert('PDF report generated successfully!');
}


