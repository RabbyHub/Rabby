import { DrawerProps } from 'antd';
import clsx from 'clsx';
import React from 'react';

import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { Field, Popup } from 'ui/component';
import './style.less';
import IconDirectMessage, {
  ReactComponent as RcIconDirectMessage,
} from 'ui/assets/feedback-popup/entry-hi.svg';
import IconProposal, {
  ReactComponent as RcIconProposal,
} from 'ui/assets/feedback-popup/entry-proposal.svg';
import IconItemLink, {
  ReactComponent as RcIconItemLink,
} from 'ui/assets/feedback-popup/item-link.svg';
import { openInTab } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

interface SettingsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const FeedbackPopup = ({ visible, onClose }: SettingsProps) => {
  const { t } = useTranslation();

  const renderData = [
    {
      leftIcon: RcIconDirectMessage,
      content: t('page.dashboard.feedback.directMessage.content'),
      description: t('page.dashboard.feedback.directMessage.description'),
      rightIcon: (
        <ThemeIcon src={RcIconItemLink} className="icon icon-item-link" />
      ),
      onClick: () => {
        openInTab('https://debank.com/hi/0a110032');
      },
    },
    {
      leftIcon: RcIconProposal,
      content: t('page.dashboard.feedback.proposal.content'),
      description: t('page.dashboard.feedback.proposal.description'),
      rightIcon: (
        <ThemeIcon src={RcIconItemLink} className="icon icon-item-link" />
      ),
      onClick: () => {
        openInTab('https://debank.com/official/Rabby_Wallet/proposals');
      },
    },
  ];

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      height={230}
      bodyStyle={{ height: '100%', padding: '20px' }}
      closable={false}
      className="dashboard-feedback-popup"
      isSupportDarkMode
    >
      <div className="popup-feedback-inner">
        <header className="pb-[20px]">
          <div className="popup-title">
            {t('page.dashboard.feedback.title')}
          </div>
        </header>
        <div className="content">
          {renderData.map((data, index) => (
            <Field
              key={index}
              leftIcon={<ThemeIcon src={data.leftIcon} className="icon" />}
              rightIcon={
                data.rightIcon || (
                  <img src={IconArrowRight} className="icon icon-arrow-right" />
                )
              }
              onClick={data.onClick}
              className={clsx(data.description ? 'has-desc' : null)}
            >
              <span className="title">{data.content}</span>
              {data.description && <p className="desc">{data.description}</p>}
            </Field>
          ))}
        </div>
      </div>
    </Popup>
  );
};

export default FeedbackPopup;
