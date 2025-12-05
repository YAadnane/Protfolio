# Portfolio Project

A full-stack portfolio website built with Node.js, Express, SQLite, and Vanilla JS/HTML/CSS.

## Features
- Dynamic content management via Admin Dashboard
- Project showcase with filtering
- Certifications, Skills, and Experience management
- Secure file uploads
- JWT Authentication

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Variables**
    Create a `.env` file in the root directory (or rename `.env.example` if available) and add:
    ```env
    PORT=3000
    SECRET_KEY=your_secure_random_string
    ADMIN_EMAIL=your_email@example.com
    ADMIN_PASSWORD_HASH=your_bcrypt_hash
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```
    - Frontend: http://localhost:5173
    - Backend: http://localhost:3000

4.  **Run Production Server**
    ```bash
    npm start
    ```

## Deployment

To deploy on a VPS (e.g., Oracle Cloud, DigitalOcean):
1.  Clone the repository.
2.  Install Node.js and dependencies.
3.  Set up `.env` file.
4.  Run `npm start` (or use PM2 for process management).
