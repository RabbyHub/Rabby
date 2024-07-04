import React from 'react';
import { useTranslation } from 'react-i18next';

import { EcologyNavBar } from '@/ui/component/Ecology/EcologyNavBar';
import { useLocation, useParams } from 'react-router-dom';
import { DbkChainHomePage } from './dbk-chain/pages/Home';
import { DbkChainBridgePage } from './dbk-chain/pages/Bridge';

export const Ecology = () => {
  const { t } = useTranslation();

  const { chainId } = useParams<{ chainId: string }>();
  console.log(chainId);

  // return <DbkChainHomePage />;
  return <DbkChainBridgePage />;
};
