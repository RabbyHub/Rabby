import React from 'react';
import { Skeleton } from 'antd';

const LoadingBalanceChange = () => {
  return (
    <div className="balance-change">
      <p className="section-title flex justify-between">
        <span>Est. token balance change</span>
      </p>
      <div className="gray-section-block balance-change-content">
        <>
          <div>
            <ul>
              <li>
                <Skeleton.Input style={{ width: 156 }} />
              </li>
              <li>
                <Skeleton.Input style={{ width: 156 }} />
              </li>
            </ul>
          </div>
          <div className="total-balance-change">
            <Skeleton.Input style={{ width: 108 }} />
          </div>
        </>
      </div>
    </div>
  );
};

export default LoadingBalanceChange;
