chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
  console.log("Ofertas CPE Extension Installed");
});

// Listener for messages from content script or panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RECORD_PRICE') {
    (async () => {
      try {
        const url = new URL(sender.tab.url);
        const domain = url.hostname;
        // Normalize URL to avoid tracking query parameters (unless necessary)
        const productUrl = `${url.origin}${url.pathname}`;
        
        const historyData = await chrome.storage.local.get(productUrl);
        const history = historyData[productUrl] || [];
        
        // Add current price if it's new or the day changed
        const today = new Date().toISOString().split('T')[0];
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;
        
        if (!lastEntry || lastEntry.date !== today || lastEntry.price !== request.data.price) {
          history.push({
            date: today,
            price: request.data.price,
            title: request.data.title,
            image: request.data.image,
            currency: request.data.currency,
            domain: domain
          });
          
          await chrome.storage.local.set({ [productUrl]: history });
        }
        sendResponse({ success: true, history });
      } catch (e) {
        console.error("Error recording price", e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true; // Keep channel open
  }
});
