import React from 'react';
import { useTranslation } from 'react-i18next';

import { useParams } from 'react-router-dom';
import { DbkChainEntry } from './dbk-chain/Entry';

export const Ecology = () => {
  const { t } = useTranslation();

  const { chainId } = useParams<{ chainId: string }>();

  return (
    <>
      <DbkChainEntry />
    </>
  );
};
