# Network Threat Detection SOC Dashboard
## Comprehensive Technical Documentation

### 1. Overview & Objective
The Network Threat Detection SOC (Security Operations Center) Dashboard is a real-time web application designed to monitor, track, and alert users of potentially malicious network activities targeting their host machine. Operating by sniffing raw network packets, the system serves as a lightweight Intrusion Detection System (IDS), applying active heuristic rules to identify classic network attack vectors such as Ping Sweeps, Port Scans, and High-Volume Traffic bursts.

### 2. Architecture & Tech Stack
The application embodies a modern frontend-backend separation utilizing a robust yet lightweight technology stack:
*   **Backend framework:** Flask 3.0.3, Werkzeug 3.0.1
*   **Packet Sniffing Engine:** Scapy 2.5.0 (Requires Npcap/WinPcap on Windows for low-level L2/L3 access)
*   **Real-time Communication:** Server-Sent Events (SSE) via the `/stream` endpoint for unidirectional, lightweight real-time data streaming from the backend to the client.
*   **Frontend UI:**
    *   Vanilla HTML5 / CSS3 structured in the `templates/` and `static/css/` directories.
    *   Vanilla JavaScript (`static/js/main.js`) handling SSE events, DOM updates, Modal interactions, and Canvas API animations.
    *   **Icons Framework:** Lucide Icons.
    *   **Data Visualization:** Chart.js mapped to Canvas elements for fluid traffic line charts.

### 3. File Structure
The project is built over the following unified structure:
```text
/CyberSecurity Threat Detection/
│
├── app.py                      # Main Python backend housing the Flask Server and Scapy background thread
├── requirements.txt            # Explicit Python dependencies
├── HOW_IT_WORKS_SIMPLE.md      # A layman explainer for non-technical users
├── DOCUMENTATION.md            # Comprehensive Technical Documentation
│
├── /static/
│   ├── /css/
│   │   └── style.css           # Styling with SOC modern dark/neon visual design
│   └── /js/
│       └── main.js             # Logic for SSE, Modal popups, Canvas map animations & Chart.js updates
│
└── /templates/
    └── index.html              # Core HTML structure encompassing grid layouts and panels
```

### 4. Core Features
*   **Live Packet Capture:** Utilizes `scapy.all.sniff()` operating on a background daemon threading task `scapy_thread` to silently capture inbound/outbound packets passing through the host's networking interface in real-time.
*   **Real-Time Active Dashboard:** Constantly streams multi-layered JSON payload to the UI updating total packets handled, active alerts, suspended activities, logged events, and active blocklists without requiring manual page refresh.
*   **Threat Intelligence IP Lookup:** An interactive UX feature allowing analysts to click flagged suspicious IP addresses to run a simulated "Intelligence Lookup", returning geographic location data and reputation via public API lookups (`ip-api.com`).
*   **Custom Visualizations:**
    *   **Traffic Graph:** A dual-line fluid area chart tracking the volume of Inbound vs. Outbound network velocities over time.
    *   **Node Activity Map:** Custom HTML5 Canvas visualization algorithm mapping nodes continuously passing payload packets to simulate network traffic behaviors.
    *   **Global Threat Map:** A 3D-effect rotating spherical wireframe Canvas visualization indicating the randomized probability of external global threats based on simulated geographical coordinates.

### 5. Threat Detection Heuristics & Rulesets
The system evaluates network-layer (IP/ICMP) and transport-layer (TCP/UDP) anomalies via the `scapy_packet_handler` function located inside `app.py`. The active heuristics are:

1.  **High Traffic Burst (DDoS/Flood indicator):**
    *   *Condition:* 25 total packets registered sequentially from a single, unique Source IP address.
    *   *Alert Trigger:* "High Traffic Detected", Severity: Medium.

2.  **Ping Sweep / Excessive ICMP:**
    *   *Condition:* A divisible count of 5 ICMP (Ping) packets received from a single, unique IP Address over its lifetime tracking.
    *   *Alert Trigger:* "Ping Sweep / Excessive ICMP", Severity: Medium.

3.  **Targeted Service Port Probes:**
    *   *Condition:* A packet targets specific historically vulnerable or commonly authenticated ports (`22` SSH, `23` Telnet, `21` FTP, `3389` RDP, `445` SMB, `1433` MSSQL) with less than or equal to 3 total historic packet occurrences traversing from that IP. This low frequency highlights a targeted attempt rather than an established session.
    *   *Alert Trigger:* "[Service] Port Probe", Severity: High.

4.  **Broad Port Scanning Activity:**
    *   *Condition:* A single unique Source IP touches 10 distinct TCP or UDP destination ports over its lifecycle tracking, indicating active reconnaissance.
    *   *Alert Trigger:* "Possible Port Scan", Severity: Critical.

### 6. Installation & Execution
**System Prerequisites:**
*   Python 3.8+ installed globally.
*   Npcap or WinPcap driver installed on Windows machines. (Often bundled alongside Wireshark installations; essential for allowing Scapy to hook into the NIC packet flow).
*   Administrative (Windows) or `root` (Linux) privileges required for raw socket access.

**Execution Guide:**
1. Initialize virtual environment (optional but recommended): `python -m venv .venv` followed by `.\.venv\Scripts\activate` (Windows).
2. Install the application's required libraries: 
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application backend utilizing elevated Administrator/Root privileges:
   ```bash
   python app.py
   ```
4. Access the SOC dashboard by opening a modern web browser and navigating to `http://localhost:5000/`.

### 7. Future Enhancements
*   **Data Persistence:** Migrating the runtime in-memory dictionary data structures (`dashboard_data`) directly into a high-performance database (ex: PostgreSQL, SQLite or time-series DBs like InfluxDB) to persist network insights and events across application restates and crashes.
*   **True Outbound Traffic Vectorization:** Modernizing the synthetic outbound packet generation visualizer to hook precisely on reverse routes matching the local target interface against destination packet footprints in Scapy rather than mathematical diff division.
*   **Intrusion Prevention System (IPS Active Responses):** Connecting Python hooks into OS-level firewall API configurations (`netsh advfirewall` on Windows or `iptables`/`ufw` on Linux) to definitively push block rules autonomously to IPs logging Critical severity violations.
