document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const noProductEl = document.getElementById('no-product');
  const productViewEl = document.getElementById('product-view');
  
  const titleEl = document.getElementById('product-title');
  const priceEl = document.getElementById('product-price');
  const currencyEl = document.getElementById('product-currency');
  const imageEl = document.getElementById('product-image');
  const domainEl = document.getElementById('product-domain');
  
  let currentProductTitle = "";
  let priceChart = null;

  // Initialize Chart.js defaults for dark mode
  if (window.Chart) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
  }

  function showState(state) {
    loadingEl.classList.add('hidden');
    noProductEl.classList.add('hidden');
    productViewEl.classList.add('hidden');
    
    if (state === 'loading') loadingEl.classList.remove('hidden');
    else if (state === 'noproduct') noProductEl.classList.remove('hidden');
    else if (state === 'product') productViewEl.classList.remove('hidden');
  }

  function renderChart(history) {
    if (!window.Chart) return;
    
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Sort history by date just in case
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = history.map(h => {
      const d = new Date(h.date);
      return `${d.getDate()}/${d.getMonth()+1}`;
    });
    const data = history.map(h => h.price);

    if (priceChart) {
      priceChart.destroy();
    }

    priceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Precio',
          data: data,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#1e293b',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#10b981',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `S/ ${context.parsed.y.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false }
          },
          y: {
            grid: { color: '#334155', drawBorder: false },
            ticks: {
              callback: function(value) {
                if (value >= 1000) return (value/1000).toFixed(1) + 'k';
                return value;
              }
            }
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }

  async function checkCurrentTab() {
    showState('loading');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        showState('noproduct');
        return;
      }

      // Execute content script logic directly or communicate with it
      // Let's ask the content script if it found a product
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          showState('noproduct');
          return;
        }

        const product = response.data;
        currentProductTitle = product.title;
        
        titleEl.textContent = product.title;
        priceEl.textContent = product.price.toLocaleString('es-PE', {minimumFractionDigits: 2});
        currencyEl.textContent = product.currency;
        domainEl.textContent = product.domain;
        
        if (product.image) {
          imageEl.src = product.image;
          imageEl.style.display = 'block';
        } else {
          imageEl.style.display = 'none';
        }

        // Get history from background
        const url = new URL(tab.url);
        const productUrl = `${url.origin}${url.pathname}`;
        
        const historyData = await chrome.storage.local.get(productUrl);
        const history = historyData[productUrl] || [
          { date: new Date().toISOString().split('T')[0], price: product.price }
        ];

        renderChart(history);
        showState('product');
      });

    } catch (e) {
      console.error(e);
      showState('noproduct');
    }
  }

  function cleanTitleForSearch(title) {
    // Remove specific models or generic words that might mess up search
    let t = title.toLowerCase();
    t = t.replace(/celular|smartphone|tablet|tv|televisor|laptop/g, ''); // Optional, but usually better search with exact model
    t = t.replace(/\d+gb|\d+tb/g, ''); // Removing capacity sometimes helps cross-store matching
    return t.trim().substring(0, 50); // Take first 50 chars to avoid super long queries
  }

  // Handle Search Buttons
  document.querySelectorAll('.compare-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentProductTitle) return;
      
      const query = encodeURIComponent(currentProductTitle.substring(0, 50));
      const store = btn.getAttribute('data-store');
      let searchUrl = '';

      switch (store) {
        case 'falabella': searchUrl = `https://www.falabella.com.pe/falabella-pe/search?Ntt=${query}`; break;
        case 'ripley': searchUrl = `https://simple.ripley.com.pe/search/${query}`; break;
        case 'wong': searchUrl = `https://www.wong.pe/search/?_query=${query}`; break;
        case 'mercadolibre': searchUrl = `https://listado.mercadolibre.com.pe/${query}`; break;
        case 'plazavea': searchUrl = `https://www.plazavea.com.pe/search/?_query=${query}`; break;
        case 'tottus': searchUrl = `https://tottus.falabella.com.pe/tottus-pe/search?Ntt=${query}`; break;
        case 'oechsle': searchUrl = `https://www.oechsle.pe/search/?_query=${query}`; break;
        case 'carsa': searchUrl = `https://www.carsa.pe/search/?_query=${query}`; break;
      }

      if (searchUrl) {
        chrome.tabs.create({ url: searchUrl, active: false }); // Open in background tab
      }
    });
  });

  // Listen for tab changes to update panel
  chrome.tabs.onActivated.addListener(checkCurrentTab);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      checkCurrentTab();
    }
  });

  // Initial check
  checkCurrentTab();
});
