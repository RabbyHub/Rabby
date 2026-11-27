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
import { Account } from '@/background/service/preference';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRequest } from 'ahooks';

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
    <div className="p-12 mb-12 last:mb-0 rounded-[6px] bg-r-neutral-card-1 shadow-[0px_6px_20px_rgba(45,48,51,0.08)]">
      <div className="group relative mb-12 max-h-[120px] min-h-[20px] overflow-hidden font-medium text-12 leading-[16px] text-r-neutral-title-1 break-all whitespace-pre-wrap">
        {formatedContent}
        <img
          src={IconCopy}
          className="icon icon-gray absolute bottom-0 right-0 w-20 h-20 hidden group-hover:block cursor-pointer select-none"
          onClick={handleCopyText}
        />
      </div>
      <div className="flex justify-between text-12 text-r-neutral-foot">
        <div className="site flex">
          {item.site?.origin === INTERNAL_REQUEST_ORIGIN ? (
            <span className="flex-1 whitespace-nowrap text-ellipsis overflow-hidden text-r-neutral-foot text-12">
              Rabby Wallet
            </span>
          ) : (
            <>
              <FallbackSiteLogo
                url={item.site.icon}
                origin={item.site.origin}
                width="14px"
                height="14px"
                className="mr-8"
                style={{
                  borderRadius: '2px',
                }}
              />
              <div
                className="link cursor-pointer hover:underline"
                onClick={() => handleClickLink(item)}
              >
                {item.site.origin}
              </div>
            </>
          )}
        </div>
        <div className="time">{sinceTime(item.createAt / 1000)}</div>
      </div>
    </div>
  );
};

const SignedTextHistory = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const account = useCurrentAccount();

  const { data: textHistory = [] } = useRequest(
    async () => {
      if (!account?.address) {
        return;
      }
      const history = await wallet.getSignTextHistory(account.address);
      return history;
    },
    {
      refreshDeps: [account?.address],
    }
  );

  return (
    <div className="flex flex-col">
      {textHistory.map((item) => (
        <SignedTextHistoryItem
          key={`${item.site?.origin}-${item.type}-${item.createAt}`}
          item={item}
        />
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
