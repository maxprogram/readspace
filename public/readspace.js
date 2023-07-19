
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

  mounted() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    this.searchQuery = params.get('q') || '';
    if (this.searchQuery) {
      this.searchHighlights();
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

      window.location.hash = `q=${encodeURIComponent(this.searchQuery)}`;
      this.adjustHeight();
      window.scrollTo(0, 0);
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
    },

    searchSimilar: function(text) {
      this.searchQuery = text;
      this.searchHighlights();
    },

    adjustHeight(event) {
      const $el = event ? event.target : document.getElementById('searchQuery');
      const $spacer = document.getElementById('spacer');

      $el.style.height = 'auto';
      $el.style.height = $el.scrollHeight + 'px';
      $spacer.style.height = $el.scrollHeight - 50 + 'px';
    },

  }
  
});

app.mount('#app');
