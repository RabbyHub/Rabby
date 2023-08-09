import { DrawerProps } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconTokenApproval from 'ui/assets/icon-token-approval.svg';
import IconNFTApproval from 'ui/assets/nft-approval.svg';
import { Field, Popup } from 'ui/component';
import './style.less';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { getKRCategoryByType } from '@/utils/transaction';

interface SecurityProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const Security = ({ visible, onClose }: SecurityProps) => {
  const history = useHistory();
  const { t } = useTranslation();
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);
  const dispatch = useRabbyDispatch();
  React.useEffect(() => {
    if (visible) {
      dispatch.account.getCurrentAccountAsync();
    }
  }, [visible]);

  const renderData = [
    {
      leftIcon: IconTokenApproval,
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
      content: t('page.dashboard.security.tokenApproval'),
      onClick: () => {
        matomoRequestEvent({
          category: 'Security',
          action: 'clickTokenApproval',
          label: [
            getKRCategoryByType(currentAccount?.type),
            currentAccount?.brandName,
          ].join('|'),
        });
        history.push('/token-approval');
      },
    },
    {
      leftIcon: IconNFTApproval,
      rightIcon: <img src={IconArrowRight} className="icon icon-arrow-right" />,
      content: t('page.dashboard.security.nftApproval'),
      onClick: () => {
        matomoRequestEvent({
          category: 'Security',
          action: 'clickNFTApproval',
          label: [
            getKRCategoryByType(currentAccount?.type),
            currentAccount?.brandName,
          ].join('|'),
        });
        history.push('/nft-approval');
      },
    },
  ];

  return (
    <>
      <Popup
        visible={visible}
        onClose={onClose}
        height={240}
        bodyStyle={{ height: '100%', paddingBottom: 0 }}
        title={t('page.dashboard.security.title')}
      >
        <div className="popup-security">
          <div className="content">
            {renderData.map((data, index) => (
              <Field
                key={index}
                leftIcon={<img src={data.leftIcon} className="icon" />}
                onClick={data.onClick}
                rightIcon={data.rightIcon}
              >
                {data.content}
              </Field>
            ))}
          </div>
          <footer className="footer">
            <div>{t('page.dashboard.security.comingSoon')}</div>
          </footer>
        </div>
      </Popup>
    </>
  );
};

export default connectStore()(Security);
