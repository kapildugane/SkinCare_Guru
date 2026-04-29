document.addEventListener("DOMContentLoaded", async () => {
    // Supabase-like chart styling defaults
    Chart.defaults.color = '#a0a0a0';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    try {
        const response = await fetch('/api/admin/dashboard');
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();

        // Update KPIs
        document.getElementById('kpi-users').textContent = data.total_users;
        document.getElementById('kpi-consultations').textContent = data.completed_consultations;
        document.getElementById('kpi-routine-length').textContent = data.avg_routine_length;
        document.getElementById('kpi-products').textContent = data.products_recommended;

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
                    borderColor: '#24b47e', // Supabase green
                    backgroundColor: 'rgba(36, 180, 126, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#24b47e',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#24b47e',
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
                        backgroundColor: '#242424',
                        titleColor: '#ededed',
                        bodyColor: '#a0a0a0',
                        borderColor: '#333333',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#333333', drawBorder: false },
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
                        '#24b47e', // Green
                        '#3ecf8e', // Light Green
                        '#1f8a62', // Dark Green
                        '#104d37'  // Darker Green
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
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: '#242424',
                        titleColor: '#ededed',
                        bodyColor: '#a0a0a0',
                        borderColor: '#333333',
                        borderWidth: 1,
                        padding: 10
                    }
                }
            }
        });

    } catch (err) {
        console.error("Error loading dashboard:", err);
    }
});
