import { TokenApproval } from '@/background/service/openapi';
import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconUnkownToken from 'ui/assets/token-default.svg';
import { numberWithCommasIsLtOne, useWallet } from 'ui/utils';

interface ApprovalCardProps {
  data: TokenApproval;
}
const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

const ApprovalCard = ({ data }: ApprovalCardProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const tokenApprove = (item: TokenApproval['spenders'][0]) => {
    wallet.approveToken(data.chain, data.id, item.id, 0);
    window.close();
  };
  return (
    <div className="token-approval-card">
      <div className="token-approval-card-header">
        <img
          src={data.logo_url || IconUnkownToken}
          className="token-approval-card-icon"
        ></img>
        <div className="overflow-hidden">
          <div className="token-approval-card-title">
            {numberWithCommasIsLtOne(data.balance, 0)} {data.symbol}
          </div>
          <div className="token-approval-card-desc">
            Risk exposure: ${numberWithCommasIsLtOne(data.sum_exposure_usd, 0)}
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
                    ${numberWithCommasIsLtOne(item.exposure_usd, 0)}
                  </div>
                  <div className="token-approval-project-item-risk-amount">
                    {item.value < 1e9
                      ? `${numberWithCommasIsLtOne(item.value, 0)} ${
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

export default ApprovalCard;
