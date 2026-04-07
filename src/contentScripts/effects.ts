chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'effects:ping') {
    sendResponse({ ok: true });
  }
});
