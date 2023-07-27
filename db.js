const { Configuration, OpenAIApi } = require('openai');
const { IndexFlatL2 } = require('faiss-node');
const fs = require('fs-extra');
const uuid = require('uuid');
const path = require('path');

class VectorStore {
    /**
     * Constructor for the VectorStore class
     * Initializes OpenAI API and prepares properties for the index and mapping
     */
    constructor() {
        this.configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.openai = new OpenAIApi(this.configuration);
        this.index = null;
        this.document_mapping = {};
        this.index_mapping = {};
    }


    /**
   * Handles OpenAI API calls with exponential backoff on 503 and 429 errors
   * @param {string[]} texts - Array of texts to be embedded
   * @param {number} [retryCount=0] - Current count of retries
   * @returns {Promise} Promise resolving to an array of embeddings
   */
    async _createEmbeddings(texts, retryCount = 0) {
        const maxRetries = 5;
        const delay = 5000;

        try {
            const result = await this.openai.createEmbedding({
                model: 'text-embedding-ada-002',
                input: texts,
            });
            return result.data.data;
        } catch (error) {
            if ((error.statusCode === 503 || error.statusCode === 429) && retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return this._createEmbeddings(texts, retryCount + 1);
            } else {
                throw error;
            }
        }
    }

    /**
     * Creates embeddings for the provided documents and adds them to the index
     * @param {Object[]} documents - Array of documents with `page_content` and `metadata`
     */
    async addDocuments(documents) {
        const batchSize = 512;
        const embeddings = [];

        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const texts = batch.map(doc => doc.page_content);
            
            const result = await this._createEmbeddings(texts);
            
            embeddings.push(...result.map(res => res.embedding));
        }

        const dimension = embeddings[0].length;
        if (!this.index) {
            this.index = new IndexFlatL2(dimension);
        }

        const indexSize = this.index.ntotal();
        for (let i = 0; i < embeddings.length; i++) {
            const documentId = uuid.v4();
            // Add the embedding to the index
            this.index.add(embeddings[i]);
            // Add the document to the mapping
            this.document_mapping[documentId] = documents[i];
            // Add the document id to the index_mapping mapping
            const index = indexSize + i;
            this.index_mapping[index] = documentId;
        }

        return this;
    }

    /**
     * Saves the index and the docstore to specified directory
     * @param {string} directory - Path to the directory where index and docstore will be saved
     */
    async save(directory) {
        const indexFilePath = path.join(directory, 'faiss.index');
        const docstoreFilePath = path.join(directory, 'docstore.json');

        await fs.ensureDir(directory);
        this.index.write(indexFilePath);

        const docstore = [this.document_mapping, this.index_mapping];
        await fs.writeFile(docstoreFilePath, JSON.stringify(docstore));

        return this;
    }

    /**
     * Loads the index and the docstore from specified directory
     * @param {string} directory - Path to the directory from where index and docstore will be loaded
     */
    async load(directory) {
        const indexFilePath = path.join(directory, 'faiss.index');
        const docstoreFilePath = path.join(directory, 'docstore.json');

        this.index = IndexFlatL2.read(indexFilePath);

        const docstore = await fs.readFile(docstoreFilePath);
        [this.document_mapping, this.index_mapping] = JSON.parse(docstore);

        return this;
    }

    /**
     * Searches the index for the provided query and returns the top k results
     * @param {string} query - The query to search for in the index
     * @param {number} [k=4] - The number of top entries to return
     * @returns {Object[]} Array of document objects: { page_content, metadata, score }
     */
    async search(query, k = 4) {
        const embeddingResponse = await this._createEmbeddings(query);
        const embedding = embeddingResponse[0].embedding;
        
        const results = this.index.search(embedding, k);

        return results.labels.map((id, idx) => ({
            ...this.document_mapping[this.index_mapping[id]],
            id: this.index_mapping[id],
            score: 1 - results.distances[idx],
        }));
    }
}

module.exports = VectorStore;
