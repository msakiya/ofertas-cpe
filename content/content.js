// content.js - Extract product info from eCommerce sites

function cleanPrice(priceStr) {
  // Remove currency symbols, spaces, and commas, keeping dots for decimals
  const cleaned = priceStr.replace(/[S/\s$,]/g, '');
  return parseFloat(cleaned);
}

function getStoreSpecificPrice() {
  const domain = window.location.hostname;
  let offerPrice = null;

  try {
    if (domain.includes('falabella.com.pe')) {
      // Falabella typically has prices in ol li containing divs. We look for lowest price.
      // Classes like .copy10 (internet), .copy12 (CMR) are common.
      const priceElements = document.querySelectorAll('ol li div[class*="copy"], .prices span[class*="copy"]');
      let minPrice = Infinity;
      priceElements.forEach(el => {
        if (el.innerText.includes('S/')) {
          const p = cleanPrice(el.innerText);
          if (p && p < minPrice && p > 0) minPrice = p;
        }
      });
      if (minPrice !== Infinity) offerPrice = minPrice;
    } 
    else if (domain.includes('ripley.com.pe')) {
      // Ripley uses .catalog-product-details__discount-price or .catalog-product-details__lowest-price
      const ripleyPrice = document.querySelector('.catalog-product-details__discount-price, .product-price, .catalog-prices__offer-price');
      if (ripleyPrice) offerPrice = cleanPrice(ripleyPrice.innerText);
    }
    else if (domain.includes('oechsle.pe') || domain.includes('plazavea.com.pe') || domain.includes('promart.pe')) {
      // VTEX stores (PlazaVea, Oechsle)
      const vtexPrice = document.querySelector('.plugin-preco .skuBestPrice, .PriceText');
      if (vtexPrice) offerPrice = cleanPrice(vtexPrice.innerText);
    }
  } catch (e) {
    console.log("Error in store specific extractor", e);
  }

  return offerPrice;
}

function extractProductInfo() {
  let title = null;
  let price = null;
  let currency = 'S/';
  let image = '';

  // 1. Try OpenGraph / Meta tags (most reliable for title and image)
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogPrice = document.querySelector('meta[property="product:price:amount"]');
  const ogCurrency = document.querySelector('meta[property="product:price:currency"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  
  if (ogTitle) title = ogTitle.content;
  if (ogImage) image = ogImage.content;
  if (ogPrice) {
    const priceVal = parseFloat(ogPrice.content);
    if (!isNaN(priceVal)) price = priceVal;
  }
  if (ogCurrency) currency = ogCurrency.content === 'PEN' ? 'S/' : ogCurrency.content;

  // 2. Try JSON-LD Schema (fallback for title/price if meta fails)
  if (!title || !price) {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.innerText);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product') {
            if (!title && item.name) title = item.name;
            if (!image && item.image) image = Array.isArray(item.image) ? item.image[0] : item.image;
            
            if (!price && item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              if (offer.price) price = parseFloat(offer.price);
              if (offer.priceCurrency) currency = offer.priceCurrency === 'PEN' ? 'S/' : offer.priceCurrency;
            }
          }
        }
      } catch (e) {}
    }
  }

  // 3. OVERRIDE with Store-Specific Offer Price (CMR, Ripley, etc.)
  const offerPrice = getStoreSpecificPrice();
  if (offerPrice && offerPrice > 0) {
    // If the offer price is lower than the schema price (or if we didn't find schema price)
    if (!price || offerPrice < price) {
      price = offerPrice;
    }
  }

  if (title && price) {
    return {
      title: title,
      price: price,
      currency: currency,
      image: image,
      domain: window.location.hostname
    };
  }

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
