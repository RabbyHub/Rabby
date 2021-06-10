import React from 'react';
import { message } from 'antd';
import ClipboardJS from 'clipboard';
import { AddressViewer } from 'ui/component';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import BalanceChange from './BalanceChange';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';

interface SignProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
}

const Sign = ({ data, chainEnum }: SignProps) => {
  const detail = data.type_call!;
  const chain = CHAINS[chainEnum];
  const handleCopySpender = () => {
    const clipboard = new ClipboardJS('.sign', {
      text: function () {
        return detail.contract;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: 'Copied',
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  return (
    <div className="sign">
      <p className="section-title">Sign {chain.name} transaction</p>
      <div className="gray-section-block common-detail-block">
        <div className="block-field">
          <span className="label">Protocol</span>
          <span className="value">{detail.contract_protocol_name}</span>
        </div>
        <div className="block-field">
          <span className="label">Action</span>
          <span className="value">{detail.action}</span>
        </div>
        <div className="block-field contract">
          <span className="label">Contract</span>
          <span className="value">
            <AddressViewer address={detail.contract} showArrow={false} />
            <img
              src={IconCopy}
              className="icon icon-copy"
              onClick={handleCopySpender}
            />
          </span>
        </div>
        <img
          src={detail.contract_protocol_logo_url}
          className="contract-logo"
        />
      </div>
      <BalanceChange data={data.balance_change} />
    </div>
  );
};

export default Sign;
