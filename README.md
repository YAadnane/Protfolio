# ⚡ Adnane Yadani - Data Scientist Portfolio v5.0

![Status](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-5.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

> *Replacing generic templates with a handcrafted, high-performance Data Science showcase.*

This is not just a resume; it's a **Full-Stack Application** demonstrating advanced capabilities in **AI Integration, Data Visualization, and System Architecture**.

🌐 **Live Demo:** [https://yadani-adnane.duckdns.org](https://yadani-adnane.duckdns.org)

---

## 🧠 System Architecture

The ecosystem relies on a robust **Monolithic Architecture** optimized for speed and low latency.

```mermaid
graph TD
    User([👤 User / Visitor])
    Admin([👨‍💻 Admin])
    
    subgraph "Oracle Cloud Infrastructure (Ubuntu VM)"
        Nginx[🟢 Nginx Reverse Proxy]
        
        subgraph "Application Layer"
            Node[🟢 Node.js Server]
            Gemini[🤖 Google Gemini API]
            SMTP[📧 Gmail SMTP]
        end
        
        subgraph "Data Layer"
            SQLite[("🗄️ SQLite Database")]
            FS["📂 File System (Uploads)"]
        end
    end
    
    User -->|HTTPS| Nginx
    Admin -->|HTTPS| Nginx
    Nginx -->|Proxy :3000| Node
    
    Node <-->|Read/Write| SQLite
    Node <-->|Store Images| FS
    Node <-->|Chat Context| Gemini
    Node -->|Send Alerts| SMTP
```

---

## 🚀 Key Features

### 🎨 **Immersive Frontend**
*   **"Cyber-Data" Aesthetic**: Custom Glassmorphism UI with neon accents.
*   **3D Interactive Core**: Three.js/CSS3D visualizations representing AI concepts.
*   **Smart Chatbot (Gemini 2.5)**: Context-aware AI assistant that answers questions about *me* in real-time.
*   **Bilingual Engine**: Instant English/French switching without page reloads.

### 🛡️ **Secure Admin Dashboard**
*   **Full CMS**: Update Projects, Skills, and Experience without touching code.
*   **Database Viewer**: Direct read/write access to SQLite tables from the UI.
*   **Review Gatekeeper**: "Anti-Zombie" logic to approve/delete testimonials.
*   **Security First**: JWT Authentication, Input Sanitization, and Rate Limiting.

---

## 🛠️ Tech Stack & Tools

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Framework-000000?style=flat&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat&logo=sqlite&logoColor=white)
![Oracle Cloud](https://img.shields.io/badge/Oracle_Cloud-Infrastructure-F80000?style=flat&logo=oracle&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Proxy-009639?style=flat&logo=nginx&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-8E75B2?style=flat&logo=google&logoColor=white)

### 📊 Database Schema (Entity Relationship)

```mermaid
erDiagram
    GENERAL_INFO ||--o{ SOCIAL_LINKS : contains
    PROJECTS ||--o{ TAGS : has
    REVIEWS {
        string name
        string message
        int rating
        boolean is_approved
    }
    MESSAGES {
        string email
        string message
        boolean is_read
    }
    USERS {
        string username
        string password_hash
    }
    SHAPES {
        string type
        float position_x
        float position_y
    }
```

---

## 📦 Installation & Setup

### 1. Clone & Install
```bash
git clone https://github.com/YAadnane/Protfolio.git
cd Protfolio
npm install
```

### 2. Configure Environment
Create a `.env` file:
```env
PORT=3000
SECRET_KEY=complex_key_here
ADMIN_EMAIL=your_email@gmail.com
EMAIL_PASS=your_app_password
GEMINI_API_KEY=your_gemini_key
```

### 3. Run Locally
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

---

## ☁️ Deployment Implementation

The project uses a **Continuous Integration-like Webhook Workflow** (simulated via SSH commands).

```mermaid
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant Git as 🐙 GitHub
    participant Server as ☁️ Oracle VM
    
    Dev->>Git: Push Code (Main)
    Dev->>Server: SSH Trigger Command
    Server->>Git: git pull origin main
    Server->>Server: npm install & npm run build
    Server->>Server: pm2 restart portfolio
    Server-->>Dev: Deployment Success ✅
```

---

## 📂 Project Structure

```
├── public/             # Static Assets (Images, Icons)
├── server/             
│   ├── database.js     # SQLite Singleton & Seeding
│   └── index.js        # Express API & Auth Logic
├── src/                
│   ├── admin_core.js   # Dashboard Logic (Glassmorphism UI)
│   ├── main.js         # Public Portfolio Logic (Animations)
│   └── styles/         # CSS Modules
└── index.html          # Entry Point
```

---

© 2025 **Adnane Yadani**. Built with Data & Design.
