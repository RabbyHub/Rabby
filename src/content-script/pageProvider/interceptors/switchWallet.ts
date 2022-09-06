import IconMetamask from '../assets/metamask.svg';
import IconRabby from '../assets/rabby.svg';
import notice from '../notice';

let instance: ReturnType<typeof notice> | null;

export const switchWalletNotice = (type: 'rabby' | 'metamask') => {
  const titles = {
    rabby: 'Rabby',
    metamask: 'MetaMask',
  };
  if (instance) {
    instance.hide();
    instance = null;
  }
  instance = notice({
    closeable: true,
    timeout: 0,
    className: 'rabby-notice-default-wallet',
    content: `<div style="display: flex; align-items: center; gap: 12px;">
      <img style="width: 28px;" src="${
        type === 'rabby' ? IconRabby : IconMetamask
      }"/>
      <div>
        <div><span style="font-weight: bold;">${
          titles[type]
        }</span> is your default wallet now. </div>
        <div>
        Please <a
          href="javascript:window.location.reload();"
          style="color: #8697FF; text-decoration: underline;">refresh the web page</a> 
        and retry
        </div>
      </div>
    </div>
    `,
  });
};
