import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconWarning } from '@/ui/assets/warning.svg';
import { getUiType, openInTab } from '@/ui/utils';
import { ReactComponent as RcIconLink } from '@/ui/assets/rabby-points/link.svg';

import { ReactComponent as RcIconMatchCC } from '@/ui/assets/match-cc.svg';

import { Popup } from '@/ui/component';
import { Skeleton } from 'antd';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

export const ExternalSwapBridgeDappTips = ({
  dappsAvailable,
}: {
  dappsAvailable?: boolean;
}) => {
  const { t } = useTranslation();
  if (!dappsAvailable) {
    return (
      <div
        className={clsx(
          'relative h-[44px] rounded-[8px] bg-r-neutral-card-1 pl-[12px]',
          'flex gap-[6px] items-center'
        )}
      >
        <RcIconWarning viewBox="0 0 16 16" className="w-16 h-16" />
        <div className="text-r-neutral-title-1 text-[14px] font-medium">
          {t('component.externalSwapBrideDappPopup.noQuotesForChain')}
        </div>
      </div>
    );
  }
  return (
    <div
      className={clsx(
        'relative h-[60px] rounded-[8px] bg-r-neutral-card-1 pl-[34px]',
        'flex flex-col gap-2 justify-center'
      )}
    >
      <div className="text-r-neutral-title-1 text-[14px] font-medium">
        {t('component.externalSwapBrideDappPopup.noQuotesForChain')}
      </div>
      <div className="text-[13px] text-r-neutral-foot">
        {t('component.externalSwapBrideDappPopup.thirdPartyDappToProceed')}
      </div>
      <RcIconWarning
        viewBox="0 0 16 16"
        className="absolute top-[11px] left-[12px] w-16 h-16"
      />
    </div>
  );
};

type SwapBridgeExternalDappInfo = {
  name: string;
  url: string;
  logo: string;
};

function cleanURL(url: string) {
  return url.replace(/^(https?:\/\/)?(www\.)?/, '');
}

const Item = ({ name, url, logo }: SwapBridgeExternalDappInfo) => {
  const openDapp = () => {
    openInTab(url);
  };
  return (
    <div
      className={clsx(
        'h-[60px] bg-r-neutral-card-1',
        'flex items-center cursor-pointer',
        'cursor-pointer',
        'rounded-[6px] p-16 pt-12',
        'border border-solid border-transparent',
        'hover:border-rabby-blue-default hover:bg-r-blue-light1'
      )}
      onClick={openDapp}
    >
      <img src={logo} alt={name} className="w-[32px] h-[32px] rounded-full" />
      <div className="flex flex-col gap- ml-8">
        <div className="text-[15px] font-medium text-r-neutral-title-1">
          {name}
        </div>
        <div className="text-[12px] text-r-neutral-foot">{cleanURL(url)}</div>
      </div>
      <RcIconLink
        className="ml-auto"
        viewBox="0 0 14 15"
        width={16}
        height={16}
      />
    </div>
  );
};

const ItemLoading = () => {
  return (
    <div
      className={clsx(
        'h-[60px] bg-r-neutral-card-1',
        'flex items-center cursor-pointer',
        'cursor-pointer',
        'rounded-[6px] p-16 pt-12',
        'border border-solid border-transparent'
      )}
    >
      <Skeleton.Avatar active shape="circle" size={32} />
      <div className="flex flex-col gap-2">
        <Skeleton.Input
          active
          style={{
            width: 67,
            height: 18,
          }}
        />
        <Skeleton.Input
          active
          style={{
            width: 124,
            height: 14,
          }}
        />
      </div>
    </div>
  );
};

const NoDapp = () => {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        'px-[21px] pt-[33px] pb-[37px]',
        'bg-r-neutral-card-1 rounded-[6px]',
        'flex flex-col items-center gap-[6px]',
        'text-r-neutral-foot'
      )}
    >
      <RcIconMatchCC />
      <span className="text-[13px] text-center font-medium">
        {t('component.externalSwapBrideDappPopup.noDapp')}
      </span>
      <span className="text-[12px] text-center ">
        {t('component.externalSwapBrideDappPopup.help')}
      </span>
    </div>
  );
};

const SwapBridgeDappPopupInner = ({
  dappList,
  loading,
}: {
  dappList: SwapBridgeExternalDappInfo[];
  loading?: boolean;
}) => {
  if (!loading && !dappList?.length) {
    return <NoDapp />;
  }
  return (
    <div className="flex flex-col gap-12">
      {!loading &&
        dappList.map((e) => (
          <Item name={e.name} logo={e.logo} url={e.url} key={e.url} />
        ))}

      {loading
        ? Array.from({ length: 2 })
            .fill(1)
            .map((_, idx) => <ItemLoading key={idx} />)
        : null}
    </div>
  );
};

export const SwapBridgeDappPopup = ({
  visible,
  onClose,
  dappList,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  dappList: SwapBridgeExternalDappInfo[];
  loading?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <Popup
      className="custom-popup is-support-darkmode is-new"
      getContainer={getContainer}
      title={t('component.externalSwapBrideDappPopup.selectADapp')}
      height={'auto'}
      visible={visible}
      onCancel={onClose}
      onClose={onClose}
      destroyOnClose
      closable
      bodyStyle={{
        paddingTop: 14,
      }}
    >
      <SwapBridgeDappPopupInner dappList={dappList} loading={loading} />
    </Popup>
  );
};
