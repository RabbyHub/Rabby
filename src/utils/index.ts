import { browser } from 'webextension-polyfill-ts';

import BroadcastChannelMessage from './message/broadcastChannelMessage';
import DomMessage from './message/domMessage';
import PortMessage from './message/portMessage';

const Message = {
  BroadcastChannelMessage,
  DomMessage,
  PortMessage,
};

declare global {
  const langLocales: Record<string, Record<'message', string>>;
}

const t = (name) => {
  if (process.env.BUILD_ENV !== 'START') {
    return browser.i18n.getMessage(name);
  }

  // default en in start mode
  // only provider in start mode
  return langLocales[name]?.message;
};

export { Message, t };
