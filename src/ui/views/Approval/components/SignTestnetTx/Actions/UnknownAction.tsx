import { Chain } from '@debank/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../Card';
import { MessageWrapper } from '../../TextActions';

export const TestnetUnknownAction = ({
  chain,
  raw,
}: {
  chain: Chain;
  raw: Record<string, string | number>;
}) => {
  const { t } = useTranslation();
  return (
    <>
      <Card className="mt-[12px]">
        <MessageWrapper>
          <div className="title">
            <div className="title-text">
              {t('page.customTestnet.signTx.title')}
            </div>
          </div>
          <div className="content">{JSON.stringify(raw, null, 2)}</div>
        </MessageWrapper>
      </Card>
    </>
  );
};
