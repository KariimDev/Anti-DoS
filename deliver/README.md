# 🛡️ Sentinel Shield Enterprise

Welcome to the **Sentinel Shield** deployment package. This is a standalone security appliance designed to sit in front of any existing web application to provides instant Protection against DoS, brute-force, and scraping attacks.

## 📦 Package Contents
- `/Shield-Proxy`: The high-performance security engine.
- `/dashboard`: The administrative "Command & Control" HUD.
- `docker-compose.yml`: Master orchestration file for Standalone Shield deployment.

## 🚀 Deployment (The "Security Layer" Setup)

The Sentinel Shield acts as a **Protective Proxy**. You install it on your VPS, and it forwards "clean" traffic to your real application.

### 1. Configure the Perimeter
Edit your `.env` file (copied from `.env.example`):
- `BACKEND_URL`: Set this to the internal URL of your main site (e.g., `http://localhost:4000`).
- `ADMIN_KEY`: Your secret password for the Dashboard.

### 2. Launch with Docker
```bash
docker-compose up --build -d
```
The Shield will now listen on **Port 80**, filtering all traffic before it reaches your app.

### 3. Access your HUD
Open `http://your-server-ip/sentinel` and enter your `ADMIN_KEY`.

## 🛠️ How it Works
1. **Traffic Hits Shield**: Sentinel evaluates the request fingerprint.
2. **Filtering**: Bots and flooders are dropped instantly with a `429` or `403`.
3. **Forwarding**: Legitimate users are proxied to your backend application.
4. **Monitoring**: You watch the live battle from the Dashboard.

---
© 2026 Sentinel Defense Industries • [SECURITY STATUS: ACTIVE]
