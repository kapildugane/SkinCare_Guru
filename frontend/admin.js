document.addEventListener("DOMContentLoaded", async () => {
    // Supabase-like chart styling defaults
    Chart.defaults.color = '#717171';
    Chart.defaults.font.family = "'Inter', sans-serif";

    function showErrorBanner(message) {
        const wrapper = document.querySelector('.content-wrapper');
        if (!wrapper) return;
        const existing = document.getElementById('dashboard-error-banner');
        if (existing) existing.remove();
        const banner = document.createElement('div');
        banner.id = 'dashboard-error-banner';
        banner.style.cssText = [
            'background: #fff3cd', 'border: 1px solid #ffc107', 'border-radius: 10px',
            'padding: 14px 20px', 'margin-bottom: 20px', 'display: flex',
            'align-items: center', 'gap: 12px', 'font-size: 13.5px', 'color: #856404'
        ].join(';');
        banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size:16px"></i><span>${message}</span>`;
        wrapper.insertBefore(banner, wrapper.firstChild);
    }

    function renderEmptyCharts() {
        const lineCtx = document.getElementById('sessionsChart')?.getContext('2d');
        if (lineCtx) {
            new Chart(lineCtx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Chatbot Sessions', data: [], borderColor: '#e78b60', backgroundColor: 'rgba(231,139,96,0.1)', fill: true, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }
            });
        }
        const pieCtx = document.getElementById('entryChart')?.getContext('2d');
        if (pieCtx) {
            new Chart(pieCtx, {
                type: 'doughnut',
                data: { labels: ['No data yet'], datasets: [{ data: [1], backgroundColor: ['#f0f0f0'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } } }
            });
        }
    }

    let data;
    try {
        const response = await fetch('/api/admin/dashboard');
        if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
        data = await response.json();
    } catch (err) {
        console.error("[Dashboard] Failed to load:", err);
        showErrorBanner(`Dashboard data unavailable: ${err.message}. The backend may be starting up — please refresh in a moment.`);
        document.getElementById('kpi-users').textContent = '--';
        document.getElementById('kpi-consultations').textContent = '--';
        document.getElementById('kpi-routine-length').textContent = '--';
        document.getElementById('kpi-products').textContent = '--';
        renderEmptyCharts();
        return;
    }

    // Warn if backend returned a partial error
    if (data._error) {
        showErrorBanner(data._error);
    }

    // Update KPIs
    document.getElementById('kpi-users').textContent = (data.total_users ?? 0).toLocaleString();
    document.getElementById('kpi-consultations').textContent = (data.completed_consultations ?? 0).toLocaleString();
    document.getElementById('kpi-routine-length').textContent = data.avg_routine_length ?? '0.0';
    document.getElementById('kpi-products').textContent = (data.products_recommended ?? 0).toLocaleString();

    // Render Line Chart (Sessions Over Time)
    const lineCtx = document.getElementById('sessionsChart').getContext('2d');
    const labels = (data.sessions_over_time || []).map(s => s.date);
    const counts = (data.sessions_over_time || []).map(s => s.count);

    new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Chatbot Sessions',
                data: counts,
                borderColor: '#e78b60',
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
    const rawDist = data.entry_card_dist || [];
    const pieLabels = rawDist.length > 0 ? rawDist.map(e => e.name) : ['No data yet'];
    const pieData   = rawDist.length > 0 ? rawDist.map(e => e.value) : [1];
    const pieColors = rawDist.length > 0
        ? ['#e78b60', '#edaa8b', '#f3cbb6', '#f9ede4']
        : ['#f0f0f0'];

    new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: pieLabels,
            datasets: [{
                data: pieData,
                backgroundColor: pieColors,
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
});
