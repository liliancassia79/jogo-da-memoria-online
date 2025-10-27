// # 1. Importar as "peças"
const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require('cors'); // Pacote para permitir a conexão

const app = express();
app.use(cors()); // HABILITA O CORS (MUITO IMPORTANTE!)
app.use(express.json()); // Habilita a API a ler JSON

const PORTA = 3000;
let db;

// # 2. Conectar ao Banco de Dados
(async () => {
  try {
    db = await open({
      filename: './banco_do_jogo.db', // O nome do arquivo do banco
      driver: sqlite3.Database
    });

    // Cria a tabela correta para salvar "tempo" (se ela não existir)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS corrida_ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        tempo REAL 
      )
    `);
    console.log("Banco de dados pronto (tabela 'corrida_ranking').");
  } catch (error) {
    console.error("Erro ao conectar ao banco:", error);
  }
})();


// # 3. Rota para buscar o Ranking
// Endereço: http://localhost:3000/api/ranking
app.get('/api/ranking', async (req, res) => {
  console.log("Pedido GET recebido em /api/ranking");
  try {
    const ranking = await db.all(`
      SELECT nome, tempo 
      FROM corrida_ranking 
      ORDER BY tempo ASC 
      LIMIT 10
    `);
    res.json(ranking);
  } catch (error) {
    console.error("Erro ao buscar ranking:", error);
    res.status(500).json({ message: "Erro ao buscar ranking" });
  }
});


// # 4. Rota para salvar o tempo
// Endereço: http://localhost:3000/api/salvar
app.post('/api/salvar', async (req, res) => {
  console.log("Pedido POST recebido em /api/salvar");
  try {
    const { nome, tempo } = req.body; // Pega 'nome' e 'tempo'

    // Verifica se os dados vieram
    if (!nome || tempo === undefined) {
      return res.status(400).json({ message: "Nome e tempo são obrigatórios." });
    }

    const jogadorExistente = await db.get(
      'SELECT * FROM corrida_ranking WHERE nome = ?',
      [nome]
    );

    if (jogadorExistente) {
      // Se o tempo novo for MENOR (melhor)
      if (tempo < jogadorExistente.tempo) {
        await db.run(
          'UPDATE corrida_ranking SET tempo = ? WHERE nome = ?',
          [tempo, nome]
        );
        res.json({ message: 'Novo recorde de tempo salvo!' });
      } else {
        res.json({ message: 'Você não bateu seu recorde anterior.' });
      }
    } else {
      // Jogador novo
      await db.run(
        'INSERT INTO corrida_ranking (nome, tempo) VALUES (?, ?)',
        [nome, tempo]
      );
      res.status(201).json({ message: 'Seu primeiro tempo foi salvo!' });
    }
  } catch (error) {
    console.error("Erro ao salvar:", error);
    res.status(500).json({ message: "Erro ao salvar tempo" });
  }
});


// # 5. Ligar a API
app.listen(PORTA, () => {
  console.log(`--- API CORRETA (DE TEMPO) RODANDO NA PORTA ${PORTA} ---`);
  console.log("Aguardando conexões do jogo...");
});