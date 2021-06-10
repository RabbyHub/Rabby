import React from 'react';
import clsx from 'clsx';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { BalanceChange as BC } from 'background/service/openapi';
import { splitNumberByStep } from 'ui/utils/number';

const BalanceChange = ({
  data,
  isSupport,
  chainEnum,
}: {
  data: BC;
  isSupport: boolean;
  chainEnum: CHAINS_ENUM;
}) => {
  const isSuccess = data.success && isSupport;
  const errorMessage = data.err_msg;
  const receiveTokenList = data.receive_token_list;
  const sendTokenList = data.send_token_list;
  const isUSDValueChangePositive = data.usd_value_change > 0;
  const chain = CHAINS[chainEnum];
  if (isSuccess && receiveTokenList.length <= 0 && sendTokenList.length <= 0)
    return <></>;
  return (
    <div className="balance-change">
      <p className="section-title flex justify-between">
        <span>Est. token balance changes</span>
        {isSuccess && (
          <span
            className={clsx('usd-value-change', {
              green: isUSDValueChangePositive,
            })}
          >
            {isUSDValueChangePositive ? '+' : '-'}$
            {splitNumberByStep(Math.abs(data.usd_value_change).toFixed(2))}
          </span>
        )}
      </p>
      {isSuccess && (
        <div className="gray-section-block balance-change-content">
          <ul>
            {sendTokenList.map((token) => (
              <li key={token.id}>
                <span className="token-symbol" title={token.symbol}>
                  {token.symbol}
                </span>
                <span
                  className="token-amount"
                  title={`-${splitNumberByStep(token.amount)}`}
                >
                  -{splitNumberByStep(token.amount)}
                </span>
              </li>
            ))}
          </ul>
          <ul>
            {receiveTokenList.map((token) => (
              <li key={token.id}>
                <span className="token-symbol" title={token.symbol}>
                  {token.symbol}
                </span>
                <span
                  className="token-amount"
                  title={`+${splitNumberByStep(token.amount)}`}
                >
                  +{splitNumberByStep(token.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!isSuccess && (
        <div className="balance-change_error">
          {!data.success
            ? errorMessage
            : `This feature is not supported on ${chain.name} at the moment`}
        </div>
      )}
    </div>
  );
};

export default BalanceChange;
