
        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCW41kfZanNe4PERnMTCsP_XkL4U1XCQ1Q",
            authDomain: "pemilu-210f7.firebaseapp.com",
            databaseURL: "https://pemilu-210f7-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "pemilu-210f7",
            storageBucket: "pemilu-210f7.appspot.com",
            messagingSenderId: "530335513266",
            appId: "1:530335513266:web:d6004bdad8b214ded027ab"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        // Admin credentials
        const adminCredentials = 
            {
            username: "admin",
            password: "admin123",
        };
        // Action history for undo/redo
        let actionHistory = [];
        let currentHistoryIndex = -1;

        // Chart instances
        let votesChart, dailyChart, dateChart, candidateChart;

        // DOM Ready
        document.addEventListener('DOMContentLoaded', function() {
            initLoginPage();
            
            // Check if already logged in
            if (localStorage.getItem('adminLoggedIn') === 'true') {
                showAdminPanel();
                initAdminPanel();
            }
        });

        function showLoginPage() {
            document.getElementById('login-page').style.display = 'flex';
            document.getElementById('admin-panel').style.display = 'none';
        }

        function showAdminPanel() {
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
        }

        function initLoginPage() {
            const loginForm = document.getElementById('login-form');
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                // Simple authentication
                if (username === adminCredentials.username && password === adminCredentials.password) {
                    localStorage.setItem('adminLoggedIn', 'true');
                    showAdminPanel();
                    initAdminPanel();
                } else {
                    alert('Username atau password salah!');
                }
            });
        }

        function initAdminPanel() {
            // Toggle sidebar for mobile
            const sidebarToggle = document.getElementById('sidebarToggle');
            sidebarToggle.addEventListener('click', function() {
                document.getElementById('sidebar').classList.toggle('active');
                document.getElementById('main-content').classList.toggle('active');
            });

            // Initialize sidebar navigation
            document.querySelectorAll('.sidebar .nav-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Remove active class from all links
                    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                    
                    // Add active class to clicked link
                    this.classList.add('active');
                    
                    // Hide all sections
                    document.querySelectorAll('.section-content').forEach(section => {
                        section.style.display = 'none';
                    });
                    
                    // Show selected section
                    const sectionId = this.getAttribute('data-section') + '-section';
                    document.getElementById(sectionId).style.display = 'block';
                    
                    // Load data if needed
                    if (sectionId === 'dashboard-section') {
                        loadDashboardData();
                    } else if (sectionId === 'data-by-date-section') {
                        loadDateFilterData();
                    } else if (sectionId === 'data-by-candidate-section') {
                        loadCandidateFilterData();
                    } else if (sectionId === 'manage-data-section') {
                        loadAllData();
                    }
                });
            });

            // Initialize logout button
            document.getElementById('logout-btn').addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('adminLoggedIn');
                showLoginPage();
            });

            // Load initial data
            loadDashboardData();
            loadCandidateOptions();
        }

            // Initialize refresh buttons
            document.getElementById('refresh-data').addEventListener('click', loadDashboardData);
            document.getElementById('refresh-all-data').addEventListener('click', loadAllData);

            // Initialize filter buttons
            document.getElementById('filter-by-date').addEventListener('click', filterDataByDate);
            document.getElementById('filter-by-candidate').addEventListener('click', filterDataByCandidate);

            // Initialize export buttons
            document.getElementById('export-date-data').addEventListener('click', exportDateData);
            document.getElementById('export-candidate-data').addEventListener('click', exportCandidateData);

            // Initialize form submissions
            document.getElementById('add-data-form').addEventListener('submit', addNewData);
            document.getElementById('save-edit').addEventListener('click', saveEdit);

            // Initialize undo/redo buttons
            document.getElementById('undo-btn').addEventListener('click', undoAction);
            document.getElementById('redo-btn').addEventListener('click', redoAction);

            // Load initial data
            loadDashboardData();
            loadCandidateOptions();
        

        function loadDashboardData() {
            const votesRef = database.ref('Pemilu');
            
            votesRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const recentData = [];
                const candidateVotes = {};
                const dailyVotes = {};
                
                // Process data
                for (const date in data) {
                    for (const nisn in data[date]) {
                        const vote = data[date][nisn];
                        recentData.push({
                            nisn: nisn,
                            nipd: vote.NIPD || '-',
                            candidate: vote.Kandidat,
                            candidateName: vote.NamaKandidat || `Kandidat ${vote.Kandidat}`,
                            date: date,
                            time: vote.Waktu || '-'
                        });
                        
                        // Count votes per candidate
                        if (!candidateVotes[vote.Kandidat]) {
                            candidateVotes[vote.Kandidat] = {
                                count: 0,
                                name: vote.NamaKandidat || `Kandidat ${vote.Kandidat}`
                            };
                        }
                        candidateVotes[vote.Kandidat].count++;
                        
                        // Count votes per day
                        if (!dailyVotes[date]) {
                            dailyVotes[date] = 0;
                        }
                        dailyVotes[date]++;
                    }
                }
                
                // Sort recent data by date and time (newest first)
                recentData.sort((a, b) => {
                    const dateA = new Date(`${a.date} ${a.time}`);
                    const dateB = new Date(`${b.date} ${b.time}`);
                    return dateB - dateA;
                });
                
                // Display recent data (limit to 10)
                displayRecentData(recentData.slice(0, 10));
                
                // Create charts
                createVotesChart(candidateVotes);
                createDailyChart(dailyVotes);
            });
        }

        function displayRecentData(data) {
            const tableBody = document.querySelector('#recent-data-table tbody');
            tableBody.innerHTML = '';
            
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.nisn}</td>
                    <td>${item.nipd}</td>
                    <td>${item.candidate}</td>
                    <td>${item.candidateName}</td>
                    <td>${item.date}</td>
                    <td>${item.time}</td>
                `;
                tableBody.appendChild(row);
            });
        }

        function createVotesChart(data) {
            const ctx = document.getElementById('votesChart').getContext('2d');
            const candidates = Object.keys(data).sort();
            const labels = candidates.map(c => data[c].name);
            const votes = candidates.map(c => data[c].count);
            
            if (votesChart) {
                votesChart.destroy();
            }
            
            votesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Jumlah Suara',
                        data: votes,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(153, 102, 255, 0.7)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Distribusi Suara per Kandidat'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        function createDailyChart(data) {
            const ctx = document.getElementById('dailyChart').getContext('2d');
            const dates = Object.keys(data).sort();
            const votes = dates.map(d => data[d]);
            
            if (dailyChart) {
                dailyChart.destroy();
            }
            
            dailyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Jumlah Suara',
                        data: votes,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Jumlah Suara Harian'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        function loadCandidateOptions() {
            // In a real app, you might want to maintain a separate list of candidates
            // For this demo, we'll extract them from the voting data
            const votesRef = database.ref('Pemilu');
            
            votesRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const candidates = new Set();
                
                for (const date in data) {
                    for (const nisn in data[date]) {
                        const vote = data[date][nisn];
                        candidates.add(`${vote.Kandidat}|${vote.NamaKandidat || `Kandidat ${vote.Kandidat}`}`);
                    }
                }
                
                // Populate candidate dropdowns
                const candidateSelects = [
                    document.getElementById('candidate-filter'),
                    document.getElementById('new-candidate'),
                    document.getElementById('edit-candidate')
                ];
                
                candidateSelects.forEach(select => {
                    // Clear existing options except the first one (if it's a placeholder)
                    if (select.id === 'candidate-filter' && select.options.length > 0) {
                        // Keep the "Semua Kandidat" option
                        while (select.options.length > 1) {
                            select.remove(1);
                        }
                    } else {
                        select.innerHTML = '';
                        
                        if (select.id === 'candidate-filter') {
                            select.innerHTML = '<option value="">Semua Kandidat</option>';
                        }
                    }
                    
                    // Add candidate options
                    Array.from(candidates).sort().forEach(candidate => {
                        const [value, name] = candidate.split('|');
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = name;
                        select.appendChild(option);
                    });
                });
            });
        }

        function loadDateFilterData() {
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date-filter').value = today;
            
            // Load data for today by default
            filterDataByDate();
        }

        function filterDataByDate() {
            const date = document.getElementById('date-filter').value;
            
            if (!date) {
                alert('Silakan pilih tanggal terlebih dahulu!');
                return;
            }
            
            const dateRef = database.ref(`Pemilu/${date}`);
            
            dateRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const filteredData = [];
                const candidateCounts = {};
                
                if (data) {
                    for (const nisn in data) {
                        const vote = data[nisn];
                        filteredData.push({
                            nisn: nisn,
                            nipd: vote.NIPD || '-',
                            candidate: vote.Kandidat,
                            candidateName: vote.NamaKandidat || `Kandidat ${vote.Kandidat}`,
                            date: date,
                            time: vote.Waktu || '-',
                            key: `${date}/${nisn}`
                        });
                        
                        // Count votes per candidate for the chart
                        if (!candidateCounts[vote.Kandidat]) {
                            candidateCounts[vote.Kandidat] = {
                                count: 0,
                                name: vote.NamaKandidat || `Kandidat ${vote.Kandidat}`
                            };
                        }
                        candidateCounts[vote.Kandidat].count++;
                    }
                }
                
                // Display filtered data
                displayDateFilteredData(filteredData);
                
                // Create chart for the date
                createDateChart(candidateCounts, date);
            });
        }

        function displayDateFilteredData(data) {
            const tableBody = document.querySelector('#date-data-table tbody');
            tableBody.innerHTML = '';
            
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.nisn}</td>
                    <td>${item.nipd}</td>
                    <td>${item.candidate}</td>
                    <td>${item.candidateName}</td>
                    <td>${item.time}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2 edit-btn" data-key="${item.key}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-key="${item.key}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    showEditModal(key);
                });
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                        deleteData(key);
                    }
                });
            });
        }

        function createDateChart(data, date) {
            const ctx = document.getElementById('dateChart').getContext('2d');
            const candidates = Object.keys(data).sort();
            const labels = candidates.map(c => data[c].name);
            const votes = candidates.map(c => data[c].count);
            
            if (dateChart) {
                dateChart.destroy();
            }
            
            dateChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: votes,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(153, 102, 255, 0.7)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        },
                        title: {
                            display: true,
                            text: `Distribusi Suara pada ${date}`
                        }
                    }
                }
            });
        }

        function loadCandidateFilterData() {
            // Load data for all candidates by default
            filterDataByCandidate();
        }

        function filterDataByCandidate() {
            const candidate = document.getElementById('candidate-filter').value;
            const votesRef = database.ref('Pemilu');
            
            votesRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const filteredData = [];
                const dateCounts = {};
                
                for (const date in data) {
                    for (const nisn in data[date]) {
                        const vote = data[date][nisn];
                        
                        if (!candidate || vote.Kandidat === candidate) {
                            filteredData.push({
                                nisn: nisn,
                                nipd: vote.NIPD || '-',
                                candidate: vote.Kandidat,
                                candidateName: vote.NamaKandidat || `Kandidat ${vote.Kandidat}`,
                                date: date,
                                time: vote.Waktu || '-',
                                key: `${date}/${nisn}`
                            });
                            
                            // Count votes per date for the chart
                            if (!dateCounts[date]) {
                                dateCounts[date] = 0;
                            }
                            dateCounts[date]++;
                        }
                    }
                }
                
                // Sort by date (newest first)
                filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Display filtered data
                displayCandidateFilteredData(filteredData, candidate);
                
                // Create chart for the candidate
                createCandidateChart(dateCounts, candidate);
            });
        }

        function displayCandidateFilteredData(data, candidateFilter) {
            const tableBody = document.querySelector('#candidate-data-table tbody');
            tableBody.innerHTML = '';
            
            data.forEach(item => {
                // If filtering by a specific candidate, skip if it doesn't match
                if (candidateFilter && item.candidate !== candidateFilter) {
                    return;
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.nisn}</td>
                    <td>${item.nipd}</td>
                    <td>${item.candidate}</td>
                    <td>${item.date}</td>
                    <td>${item.time}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2 edit-btn" data-key="${item.key}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-key="${item.key}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    showEditModal(key);
                });
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                        deleteData(key);
                    }
                });
            });
        }

        function createCandidateChart(data, candidate) {
            const ctx = document.getElementById('candidateChart').getContext('2d');
            const dates = Object.keys(data).sort();
            const votes = dates.map(d => data[d]);
            
            // Get candidate name for title
            let candidateName = 'Semua Kandidat';
            if (candidate) {
                const candidateSelect = document.getElementById('candidate-filter');
                for (let i = 0; i < candidateSelect.options.length; i++) {
                    if (candidateSelect.options[i].value === candidate) {
                        candidateName = candidateSelect.options[i].text;
                        break;
                    }
                }
            }
            
            if (candidateChart) {
                candidateChart.destroy();
            }
            
            candidateChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Jumlah Suara',
                        data: votes,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: `Distribusi Suara untuk ${candidateName}`
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        function loadAllData() {
            const votesRef = database.ref('Pemilu');
            
            votesRef.once('value').then(snapshot => {
                const data = snapshot.val();
                const allData = [];
                
                for (const date in data) {
                    for (const nisn in data[date]) {
                        const vote = data[date][nisn];
                        allData.push({
                            nisn: nisn,
                            nipd: vote.NIPD || '-',
                            candidate: vote.Kandidat,
                            candidateName: vote.NamaKandidat || `Kandidat ${vote.Kandidat}`,
                            date: date,
                            time: vote.Waktu || '-',
                            key: `${date}/${nisn}`
                        });
                    }
                }
                
                // Sort by date (newest first)
                allData.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Display all data
                displayAllData(allData);
            });
        }

        function displayAllData(data) {
            const tableBody = document.querySelector('#all-data-table tbody');
            tableBody.innerHTML = '';
            
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.nisn}</td>
                    <td>${item.nipd}</td>
                    <td>${item.candidate}</td>
                    <td>${item.candidateName}</td>
                    <td>${item.date}</td>
                    <td>${item.time}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2 edit-btn" data-key="${item.key}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-key="${item.key}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    showEditModal(key);
                });
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                        deleteData(key);
                    }
                });
            });
        }

        function showEditModal(key) {
            const ref = database.ref(`Pemilu/${key}`);
            
            ref.once('value').then(snapshot => {
                const data = snapshot.val();
                const [date, nisn] = key.split('/');
                
                document.getElementById('edit-key').value = key;
                document.getElementById('edit-nisn').value = nisn;
                document.getElementById('edit-nipd').value = data.NIPD || '';
                document.getElementById('edit-date').value = date;
                document.getElementById('edit-time').value = data.Waktu || '';
                
                // Set candidate selection
                const candidateSelect = document.getElementById('edit-candidate');
                for (let i = 0; i < candidateSelect.options.length; i++) {
                    if (candidateSelect.options[i].value === data.Kandidat) {
                        candidateSelect.selectedIndex = i;
                        break;
                    }
                }
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('editModal'));
                modal.show();
            });
        }

        function saveEdit() {
            const key = document.getElementById('edit-key').value;
            const nisn = document.getElementById('edit-nisn').value;
            const nipd = document.getElementById('edit-nipd').value;
            const candidate = document.getElementById('edit-candidate').value;
            const date = document.getElementById('edit-date').value;
            const time = document.getElementById('edit-time').value;
            
            // Get candidate name
            const candidateSelect = document.getElementById('edit-candidate');
            const candidateName = candidateSelect.options[candidateSelect.selectedIndex].text;
            
            // Get original data for undo
            const originalRef = database.ref(`Pemilu/${key}`);
            
            originalRef.once('value').then(snapshot => {
                const originalData = snapshot.val();
                
                // Create new data
                const newData = {
                    Kandidat: candidate,
                    NamaKandidat: candidateName,
                    NIPD: nipd,
                    Waktu: time
                };
                
                // If date changed, we need to move the data
                const [originalDate, originalNisn] = key.split('/');
                
                if (date !== originalDate || nisn !== originalNisn) {
                    // Add to action history for undo
                    addToHistory({
                        type: 'move',
                        originalKey: key,
                        newKey: `${date}/${nisn}`,
                        originalData: originalData,
                        newData: newData
                    });
                    
                    // Remove from original location and add to new location
                    const updates = {};
                    updates[`Pemilu/${originalDate}/${originalNisn}`] = null;
                    updates[`Pemilu/${date}/${nisn}`] = newData;
                    
                    database.ref().update(updates).then(() => {
                        alert('Data berhasil diupdate!');
                        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                        
                        // Refresh data
                        if (document.getElementById('data-by-date-section').style.display !== 'none') {
                            filterDataByDate();
                        }
                        if (document.getElementById('data-by-candidate-section').style.display !== 'none') {
                            filterDataByCandidate();
                        }
                        if (document.getElementById('manage-data-section').style.display !== 'none') {
                            loadAllData();
                        }
                    }).catch(error => {
                        alert('Terjadi error saat mengupdate data: ' + error.message);
                    });
                } else {
                    // Add to action history for undo
                    addToHistory({
                        type: 'edit',
                        key: key,
                        originalData: originalData,
                        newData: newData
                    });
                    
                    // Just update the data
                    originalRef.update(newData).then(() => {
                        alert('Data berhasil diupdate!');
                        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                        
                        // Refresh data
                        if (document.getElementById('data-by-date-section').style.display !== 'none') {
                            filterDataByDate();
                        }
                        if (document.getElementById('data-by-candidate-section').style.display !== 'none') {
                            filterDataByCandidate();
                        }
                        if (document.getElementById('manage-data-section').style.display !== 'none') {
                            loadAllData();
                        }
                    }).catch(error => {
                        alert('Terjadi error saat mengupdate data: ' + error.message);
                    });
                }
            });
        }

        function addNewData(e) {
            e.preventDefault();
            
            const nisn = document.getElementById('new-nisn').value;
            const nipd = document.getElementById('new-nipd').value;
            const candidate = document.getElementById('new-candidate').value;
            const date = document.getElementById('new-date').value;
            const time = document.getElementById('new-time').value;
            
            // Get candidate name
            const candidateSelect = document.getElementById('new-candidate');
            const candidateName = candidateSelect.options[candidateSelect.selectedIndex].text;
            
            // Create new data
            const newData = {
                Kandidat: candidate,
                NamaKandidat: candidateName,
                NIPD: nipd,
                Waktu: time
            };
            
            // Check if data already exists
            const ref = database.ref(`Pemilu/${date}/${nisn}`);
            
            ref.once('value').then(snapshot => {
                if (snapshot.exists()) {
                    alert('Data untuk NISN ini pada tanggal tersebut sudah ada!');
                    return;
                }
                
                // Add to action history for undo
                addToHistory({
                    type: 'add',
                    key: `${date}/${nisn}`,
                    newData: newData
                });
                
                // Add new data
                ref.set(newData).then(() => {
                    alert('Data berhasil ditambahkan!');
                    document.getElementById('add-data-form').reset();
                    
                    // Refresh data
                    if (document.getElementById('data-by-date-section').style.display !== 'none') {
                        filterDataByDate();
                    }
                    if (document.getElementById('data-by-candidate-section').style.display !== 'none') {
                        filterDataByCandidate();
                    }
                    if (document.getElementById('manage-data-section').style.display !== 'none') {
                        loadAllData();
                    }
                }).catch(error => {
                    alert('Terjadi error saat menambahkan data: ' + error.message);
                });
            });
        }

        function deleteData(key) {
            const ref = database.ref(`Pemilu/${key}`);
            
            ref.once('value').then(snapshot => {
                const data = snapshot.val();
                
                // Add to action history for undo
                addToHistory({
                    type: 'delete',
                    key: key,
                    originalData: data
                });
                
                // Delete data
                ref.remove().then(() => {
                    alert('Data berhasil dihapus!');
                    
                    // Refresh data
                    if (document.getElementById('data-by-date-section').style.display !== 'none') {
                        filterDataByDate();
                    }
                    if (document.getElementById('data-by-candidate-section').style.display !== 'none') {
                        filterDataByCandidate();
                    }
                    if (document.getElementById('manage-data-section').style.display !== 'none') {
                        loadAllData();
                    }
                }).catch(error => {
                    alert('Terjadi error saat menghapus data: ' + error.message);
                });
            });
        }

        function exportDateData() {
            const table = document.getElementById('date-data-table');
            exportTableToExcel(table, 'Data_Pemilu_Tanggal');
        }

        function exportCandidateData() {
            const table = document.getElementById('candidate-data-table');
            exportTableToExcel(table, 'Data_Pemilu_Kandidat');
        }

        function exportTableToExcel(table, filename) {
            let html = table.outerHTML;
            
            // Create a download link
            const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `${filename}.xls`;
            link.click();
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        }

        function addToHistory(action) {
            // If we're not at the end of history, remove future actions
            if (currentHistoryIndex < actionHistory.length - 1) {
                actionHistory = actionHistory.slice(0, currentHistoryIndex + 1);
            }
            
            actionHistory.push(action);
            currentHistoryIndex = actionHistory.length - 1;
            
            updateUndoRedoButtons();
        }

        function undoAction() {
            if (currentHistoryIndex < 0) return;
            
            const action = actionHistory[currentHistoryIndex];
            
            switch (action.type) {
                case 'add':
                    // Undo add by deleting
                    database.ref(`Pemilu/${action.key}`).remove();
                    break;
                    
                case 'delete':
                    // Undo delete by restoring
                    database.ref(`Pemilu/${action.key}`).set(action.originalData);
                    break;
                    
                case 'edit':
                    // Undo edit by restoring original data
                    database.ref(`Pemilu/${action.key}`).set(action.originalData);
                    break;
                    
                case 'move':
                    // Undo move by moving back
                    const updates = {};
                    updates[`Pemilu/${action.originalKey}`] = action.originalData;
                    updates[`Pemilu/${action.newKey}`] = null;
                    database.ref().update(updates);
                    break;
            }
            
            currentHistoryIndex--;
            updateUndoRedoButtons();
            
            // Refresh data
            if (document.getElementById('data-by-date-section').style.display !== 'none') {
                filterDataByDate();
            }
            if (document.getElementById('data-by-candidate-section').style.display !== 'none') {
                filterDataByCandidate();
            }
            if (document.getElementById('manage-data-section').style.display !== 'none') {
                loadAllData();
            }
        }

        function redoAction() {
            if (currentHistoryIndex >= actionHistory.length - 1) return;
            
            currentHistoryIndex++;
            const action = actionHistory[currentHistoryIndex];
            
            switch (action.type) {
                case 'add':
                    // Redo add by adding again
                    database.ref(`Pemilu/${action.key}`).set(action.newData);
                    break;
                    
                case 'delete':
                    // Redo delete by deleting again
                    database.ref(`Pemilu/${action.key}`).remove();
                    break;
                    
                case 'edit':
                    // Redo edit by applying new data again
                    database.ref(`Pemilu/${action.key}`).set(action.newData);
                    break;
                    
                case 'move':
                    // Redo move by moving again
                    const updates = {};
                    updates[`Pemilu/${action.originalKey}`] = null;
                    updates[`Pemilu/${action.newKey}`] = action.newData;
                    database.ref().update(updates);
                    break;
            }
            
            updateUndoRedoButtons();
            
            // Refresh data
            if (document.getElementById('data-by-date-section').style.display !== 'none') {
                filterDataByDate();
            }
            if (document.getElementById('data-by-candidate-section').style.display !== 'none') {
                filterDataByCandidate();
            }
            if (document.getElementById('manage-data-section').style.display !== 'none') {
                loadAllData();
            }
        }

        function updateUndoRedoButtons() {
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            
            undoBtn.disabled = currentHistoryIndex < 0;
            redoBtn.disabled = currentHistoryIndex >= actionHistory.length - 1;
        }
