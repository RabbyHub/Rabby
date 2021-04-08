const WINDOW_SIZE = {
  width: 366,
  height: 440,
}

let popWinId = 0;

function openPopup() {
  if (popWinId) {
    chrome.windows.update(popWinId, {
      focused: true,
    })
    return;
  }

  chrome.windows.create({
    focused: true,
    url: 'notification.html',
    type: 'popup',
    ...WINDOW_SIZE,
  }, (res) => {
    popWinId = res.id;
  });
}

chrome.windows.onRemoved.addListener((winId) => {
  if (winId === popWinId) {
    popWinId = 0;
  }
});


export {
  openPopup,
};
