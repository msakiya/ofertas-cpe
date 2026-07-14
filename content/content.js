// content.js - Extract product info from eCommerce sites

function extractProductInfo() {
  // 1. Try JSON-LD Schema (usually best for eCommerce)
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.innerText);
      // Data might be an array or a single object
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        if (item['@type'] === 'Product') {
          let price = null;
          let currency = 'S/';
          
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            price = parseFloat(offer.price);
            if (offer.priceCurrency) currency = offer.priceCurrency === 'PEN' ? 'S/' : offer.priceCurrency;
          }
          
          if (price && item.name) {
            return {
              title: item.name,
              price: price,
              currency: currency,
              image: Array.isArray(item.image) ? item.image[0] : (item.image || ''),
              domain: window.location.hostname
            };
          }
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // 2. Try OpenGraph / Meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogPrice = document.querySelector('meta[property="product:price:amount"]');
  const ogCurrency = document.querySelector('meta[property="product:price:currency"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  
  if (ogTitle && ogPrice) {
    const priceVal = parseFloat(ogPrice.content);
    if (!isNaN(priceVal)) {
      return {
        title: ogTitle.content,
        price: priceVal,
        currency: (ogCurrency && ogCurrency.content === 'PEN') ? 'S/' : (ogCurrency ? ogCurrency.content : 'S/'),
        image: ogImage ? ogImage.content : '',
        domain: window.location.hostname
      };
    }
  }

  // 3. Very generic fallback for specific Peruvian stores if meta tags fail
  // Example for common class names (price-current, product-title, etc.)
  // (In a real scenario, we would add specific selectors for Falabella, Ripley, etc.)
  
  return null;
}

const productInfo = extractProductInfo();

// If we found a product, record its price silently in background
if (productInfo) {
  chrome.runtime.sendMessage({
    type: 'RECORD_PRICE',
    data: productInfo
  });
}

// Listen for side panel requesting current info
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PRODUCT_INFO') {
    const info = extractProductInfo();
    if (info) {
      sendResponse({ success: true, data: info });
    } else {
      sendResponse({ success: false });
    }
  }
  return true;
});
