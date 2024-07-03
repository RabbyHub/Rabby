import React from 'react';
import { useTranslation } from 'react-i18next';

import { EcologyNavBar } from '@/ui/component/Ecology/EcologyNavBar';
import { useLocation, useParams } from 'react-router-dom';
import { DbkChainPage } from './dbk-chain';

export const Ecology = () => {
  const { t } = useTranslation();

  const { chainId } = useParams<{ chainId: string }>();
  console.log(chainId);

  return <DbkChainPage />;
};
