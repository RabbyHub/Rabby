import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { Field, PageHeader } from 'ui/component';
import { cn } from '@/ui/utils/cn';
import { ReactComponent as RcIconDirectMessage } from 'ui/assets/feedback-popup/entry-hi.svg';
import { ReactComponent as RcIconProposal } from 'ui/assets/feedback-popup/entry-proposal.svg';
import { ReactComponent as RcIconItemLink } from 'ui/assets/feedback-popup/item-link.svg';
import { openInTab } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

interface SettingsProps {
  visible?: boolean;
  onClose?(): void;
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
        openInTab('https://support.rabby.io/en/');
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
  const [isVisible, setIsVisible] = useState(false);

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(!!visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={cn('popup-feedback-inner flex flex-col overflow-auto', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader
        forceShowBack
        onBack={handleCancel}
        className="bg-neutral-bg1 popup-title text-r-neutral-title-1 text-center text-[20px] not-italic font-medium leading-[normal] pt-0 mb-[28px]"
      >
        {t('page.dashboard.feedback.title')}
      </PageHeader>
      <div className="content">
        {renderData.map((data, index) => (
          <Field
            key={index}
            leftIcon={
              <ThemeIcon src={data.leftIcon} className="icon w-24 h-24" />
            }
            rightIcon={
              data.rightIcon || (
                <img src={IconArrowRight} className="icon icon-arrow-right" />
              )
            }
            onClick={data.onClick}
            className={clsx(
              '[&>.left-icon]:self-center [&>.right-icon]:self-center',
              'bg-r-neutral-card-2 px-16 py-0 min-h-[52px] hover:bg-[rgba(134,151,255,0.2)]',
              data.description &&
                'has-desc py-14 items-start [&>.field-slot]:overflow-visible'
            )}
          >
            <span className="title text-r-neutral-title-1 text-[15px] not-italic font-medium">
              {data.content}
            </span>
            {data.description && (
              <p className="desc text-r-neutral-body">{data.description}</p>
            )}
          </Field>
        ))}
      </div>
    </div>
  );
};

export default FeedbackPopup;
