let state = {
    robots: [],
    alerts: [],
    selected: 'RB-001',
    chart: null,
    modalRobot: null
};
const $ = s=>document.querySelector(s);
const esc = s=>String(s).replace(/[&<>'"]/g,c=>({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[c]));
    async function api(url,opt){const r = await fetch(url, opt); return r.json()}
    async function refresh(){state = Object.assign(state, await api('/api/dashboard')); render(); if (state.robots.length) await selectRobot(state.selected, true)}
    function render(){
    $('#stats').innerHTML = `${stat('Total Robots', state.stats.total, 'bi-robot', 'primary')}${stat('Online', state.stats.active, 'bi-broadcast', 'success')}${stat('Charging', state.stats.charging, 'bi-lightning-charge', 'warning')}${stat('Offline', state.stats.offline, 'bi-slash-circle', 'secondary')}${stat('Avg Battery', state.stats.avgBattery.toFixed(0)+'%', 'bi-battery-half', 'info')}`;
    $('#map').querySelectorAll('.robot-pin').forEach(e => e.remove()); state.robots.forEach(r => {
        const el = document.createElement('button'); el.className = `robot-pin ${r.status} ${r.temperature > 55 || r.battery < 20?'danger': ''}`; el.style.left = r.x+'%'; el.style.top = r.y+'%'; el.title = r.name; el.innerHTML = `<i class="bi bi-robot"></i><span class="robot-label">${r.name}</span>`; el.onclick = ()=>selectRobot(r.id); $('#map').appendChild(el)});
    $('#alerts').innerHTML = state.alerts.filter(a=>!a.acknowledged).slice(0, 8).map(a => `<div class="list-group-item alert-item ${a.severity}"><div class="d-flex justify-content-between"><strong>${esc(a.title)}</strong><button class="btn btn-sm btn-link" onclick="ack(${a.id})">Ack</button></div><div class="small">${esc(a.robotId)} · ${esc(a.message)}</div><div class="text-secondary small mt-1">${new Date(a.time).toLocaleTimeString()}</div></div>`).join('') || '<div class="p-4 text-center text-secondary">No active alerts</div>';
    $('#robotTable').innerHTML = state.robots.map(r => `<tr><td><strong>${r.name}</strong><div class="small text-secondary">${r.id} · ${r.type}</div></td><td><span class="badge text-bg-${r.status === 'online'?'success': r.status === 'charging'?'warning': 'secondary'} status-badge">${r.status}</span></td><td style="min-width:90px"><div class="small fw-bold">${r.battery.toFixed(0)}%</div><div class="progress"><div class="progress-bar" style="width:${r.battery}%"></div></div></td><td><button class="btn btn-sm btn-outline-primary" onclick="openControls('${r.id}')"><i class="bi bi-sliders"></i></button></td></tr>`).join('');
    $('#robotSelect').innerHTML = state.robots.map(r => `<option value="${r.id}" ${r.id === state.selected?'selected': ''}>${r.name} (${r.id})</option>`).join('');
    }
    function stat(label,value,icon,color){return `<div class="col-6 col-md"><div class="card shadow-sm p-3"><div class="d-flex justify-content-between"><span class="text-secondary small">${label}</span><i class="bi ${icon} text-${color}"></i></div><div class="fs-4 fw-bold mt-1">${value}</div></div></div>`}
    async function selectRobot(id,silent=false){state.selected = id; const r = state.robots.find(x => x.id === id); if (!r)return; $('#telemetry').innerHTML = [['Battery', r.battery.toFixed(1)+'%', 'bi-battery-half'], ['Temperature', r.temperature.toFixed(1)+'°C', 'bi-thermometer-half'], ['Speed', r.speed.toFixed(2)+' m/s', 'bi-speedometer2'], ['Load', r.load.toFixed(0)+'%', 'bi-box-seam']].map(x => `<div class="col-6 col-md-3"><div class="metric"><div class="text-secondary small"><i class="bi ${x[2]} me-1"></i>${x[0]}</div><div class="value">${x[1]}</div></div></div>`).join('');
    const h = await api('/api/robots/'+id+'/history'); const labels = h.map(x => new Date(x.time).toLocaleTimeString()); if (state.chart)state.chart.destroy(); state.chart = new Chart($('#chart'), {
        type: 'line', data: {
            labels, datasets: [{
                label: 'Battery %', data: h.map(x => x.battery), tension: .35
            }, {
                label: 'Temperature °C', data: h.map(x => x.temperature), tension: .35
            }]}, options: {
            responsive: true, interaction: {
                mode: 'index', intersect: false
            }, plugins: {
                legend: {
                    position: 'bottom'
                }}, scales: {
                y: {
                    beginAtZero: false
                }}}}); if (!silent) render()}
    function openControls(id){state.modalRobot = id; const r = state.robots.find(x => x.id === id); $('#modalRobot').innerHTML = `<div class="p-3 bg-light rounded"><strong>${r.name}</strong> (${r.id})<br><span class="text-secondary">${r.status} · ${r.mode} · ${r.battery.toFixed(0)}% battery</span></div>`; new bootstrap.Modal($('#controlModal')).show()}
    async function action(a){await api('/api/robots/'+state.modalRobot+'/action', {
        method: 'POST', headers: {
            'Content-Type': 'application/json'
        }, body: JSON.stringify({
                action: a
            })}); bootstrap.Modal.getInstance($('#controlModal')).hide(); await refresh()}
    async function ack(id){await api('/api/alerts/'+id+'/ack', {
        method: 'POST'
    }); await refresh()}
    refresh();setInterval(refresh,3000);