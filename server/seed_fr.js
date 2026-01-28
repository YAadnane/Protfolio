import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const verboseSqlite = sqlite3.verbose();
const dbPath = path.resolve(__dirname, 'portfolio.db');
const db = new verboseSqlite.Database(dbPath);


console.log("Seeding French data to:", dbPath);

const educationFR = [
    {
        degree: "Master en Big Data & Cloud Computing",
        institution: "Faculté des Sciences et Techniques de Tanger",
        year: "2023 - Présent",
        start_date: "2023",
        end_date: "Présent",
        description: "",
        lang: "fr"
    },
    {
        degree: "Licence en Génie Informatique",
        institution: "Université Moulay Ismaïl",
        year: "2022 - 2023",
        start_date: "2022",
        end_date: "2023",
        description: "",
        lang: "fr"
    },
    {
        degree: "Technicien Spécialisé en Développement Informatique",
        institution: "ISTA NTIC",
        year: "2021 - 2022",
        start_date: "2021",
        end_date: "2022",
        description: "",
        lang: "fr"
    },
    {
        degree: "DUT en Génie Informatique",
        institution: "Université Moulay Ismaïl",
        year: "2020 - 2022",
        start_date: "2020",
        end_date: "2022",
        description: "",
        lang: "fr"
    }
];

const experienceFR = [
    {
        role: "Développeur Web Full Stack",
        company: "UNIVERSHIGHTECH",
        year: "02/2023 - 04/2023",
        start_date: "02/2023",
        end_date: "04/2023",
        description: "Direction de la conception et du déploiement d'un site web immobilier.",
        lang: "fr"
    },
    {
        role: "Développeur Web Full Stack",
        company: "OSPRO",
        year: "06/2022 - 07/2022",
        start_date: "06/2022",
        end_date: "07/2022",
        description: "Ingénierie d'une plateforme de candidature à l'emploi.",
        lang: "fr"
    },
    {
        role: "Développeur Web Front End",
        company: "JAWDA BOIS",
        year: "04/2021 - 05/2021",
        start_date: "04/2021",
        end_date: "05/2021",
        description: "Conception d'un site vitrine pour une entreprise de construction.",
        lang: "fr"
    }
];

db.serialize(() => {
    // Insert Education
    const stmtEdu = db.prepare(`INSERT INTO education (degree, institution, year, description, lang, is_hidden) VALUES (?, ?, ?, ?, ?, 0)`);
    educationFR.forEach(e => {
        stmtEdu.run(e.degree, e.institution, e.year, e.description, e.lang);
    });
    stmtEdu.finalize();
    console.log("Inserted Education rows (FR)");

    // Insert Experience
    const stmtExp = db.prepare(`INSERT INTO experience (role, company, year, description, lang, is_hidden) VALUES (?, ?, ?, ?, ?, 0)`);
    experienceFR.forEach(e => {
        stmtExp.run(e.role, e.company, e.year, e.description, e.lang);
    });
    stmtExp.finalize();
    console.log("Inserted Experience rows (FR)");
});

db.close();
