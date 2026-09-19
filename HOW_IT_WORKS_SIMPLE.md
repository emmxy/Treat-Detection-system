# How It Works (The Simple Version)

Welcome! This system is a **Network Threat Detection Dashboard**. It acts like a security camera for your computer network, watching all the data flowing in and out to catch any suspicious behavior.

Here is a simple breakdown of how it works:

### 1. The Traffic Watcher (Packet Sniffing)
The system uses a tool underneath the hood to constantly look at "packets." Packets are like tiny envelopes of data moving through the internet. Because it watches in real-time, the system counts these envelopes to see if sudden, unusual spikes of traffic are hitting your network.

### 2. Identifying Suspicious Behavior
It doesn't just count the envelopes; it checks what kind of envelopes they are. It specifically looks for a few classic hacker tricks:
- **Ping Sweeps:** If someone is sending you a lot of fast "hello" messages to see if your computer is online.
- **Port Probes:** If someone tries to poke at specific "doors" on your computer that are commonly used for attacks (like remote desktop or file sharing ports).
- **Port Scanning:** If someone is quickly testing dozens of different doors on your computer to see which ones are left unlocked.

### 3. The Dashboard (Alerts & Logging)
When the system spots any of this suspicious behavior, it triggers an alert. You can see these warnings directly on the dashboard's **Threat Alerts** section. The dashboard also logs the exact time and IP address of the potential attacker, and allows you to trace where in the world the IP address might be coming from.

---
**In short:** The system quietly watches the internet traffic going to and from your computer, looks for common hacking patterns, and immediately displays alerts on a dashboard so you know who is trying to break in.
