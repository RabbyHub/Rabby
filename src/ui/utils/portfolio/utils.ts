import PQueue from 'p-queue';
import { WalletControllerType } from '../WalletContext';

import { PortfolioProject } from './types';
import { DisplayedProject } from './project';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

export interface PortfolioItemToken extends TokenItem {
  claimable_amount?: number;
}
export const pQueue = new PQueue({
  interval: 1000,
  intervalCap: 100,
  concurrency: 40,
});

export const snapshot2Display = (projects?: PortfolioProject[]) => {
  if (!projects) {
    return { list: {}, netWorth: 0 };
  }

  const result = {} as Record<string, DisplayedProject>;
  let netWorth = 0;

  for (let i = 0; i < projects.length; i++) {
    const { portfolio_item_list, ...p } = projects[i];
    const project = new DisplayedProject(p, portfolio_item_list);
    result[project.id] = project;

    netWorth += project.netWorth;
  }

  return { list: result, netWorth };
};

export const portfolio2Display = (
  p: PortfolioProject,
  dict: Record<string, DisplayedProject>
) => {
  // fetched failed
  if (!p) {
    return;
  }

  // 如果 positions 没有 中多出来
  if (!p.portfolio_item_list?.length) {
    delete dict[p.id];

    return;
  }

  // 如果 snapshot 中没有
  dict[p.id] = new DisplayedProject(p, p.portfolio_item_list);
};

export const loadPortfolioSnapshot = (
  userAddr: string,
  wallet: WalletControllerType
) => {
  return pQueue.add(() => {
    return wallet.openapi.getComplexProtocolList(userAddr);
  });
};

export const loadAppChainList = (
  userAddr: string,
  wallet: WalletControllerType
) => {
  return pQueue.add(() => {
    return wallet.openapi.getAppChainList(userAddr);
  });
};

export const batchLoadProjects = async (
  user_id: string,
  projectIds: string[],
  wallet: WalletControllerType,
  _isTestnet = false
) => {
  const queues = projectIds.map((id) =>
    pQueue.add(() => wallet.openapi.getProtocol({ addr: user_id, id }))
  );
  return await Promise.all(queues);
};

export const chunk = <T>(input: T[], size = 3) => {
  return input.reduce((arr: T[][], item: T, idx) => {
    return idx % size === 0
      ? [...arr, [item]]
      : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);
};
