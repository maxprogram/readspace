
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
      fetch(`${BASE_URL}/api/load_highlights`)
        .then(response => response.json())
        .then(data => this.highlights = data);
    },

    async searchHighlights() {
      fetch(`/api/search?q=${this.searchQuery}`)
        .then(response => response.json())
        .then(data => this.highlights = data);
    },

    async openSettings() {
      let response = await fetch(`${BASE_URL}/api/settings`)
      this.settings = response.json();
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
