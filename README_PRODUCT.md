# 🛡️ Sentinel Shield Enterprise v2.5

Sentinel Shield is a high-performance, standalone security appliance designed to provide immediate protection for any web application (e.g., `unsecure.com`). It combines atomic Token Bucket rate limiting with real-time HUD forensics and multi-tier IP isolation.

---

## 🚀 Professional Integration Options

You can integrate Sentinel Shield into your infrastructure in two ways, depending on your architecture:

### 🏥 Path A: The "Protective Wall" (Zero Code Change)
**Recommended for: Legacy Apps, Third-Party Sites, or Highest Security.**
In this mode, the Shield acts as a "Bouncer" at the front door. 

1.  **Traffic Flow**: Internet ➔ Sentinel Shield (Port 80) ➔ Your App (Port 4000).
2.  **Implementation**: 
    - Deploy using `docker-compose up`.
    - Point `BACKEND_URL` in `.env` to your application's internal address.
3.  **Benefit**: You don't have to touch a single line of your existing code. The Shield stops threats before they even reach your server.

### 💉 Path B: The "Embedded Guard" (Direct Middleware)
**Recommended for: Cloud-Native Apps or Minimal Infrastructure.**
If you prefer not to run a separate proxy, you can embed the security core directly.

1.  **Implementation**: Copy `Shield-Proxy/middleware/dosMitigator.js` into your project.
2.  **Integration**: Import it as a standard Express middleware: `app.use(dosMitigator)`.
3.  **Benefit**: Lower latency and fewer moving parts, though it requires access to your source code.

---

## 📦 Deployment Instructions

### 1. Simple Setup (Terminal)
Ensure Docker is installed, then run our automated deployment script:
```bash
chmod +x setup.sh
./setup.sh
```

### 2. Manual Configuration
1.  Copy `.env.example` to `.env`.
2.  Set `ADMIN_KEY` (Your Dashboard Password).
3.  Set `BACKEND_URL` to your site's target port.
4.  Run `docker-compose up -d`.

### 📊 Monitoring
Your live Command & Control HUD is available at:
`http://your-server-ip/sentinel`

---

## 🛠️ Technical Support & Enterprise Licensing

For implementation assistance, custom security policies, or enterprise support plans, please contact our security team:

- **Deployment Support**: support@sentinel-defense.com
- **Emergency Incident Response**: 24/7 Priority Hotline
- **Custom Policy Development**: Consulting available for high-traffic endpoints.

---
© 2026 Sentinel Defense Industries • [SECURITY STATUS: ACTIVE]
