import { DisplayedProject } from '@/ui/utils/portfolio/project';
import { TOKEN_WALLET_ANCHOR_ID } from './constant';
import { numberWithCommasIsLtOne } from '@/ui/utils';

export const ScrollToDomById = (id: string) => {
  const dom = document.getElementById(id);
  // const bar = document.getElementById('_anchor');
  if (!dom) return;

  const y = dom.getBoundingClientRect().y;
  const scrollElement = document.getElementById('root')
    ?.firstChild as HTMLElement;

  if (!scrollElement) return;
  scrollElement?.scrollTo({
    top: window.scrollY + y - 103, // 103 是stick header的高度
    behavior: 'smooth',
  });
};

export const getTokenWalletFakeProject = (netWorth: number) => {
  const p = new DisplayedProject({
    id: TOKEN_WALLET_ANCHOR_ID,
    name: 'Wallet',
    chain: 'eth',
  });
  p.netWorth = netWorth;
  p._netWorth = '$' + numberWithCommasIsLtOne(netWorth, 0);
  return p;
};
