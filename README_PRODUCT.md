# 🛡️ Sentinel Shield Enterprise v2.5

Sentinel Shield is a high-performance, standalone security appliance that provides instant DDoS/DoS protection for **any web server**. It sits in front of your application as a reverse proxy, filtering malicious traffic before it ever reaches your server.

---

## 🚀 Quick Start (Any Server)

### Prerequisites
- A Linux server with [Docker](https://docs.docker.com/get-docker/) installed
- Your existing app/website already running on some port

### One-Command Deployment
```bash
chmod +x setup.sh
./setup.sh
```

The installer will ask you 3 questions:
1. **What port is your server running on?** — e.g. `3000`, `4000`, `8080`
2. **What port should Sentinel Shield listen on?** — e.g. `80`, `8081` (clients connect here)
3. **Choose a dashboard secret key** — used to access the live monitoring HUD

That's it. Sentinel Shield will build, deploy, and start protecting your server automatically.

---

## 🏗️ How It Works

```
Internet Traffic
       │
       ▼
┌──────────────────┐
│  Sentinel Shield │  ← Filters DDoS/DoS attacks
│   (port 80)      │
└────────┬─────────┘
         │ Clean traffic only
         ▼
┌──────────────────┐
│   Your Server    │  ← Never sees malicious requests
│  (port 3000)     │
└──────────────────┘
```

- **Token Bucket rate limiting** with atomic Redis execution
- **Multi-tier IP isolation**: Warning → Jail → Permanent Ban
- **Fingerprint forensics** combining IP + User-Agent + Auth
- **Real-time HUD dashboard** with live threat feed and charts

---

## 📊 Dashboard

After deployment, access your Command & Control HUD at:
```
http://YOUR-SERVER-IP:SHIELD_PORT/sentinel
```
Enter the admin key you chose during setup to unlock the dashboard.

---

## 🛠️ Manual Configuration

If you prefer not to use `setup.sh`, you can manually configure:

1. Copy `.env.example` to `.env`
2. Edit the values:
   - `TARGET_PORT` — port of the server to protect
   - `SHIELD_PORT` — port for the Shield proxy
   - `ADMIN_KEY` — your dashboard password
3. Run `docker compose up -d`

---

## ⚙️ Advanced: Embedded Mode (No Docker)

If you prefer not to run a separate proxy, embed the security core directly into your Express app:

1. Copy `Shield-Proxy/middleware/dosMitigator.js` into your project
2. Import it: `app.use(dosMitigator)`
3. No Docker required — lower latency, but requires source code access

---

© 2026 Sentinel Defense Industries • [SECURITY STATUS: ACTIVE]
