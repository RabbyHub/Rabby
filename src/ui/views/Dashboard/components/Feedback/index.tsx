import { DrawerProps } from 'antd';
import clsx from 'clsx';
import React from 'react';

import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { Field, Popup } from 'ui/component';
import './style.less';
import IconDirectMessage from 'ui/assets/feedback-popup/entry-hi.svg';
import IconProposal from 'ui/assets/feedback-popup/entry-proposal.svg';
import IconItemLink from 'ui/assets/feedback-popup/item-link.svg';
import { openInTab } from '@/ui/utils';

interface SettingsProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const FeedbackPopup = ({ visible, onClose }: SettingsProps) => {
  const renderData = [
    {
      leftIcon: IconDirectMessage,
      content: 'Direct Message',
      description: 'Chat with Rabby Wallet Official on DeBank',
      rightIcon: <img src={IconItemLink} className="icon icon-item-link" />,
      onClick: () => {
        openInTab('https://debank.com/hi/0a110032');
      },
    },
    {
      leftIcon: IconProposal,
      content: 'Proposal',
      description: 'Submit a proposal for Rabby Wallet on DeBank',
      rightIcon: <img src={IconItemLink} className="icon icon-item-link" />,
      onClick: () => {
        openInTab('https://debank.com/official-account/110032/proposals');
      },
    },
  ];

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      height={230}
      bodyStyle={{ height: '100%', padding: '20px' }}
      closable={true}
      className="dashboard-feedback-popup"
    >
      <div className="popup-feedback">
        <header className="pb-[20px]">
          <div className="popup-title">Feedback</div>
        </header>
        <div className="content">
          {renderData.map((data, index) => (
            <Field
              key={index}
              leftIcon={<img src={data.leftIcon} className="icon" />}
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
