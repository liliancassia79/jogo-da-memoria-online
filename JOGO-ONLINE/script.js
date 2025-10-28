// --- A URL DA NOSSA API (O GARÇOM) ---
// Verifique se a porta 3000 está correta
const API_URL = 'http://localhost:3000/api';

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

// --- Pegar os elementos do HTML ---
const setupDiv = document.getElementById('setup');
const nomeInput = document.getElementById('nome-jogador');
const btnIniciar = document.getElementById('btn-iniciar');

const jogoContainer = document.getElementById('jogo-container');
const cronometroH3 = document.getElementById('cronometro');
const tabuleiroDiv = document.getElementById('tabuleiro');

const fimDeJogoDiv = document.getElementById('fim-de-jogo');
const nomeFinalSpan = document.getElementById('nome-final');
const tempoFinalSpan = document.getElementById('tempo-final');
const mensagemServidorP = document.getElementById('mensagem-servidor');
const btnJogarNovamente = document.getElementById('btn-jogar-novamente');

const listaRankingOL = document.getElementById('lista-ranking');
const btnAtualizarRanking = document.getElementById('btn-atualizar-ranking');

// --- Variáveis do Jogo ---
let nomeDoJogador = '';
let tempoInicial = null;
let timerId = null; // Guarda o cronômetro
let cartasViradas = [];
let paresEncontrados = 0;
let bloqueado = false;

// --- Ouvir cliques ---
btnIniciar.addEventListener('click', iniciarJogo);
btnJogarNovamente.addEventListener('click', iniciarJogo);
btnAtualizarRanking.addEventListener('click', buscarRanking);

function iniciarJogo() {
    nomeDoJogador = nomeInput.value;
    if (nomeDoJogador.trim() === '') {
        alert('Por favor, digite um nome!');
        return;
    }
    
    // --- CORREÇÃO (Para o cronômetro zumbi) ---
    // Limpa qualquer cronômetro antigo antes de começar
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }

    paresEncontrados = 0;
    cartasViradas = [];
    bloqueado = false;

    setupDiv.classList.add('hidden');
    fimDeJogoDiv.classList.add('hidden');
    jogoContainer.classList.remove('hidden');

    criarTabuleiro();

    // Inicia o cronômetro
    cronometroH3.textContent = 'Tempo: 0s';
    tempoInicial = new Date();
    timerId = setInterval(() => {
        const tempoPassado = Math.floor((new Date() - tempoInicial) / 1000);
        cronometroH3.textContent = `Tempo: ${tempoPassado}s`;
    }, 1000);
}

function criarTabuleiro() {
    tabuleiroDiv.innerHTML = '';
    const cartasDoJogo = [...EMOJIS, ...EMOJIS];
    cartasDoJogo.sort(() => Math.random() - 0.5);

    cartasDoJogo.forEach(emoji => {
        const carta = document.createElement('div');
        carta.classList.add('carta');
        carta.dataset.emoji = emoji; 

        carta.innerHTML = `
            <div class="face-carta frente-carta">❓</div>
            <div class="face-carta verso-carta">${emoji}</div>
        `;
        carta.addEventListener('click', virarCarta);
        tabuleiroDiv.appendChild(carta);
    });
}

function virarCarta(evento) {
    if (bloqueado) return;
    const cartaClicada = evento.currentTarget;
    if (cartasViradas.length === 1 && cartasViradas[0] === cartaClicada) {
        return;
    }

    cartaClicada.classList.add('virada');
    cartasViradas.push(cartaClicada);

    if (cartasViradas.length === 2) {
        checarPar();
    }
}

function checarPar() {
    const [carta1, carta2] = cartasViradas;

    if (carta1.dataset.emoji === carta2.dataset.emoji) {
        // É UM PAR!
        paresEncontrados++;
        cartasViradas = [];
        carta1.removeEventListener('click', virarCarta);
        carta2.removeEventListener('click', virarCarta);

        if (paresEncontrados === EMOJIS.length) {
            finalizarJogo();
        }
    } else {
        // NÃO É UM PAR!
        bloqueado = true;
        setTimeout(() => {
            carta1.classList.remove('virada');
            carta2.classList.remove('virada');
            cartasViradas = [];
            bloqueado = false;
        }, 1000); // 1 segundo para desvirar
    }
}

function finalizarJogo() {
    clearInterval(timerId); // Para o cronômetro

    const tempoFinalMs = new Date() - tempoInicial;
    const tempoFinalSegundos = tempoFinalMs / 1000;

    jogoContainer.classList.add('hidden');
    fimDeJogoDiv.classList.remove('hidden');
    
    nomeFinalSpan.textContent = nomeDoJogador;
    tempoFinalSpan.textContent = tempoFinalSegundos.toFixed(2);

    salvarTempo(nomeDoJogador, tempoFinalSegundos);
}

// --- FUNÇÕES DE API ---

async function salvarTempo(nome, tempo) {
    mensagemServidorP.textContent = 'Enviando seu recorde...';
    try {
        const resposta = await fetch(`${API_URL}/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome, tempo: tempo }) 
        });
        
        if (!resposta.ok) { // Se a resposta não for 2xx (ex: 404, 500)
             throw new Error(`Erro da API: ${resposta.statusText}`);
        }

        const dados = await resposta.json();
        mensagemServidorP.textContent = dados.message;
        await buscarRanking(); // Espera o ranking atualizar
    } catch (error) {
        console.error("Erro ao salvar:", error);
        mensagemServidorP.textContent = "Erro ao conectar com o servidor para salvar.";
    }
}

async function buscarRanking() {
    // --- CORREÇÃO (Cache buster) ---
    // Adiciona um valor aleatório para enganar o cache do navegador
    const urlParaBuscar = `${API_URL}/ranking?timestamp=${new Date().getTime()}`;
    
    listaRankingOL.innerHTML = '<li>Carregando...</li>';
    try {
        const resposta = await fetch(urlParaBuscar);

        if (!resposta.ok) { // Se a resposta não for 2xx (ex: 404, 500)
             throw new Error(`Erro da API: ${resposta.statusText}`);
        }

        const ranking = await resposta.json();
        
        listaRankingOL.innerHTML = ''; // Limpa a lista

        if (ranking.length === 0) {
            listaRankingOL.innerHTML = '<li>Ninguém jogou ainda. Seja o primeiro!</li>';
            return;
        }

        ranking.forEach(jogador => {
            const item = document.createElement('li');
            item.textContent = `${jogador.nome} - ${jogador.tempo.toFixed(2)} segundos`;
            listaRankingOL.appendChild(item);
        });
    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
        listaRankingOL.innerHTML = '<li>Erro ao carregar o ranking. Verifique o console (F12).</li>';
    }
}

// Carrega o ranking assim que a página abre
document.addEventListener('DOMContentLoaded', buscarRanking);