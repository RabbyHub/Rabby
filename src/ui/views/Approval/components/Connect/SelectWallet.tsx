import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
// import { ReactComponent as RcIconBack } from 'ui/assets/icon-back-cc.svg';
import IconLogo from 'ui/assets/rabby-logo-circle.svg';

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface Props {
  onBack(): void;
  providers?: EIP6963ProviderInfo[];
  onSelect?(info?: EIP6963ProviderInfo): void;
}
export const SelectWallet: React.FC<Props> = ({
  onBack,
  providers,
  onSelect,
}) => {
  const { t } = useTranslation();
  return (
    <div className="pt-[56px] px-[20px] pb-[20px] h-full bg-r-neutral-card-2">
      <div>
        {/* <div className="text-r-neutral-body mb-[24px]">
          <RcIconBack className="cursor-pointer" onClick={onBack} />
        </div> */}
        <div className="text-center mb-[32px]">
          <h1 className="text-[24px] leading-[29px] font-medium text-r-neutral-title1 mt-0 mb-[8px]">
            {t('page.connect.SelectWallet.title')}
          </h1>
          <p className="text-[15px] leading-[18px] text-r-neutral-body m-0">
            {t('page.connect.SelectWallet.desc')}
          </p>
        </div>
      </div>
      <main className="flex flex-wrap m-[-8px]">
        <div className="p-[8px] w-[50%]">
          <div
            className={clsx(
              'p-[20px] h-[100px] cursor-pointer',
              'bg-r-neutral-card-1 rounded-[8px] border-[1px] border-transparent',
              'flex flex-col items-center justify-center',
              'hover:bg-r-blue-light1 hover:border-rabby-blue-default'
            )}
            style={{ boxShadow: '0px 4px 16px 0px rgba(0, 0, 0, 0.04)' }}
            onClick={() => {
              onSelect?.();
            }}
          >
            <img
              className="block w-[32px] h-[32px] mb-[8px]"
              src={IconLogo}
              alt=""
            />
            <div className="truncate text-[18px] leading-[21px] font-medium">
              Rabby Wallet
            </div>
          </div>
        </div>
        {providers?.map((item) => {
          return (
            <div className="p-[8px] w-[50%]" key={item.uuid}>
              <div
                className={clsx(
                  'p-[20px] h-[100px] cursor-pointer',
                  'bg-r-neutral-card-1 rounded-[8px] border-[1px] border-transparent',
                  'flex flex-col items-center justify-center',
                  'hover:bg-r-blue-light1 hover:border-rabby-blue-default'
                )}
                style={{ boxShadow: '0px 4px 16px 0px rgba(0, 0, 0, 0.04)' }}
                onClick={() => {
                  onSelect?.(item);
                }}
              >
                <img
                  className="block w-[32px] h-[32px] mb-[8px]"
                  src={item.icon}
                  alt=""
                />
                <div className="truncate text-[18px] leading-[21px] font-medium">
                  {item.name}
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};
