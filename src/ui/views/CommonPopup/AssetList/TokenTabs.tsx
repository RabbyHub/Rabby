import React from 'react';

type TokenTab = 'list' | 'summary' | 'history';

export interface Props {
  activeTab?: TokenTab;
  onTabChange?: (tab: TokenTab) => void;
}

export const TokenTabs: React.FC<Props> = ({ children }) => {
  return <div>123</div>;
};
