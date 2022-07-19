const domReadyCall = (callback) => {
  if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
  ) {
    callback();
  } else {
    const domContentLoadedHandler = () => {
      callback();
      document.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
    };
    document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
  }
};

const $ = document.querySelector.bind(document);

export { domReadyCall, $ };
