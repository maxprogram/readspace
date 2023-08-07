const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const keys = require('./keys.js');
const { build_db, search_similar, get_books } = require('./functions.js');


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
        const books = req.query.books.split(',').filter(b => b.length > 0).map(Number);

        let filters = {};
        if (books.length > 0) filters = { book_id: books };

        console.log(`\n* Searching for "${query.substring(0, 50)}..."`);
        const results = await search_similar(query, k=30, filters);

        if (results.length < 0) return res.json([]);
        console.log(`> First result: "${results[0]?.page_content.substring(0, 50)}..."`);

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const settings = await keys.load();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        await keys.save(req.body);
        res.json({
            status: 'success',
            settings: req.body
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/books', async (req, res) => {
    try {
        const result = await get_books();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
