const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
require('dotenv').config(); // charge les variables .env

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Vérification des variables d'environnement
console.log("MYSQL_HOST =", process.env.MYSQL_HOST);
console.log("MYSQL_PORT =", process.env.MYSQL_PORT);
console.log("MYSQL_USER =", process.env.MYSQL_USER);
console.log("MYSQL_PASSWORD =", process.env.MYSQL_PASSWORD);
console.log("MYSQL_DATABASE =", process.env.MYSQL_DATABASE);

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT, 10)
});

// Connexion à MySQL
db.connect(err => {
  if (err) console.error('Erreur connexion MySQL :', err);
  else console.log('Connecté à la base Railway !');
});

// -------------------- ROUTES -------------------- //
// 🔹 Inscription
app.post("/register", (req, res) => {
  const { identifiant, mdp } = req.body;
  if (!identifiant || !mdp) return res.status(400).json({ message: "Veuillez remplir tous les champs" });

  const sql = "INSERT INTO users_2 (identifiant, mdp) VALUES (?, ?)";
  db.query(sql, [identifiant, mdp], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Identifiant déjà utilisé" });
      return res.status(500).json({ message: "Erreur serveur", error: err });
    }
    res.json({ message: "✅ Inscription réussie !" });
  });
});

// 🔹 Connexion
app.post("/login", (req, res) => {
  const { identifiant, mdp } = req.body;
  if (!identifiant || !mdp) return res.status(400).json({ message: "Veuillez remplir tous les champs" });

  const sql = "SELECT * FROM users_2 WHERE identifiant = ? AND mdp = ?";
  db.query(sql, [identifiant, mdp], (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (results.length === 0) return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
    res.json({ message: "✅ Connexion réussie", user: results[0] });
  });
});

// 🔹 Voir tous les utilisateurs
app.get("/users", (req, res) => {
  db.query("SELECT * FROM users_2", (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    res.json(results);
  });
});

// 🔹 Publications
app.get("/publications", (req, res) => {
  const query = `
    SELECT p.*, COUNT(l.id) AS likes_count 
    FROM publications_2 p 
    LEFT JOIN likes l ON p.id = l.pub_id 
    GROUP BY p.id 
    ORDER BY date_heure DESC`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

// 🔹 Publier
app.post("/publish", (req, res) => {
  const { identifiant, titre, contenu } = req.body;
  if (!identifiant || !titre || !contenu) return res.status(400).json({ message: "Veuillez remplir tous les champs" });

  const query = "INSERT INTO publications_2 (identifiant, titre, contenu) VALUES (?, ?, ?)";
  db.query(query, [identifiant, titre, contenu], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Publication enregistrée avec succès !" });
  });
});

// 🔹 Like / Unlike
app.post('/like', (req, res) => {
  const { id, identifiant } = req.body;

  db.query("SELECT * FROM likes WHERE pub_id = ? AND user_identifiant = ?", [id, identifiant], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length > 0) {
      // Unlike
      db.query("DELETE FROM likes WHERE pub_id = ? AND user_identifiant = ?", [id, identifiant]);
      db.query("UPDATE publications_2 SET likes = likes - 1 WHERE id = ?", [id]);
      return res.json({ success: true, action: "unliked" });
    } else {
      // Like
      db.query("INSERT INTO likes (pub_id, user_identifiant) VALUES (?, ?)", [id, identifiant], (err2) => {
        if (err2) return res.status(500).json({ error: err2 });
        db.query("UPDATE publications_2 SET likes = likes + 1 WHERE id = ?", [id]);
        return res.json({ success: true, action: "liked" });
      });
    }
  });
});

// -------------------- LANCEMENT SERVEUR -------------------- //
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
