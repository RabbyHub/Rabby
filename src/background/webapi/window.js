const WINDOW_SIZE = {
  width: 366,
  height: 440,
};

let popWinId = 0;

// if focus other windows, then reject the approval
chrome.windows.onFocusChanged.addListener((winId) => {
  console.log("focus", winId, popWinId);
  if (popWinId && winId !== popWinId) {
    chrome.windows.remove(popWinId);
  }
});

chrome.windows.onRemoved.addListener((winId) => {
  console.log("remove", winId, popWinId);
  if (winId === popWinId) {
    popWinId = 0;
  }
});

function openNotification(hash = "") {
  if (popWinId) return;

  chrome.windows.create(
    {
      focused: true,
      url: `notification.html${hash}`,
      type: "popup",
      ...WINDOW_SIZE,
    },
    (res) => {
      popWinId = res.id;
    }
  );
}

export default openNotification;
