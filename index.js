const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Cabeceras para simular un navegador real
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
};

async function scrapeMarca() {
    try {
        console.log("Scraping Marca...");
        // Usamos la página de marcadores directo, es más fiable
        const { data } = await axios.get('https://www.marca.com/deporte/futbol/marcadores/directo/', { headers: HEADERS });
        const $ = cheerio.load(data);
        const lista = [];

        // Nuevo selector para la página de directos de Marca
        $('.ms-match').each((i, elemento) => {
            const local = $(elemento).find('.ms-match__team-name.ms-match__team-name--local').text().trim();
            const visitante = $(elemento).find('.ms-match__team-name.ms-match__team-name--visitor').text().trim();
            const marcador = $(elemento).find('.ms-match__score').text().trim().replace(/\s+/g, ''); // Limpiar espacios
            const estado = $(elemento).find('.ms-match__status').text().trim();
            const enlace = $(elemento).attr('data-url'); // A veces el enlace está en un atributo data

            // Si no encuentra nombres (a veces usan siglas), buscamos las siglas
            const localSiglas = $(elemento).find('.ms-match__team-acronym--local').text().trim();
            const visitanteSiglas = $(elemento).find('.ms-match__team-acronym--visitor').text().trim();

            const nombreLocal = local || localSiglas;
            const nombreVisitante = visitante || visitanteSiglas;

            if (nombreLocal && nombreVisitante) {
                lista.push({
                    local: nombreLocal,
                    visitante: nombreVisitante,
                    marcador: marcador || "vs",
                    estado: estado || "Programado",
                    url: enlace ? `https://www.marca.com${enlace}` : null,
                    fuente: 'Marca'
                });
            }
        });

        console.log(`Marca encontró: ${lista.length} partidos`);
        return lista;
    } catch (error) {
        console.error("Error Marca:", error.message);
        return [];
    }
}

async function scrapeAs() {
    try {
        console.log("Scraping As...");
        // Página de resultados en directo de As
        const url = 'https://resultados.as.com/resultados/futbol/directo/';
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        const lista = [];

        $('.event-row').each((i, elemento) => {
            const local = $(elemento).find('.team-name.home').text().trim();
            const visitante = $(elemento).find('.team-name.away').text().trim();
            const marcador = $(elemento).find('.score-content').text().trim();
            const estado = $(elemento).find('.state').text().trim();
            const enlace = $(elemento).find('a.event-link').attr('href');

            if (local && visitante) {
                lista.push({
                    local,
                    visitante,
                    marcador: marcador || "vs",
                    estado: estado || "En Juego",
                    url: enlace ? (enlace.startsWith('http') ? enlace : `https://resultados.as.com${enlace}`) : null,
                    fuente: 'As.com'
                });
            }
        });

        console.log(`As encontró: ${lista.length} partidos`);
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
    try {
        const [datosMarca, datosAs] = await Promise.all([scrapeMarca(), scrapeAs()]);
        const todosLosPartidos = [...datosMarca, ...datosAs];

        // Si ambos fallan, devolvemos array vacío pero con status success para que no rompa la app
        res.json({ status: "success", resultados: todosLosPartidos });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
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
    res.send('API de Fútbol V3 - Marca Directo + As Directo');
});

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});
