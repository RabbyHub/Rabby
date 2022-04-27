import { CHAINS } from '@/constant';
import IconRabby from 'ui/assets/dashboard/rabby.svg';
export const switchChainInterceptor = {
  onResponse(res, data) {
    if (data.method === 'wallet_switchEthereumChain') {
      const chainId = data.params && data.params[0]?.chainId;
      const chain = Object.values(CHAINS).find((item) => item.hex === chainId);
      Notification.open({
        content: `Switched to <span class="rabby-strong">${chain?.name}</span> for the current Dapp`,
      });
    }

    return res;
  },
};

export const switchChainNotice = (chainId: string) => {
  const chain = Object.values(CHAINS).find((item) => item.hex === chainId);
  Notification.open({
    content: `Switched to <span class="rabby-strong">${chain?.name}</span> for the current Dapp`,
  });
};

class Notification {
  styles = `
    .rabby-notification {
      position: fixed;
      z-index: 1010;
      top: 60px;
      right: 42px;
    }
    .rabby-notification-content {
      min-width: 230px;
      height: 44px;
      background: #FFFFFF;
      border: 1px solid #8697FF;
      box-sizing: border-box;
      box-shadow: 0px 24px 40px rgba(134, 151, 255, 0.12);
      border-radius: 6px;
      display: flex;
      align-items: center;

      font-family: 'Arial', sans-serif;
      font-style: normal;
      font-weight: 400;
      font-size: 14px;
      line-height: 16px;
      color: #13141A;

      padding: 12px;
      gap: 8px;
    }

    .rabby-notification-icon {
      width: 20px;
    }
    .rabby-strong {
      font-weight: bold;
    }
    
  `;

  content = '';

  template = () => {
    return `
      <div class="rabby-notification">
        <div class="rabby-notification-content">
          <img class="rabby-notification-icon" src="${IconRabby}"/>
          ${this.content}
        </div>
      </div>
    `;
  };

  static instance?: Notification | null;
  static id?: any;
  static close?: (() => void) | null;

  static open = ({ content }) => {
    if (Notification.instance) {
      Notification.close?.();
    }
    const instance = new Notification();
    instance.content = content;
    Notification.instance = instance;
    const style = document.createElement('style');
    style.setAttribute('rel', 'stylesheet');
    style.innerHTML = instance.styles;
    document.head.appendChild(style);

    const div = document.createElement('div');
    div.innerHTML = instance.template();

    document.body.appendChild(div);
    const close = () => {
      document.head.removeChild(style);
      document.body.removeChild(div);
      clearTimeout(Notification.id);
      Notification.instance = null;
      Notification.id = null;
      Notification.close = null;
    };

    Notification.id = setTimeout(close, 3000);
    Notification.close = close;

    return {
      close,
    };
  };
}
