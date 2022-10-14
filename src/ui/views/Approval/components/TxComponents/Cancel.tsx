import { message } from 'antd';
import { ExplainTxResponse } from 'background/service/openapi';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { AddressViewer } from 'ui/component';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
import useBalanceChange from '@/ui/hooks/useBalanceChange';

interface CancelProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  isSpeedUp: boolean;
  raw: Record<string, string | number>;
}

const Cancel = ({ data, chainEnum, isSpeedUp, raw }: CancelProps) => {
  const detail = data.type_cancel_token_approval!;
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();

  const handleCopySpender = () => {
    const clipboard = new ClipboardJS('.cancel', {
      text: function () {
        return detail.spender;
      },
    });

    clipboard.on('success', () => {
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{detail.spender}</div>
          </div>
        ),
      });
      clipboard.destroy();
    });
  };

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi_str,
    });
  };

  const handleProtocolLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknownProtocol;
  };

  const bfInfo = useBalanceChange(data);

  return (
    <div
      className={clsx(
        'cancel',
        bfInfo.belowBlockIsEmpty && 'below-bc-block-empty'
      )}
    >
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
        <span
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('View Raw')}
          <img src={IconArrowRight} />
        </span>
      </p>
      <div className="action-card">
        <div className="common-detail-block">
          {isSpeedUp && <SpeedUpCorner />}
          <p className="title">
            <Trans
              i18nKey="cancelApprovalTitle"
              values={{ symbol: detail.token_symbol }}
            />
          </p>
          <div className="protocol">
            <img
              className="protocol-logo"
              src={detail.spender_protocol_logo_url || IconUnknownProtocol}
              onError={handleProtocolLogoLoadFailed}
            />
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
                  className="icon icon-copy w-[14px] h-[14px]"
                  onClick={handleCopySpender}
                />
              </div>
            </div>
          </div>
        </div>
        <BalanceChange
          version={data.pre_exec_version}
          data={data.balance_change}
          chainEnum={chainEnum}
          isSupport={data.support_balance_change}
        />
      </div>
    </div>
  );
};

export default Cancel;
