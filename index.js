const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/partidos-marca', async (req, res) => {
    try {
        const { data } = await axios.get('https://www.marca.com/programacion-tv.html');
        const $ = cheerio.load(data);
        const listaPartidos = [];

        $('.ev-comp-game').each((i, elemento) => {
            const local = $(elemento).find('.ev-team-name.local').text().trim();
            const visitante = $(elemento).find('.ev-team-name.visitant').text().trim();
            const marcador = $(elemento).find('.ev-game-result').text().trim();
            const estado = $(elemento).find('.ev-game-status').text().trim();
            const enlace = $(elemento).find('a').attr('href');

            if (local && visitante) {
                listaPartidos.push({
                    local,
                    visitante,
                    marcador: marcador || "vs",
                    estado: estado || "Programado",
                    url: enlace
                });
            }
        });

        res.json({ status: "success", resultados: listaPartidos });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", mensaje: "Error al leer Marca" });
    }
});

// Endpoint recuperado para detalles del partido (Adaptado a Cheerio)
app.get('/detalle', async (req, res) => {
    const urlPartido = req.query.url;
    if (!urlPartido) return res.status(400).send("Falta la URL");

    try {
        const { data } = await axios.get(urlPartido);
        const $ = cheerio.load(data);
        const eventos = [];

        // Selectores de Marca para eventos (goles, tarjetas, etc)
        $('.ue-c-match-event').each((i, item) => {
            const minuto = $(item).find('.ue-c-match-event__time').text().trim();
            const texto = $(item).find('.ue-c-match-event__text').text().trim();
            // Intentamos capturar el tipo de evento basado en el icono SVG
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
    res.send('API de Fútbol Funcionando');
});

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});
