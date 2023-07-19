
const { createApp } = Vue;

const BASE_URL = 'http://localhost:3080';

const app = createApp({

  data() {
    return {
      searchQuery: '',
      highlights: [],
      showSettings: false,
      defaultSettings: [
        { name: 'OpenAI API Key', key: 'OPENAI_API_KEY', value: '' },
        { name: 'Readwise API Key', key: 'READWISE_TOKEN', value: '' },
      ],
      settings: {}
    }
  },

  methods: {

    async loadHighlights() {
      let response = await fetch(`${BASE_URL}/api/load_highlights`);
      let results = await response.json();
    },

    async searchHighlights() {
      let response = await fetch(`${BASE_URL}/api/search?q=${this.searchQuery}`);
      this.highlights = (await response.json()).map(h => ({
        ...h,
        author: h.author.replace(/\./g, ' . '),
      }));
    },

    async openSettings() {
      let response = await fetch(`${BASE_URL}/api/settings`)
      this.settings = await response.json();
      this.showSettings = true;
    },

    async saveSettings() {
      await fetch(`${BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.settings)
      });
      this.showSettings = false;
    }

  }
  
});

app.mount('#app');
