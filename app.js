const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(express.json());

const db = new sqlite3.Database('./farmacie.sqlite', (err) => {
  if (err) {
    console.error('Eroare la DB:', err.message);
  } else {
    console.log('✅ Baza de date "farmacie.sqlite" este pregătită!');
  }
});


db.serialize(() => {
  //Tabelul de categorii
  db.run(`
    CREATE TABLE IF NOT EXISTS categorii (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nume_categorie TEXT NOT NULL
    )
  `);

  //  Tabelul de medicamente cu cheie străină (category_id)
  db.run(`
    CREATE TABLE IF NOT EXISTS medicamente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nume TEXT NOT NULL,
      pret REAL NOT NULL,
      stoc INTEGER DEFAULT 0,
      necesita_reteta BOOLEAN DEFAULT 0,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categorii(id)
    )
  `);
});

app.post('/categorii', (req, res) => { // adauga categorie
    const { nume_categorie } = req.body;        
    if(!nume_categorie) {   
        return res.status(400).json({ error: 'Numele categoriei este obligatoriu.' });
    }
    const query = 'INSERT INTO categorii (nume_categorie) VALUES (?)' ;
    db.run(query, [nume_categorie], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({ 
                id: this.lastID, 
                nume_categorie 
            });
        }
    });
});

app.get('/medicamente', (req, res) => { //afiseaza toate medicamentele
  const { reteta, stocMinim } = req.query;

 let query = `
    SELECT medicamente.*, categorii.nume_categorie 
    FROM medicamente 
    LEFT JOIN categorii ON medicamente.category_id = categorii.id
    WHERE 1=1
  `;
  const params = [];
  if(reteta) {
    query += ' AND necesita_reteta = ?';
    params.push(reteta === 'true');
  }
  if(stocMinim) {
    query += ' AND stoc >= ?';
    params.push(stocMinim);
  }
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(200).json(rows);
    }
});
});
app.post('/medicamente', (req, res) => {    // adauga medicament
            const { nume, pret, stoc, necesita_reteta , category_id } = req.body;
            if(!nume || !pret) {
                return res.status(400).json({ error: 'Numele și prețul sunt obligatorii.' });
            }
            const query = 'INSERT INTO medicamente (nume, pret, stoc, necesita_reteta, category_id) VALUES (?, ?, ?, ?, ?)';
            db.run(query, [nume, pret, stoc || 0, necesita_reteta || 0, category_id || null], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.status(201).json({ 
                        id: this.lastID, 
                        nume, 
                        pret,
                        stoc: stoc || 0,
                        necesita_reteta: necesita_reteta || 0 ,
                        category_id: category_id || null});
                }   
        });
});


app.put('/medicamente/:id', (req, res) => {
  const { id } = req.params;
  const { nume, pret, stoc, necesita_reteta, category_id } = req.body;

  // 🔍 PUNEM ACEST CONSOLE.LOG CA SĂ VEDEM CE PRIMEȘTE SERVERUL
  console.log("ID primit:", id);
  console.log("Body primit de la client:", req.body);
  console.log("Valoare necesita_reteta detectată:", necesita_reteta);

  let fields = [];
  let params = [];

  if (nume !== undefined) {
    fields.push('nume = ?');
    params.push(nume);
  }
  if (pret !== undefined) {
    fields.push('pret = ?');
    params.push(pret);
  }
  if (stoc !== undefined) {
    fields.push('stoc = ?');
    params.push(stoc);
  }
 if (necesita_reteta !== undefined) {
    fields.push('necesita_reteta = ?');
    const valoareReteta = (necesita_reteta === true || necesita_reteta === 'true' || necesita_reteta === 1) ? 1 : 0;
    params.push(valoareReteta);
  }
  if (category_id !== undefined) {
    fields.push('category_id = ?');
    params.push(category_id);
  }

  if (fields.length === 0) {
    return res.status(400).json({ eroare: 'Nu ai trimis nicio dată de actualizat!' });
  }

  params.push(id);
  const query = `UPDATE medicamente SET ${fields.join(', ')} WHERE id = ?`;

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ eroare: err.message });
    if (this.changes === 0) return res.status(404).json({ eroare: 'Medicamentul nu a fost găsit!' });

    res.json({ mesaj: `Medicamentul cu ID-ul ${id} a fost actualizat cu succes!` });
  });
});


app.delete('/medicamente/:id', (req, res) => { // sterge medicament
    const { id } = req.params;
    db.run('DELETE FROM medicamente WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(200).json({ message: 'Medicamentul a fost șters cu succes.' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Serverul rulează la http://localhost:${PORT}`);
});
