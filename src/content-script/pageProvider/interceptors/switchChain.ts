import { CHAINS } from '@debank/common';
import IconRabby from '../assets/rabby.svg';
import notice from '../notice';

let instance: ReturnType<typeof notice> | null;

export const switchChainNotice = (chainId: string) => {
  const chain = Object.values(CHAINS).find((item) => item.hex === chainId);
  if (instance) {
    instance.hide();
    instance = null;
  }
  instance = notice({
    timeout: 3000,
    content: `<img style="width: 20px; margin-right: 8px;" src="${IconRabby}"/>Switched to <span class="rabby-strong" style="margin: 0 8px;">${chain?.name}</span> for the current Dapp`,
  });
};
