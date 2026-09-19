document.addEventListener("DOMContentLoaded", () => {
    let currentBlockedIps = [];

    // 1. Time Update
    const timeDisplay = document.getElementById("current-time");
    setInterval(() => {
        timeDisplay.innerText = new Date().toLocaleTimeString();
    }, 1000);

    // 2. Initialize Traffic Chart (Chart.js)
    const ctx = document.getElementById('trafficChart').getContext('2d');

    // Gradients
    const gradientIn = ctx.createLinearGradient(0, 0, 0, 400);
    gradientIn.addColorStop(0, 'rgba(148, 163, 184, 0.4)'); // Ash
    gradientIn.addColorStop(1, 'rgba(148, 163, 184, 0.0)');

    const gradientOut = ctx.createLinearGradient(0, 0, 0, 400);
    gradientOut.addColorStop(0, 'rgba(0, 240, 255, 0.4)'); // Neon Blue
    gradientOut.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

    const trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Inbound Traffic',
                    borderColor: '#94a3b8',
                    backgroundColor: gradientIn,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    data: [],
                    tension: 0.4
                },
                {
                    label: 'Outbound Traffic',
                    borderColor: '#00f0ff',
                    backgroundColor: gradientOut,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    data: [],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: '#8b8095', font: {family: 'Inter'} }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { color: '#8b8095', font: {family: 'Inter'} }
                },
                y: {
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8b8095', font: {family: 'Inter'} }
                }
            },
            animation: { duration: 0 }
        }
    });

    // 3. Simple Node Animation
    const mapCtx = document.getElementById('networkMapChart').getContext('2d');
    let width = document.getElementById('networkMapChart').offsetWidth;
    let height = document.getElementById('networkMapChart').offsetHeight;
    document.getElementById('networkMapChart').width = width;
    document.getElementById('networkMapChart').height = height;

    class Node {
        constructor(x, y, color) { this.x = x; this.y = y; this.color = color; }
        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.fillStyle = "#8b8095";
            ctx.shadowBlur = 0;
            ctx.font = "10px Inter";
            ctx.fillText("Node", this.x - 12, this.y + 18);
        }
    }

    class Packet {
        constructor(startX, startY, endX, endY) {
            this.x = startX; this.y = startY;
            this.endX = endX; this.endY = endY;
            this.progress = 0;
            this.speed = 0.015 + Math.random() * 0.015;
            const colors = ['#94a3b8', '#00f0ff', '#ff3b3b'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() { this.progress += this.speed; }
        draw(ctx) {
            const currentX = this.x + (this.endX - this.x) * this.progress;
            const currentY = this.y + (this.endY - this.y) * this.progress;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    const mapNodes = [
        new Node(width * 0.5, height * 0.5, '#cbd5e1'), // Center
        new Node(width * 0.2, height * 0.2, '#f0ecf4'),
        new Node(width * 0.8, height * 0.2, '#f0ecf4'),
        new Node(width * 0.2, height * 0.8, '#f0ecf4'),
        new Node(width * 0.8, height * 0.8, '#ff3b3b'), // Suspicious node
        new Node(width * 0.5, height * 0.1, '#f0ecf4')
    ];
    let mapPackets = [];

    function animateMap() {
        mapCtx.clearRect(0, 0, width, height);

        // draw lines
        mapNodes.forEach(node => {
            if (node !== mapNodes[0]) {
                mapCtx.beginPath();
                mapCtx.moveTo(node.x, node.y);
                mapCtx.lineTo(mapNodes[0].x, mapNodes[0].y);
                mapCtx.strokeStyle = 'rgba(255,255,255,0.05)';
                mapCtx.stroke();
            }
        });

        // Generate packets
        if (Math.random() < 0.1) {
            const target = mapNodes[Math.floor(Math.random() * (mapNodes.length - 1)) + 1];
            if (Math.random() > 0.5) {
                mapPackets.push(new Packet(mapNodes[0].x, mapNodes[0].y, target.x, target.y));
            } else {
                mapPackets.push(new Packet(target.x, target.y, mapNodes[0].x, mapNodes[0].y));
            }
        }

        mapPackets.forEach((p, i) => {
            p.update();
            p.draw(mapCtx);
            if (p.progress >= 1) mapPackets.splice(i, 1);
        });

        mapNodes.forEach(node => node.draw(mapCtx));
        requestAnimationFrame(animateMap);
    }
    animateMap();


    // Threat Intelligence Lookup
    const COUNTRIES = ["Russia", "China", "North Korea", "Iran", "Unknown", "Romania", "Brazil"];
    const ATTACKS = ["SSH brute force", "DDoS Node", "SQL Injection", "Malware Callback", "Ransomware C2"];
    const modalOverlay = document.getElementById("ip-modal");

    document.querySelector('.close-modal').addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });

    window.openIpLookup = async function (ip) {
        document.getElementById("modal-ip").innerText = ip;
        document.getElementById("modal-country").innerText = "Querying live database...";
        document.getElementById("modal-reputation").innerText = "Analyzing...";
        document.getElementById("modal-attacks").innerText = "Analyzing...";
        document.getElementById("modal-reputation").className = "detail-value";
        
        const btnText = document.getElementById("block-btn-text");
        const blockBtn = document.getElementById('block-ip-btn');
        
        const isBlocked = currentBlockedIps.includes(ip);
        if (isBlocked) {
            btnText.innerText = "Unblock IP";
            blockBtn.style.background = "rgba(57, 255, 20, 0.15)";
            blockBtn.style.color = "#39ff14";
            blockBtn.style.border = "1px solid #39ff14";
            blockBtn.dataset.action = "unblock";
        } else {
            btnText.innerText = "Block IP";
            blockBtn.style.background = "rgba(255, 59, 59, 0.15)";
            blockBtn.style.color = "#ff3b3b";
            blockBtn.style.border = "1px solid #ff3b3b";
            blockBtn.dataset.action = "block";
        }
        blockBtn.disabled = false;

        modalOverlay.classList.add('active');
        if (window.lucide) lucide.createIcons();

        try {
            const response = await fetch(`http://ip-api.com/json/${ip}`);
            const data = await response.json();

            if (data.status === "success") {
                document.getElementById("modal-country").innerText = data.country || "Unknown";
                document.getElementById("modal-reputation").innerText = "Traced to ISP";
                document.getElementById("modal-reputation").className = "detail-value neon-blue";
                document.getElementById("modal-attacks").innerText = data.isp || "N/A";
            } else {
                document.getElementById("modal-country").innerText = "Local/Private Region";
                document.getElementById("modal-reputation").innerText = "Safe / Internal";
                document.getElementById("modal-reputation").className = "detail-value highlight-green";
                document.getElementById("modal-attacks").innerText = "None";
            }
        } catch (e) {
            document.getElementById("modal-country").innerText = "Lookup Failed";
            document.getElementById("modal-reputation").innerText = "Unknown";
            document.getElementById("modal-attacks").innerText = "Unknown";
        }
    };

    // Block IP Action
    document.getElementById('block-ip-btn').addEventListener('click', async () => {
        const ip = document.getElementById("modal-ip").innerText;
        const btnText = document.getElementById("block-btn-text");
        const blockBtn = document.getElementById('block-ip-btn');
        const action = blockBtn.dataset.action || "block";
        
        if (blockBtn.disabled) return;
        
        btnText.innerText = action === "block" ? "Blocking..." : "Unblocking...";
        blockBtn.disabled = true;
        
        try {
            const url = action === "block" ? '/block_ip' : '/unblock_ip';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: ip })
            });
            const data = await res.json();
            if (data.status === 'success') {
                btnText.innerText = action === "block" ? "IP Blocked" : "IP Unblocked";
                blockBtn.style.background = "rgba(148, 163, 184, 0.15)";
                blockBtn.style.color = "#cbd5e1";
                blockBtn.style.border = "1px solid #cbd5e1";
                setTimeout(() => { modalOverlay.classList.remove('active'); }, 1500);
            } else {
                btnText.innerText = "Error";
                blockBtn.disabled = false;
            }
        } catch (e) {
            btnText.innerText = "Error";
            blockBtn.disabled = false;
        }
    });

    // 4. SSE Stream connecting to Flask Backend
    const source = new EventSource("/stream");

    source.onmessage = function (event) {
        const data = JSON.parse(event.data);
        
        currentBlockedIps = data.blocked_ips_list || [];

        // Update Stats
        document.getElementById("total-packets").innerText = data.stats.total_packets.toLocaleString();
        document.getElementById("suspicious-activities").innerText = data.stats.suspicious_activities.toLocaleString();
        document.getElementById("active-alerts").innerText = data.stats.active_alerts.toLocaleString();
        document.getElementById("blocked-ips").innerText = data.stats.blocked_ips.toLocaleString();
        document.getElementById("nav-alerts-count").innerText = data.stats.active_alerts.toLocaleString();

        // Update Chart
        if (data.history && trafficChart.data.labels.length === 0) {
            data.history.forEach(pt => {
                const timeStr = new Date(pt.time).toLocaleTimeString();
                trafficChart.data.labels.push(timeStr);
                trafficChart.data.datasets[0].data.push(pt.inbound);
                trafficChart.data.datasets[1].data.push(pt.outbound);
            });
            trafficChart.update();
        } else if (data.chart) {
            const timeStr = new Date(data.chart.time).toLocaleTimeString();
            trafficChart.data.labels.push(timeStr);
            trafficChart.data.datasets[0].data.push(data.chart.inbound);
            trafficChart.data.datasets[1].data.push(data.chart.outbound);

            if (trafficChart.data.labels.length > 20) {
                trafficChart.data.labels.shift();
                trafficChart.data.datasets[0].data.shift();
                trafficChart.data.datasets[1].data.shift();
            }
            trafficChart.update();
        }

        // Update Top IPs
        const topIpsList = document.getElementById("top-ips-list");
        topIpsList.innerHTML = "";
        data.top_ips.forEach(ipData => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="clickable-ip" onclick="openIpLookup('${ipData.ip}')">${ipData.ip}</span> <span>${ipData.count} alerts</span>`;
            topIpsList.appendChild(li);
        });

        // Update Alerts Table
        const alertsTbody = document.querySelector("#alerts-table tbody");
        alertsTbody.innerHTML = "";
        data.alerts.forEach(alert => {
            const tr = document.createElement("tr");
            let badgeClass = "badge-low";
            if (alert.severity === "Medium") badgeClass = "badge-medium";
            if (alert.severity === "High" || alert.severity === "Critical") badgeClass = "badge-critical";

            tr.innerHTML = `
                <td>${alert.id}</td>
                <td><span class="clickable-ip" onclick="openIpLookup('${alert.ip}')">${alert.ip}</span></td>
                <td>${alert.port}</td>
                <td>${alert.protocol}</td>
                <td>${alert.type}</td>
                <td><span class="badge ${badgeClass}">${alert.severity}</span></td>
                <td>${alert.timestamp.split(' ')[1]}</td>
            `;
            alertsTbody.appendChild(tr);
        });

        // Update Logs
        const logBody = document.getElementById("event-logs");
        logBody.innerHTML = "";
        data.logs.forEach(log => {
            const div = document.createElement("div");
            div.className = "log-entry";

            let levelClass = "log-info";
            let prefix = "[INFO]";
            if (log.level === "WARNING") { levelClass = "log-warning"; prefix = "[WARN]"; }
            if (log.level === "CRITICAL") { levelClass = "log-critical"; prefix = "[CRIT]"; }

            div.innerHTML = `<span class="log-time">${log.timestamp}</span> <span class="${levelClass}">${prefix}</span> <span style="color:#e5dde9">${log.message}</span>`;
            logBody.appendChild(div);
        });
    };

    source.onerror = function (error) {
        console.error("SSE Error:", error);
    };

    // 5. Rotating Global Threat Map Animation
    const gCtx = document.getElementById('globeChart').getContext('2d');
    let gW = 0, gH = 0;

    let spherePoints = [];
    for (let i = 0; i <= 15; i++) {
        let lat = Math.PI * (-0.5 + i / 15);
        for (let j = 0; j < 25; j++) {
            let lon = 2 * Math.PI * j / 25;
            spherePoints.push({ lat, lon, threat: Math.random() < 0.05 });
        }
    }
    let sphereRotation = 0;

    function resizeGlobe() {
        gW = document.getElementById('globeChart').offsetWidth;
        gH = document.getElementById('globeChart').offsetHeight;
        document.getElementById('globeChart').width = gW;
        document.getElementById('globeChart').height = gH;
    }
    resizeGlobe();

    function drawGlobe() {
        gCtx.clearRect(0, 0, gW, gH);
        let radius = Math.min(gW, gH) / 2 - 20;
        let cx = gW / 2;
        let cy = gH / 2;

        sphereRotation += 0.003;

        spherePoints.forEach(p => {
            let rotatedLon = p.lon + sphereRotation;
            let x3d = Math.cos(p.lat) * Math.cos(rotatedLon);
            let y3d = Math.sin(p.lat);
            let z3d = Math.cos(p.lat) * Math.sin(rotatedLon);

            if (z3d > 0) {
                let x = cx + x3d * radius;
                let y = cy + y3d * radius;

                gCtx.beginPath();
                gCtx.arc(x, y, p.threat ? 2 : 1, 0, Math.PI * 2);
                gCtx.fillStyle = p.threat ? '#ff3b3b' : 'rgba(203, 213, 225, 0.4)'; // Premium light ash
                if (p.threat) {
                    gCtx.shadowBlur = 10;
                    gCtx.shadowColor = '#ff3b3b';
                } else {
                    gCtx.shadowBlur = 0;
                }
                gCtx.fill();
            }
        });
        requestAnimationFrame(drawGlobe);
    }
    drawGlobe();

    window.addEventListener('resize', () => {
        width = document.getElementById('networkMapChart').offsetWidth;
        height = document.getElementById('networkMapChart').offsetHeight;
        document.getElementById('networkMapChart').width = width;
        document.getElementById('networkMapChart').height = height;
        resizeGlobe();
    });
});
