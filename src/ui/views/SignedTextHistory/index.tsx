import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import ClipboardJS from 'clipboard';
import { useTranslation } from 'react-i18next';
import { SignTextHistoryItem } from 'background/service/signTextHistory';
import { Empty, FallbackSiteLogo, PageHeader } from '@/ui/component';
import { useWallet, hex2Text, sinceTime } from 'ui/utils';
import { openInTab } from 'ui/utils/webapi';
import IconCopy from 'ui/assets/copy-gray.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';
import { Account } from '@/background/service/preference';

const SignedTextHistoryItem = ({ item }: { item: SignTextHistoryItem }) => {
  const { t } = useTranslation();

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

  const handleCopyText = () => {
    const clipboard = new ClipboardJS('.text-history__item--content', {
      text: function () {
        return formatedContent;
      },
    });
    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const handleClickLink = (item: SignTextHistoryItem) => {
    openInTab(item.site.origin);
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
          <div className="link" onClick={() => handleClickLink(item)}>
            {item.site.origin}
          </div>
        </div>
        <div className="time">{sinceTime(item.createAt / 1000)}</div>
      </div>
    </div>
  );
};

const SignedTextHistory = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [textHistory, setTextHistory] = useState<SignTextHistoryItem[]>([]);

  const init = async () => {
    const account = await wallet.getCurrentAccount<Account>();
    const history = await wallet.getSignTextHistory(account.address);
    setTextHistory(history);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="text-history">
      {textHistory.map((item) => (
        <SignedTextHistoryItem item={item} />
      ))}
      {textHistory.length <= 0 && (
        <Empty
          title={t('page.activities.signedText.empty.title')}
          desc={t('page.activities.signedText.empty.desc')}
          className="pt-[108px]"
        ></Empty>
      )}
    </div>
  );
};

export default SignedTextHistory;
