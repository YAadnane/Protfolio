import db from './database.js';

const projects = [
    { title: "Smart Recruitment Assistant", description: "Semantic matching between CVs and job offers using RAG.", tags: "NLP, LLM, RAG", category: "AI", image: "bg-1", link: "#" },
    { title: "Real-Time ETL Pipeline", description: "Stream processing & visualization of massive data streams.", tags: "Kafka, Flink, Power BI", category: "Big Data", image: "bg-2", link: "#" },
    { title: "Intelligent Tank Monitoring", description: "Real-time reservoir prediction dashboard.", tags: "IoT, Predictive Analytics", category: "IoT", image: "bg-3", link: "#" },
    { title: "Drowsiness Detector", description: "Real-time driver safety system using facial landmark detection.", tags: "Computer Vision, OpenCV", category: "AI", image: "bg-4", link: "#" }
];

const certifications = [
    { name: "Data Science Professional", issuer: "IBM", icon: "fa-brands fa-python", year: "2023" },
    { name: "Big Data Engineering", issuer: "Coursera", icon: "fa-solid fa-database", year: "2023" },
    { name: "Machine Learning Specialization", issuer: "Stanford", icon: "fa-solid fa-brain", year: "2022" }
];

const education = [
    { degree: "Master's in Data Analytics & AI", institution: "University Ibn Zohr", year: "2023 - Present", description: "" },
    { degree: "Bachelor's in Data Analytics & AI", institution: "University Ibn Zohr", year: "2022 - 2023", description: "" },
    { degree: "License in Computer Engineering", institution: "University Ibn Zohr", year: "2021 - 2022", description: "" },
    { degree: "DUT in Computer Engineering", institution: "Moulay Ismail University", year: "2020 - 2022", description: "" }
];

const experience = [
    { role: "Full Stack Web Developer", company: "UNIVERSHIGHTECH", year: "02/2023 - 04/2023", description: "Led design and deployment of a real estate website." },
    { role: "Full Stack Web Developer", company: "OSPRO", year: "06/2022 - 07/2022", description: "Engineered a job application platform." },
    { role: "Front End Web Developer", company: "JAWDA BOIS", year: "04/2021 - 05/2021", description: "Designed a showcase website for a construction firm." }
];

const skills = [
    { category: "Data & AI", name: "Machine Learning", level: 90 },
    { category: "Data & AI", name: "Deep Learning", level: 85 },
    { category: "Data & AI", name: "NLP & LLM", level: 85 },
    { category: "Data & AI", name: "Computer Vision", level: 80 },
    { category: "Big Data", name: "Kafka", level: 0 },
    { category: "Big Data", name: "Spark", level: 0 },
    { category: "Languages", name: "Python", level: 0 },
    { category: "Languages", name: "SQL", level: 0 }
];

db.serialize(() => {
    // Clear existing data
    db.run("DELETE FROM projects");
    db.run("DELETE FROM certifications");
    db.run("DELETE FROM education");
    db.run("DELETE FROM experience");
    db.run("DELETE FROM skills");

    // Insert Projects
    const stmtProject = db.prepare("INSERT INTO projects (title, description, tags, category, image, link) VALUES (?, ?, ?, ?, ?, ?)");
    projects.forEach(p => stmtProject.run(p.title, p.description, p.tags, p.category, p.image, p.link));
    stmtProject.finalize();

    // Insert Certifications
    const stmtCert = db.prepare("INSERT INTO certifications (name, issuer, icon, year) VALUES (?, ?, ?, ?)");
    certifications.forEach(c => stmtCert.run(c.name, c.issuer, c.icon, c.year));
    stmtCert.finalize();

    // Insert Education
    const stmtEdu = db.prepare("INSERT INTO education (degree, institution, year, description) VALUES (?, ?, ?, ?)");
    education.forEach(e => stmtEdu.run(e.degree, e.institution, e.year, e.description));
    stmtEdu.finalize();

    // Insert Experience
    const stmtExp = db.prepare("INSERT INTO experience (role, company, year, description) VALUES (?, ?, ?, ?)");
    experience.forEach(e => stmtExp.run(e.role, e.company, e.year, e.description));
    stmtExp.finalize();

    // Insert Skills
    const stmtSkill = db.prepare("INSERT INTO skills (category, name, level) VALUES (?, ?, ?)");
    skills.forEach(s => stmtSkill.run(s.category, s.name, s.level));
    stmtSkill.finalize();

    console.log("Database seeded successfully.");
});
