// Importações
const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require = require('cors'); // Pacote para permitir a conexão

// ----------------------------------------------------
// Configuração do Servidor
// CRUCIAL: O Railway usa a variável de ambiente process.env.PORT
const PORT = process.env.PORT || 3000;
let db;

const app = express();

// Middlewares (Configurações Globais)
// IMPORTANTE: CORS e express.json() devem vir antes das rotas
app.use(cors());         // Permite que o Netlify se comunique com o Railway
app.use(express.json()); // Habilita a API a ler JSON
// ----------------------------------------------------


// # 1. Conectar ao Banco de Dados (Bloco Assíncrono)
(async () => {
  try {
    db = await open({
      filename: './banco_do_jogo.db', // O nome do arquivo do banco
      driver: sqlite3.Database
    });

    // Cria a tabela de ranking se ela não existir
    await db.exec(`
      CREATE TABLE IF NOT EXISTS corrida_ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        tempo REAL 
      )
    `);
    console.log("Banco de dados pronto (tabela 'corrida_ranking').");

    // # 4. Ligar a API - Movemos o app.listen para dentro do try/catch
    app.listen(PORT, () => {
        console.log(`--- API CORRETA (DE TEMPO) RODANDO NA PORTA ${PORT} ---`);
        console.log("Aguardando conexões do jogo...");
    });

  } catch (error) {
    console.error("ERRO CRÍTICO ao conectar ao banco ou ligar a API:", error);
  }
})();


// # 2. Rota para buscar o Ranking
// Endereço: /api/ranking
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


// # 3. Rota para salvar o tempo
// Endereço: /api/salvar
app.post('/api/salvar', async (req, res) => {
  console.log("Pedido POST recebido em /api/salvar");
  try {
    const { nome, tempo } = req.body;

    if (!nome || tempo === undefined) {
      return res.status(400).json({ message: "Nome e tempo são obrigatórios." });
    }

    const jogadorExistente = await db.get(
      'SELECT * FROM corrida_ranking WHERE nome = ?',
      [nome]
    );

    if (jogadorExistente) {
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