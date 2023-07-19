const express = require('express');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const cors = require('cors');

const { build_db, search_similar } = require('./db.js');

const app = express();
const port = process.env.PORT || 3080;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.get('/api/load_highlights', async (req, res) => {
    try {
        const result = await build_db();
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const results = await search_similar(query);
        res.send(results);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.get('/api/settings', async (req, res) => {
    if (!fs.existsSync('data/settings.json')) {
        await fs.writeFile('data/settings.json', '{}');
    }

    const data = await fs.readFile('data/settings.json');
    const settings = JSON.parse(data);
    res.send(settings);
    
});

app.post('/api/settings', async (req, res) => {
    try {
        const settings = JSON.stringify(req.body);
        await fs.writeFile('data/settings.json', settings);
        res.send({
            status: 'sucess',
            settings
        });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
