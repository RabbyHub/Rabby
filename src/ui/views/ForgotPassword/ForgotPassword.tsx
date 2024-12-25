import React from 'react';
import Browser from 'webextension-polyfill';

export const ForgotPassword = () => {
  // This useEffect is used to close the window when the extension icon is clicked
  React.useEffect(() => {
    Browser.runtime.onMessage.addListener((request) => {
      if (request.type === 'pageOpened') {
        window.close();
      }
    });
  }, []);

  return <div>Forgot Password</div>;
};
