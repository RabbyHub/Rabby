import { Button } from 'antd';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import IconWarning from 'ui/assets/warning.svg';
import { useApproval } from 'ui/utils';
import Browser from 'webextension-polyfill';

export const EIP7702Warning = () => {
  const [, , rejectApproval] = useApproval();
  const { t } = useTranslation();

  useEffect(() => {
    Browser.windows.getCurrent().then((window) => {
      if (window.id) {
        Browser.windows.update(window.id, {
          height: 390,
        });
      }
    });
  }, []);
  return (
    <>
      <div className="approval-add-asset">
        <>
          <img
            src={IconWarning}
            className="w-[68px] h-[68px] mt-[72px] mb-[20px] mx-auto"
          />
          <div className="text-r-neutral-body text-[20px] leading-[26px] w-[344px] mx-auto font-medium text-center">
            {t('page.eip7702.alert')}
          </div>
        </>
      </div>
      <footer className="connect-footer p-[20px]">
        <div className={clsx(['action-buttons flex mt-4', 'justify-center'])}>
          <Button
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={() => rejectApproval()}
          >
            {t('global.ok')}
          </Button>
        </div>
      </footer>
    </>
  );
};
