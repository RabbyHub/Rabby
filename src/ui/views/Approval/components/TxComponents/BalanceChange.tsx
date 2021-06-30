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
  const isUSDValueChangeNegative = data.usd_value_change < 0;
  const hasChange =
    data.receive_token_list.length > 0 || data.send_token_list.length > 0;
  const chain = CHAINS[chainEnum];
  return (
    <div className="balance-change">
      <p className="section-title flex justify-between">
        <span>Est. token balance change</span>
      </p>
      {isSuccess && (
        <div className="gray-section-block balance-change-content">
          {hasChange ? (
            <>
              <div>
                {sendTokenList && sendTokenList.length > 0 && (
                  <ul>
                    {sendTokenList.map((token) => (
                      <li key={token.id}>
                        <div className="first-line">
                          <span className="token-symbol" title={token.symbol}>
                            {token.symbol}
                          </span>
                          <span
                            className="token-amount"
                            title={`- ${splitNumberByStep(token.amount)}`}
                          >
                            -{splitNumberByStep(token.amount)}
                          </span>
                        </div>
                        <div className="second-line">
                          ${splitNumberByStep(token.usd_value.toFixed(2))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {receiveTokenList && receiveTokenList.length > 0 && (
                  <ul>
                    {receiveTokenList.map((token) => (
                      <li key={token.id}>
                        <div className="first-line">
                          <span className="token-symbol" title={token.symbol}>
                            {token.symbol}
                          </span>
                          <span
                            className="token-amount"
                            title={`+ ${splitNumberByStep(token.amount)}`}
                          >
                            +{splitNumberByStep(token.amount)}
                          </span>
                        </div>
                        <div className="second-line">
                          ${splitNumberByStep(token.usd_value.toFixed(2))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="total-balance-change">
                <span className="token-symbol">Total value change</span>
                <span
                  className={clsx('usd-value-change', {
                    green: isUSDValueChangePositive,
                    red: isUSDValueChangeNegative,
                  })}
                >
                  {isUSDValueChangePositive ? '+' : '-'}$
                  {splitNumberByStep(
                    Math.abs(data.usd_value_change).toFixed(2)
                  )}
                </span>
              </div>
            </>
          ) : (
            <span className="text-14 text-gray-content">No Changes</span>
          )}
        </div>
      )}
      {!isSuccess && (
        <div className="balance-change_error">
          {!data.success ? errorMessage : `Not supported on ${chain.name}`}
        </div>
      )}
    </div>
  );
};

export default BalanceChange;
