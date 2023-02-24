import { TokenApproval, TokenItem } from '@/background/service/openapi';
import { TokenWithChain } from '@/ui/component';
import { Button, message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import {
  numberWithCommasIsLtOne,
  splitNumberByStep,
  useWallet,
} from 'ui/utils';
import { connectStore, useRabbySelector } from '@/ui/store';
import { getKRCategoryByType } from '@/utils/transaction';
import { getChain } from '@/utils';

interface ApprovalCardProps {
  data: TokenApproval;
}
const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

const ApprovalCard = ({ data }: ApprovalCardProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);

  const tokenApprove = async (item: TokenApproval['spenders'][0]) => {
    try {
      matomoRequestEvent({
        category: 'Security',
        action: 'startDeclineTokenApproval',
        label: [
          getChain(data.chain)?.name,
          getKRCategoryByType(currentAccount?.type),
          currentAccount?.brandName,
        ].join('|'),
      });
      wallet.approveToken(data.chain, data.id, item.id, 0, {
        ga: {
          category: 'Security',
          source: 'tokenApproval',
        },
      });
      window.close();
    } catch (e) {
      message.error(e.message);
    }
  };
  return (
    <div className="token-approval-card">
      <div className="token-approval-card-header">
        <TokenWithChain
          token={(data as unknown) as TokenItem}
          width="24px"
          height="24px"
          hideConer
        ></TokenWithChain>
        <div className="overflow-hidden">
          <div className="token-approval-card-title">
            {numberWithCommasIsLtOne(data.balance, 4)} {data.symbol}
          </div>
          <div className="token-approval-card-desc">
            Risk exposure: $
            {splitNumberByStep(data.sum_exposure_usd.toFixed(2))}
          </div>
        </div>
      </div>
      <div className="token-approval-card-body">
        <div className="token-approval-project-list">
          <div className="token-approval-project-list-header">
            <div className="column-title">{t('Approved to')}</div>
            <div className="column-title">{t('Exposure/Amount')}</div>
          </div>
          {data.spenders.map((item) => {
            return (
              <div className="token-approval-project-item" key={item.id}>
                <img
                  src={item?.protocol?.logo_url || IconUnknown}
                  className="token-approval-project-item-icon"
                ></img>

                <div className="max-w-[200px] overflow-hidden">
                  <div className="token-approval-project-item-title">
                    {item?.protocol?.name}
                    {!item.protocol && (
                      <span className={'token-approval-tag'}>
                        Unknown project
                      </span>
                    )}
                  </div>
                  <div className="token-approval-project-item-desc">
                    {ellipsis(item.id)}
                  </div>
                </div>
                <div className="token-approval-project-item-right">
                  <div className="token-approval-project-item-risk-usd">
                    ${splitNumberByStep(item.exposure_usd.toFixed(2))}
                  </div>
                  <div className="token-approval-project-item-risk-amount">
                    {item.value < 1e9
                      ? `${splitNumberByStep(item.value.toFixed(4))} ${
                          data.symbol
                        }`
                      : 'Infinite'}
                  </div>
                  <Button
                    type="primary"
                    danger
                    ghost
                    shape="round"
                    size="small"
                    onClick={() => {
                      tokenApprove(item);
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default connectStore()(ApprovalCard);
