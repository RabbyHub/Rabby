import React from 'react';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

const LoadingBalanceChange = () => {
  const { t } = useTranslation();
  return (
    <div className="balance-change">
      <p className="section-title flex justify-between">
        <span>{t('token balance change')}</span>
      </p>
      <div className="gray-section-block balance-change-content">
        <>
          <div>
            <ul>
              <li>
                <Skeleton.Input active style={{ width: 156 }} />
              </li>
              <li>
                <Skeleton.Input active style={{ width: 156 }} />
              </li>
            </ul>
          </div>
          <div className="total-balance-change">
            <Skeleton.Input active style={{ width: 108 }} />
          </div>
        </>
      </div>
    </div>
  );
};

export default LoadingBalanceChange;
