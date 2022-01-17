import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import ClipboardJS from 'clipboard';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { SignTextHistoryItem } from 'background/service/signTextHistory';
import { FallbackSiteLogo, PageHeader } from '@/ui/component';
import { useWallet, timeago, hex2Text } from 'ui/utils';
import IconCopy from 'ui/assets/copy-gray.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';

const SignedTextHistoryItem = ({ item }: { item: SignTextHistoryItem }) => {
  const { t } = useTranslation();
  const relativeTime = timeago(Date.now(), item.createAt);

  let formatedContent = '';
  if (item.type === 'personalSign') {
    formatedContent = hex2Text(item.text);
  } else {
    try {
      formatedContent = JSON.stringify(JSON.parse(item.text), null, 2);
    } catch (e) {
      console.log('error', e);
      formatedContent = item.text;
    }
  }
  let agotext = '';
  if (relativeTime.hour <= 0 && relativeTime.minute <= 0) {
    relativeTime.minute = 1;
  }
  if (relativeTime.hour < 24) {
    if (relativeTime.hour > 0) {
      agotext += `${relativeTime.hour} h`;
    }
    if (relativeTime.minute > 0) {
      if (agotext) agotext += ' ';
      agotext += `${relativeTime.minute} ${t('min')}`;
    }
    agotext += ` ${t('ago')}`;
  } else {
    agotext = dayjs(item.createAt).format('MM/DD HH:mm');
  }

  const handleCopyText = () => {
    const clipboard = new ClipboardJS('.text-history__item--content', {
      text: function () {
        return formatedContent;
      },
    });
    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  return (
    <div className="text-history__item">
      <div className="text-history__item--content">
        {formatedContent}
        <img
          src={IconCopy}
          className="icon icon-gray"
          onClick={handleCopyText}
        />
      </div>
      <div className="text-history__item--footer">
        <div className="site">
          <FallbackSiteLogo
            url={item.site.icon}
            origin={item.site.origin}
            width="14px"
            height="14px"
            style={{
              borderRadius: '2px',
            }}
          />
          {item.site.origin}
        </div>
        <div className="time">{agotext}</div>
      </div>
    </div>
  );
};

const SignedTextHistory = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [textHistory, setTextHistory] = useState<SignTextHistoryItem[]>([]);

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    const history = await wallet.getSignTextHistory(account.address);
    setTextHistory(history);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="text-history">
      <PageHeader fixed>{t('Signed Text')}</PageHeader>
      {textHistory.map((item) => (
        <SignedTextHistoryItem item={item} />
      ))}
      {textHistory.length <= 0 && (
        <div className="text-history__empty">
          <img className="no-data" src="./images/nodata-tx.png" />
          <p className="text-14 text-gray-content mt-12">
            {t('No signed Text')}
          </p>
        </div>
      )}
    </div>
  );
};

export default SignedTextHistory;
