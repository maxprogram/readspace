const express = require('express');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const { build_db, search_similar } = require('./functions.js');


const DATA_PATH = path.join(process.env.HOME, 'Documents/Readspace');
const SETTINGS_PATH = path.join(DATA_PATH, 'settings.json');


const app = express();
const port = process.env.PORT || 3080;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/load_highlights', async (req, res) => {
    try {
        const result = await build_db();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;

        console.log(`\n* Searching for "${query.substring(0, 50)}..."`);
        const results = await search_similar(query);
        console.log(`> First result: "${results[0].page_content.substring(0, 50)}..."`);

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings', async (req, res) => {
    if (!fs.existsSync(SETTINGS_PATH)) {
        await fs.ensureFile(SETTINGS_PATH);
        await fs.writeFile(SETTINGS_PATH, '{}');
    }

    const data = await fs.readFile(SETTINGS_PATH);
    const settings = JSON.parse(data);
    res.json(settings);
    
});

app.post('/api/settings', async (req, res) => {
    try {
        const settings = JSON.stringify(req.body);
        await fs.writeFile(SETTINGS_PATH, settings);
        res.json({
            status: 'sucess',
            settings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
