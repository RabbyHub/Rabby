import React from 'react';
import clsx from 'clsx';
import ClipboardJS from 'clipboard';
import { message } from 'antd';
import { useTranslation, Trans } from 'react-i18next';
import { AddressViewer } from 'ui/component';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { splitNumberByStep } from 'ui/utils/number';
import { ExplainTxResponse } from 'background/service/openapi';
import BalanceChange from './BalanceChange';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';

interface ApproveProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
}

const Approve = ({ data, chainEnum }: ApproveProps) => {
  const detail = data.type_token_approval!;
  const isUnlimited = detail.is_infinity;
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();

  const handleCopySpender = () => {
    const clipboard = new ClipboardJS('.approve', {
      text: function () {
        return detail.spender;
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

  const handleProtocolLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknownProtocol;
  };

  return (
    <div className="approve">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
      </p>
      <div className="gray-section-block common-detail-block">
        <p className="title">
          {t('Approve')}{' '}
          {isUnlimited
            ? t('unlimited')
            : splitNumberByStep(detail.token_amount)}{' '}
          {detail.token_symbol}
        </p>
        <div className="protocol">
          {detail.spender_protocol_logo_url && (
            <img
              className="protocol-logo"
              src={detail.spender_protocol_logo_url || IconUnknownProtocol}
              onError={handleProtocolLogoLoadFailed}
            />
          )}
          <div className="protocol-info">
            <p
              className={clsx('protocol-info__name', {
                'text-gray-content': !detail.spender_protocol_name,
              })}
            >
              {detail.spender_protocol_name || t('UnknownProtocol')}
            </p>
            <div className="protocol-info__spender">
              <AddressViewer address={detail.spender} showArrow={false} />
              <img
                src={IconCopy}
                className="icon icon-copy"
                onClick={handleCopySpender}
              />
            </div>
          </div>
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

export default Approve;
