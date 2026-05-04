document.addEventListener("DOMContentLoaded", async () => {
    // Supabase-like chart styling defaults
    Chart.defaults.color = '#717171';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    try {
        const response = await fetch('/api/admin/dashboard');
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();

        // Update KPIs
        document.getElementById('kpi-users').textContent = data.total_users.toLocaleString();
        document.getElementById('kpi-consultations').textContent = data.completed_consultations.toLocaleString();
        document.getElementById('kpi-routine-length').textContent = data.avg_routine_length;
        document.getElementById('kpi-products').textContent = data.products_recommended.toLocaleString();

        // Render Line Chart (Sessions Over Time)
        const lineCtx = document.getElementById('sessionsChart').getContext('2d');
        const labels = data.sessions_over_time.map(s => s.date);
        const counts = data.sessions_over_time.map(s => s.count);

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Chatbot Sessions',
                    data: counts,
                    borderColor: '#e78b60', // Peach accent
                    backgroundColor: 'rgba(231, 139, 96, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#e78b60',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#e78b60',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#1a1a1a',
                        bodyColor: '#717171',
                        borderColor: '#f0f0f0',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        titleFont: { family: "'Inter', sans-serif", weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif" }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0', drawBorder: false, borderDash: [5, 5] },
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });

        // Render Pie Chart (Entry Card Distribution)
        const pieCtx = document.getElementById('entryChart').getContext('2d');
        const pieLabels = data.entry_card_dist.map(e => e.name);
        const pieData = data.entry_card_dist.map(e => e.value);

        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: [
                        '#e78b60', // Peach
                        '#edaa8b', // Lighter Peach
                        '#f3cbb6', // Even Lighter
                        '#f9ede4'  // Very Light
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: "'Inter', sans-serif" }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#1a1a1a',
                        bodyColor: '#717171',
                        borderColor: '#f0f0f0',
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { family: "'Inter', sans-serif", weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif" }
                    }
                }
            }
        });

    } catch (err) {
        console.error("Error loading dashboard:", err);
    }
});
