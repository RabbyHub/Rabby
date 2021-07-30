import React from 'react';
import { message } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import ClipboardJS from 'clipboard';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import { splitNumberByStep } from 'ui/utils/number';
import { ellipsisOverflowedText } from 'ui/utils';
import BalanceChange from './BalanceChange';
import AddressViewer from 'ui/component/AddressViewer';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';

interface SendProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
}

const Send = ({ data, chainEnum }: SendProps) => {
  const detail = data.type_send!;
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();
  const handleCopyToAddr = () => {
    const clipboard = new ClipboardJS('.send', {
      text: function () {
        return detail.to_addr;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  return (
    <div className="send">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
      </p>
      <div className="gray-section-block common-detail-block">
        <p className="title">{t('Send Token')}</p>
        <div className="block-field">
          <span className="label">{t('Amount')}</span>
          <div className="value">
            {ellipsisOverflowedText(splitNumberByStep(detail.token_amount), 12)}{' '}
            <span title={detail.token_symbol}>
              {ellipsisOverflowedText(detail.token_symbol, 6)}
            </span>
            <p className="est-price">
              ≈ $
              {splitNumberByStep(
                new BigNumber(detail.token_amount)
                  .times(detail.token.price)
                  .toFixed(2)
              )}
            </p>
          </div>
        </div>
        <div className="block-field contract">
          <span className="label">{t('To address')}</span>
          <span className="value">
            <AddressViewer address={detail.to_addr} showArrow={false} />
            <img
              src={IconCopy}
              className="icon icon-copy"
              onClick={handleCopyToAddr}
            />
          </span>
        </div>
      </div>
      <BalanceChange
        data={data.balance_change}
        chainEnum={chainEnum}
        isSupport={data.support_balance_change}
      />
    </div>
  );
};

export default Send;
