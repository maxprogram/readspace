const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const https = require('https');
const keytar = require('keytar');
const VectorStore = require('./db');

dotenv.config();


// Vector DB stored in memory
let g_db = null;

const DATA_PATH = path.join(process.env.HOME, 'Documents/Readspace');
const g_index = path.join(DATA_PATH, 'readwise_faiss_index');
const g_last_fetch = path.join(DATA_PATH, 'last_fetch.txt');


/**
 * Saves the last time the database was updated to local file.
 */
const save_last_fetch = async () => {
    const time = new Date().toISOString();
    await fs.ensureFile(g_last_fetch);
    await fs.writeFile(g_last_fetch, time);
};


/**
 * Gets the last time the database was updated
 * @returns {string} The last time the database was updated
 */
const get_last_fetch = async () => {
    if (!fs.existsSync(g_last_fetch)) return null;
    const time = await fs.readFile(g_last_fetch, 'utf8');
    return time;
};


/**
 * Loads in settings.json with customized api keys
 */
const load_settings = async () => {
    const keys = await keytar.findCredentials('readspace');
    for (const key of keys) {
        if (key.account == 'OPENAI_API_KEY') process.env.OPENAI_API_KEY = key.password;
        if (key.account == 'READWISE_TOKEN') process.env.READWISE_TOKEN = key.password;
    }
};


/**
 * Fetches all highlights from the Readwise export API
 * @returns {Array} An array of highlights
 */
const get_highlights = async () => {
    const fetchFromExportApi = async (updatedAfter = null) => {
        let fullData = [];
        let nextPageCursor = null;
        while (true) {
            const params = {};
            if (nextPageCursor) {
                params.pageCursor = nextPageCursor;
            }
            if (updatedAfter) {
                params.updatedAfter = updatedAfter;
            }
            const response = await axios.get("https://readwise.io/api/v2/export/", {
                params: params,
                headers: { "Authorization": `Token ${process.env.READWISE_TOKEN}` },
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });
            fullData = fullData.concat(response.data.results);
            nextPageCursor = response.data.nextPageCursor;
            if (!nextPageCursor) break;
        }
        return fullData;
    };    

    const lastFetch = await get_last_fetch();
    const allData = await fetchFromExportApi(lastFetch);
    return allData;
};


/**
 * Builds a database of Readwise highlights
 * @returns {Object} An object with the number of documents added
 */
const build_db = async () => {
    await load_settings();
    const documents = await get_highlights();

    // Create index documents
    const docs = [];
    for (let book of documents) {
        const author = book.author || 'Unknown';
        const title = book.title;

        for (let highlight of book.highlights) {
            if (highlight.is_discard) continue;
            docs.push({
                page_content: `${highlight.text}`,
                metadata: {
                    id: highlight.id,
                    book: title,
                    author: author,
                    book_id: book.user_book_id,
                    favorite: highlight.is_favorite,
                    highlighted_at: highlight.highlighted_at,
                    tags: highlight.tags,
                    note: highlight.note,
                },
            });
        }
    }

    if (docs.length === 0) {
        console.log('No new documents to add!');
        return { documents_added: 0 };
    }

    console.log(`Adding ${docs.length} documents to index...`);

    // Add documents to database
    const db = new VectorStore();
    if (fs.existsSync(g_index)) {
        g_db = await db.load(g_index);
        await g_db.addDocuments(docs);
    } else {
        g_db = await db.addDocuments(docs);
    }

    // Save database
    await fs.ensureDir(g_index);
    await g_db.save(g_index);
    await save_last_fetch();

    return {
        documents_added: docs.length
    };
};


/**
 * Loads the database from disk
 * @returns {Object} The database
 */
const load_db = async () => {
    if (g_db !== null) return g_db;
    
    if (!fs.existsSync(g_index)) {
        throw new Error('Readwise highlights must be loaded first!');
    }

    await load_settings();
    g_db = new VectorStore();
    await g_db.load(g_index);

    return g_db;
};


/**
 * Searches the database for similar documents
 * @param {string} query The query to search for
 * @param {number} [k] The number of results to return
 * @returns {Array} An array of results
 */
const search_similar = async (query, k = 30, filters={}) => {
    const db = await load_db();

    const results = await db.search(query, filters, 0.5);

    return results.slice(0, k);
};


/**
 * Gets all books from the database
 * @returns {Array} An array of books
 */
const get_books = async () => {
    const db = await load_db();

    let books = db.documents.map(doc => ({
        id: doc.metadata.book_id,
        title: doc.metadata.book,
    }));

    // Return unique books by title & alphabetically
    return books.filter((book, index, self) =>
        index === self.findIndex((b) => (
            b.title === book.title
        ))
    ).sort((a, b) => a.title.localeCompare(b.title));
};


module.exports = {
    get_highlights,
    build_db,
    load_db,
    search_similar,
    get_books
};
