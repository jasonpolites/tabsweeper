try {
  chrome.contextMenus.create({
    id: 'show-settings', // or any other name
    title: 'Tab Sweeper Settings',
    contexts: ['browser_action'],
    visible:true
  }, () => {
    if (chrome.runtime.lastError) {
      // This will occasionally fail due to a duplicate ID, but there is no "exists" method
      // in the API to avoid this
      console.warn(chrome.runtime.lastError.message);
    }
  });
} catch (ignore) {} // Catch exception due to https://code.google.com/p/chromium/issues/detail?id=496020