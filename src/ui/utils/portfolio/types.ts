import {
  PortfolioItem,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';
// curve
export type ChartLine = {
  value: number;
  netWorth: string;
  timestamp: number;
  change?: string;
  isUp: boolean;
  changePecentage?: string;
};

// portfolios
export interface AbstractProject {
  id: string;
  name: string;
  logo?: string;
  chain?: string;
  netWorth: number;
  site_url?: string;
  _netWorth: string;
  _portfolioDict: Record<string, AbstractPortfolio>;
  _historyPatched?: boolean;
  _portfolios: AbstractPortfolio[];
  _serverUpdatedAt: number;
  netWorthChange: number;
  _netWorthChange: string;
  _netWorthChangePercent: string;
  _intNetworth: string;
}

export interface AbstractPortfolio {
  id: string;
  name?: string;
  type?: string;
  netWorth: number;
  _netWorth: string;
  // _project?: AbstractProject;
  _originPortfolio: PortfolioItem;
  _tokenDict: Record<string, AbstractPortfolioToken>;
  _tokenList: AbstractPortfolioToken[];
  _historyPatched?: boolean;
  netWorthChange: number;
  _netWorthChange: string;
  _changePercentStr: string;
}

export type AbstractPortfolioToken = PortfolioItemToken & {
  _tokenId: string;
  _amountStr?: string;
  _priceStr?: string;
  _amountChange?: number;
  _amountChangeStr?: string;
  _usdValue?: number;
  _realUsdValue: number;
  _usdValueStr?: string;
  _historyPatched?: boolean;
  _usdValueChange?: number;
  _usdValueChangeStr?: string;
  _amountChangeUsdValueStr?: string;
  _usdValueChangePercent?: string;
  _realUsdValueChange?: number;
};

export type PortfolioProject = {
  chain: string;
  id: string;
  logo_url: string;
  name: string;
  site_url: string;
  portfolio_item_list?: PortfolioItem[];
};
