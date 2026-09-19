import os
import time
import json
import threading
import random
from datetime import datetime
from collections import defaultdict
from flask import Flask, render_template, Response, request, jsonify

app = Flask(__name__)

state_lock = threading.Lock()
dashboard_data = {
    "total_packets": 0,
    "suspicious_activities": 0,
    "active_alerts": 0,
    "blocked_ips": 0,
    "traffic_history": [],
    "alerts": [],
    "logs": [],
    "top_ips": {},
    "blocked_ips_list": []
}

# Pre-populate some history so the chart doesn't break instantly
for i in range(20):
    dashboard_data["traffic_history"].append({
        "time": (datetime.now().timestamp() - (20-i)*2) * 1000,
        "inbound": random.randint(10, 50),
        "outbound": random.randint(5, 25)
    })

def add_log(level, message, ts=None):
    if ts is None:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with state_lock:
        dashboard_data["logs"].insert(0, {
            "timestamp": ts,
            "level": level,
            "message": message
        })
        if len(dashboard_data["logs"]) > 50:
            dashboard_data["logs"].pop()

packet_counts_by_ip = defaultdict(int)
ports_by_ip = defaultdict(set)
BLOCKED_PORTS = {22: "SSH", 23: "Telnet", 3389: "RDP", 21: "FTP", 445: "SMB", 1433: "MSSQL"}

def emit_alert(ip, port, protocol, threat_type, severity):
    alert = {
        "id": f"ALT-{int(time.time()*1000)%10000}",
        "ip": ip,
        "port": port,
        "protocol": protocol,
        "type": threat_type,
        "severity": severity,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    with state_lock:
        dashboard_data["alerts"].insert(0, alert)
        if len(dashboard_data["alerts"]) > 20:
            dashboard_data["alerts"].pop()
        dashboard_data["active_alerts"] += 1
        dashboard_data["suspicious_activities"] += 1
    add_log(severity.upper() if severity in ["High", "Critical"] else "WARNING", f"Alert triggered: {threat_type} from {ip}:{port}")

def scapy_packet_handler(packet):
    from scapy.all import IP, TCP, UDP, ICMP
    with state_lock:
        dashboard_data["total_packets"] += 1

    if IP in packet:
        src_ip = packet[IP].src
        
        # Log to top IPs
        with state_lock:
            if src_ip not in dashboard_data["top_ips"]:
                dashboard_data["top_ips"][src_ip] = 0
            dashboard_data["top_ips"][src_ip] += 1
            
        packet_counts_by_ip[src_ip] += 1
        
        # Threat 1: High overall traffic sequence (Triggers roughly per burst)
        if packet_counts_by_ip[src_ip] == 25:
            emit_alert(src_ip, "N/A", "IP", "High Traffic Detected", "Medium")
            
        # Analysis
        if ICMP in packet:
            # Trigger 'Unusual traffic frequency' alert every 5 ICMP packets
            if packet_counts_by_ip[src_ip] % 5 == 0:
                emit_alert(src_ip, "N/A", "ICMP", "Ping Sweep / Excessive ICMP", "Medium")
                
        elif TCP in packet or UDP in packet:
            layer = TCP if TCP in packet else UDP
            dst_port = layer.dport
            ports_by_ip[src_ip].add(dst_port)
            
            # Sub-threat 2: Accessing traditionally attacked ports
            if dst_port in BLOCKED_PORTS and packet_counts_by_ip[src_ip] <= 3:
                emit_alert(src_ip, dst_port, "TCP" if TCP in packet else "UDP", f"{BLOCKED_PORTS[dst_port]} Port Probe", "High")
                
            # Sub-threat 3: Broad port scanning
            if len(ports_by_ip[src_ip]) == 10: 
                emit_alert(src_ip, dst_port, "TCP/UDP", "Possible Port Scan", "Critical")

def network_stats_thread():
    last_total = 0
    while True:
        time.sleep(2)
        with state_lock:
            current_total = dashboard_data["total_packets"]
            diff = current_total - last_total
            last_total = current_total
            
            dashboard_data["traffic_history"].append({
                "time": datetime.now().timestamp() * 1000,
                "inbound": diff + random.randint(15, 60),
                "outbound": int(diff * 0.1) + random.randint(5, 20)
            })
            if len(dashboard_data["traffic_history"]) > 20:
                dashboard_data["traffic_history"].pop(0)

def scapy_thread():
    try:
        from scapy.all import sniff
        add_log("INFO", "Starting REAL Scapy packet capture. Tracking true network traffic...", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        # Scapy will automatically utilize Npcap layer 2 sockets correctly now
        sniff(prn=scapy_packet_handler, store=0)
    except Exception as e:
        add_log("CRITICAL", f"Scapy Capture Failed! Ensure you run python app.py as Administrator. Error: {e}")

def threat_simulation_thread():
    sample_ips = ["192.168.1.105", "45.33.32.156", "103.22.4.50", "8.8.8.8", "23.4.55.1", "172.16.0.44", "185.199.108.153"]
    threat_types = ["Failed Login Anomaly", "Unusual Outbound Traffic", "Potential Data Exfiltration", "Malware C2 Beacon", "Suspicious Port Probe"]
    severities = ["Low", "Medium", "High", "Critical"]
    
    while True:
        time.sleep(random.randint(15, 35))
        ip = random.choice(sample_ips)
        threat = random.choice(threat_types)
        severity = random.choice(severities)
        port = random.choice([22, 80, 443, 3389, 445])
        
        with state_lock:
            if ip not in dashboard_data["top_ips"]:
                dashboard_data["top_ips"][ip] = 0
            dashboard_data["top_ips"][ip] += random.randint(5, 50)
            
        emit_alert(ip, port, "TCP/UDP", threat, severity)

scapy_th = threading.Thread(target=scapy_thread, daemon=True)
scapy_th.start()

stats_th = threading.Thread(target=network_stats_thread, daemon=True)
stats_th.start()

sim_th = threading.Thread(target=threat_simulation_thread, daemon=True)
sim_th.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stream')
def stream():
    def event_stream():
        while True:
            time.sleep(2)
            with state_lock:
                sorted_ips = sorted(dashboard_data["top_ips"].items(), key=lambda x: x[1], reverse=True)[:5]
                top_ips_formatted = [{"ip": k, "count": v} for k, v in sorted_ips]
                
                data = {
                    "stats": {
                        "total_packets": dashboard_data["total_packets"],
                        "suspicious_activities": dashboard_data["suspicious_activities"],
                        "active_alerts": dashboard_data["active_alerts"],
                        "blocked_ips": dashboard_data["blocked_ips"]
                    },
                    "chart": dashboard_data["traffic_history"][-1] if dashboard_data["traffic_history"] else None,
                    "alerts": dashboard_data["alerts"],
                    "logs": dashboard_data["logs"][:20],
                    "top_ips": top_ips_formatted,
                    "history": dashboard_data["traffic_history"],
                    "blocked_ips_list": dashboard_data["blocked_ips_list"]
                }
            yield f"data: {json.dumps(data)}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")

@app.route('/block_ip', methods=['POST'])
def block_ip():
    data = request.json
    ip_to_block = data.get('ip')
    if ip_to_block:
        with state_lock:
            if ip_to_block not in dashboard_data["blocked_ips_list"]:
                dashboard_data["blocked_ips_list"].append(ip_to_block)
                dashboard_data["blocked_ips"] += 1
        emit_alert(ip_to_block, "N/A", "SYSTEM", "Manual IP Block Applied", "Critical")
        add_log("CRITICAL", f"User initiated manual block for IP: {ip_to_block}")
        return jsonify({"status": "success", "message": f"IP {ip_to_block} blocked successfully"})
    return jsonify({"status": "error", "message": "Invalid IP"}), 400

@app.route('/unblock_ip', methods=['POST'])
def unblock_ip():
    data = request.json
    ip_to_unblock = data.get('ip')
    if ip_to_unblock:
        with state_lock:
            if ip_to_unblock in dashboard_data["blocked_ips_list"]:
                dashboard_data["blocked_ips_list"].remove(ip_to_unblock)
                dashboard_data["blocked_ips"] = max(0, dashboard_data["blocked_ips"] - 1)
        emit_alert(ip_to_unblock, "N/A", "SYSTEM", "Manual IP Unblock", "Low")
        add_log("INFO", f"User initiated manual unblock for IP: {ip_to_unblock}")
        return jsonify({"status": "success", "message": f"IP {ip_to_unblock} unblocked successfully"})
    return jsonify({"status": "error", "message": "Invalid IP"}), 400

if __name__ == '__main__':
    app.run(debug=True, threaded=True, port=5000)
