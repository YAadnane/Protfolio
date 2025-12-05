# Adnane Yadani - Data Scientist Portfolio 📊🤖

A high-performance, full-stack portfolio application designed for a Data Scientist & AI Engineer. This project showcases advanced web development skills, integrating 3D visualizations, dynamic content management, and a secure admin dashboard.

**Live Demo:** [https://yadani-adnane.duckdns.org](https://yadani-adnane.duckdns.org)

---

## 🚀 Key Features

### 🎨 Frontend Experience
*   **Modern Design**: Glassmorphism, neon accents, and a "cyber-data" aesthetic.
*   **3D Visualizations**: Interactive cubes, spheres, and pyramids representing data concepts (using CSS3D & GSAP).
*   **Animations**: Complex GSAP ScrollTrigger animations, "Hacker" text scramble effects, and particle networks.
*   **Responsive**: Fully optimized for Desktop, Tablet, and Mobile.
*   **Dynamic Content**: Projects, Skills, Education, and Experience are fetched from the API.

### 🛠️ Admin Dashboard
*   **Authentication**: Secure JWT-based login system.
*   **Content Management (CMS)**:
    *   **CRUD Operations**: Add, Edit, Delete, and Hide/Show any content (Projects, Certifications, etc.).
    *   **File Uploads**: Drag & drop support for Project Images/Videos and PDF Documents (CV, Certs).
*   **Messages & Notifications**:
    *   Real-time **Unread Message Counter** badge.
    *   **Email Notifications** via SMTP (Gmail) for every new contact form submission.
    *   Manage messages (Mark as Read / Delete) directly from the dashboard.

### ⚙️ Backend & Architecture
*   **API**: RESTful API built with Node.js & Express.
*   **Database**: SQLite for lightweight, zero-configuration data persistence.
*   **Security**:
    *   Input Sanitization (XSS prevention) on all inputs.
    *   JWT Middleware for protected routes.
    *   Helmet & CORS configuration.
*   **SEO Optimized**:
    *   Dynamic Sitemap (`/sitemap.xml`) generation.
    *   Open Graph tags (Social Previews).
    *   JSON-LD Structured Data for Google Indexing.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Vite |
| **Animations** | GSAP (GreenSock), Vanilla-Tilt.js, Particles.js |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite3 |
| **Auth** | JSON Web Tokens (JWT), Bcrypt |
| **Email** | Nodemailer |
| **Server** | Nginx (Reverse Proxy), PM2 (Process Manager) |
| **OS** | Ubuntu (Oracle Cloud VM) |

---

## 📦 Installation (Local)

1.  **Clone the repository**
    ```bash
    git clone https://github.com/YAadnane/Protfolio.git
    cd Protfolio
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    JWT_SECRET=your_super_secret_jwt_key
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    *   Frontend: `http://localhost:5173`
    *   Backend: `http://localhost:3000`

---

## ☁️ Deployment (Oracle Cloud)

The project is deployed on an Ubuntu VM using Nginx as a reverse proxy.

### Quick Commands (Server)

**Update & Restart:**
```bash
# Pull changes, rebuild frontend, and restart Node server
cd ~/Protfolio
git pull
npm install # if new deps added
npm run build
pm2 restart portfolio
```

**Check Logs:**
```bash
pm2 logs portfolio
```

**Nginx Configuration:**
Located at `/etc/nginx/sites-available/portfolio`. Handles SSL (Let's Encrypt) and proxies traffic to port 3000.

---

## 👮 Admin Access

To access the dashboard, visit `/login.html`.

*   **Default Username**: `admin`
*   **Default Password**: *(Check server environment variables or database seed)*

---

## 📂 Project Structure

```
├── public/             # Static assets (robots.txt, og-image.jpg)
├── server/             # Backend logic
│   ├── database.js     # SQLite connection & schema
│   └── index.js        # Express API routes & server
├── src/                # Frontend source
│   ├── admin.js        # Dashboard logic
│   ├── main.js         # Public site logic
│   └── ...
├── index.html          # Main entry point
└── admin.html          # Dashboard entry point
```

---

© 2025 Adnane Yadani. Built from scratch with ❤️ and Code.
