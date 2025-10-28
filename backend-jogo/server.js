// server.js - Código adaptado para Node.js (Express) e PostgreSQL (Driver 'pg')

// 1. IMPORTAÇÕES NECESSÁRIAS
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // <-- Importa o Pool para conexão com PostgreSQL

// Configurações Iniciais
const app = express();
// CRUCIAL: O Railway injeta a porta automaticamente via variável de ambiente
const PORT = process.env.PORT || 3000; 

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO BANCO DE DADOS POSTGRESQL
// O objeto Pool vazio usa automaticamente as variáveis de ambiente 
// (PGHOST, PGUSER, PGPASSWORD, PGDATABASE) que o Railway adiciona ao seu serviço.
const pool = new Pool(); 
console.log("Pool de conexão PostgreSQL criado.");

// MIDDLEWARES (Configurações Globais que rodam antes das rotas)
app.use(cors());         // Permite a comunicação entre Frontend (Netlify) e Backend (Railway)
app.use(express.json()); // Habilita a API a receber dados em formato JSON
// ------------------------------------------------------------------


// 2. FUNÇÃO DE ESTRUTURA DB
// Garante que a tabela 'corrida_ranking' existe no PostgreSQL
async function ensureDbStructure() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS corrida_ranking (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) UNIQUE NOT NULL,
                tempo REAL 
            )
        `);
        console.log("Estrutura do banco de dados (tabela 'corrida_ranking') verificada.");
    } catch (error) {
        console.error("Erro ao verificar ou criar tabela:", error);
    }
}


// 3. ROTA para buscar o Ranking (GET)
// Endpoint: /api/ranking
app.get('/api/ranking', async (req, res) => {
    try {
        // Seleciona os 10 melhores tempos (menores tempos)
        const result = await pool.query(`
            SELECT nome, tempo 
            FROM corrida_ranking 
            ORDER BY tempo ASC 
            LIMIT 10
        `);
        // No 'pg', os resultados vêm dentro da propriedade 'rows'
        res.json(result.rows); 
    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
        res.status(500).json({ message: "Erro ao buscar ranking" });
    }
});


// 4. ROTA para salvar o tempo (POST)
// Endpoint: /api/salvar
app.post('/api/salvar', async (req, res) => {
    try {
        const { nome, tempo } = req.body;

        if (!nome || tempo === undefined) {
            return res.status(400).json({ message: "Nome e tempo são obrigatórios." });
        }

        // Tenta buscar o jogador existente
        const existente = await pool.query(
            'SELECT * FROM corrida_ranking WHERE nome = $1', // $1 é a sintaxe do pg para parâmetros
            [nome]
        );
        const jogadorExistente = existente.rows[0];

        if (jogadorExistente) {
            // Se o tempo novo for MELHOR (menor)
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
            // Insere novo jogador
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


// 5. INICIAR O SERVIDOR
// Garante que a estrutura do DB está ok antes de iniciar o servidor
ensureDbStructure() 
    .then(() => {
        app.listen(PORT, () => {
            console.log(`--- API de Ranking PostgreSQL Rodando na Porta ${PORT} ---`);
        });
    })
    .catch(error => {
        console.error("Falha ao iniciar a aplicação:", error);
    });