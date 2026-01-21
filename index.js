const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Cabeceras para simular un navegador real y evitar bloqueos
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

async function scrapeMarca() {
    try {
        // Añadimos headers a la petición
        const { data } = await axios.get('https://www.marca.com/programacion-tv.html', { headers: HEADERS });
        const $ = cheerio.load(data);
        const lista = [];

        $('.ev-comp-game').each((i, elemento) => {
            const local = $(elemento).find('.ev-team-name.local').text().trim();
            const visitante = $(elemento).find('.ev-team-name.visitant').text().trim();
            const marcador = $(elemento).find('.ev-game-result').text().trim();
            const estado = $(elemento).find('.ev-game-status').text().trim();
            const enlace = $(elemento).find('a').attr('href');

            if (local && visitante) {
                lista.push({
                    local,
                    visitante,
                    marcador: marcador || "vs",
                    estado: estado || "Programado",
                    url: enlace,
                    fuente: 'Marca'
                });
            }
        });
        console.log(`Marca: ${lista.length} partidos encontrados`);
        return lista;
    } catch (error) {
        console.error("Error Marca:", error.message);
        return [];
    }
}

async function scrapeAs() {
    try {
        const url = 'https://resultados.as.com/resultados/futbol/champions/jornada/';
        // Añadimos headers a la petición
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        const lista = [];

        $('.li-jornada').each((i, elemento) => {
            const local = $(elemento).find('.equipo-local .nombre-equipo').text().trim();
            const visitante = $(elemento).find('.equipo-visitante .nombre-equipo').text().trim();
            const resultado = $(elemento).find('.resultado').text().trim();
            const enlaceRelativo = $(elemento).find('a').attr('href');
            const url = enlaceRelativo ? (enlaceRelativo.startsWith('http') ? enlaceRelativo : `https://resultados.as.com${enlaceRelativo}`) : null;

            if (local && visitante) {
                lista.push({
                    local,
                    visitante,
                    marcador: resultado || "vs",
                    estado: resultado.includes(':') || resultado.includes('-') ? "Info" : "En Juego",
                    url: url,
                    fuente: 'As.com'
                });
            }
        });
        console.log(`As: ${lista.length} partidos encontrados`);
        return lista;
    } catch (error) {
        console.error("Error As:", error.message);
        return [];
    }
}

// --- Rutas ---

app.get('/partidos-marca', async (req, res) => {
    const resultados = await scrapeMarca();
    res.json({ status: "success", resultados });
});

app.get('/partidos-combinados', async (req, res) => {
    const [datosMarca, datosAs] = await Promise.all([scrapeMarca(), scrapeAs()]);
    const todosLosPartidos = [...datosMarca, ...datosAs];
    res.json({ status: "success", resultados: todosLosPartidos });
});

app.get('/detalle', async (req, res) => {
    const urlPartido = req.query.url;
    if (!urlPartido) return res.status(400).send("Falta la URL");

    try {
        const { data } = await axios.get(urlPartido, { headers: HEADERS });
        const $ = cheerio.load(data);
        const eventos = [];

        $('.ue-c-match-event').each((i, item) => {
            const minuto = $(item).find('.ue-c-match-event__time').text().trim();
            const texto = $(item).find('.ue-c-match-event__text').text().trim();
            const tipo = $(item).find('svg').attr('class') || 'evento';

            if (texto) {
                eventos.push({ minuto, texto, tipo });
            }
        });

        res.json({ status: "success", eventos });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/', (req, res) => {
    res.send('API de Fútbol Funcionando (Marca + As)');
});

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});
