// Substitua o conteúdo do seu arquivo principal (ex: server.js) por este código:

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // <--- NOVO: Importa o pool do PostgreSQL

const app = express();

// A porta é definida pelo Railway, e 3000 é o fallback local
const PORT = process.env.PORT || 3000; 

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO BANCO DE DADOS POSTGRESQL (USA VARIÁVEIS DO RAILWAY)
// Se estiver rodando no Railway, ele usa as variáveis PGHOST, PGUSER, etc.
// Se estiver rodando localmente, estas variáveis estarão vazias.
const pool = new Pool();
console.log("Pool de conexão PostgreSQL criado.");

// Middleware (CRUCIAL: antes das rotas)
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------


// # 1. Função para garantir que a tabela existe (Executada uma vez na inicialização)
async function ensureDbStructure() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS corrida_ranking (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) UNIQUE,
                tempo REAL 
            )
        `);
        console.log("Estrutura do banco de dados (tabela 'corrida_ranking') verificada.");
    } catch (error) {
        console.error("Erro ao verificar ou criar tabela:", error);
    }
}


// # 2. Rota para buscar o Ranking
// Endereço: /api/ranking
app.get('/api/ranking', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT nome, tempo 
            FROM corrida_ranking 
            ORDER BY tempo ASC 
            LIMIT 10
        `);
        res.json(result.rows); // No 'pg', os dados vêm em 'result.rows'
    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
        res.status(500).json({ message: "Erro ao buscar ranking" });
    }
});


// # 3. Rota para salvar o tempo
// Endereço: /api/salvar
app.post('/api/salvar', async (req, res) => {
    try {
        const { nome, tempo } = req.body;

        if (!nome || tempo === undefined) {
            return res.status(400).json({ message: "Nome e tempo são obrigatórios." });
        }

        // Tenta buscar o jogador existente
        const existente = await pool.query(
            'SELECT * FROM corrida_ranking WHERE nome = $1',
            [nome]
        );
        const jogadorExistente = existente.rows[0];

        if (jogadorExistente) {
            // Se o tempo novo for MENOR (melhor)
            if (tempo < jogadorExistente.tempo) {
                await pool.query(
                    'UPDATE corrida_ranking SET tempo = $1 WHERE nome = $2',
                    [tempo, nome]
                );
                res.json({ message: 'Novo recorde de tempo salvo!' });
            } else {
                res.json({ message: 'Você não bateu seu recorde anterior.' });
            }
        } else {
            // Jogador novo
            await pool.query(
                'INSERT INTO corrida_ranking (nome, tempo) VALUES ($1, $2)',
                [nome, tempo]
            );
            res.status(201).json({ message: 'Seu primeiro tempo foi salvo!' });
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        res.status(500).json({ message: "Erro ao salvar tempo" });
    }
});


// # 4. Iniciar o Servidor
ensureDbStructure() // Garante que a tabela existe
    .then(() => {
        app.listen(PORT, () => {
            console.log(`--- API de Ranking PostgreSQL Rodando na Porta ${PORT} ---`);
            console.log("Aguardando conexões do jogo...");
        });
    })
    .catch(error => {
        console.error("Falha ao iniciar a aplicação:", error);
    });