

const { createApp } = Vue;

const app = createApp({

  data() {
    return {
      searchQuery: '',
      highlights: [],
      showSettings: false,
      settings: {}
    }
  },

  methods: {
    loadHighlights() {
      fetch('/api/load_highlights')
        .then(response => response.json())
        .then(data => this.highlights = data);
    },
    searchHighlights() {
      fetch(`/api/search?q=${this.searchQuery}`)
        .then(response => response.json())
        .then(data => this.highlights = data);
    },
    clearHighlights() {
      fetch('/api/clear_highlights')
        .then(() => this.highlights = []);
    },
    openSettings() {
      fetch('/api/settings')
        .then(response => response.json())
        .then(data => this.settings = data);
      this.showSettings = true;
    },
    saveSettings() {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.settings)
      })
        .then(() => this.showSettings = false);
    }
  }
  
});

app.mount('#app');
