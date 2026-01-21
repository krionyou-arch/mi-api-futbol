const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = 3000;

app.get('/partidos-marca', async (req, res) => {
    console.log("Consultando resultados en Marca...");
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        await page.goto('https://www.marca.com/programacion-tv.html', { waitUntil: 'networkidle2' });

        const partidos = await page.evaluate(() => {
            const lista = [];
            const bloques = document.querySelectorAll('.ev-comp-game');

            bloques.forEach(bloque => {
                const local = bloque.querySelector('.ev-team-name.local')?.innerText.trim();
                const visitante = bloque.querySelector('.ev-team-name.visitant')?.innerText.trim();
                const marcador = bloque.querySelector('.ev-game-result')?.innerText.trim();
                const estado = bloque.querySelector('.ev-game-status')?.innerText.trim();
                // CAPTURAMOS LA URL AQUÍ
                const url = bloque.querySelector('a')?.href;

                if (local && visitante) {
                    lista.push({ local, visitante, marcador: marcador || "vs", estado, url });
                }
            });
            return lista;
        });

        await browser.close();
        res.json({ status: "success", resultados: partidos });

    } catch (e) {
        if (browser) await browser.close();
        console.error(e);
        res.status(500).json({ status: "error", mensaje: e.message });
    }
});

app.get('/detalle', async (req, res) => {
    const urlPartido = req.query.url;
    if (!urlPartido) return res.status(400).send("Falta la URL");

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(urlPartido, { waitUntil: 'networkidle2' });

        const detalles = await page.evaluate(() => {
            const eventos = [];
            // Selectores actualizados para detalle
            const items = document.querySelectorAll('.ue-c-match-event');

            items.forEach(item => {
                const minuto = item.querySelector('.ue-c-match-event__time')?.innerText;
                const texto = item.querySelector('.ue-c-match-event__text')?.innerText;
                const tipo = item.querySelector('svg')?.getAttribute('class') || 'evento';

                if (texto) {
                    eventos.push({ minuto, texto, tipo });
                }
            });
            return eventos;
        });

        await browser.close();
        res.json({ status: "success", eventos: detalles });
    } catch (e) {
        if (browser) await browser.close();
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}/partidos-marca`);
});
