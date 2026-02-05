import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Popover } from 'antd';
import clsx from 'clsx';
import { LANGS } from 'consts';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcArrowDownSVG } from '@/ui/assets/dashboard/arrow-down-cc.svg';
import IconCheck from 'ui/assets/check-2.svg';
import './styles.less';

export const LangSelector: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const currentLang = useRabbySelector((state) => {
    const code = state.preference.locale;
    const name = LANGS.find((lang) => lang.code === code)?.name;
    return {
      code,
      name: name || code,
    };
  });
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLangChange = useCallback(
    (lang: string) => {
      dispatch.preference.switchLocale(lang);
      setIsOpen(false);
    },
    [dispatch]
  );

  return (
    <Popover
      overlayClassName={'lang-selector-popover'}
      visible={isOpen}
      onVisibleChange={(visible) => setIsOpen(visible)}
      content={
        <div className="flex flex-wrap w-[360px]">
          {LANGS.map((lang) => (
            <div
              key={lang.code}
              className={clsx(
                'w-[50%] min-h-[44px]',
                'flex items-center justify-between',
                'pl-[16px] py-[12px] pr-[12px] cursor-pointer hover:bg-r-blue-light1',
                'text-r-neutral-title1 text-[15px] leading-[18px] font-medium'
              )}
              onClick={() => handleLangChange(lang.code)}
            >
              {lang.name}
              {currentLang?.code === lang.code && (
                <img src={IconCheck} className="w-[16px] h-[16px]" />
              )}
            </div>
          ))}
        </div>
      }
      trigger={['click']}
      placement="bottomRight"
    >
      <div
        className={clsx(
          'inline-flex items-center gap-[8px] justify-between min-w-[140px]',
          'px-[16px] py-[13px] rounded-[8px] bg-r-neutral-card-1 cursor-pointer',
          'text-r-neutral-title1 text-[15px] leading-[18px] font-medium'
        )}
      >
        <div>{currentLang?.name}</div>
        <RcArrowDownSVG
          viewBox="0 0 14 14"
          className={clsx('w-[14px] h-[14px] text-r-neutral-body')}
        />
      </div>
    </Popover>
  );
};
