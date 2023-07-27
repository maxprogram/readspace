const { createApp } = Vue;

const BASE_URL = 'http://localhost:3080';

const isElectron = () => {
  return window && window.process && window.process.type;
}
let shell;

const routeLinksToExternal = (links) => {
  Array.prototype.forEach.call(links, function (link) {
    const url = link.getAttribute('href');
    if (url.indexOf('http') === 0) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        shell.openExternal(url);
      });
    }
  });
}

// For Electron:
if (isElectron()) {
  const server = require('../server.js');
  shell = require('electron').shell;

  process.on('uncaughtException', function (err) {
    console.log(err);
  });

  // Disable CORS for OpenAI API
  const setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function newSetRequestHeader(key, val) {
      if (key.toLocaleLowerCase() === 'user-agent') {
          return;
      }
      setRequestHeader.apply(this, [key, val]);
  };

  // Open links in external browser
  document.addEventListener('DOMContentLoaded', function () {
    const links = document.querySelectorAll('a[href]');
    routeLinksToExternal(links);
  });
}




const app = createApp({

  data() {
    return {
      searchQuery: '',
      highlights: [],
      showNav: false,
      isLoading: false,
      isLoadingHighlights: false,
      newHighlightsCount: null,
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
      this.adjustHeight();
      this.searchHighlights();
    }
  },

  methods: {

    async loadHighlights() {
      this.isLoadingHighlights = true;
      let response = await fetch(`${BASE_URL}/api/load_highlights`);
      let data = await response.json();
      this.newHighlightsCount = data.documents_added;
      this.isLoadingHighlights = false;
    },

    async searchHighlights() {
      if (!this.searchQuery || this.searchQuery.trim() == '') return;

      this.isLoading = true;
      window.scrollTo(0, 0);

      let response = await fetch(`${BASE_URL}/api/search?q=${this.searchQuery}`);
      this.highlights = (await response.json()).map(h => {
        let html = marked.parse(h.page_content, { mangle: false, headerIds: false });
        html = html.replace(/<a href=/g, '<a target="_blank" href=');
        
        return {
          text: h.page_content,
          html,
          ...h.metadata,
        }
      });

      // Add event listener for opening links in external browser
      if (isElectron() && shell) this.$nextTick(() => {
        const links = document.querySelectorAll('.highlight a');
        routeLinksToExternal(links);
      });

      window.location.hash = `q=${encodeURIComponent(this.searchQuery)}`;
      this.adjustHeight();
      this.isLoading = false;
    },

    async openSettings() {
      let response = await fetch(`${BASE_URL}/api/settings`)
      this.settings = await response.json();
      // If settings are empty, set defaults
      if (Object.keys(this.settings).length === 0) {
        for (let setting of this.defaultSettings) {
          this.settings[setting.key] = setting.value;
        }
      }
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
