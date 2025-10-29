const path = require('path');
const fs = require('fs');

const appRoot = fs.realpathSync(process.cwd());

const rootResolve = path.resolve.bind(path, appRoot);

module.exports = {
  root: appRoot,
  src: rootResolve('src'),
  popupHtml: rootResolve('src/ui/popup.html'),
  notificationHtml: rootResolve('src/ui/notification.html'),
  indexHtml: rootResolve('src/ui/index.html'),
  desktopHtml: rootResolve('src/ui/desktop.html'),
  backgroundHtml: rootResolve('src/background/background.html'),
  offscreenHtml: rootResolve('src/offscreen/offscreen.html'),
  dist: rootResolve('dist'),
  distMv2: rootResolve('dist-mv2'),

  rootResolve,
};
