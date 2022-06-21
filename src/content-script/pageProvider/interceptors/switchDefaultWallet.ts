import { CHAINS } from '@/constant';
import IconRabby from 'ui/assets/dashboard/rabby.svg';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.svg';
import notice from '../notice';

let instance: ReturnType<typeof notice> | null;

export const switchWalletNotice = (chainId: string) => {
  const chain = Object.values(CHAINS).find((item) => item.hex === chainId);
  if (instance) {
    instance.hide();
    instance = null;
  }
  instance = notice({
    closeable: true,
    timeout: 0,
    className: 'rabby-notice-default-wallet',
    content: `<div style="display: flex; align-items: center; gap: 12px;">
      <img style="width: 28px;" src="${IconRabby}"/>
      <div>
        <div><span style="font-weight: bold;">MetaMask</span> is your default wallet now. </div>
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
