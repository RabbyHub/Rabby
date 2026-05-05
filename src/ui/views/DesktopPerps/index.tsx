import React from 'react';
import styled from 'styled-components';
import { ChartArea } from './components/ChartArea';
import { OrderBookTrades } from './components/OrderBookTrades';
import { TradingPanel } from './components/TradingPanel';
import { UserInfoHistory } from './components/UserInfoHistory';
import { AccountInfo } from './components/AccountInfo';
import { StatusBar } from './components/StatusBar';
import './index.less';
import { usePerpsProInit } from './hooks/usePerpsProInit';
import {
  DepositWithdrawModal,
  DepositWithdrawModalType,
} from './components/DepositWithdrawModal';
import { SpotSwapModal } from './modal/SpotSwapModal';
import { EnableUnifiedAccountModal } from './modal/EnableUnifiedAccountModal';
import { TransferToPerpsModal } from './modal/TransferToPerpsModal';
import { usePerpsPopupNav } from './hooks/usePerpsPopupNav';
import { usePerpsActions } from '@/ui/views/Perps/hooks/usePerpsActions';
import { useRabbySelector } from '@/ui/store';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { AccountActions } from './components/AccountActions';
import { TopPermissionTips } from './components/TopPermissionTips';
import { SwitchThemeBtn } from '../DesktopProfile/components/SwitchThemeBtn';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import usePerpsProState from './hooks/usePerpsProState';
import { ReactComponent as RcIconRabbyCC } from '@/ui/assets/perps/IconRabbyCC.svg';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './resizable-panels.css';
import { useTranslation } from 'react-i18next';

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  flex-direction: column;
  padding-bottom: 32px;
`;

export type PopupType =
  | DepositWithdrawModalType
  | 'swap'
  | 'enable-unified'
  | 'transfer-to-perps'
  | 'add-address'
  | null;

export const DesktopPerps: React.FC<{ isActive?: boolean }> = ({
  isActive = true,
}) => {
  usePerpsProInit(isActive);

  const { t } = useTranslation();

  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );
  const { login: switchPerpsAccount } = usePerpsProState();

  const {
    action,
    source,
    target,
    disableSwitch,
    next,
    closePerpsPopup,
    advancePerpsPopup,
    openPerpsPopup,
  } = usePerpsPopupNav();
  const { handleEnableUnifiedAccount } = usePerpsActions();

  return (
    <>
      <Wrap>
        <div className="flex flex-1 pb-16">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between mt-20 mb-12 px-[12px]">
              {/* <DesktopNav showRightItems={false} /> */}
              <div className="flex items-center gap-[6px] text-rb-neutral-title-1">
                <RcIconRabbyCC />
                <span className="text-[20px] leading-[24px] font-bold">
                  {t('component.DesktopNav.perps')}
                </span>
              </div>
              <div className="flex items-center gap-[12px]">
                <DesktopAccountSelector
                  scene="perps"
                  value={currentPerpsAccount}
                  onChange={switchPerpsAccount}
                />
                <AccountActions />
                <SwitchThemeBtn />
              </div>
            </div>
            <TopPermissionTips />
            <div className="flex flex-1 min-w-0 min-h-0 border-t border-b  border-solid border-rb-neutral-line overflow-hidden bg-rb-neutral-bg-1">
              {/* [chart + order book] + UserInfoHistory，can be resized vertically */}
              <div className="flex-[4] flex flex-col min-w-0 min-h-0 border-r border-solid border-rb-neutral-line overflow-hidden">
                <PanelGroup
                  direction="vertical"
                  autoSaveId="perps-layout-vertical"
                >
                  <Panel defaultSize={65} minSize={25} maxSize={80}>
                    <div className="flex h-full">
                      <div className="flex-[3] min-w-0 border-r border-solid border-rb-neutral-line">
                        <ChartArea />
                      </div>
                      <div className="flex-1 max-w-[340px] min-w-0">
                        <OrderBookTrades />
                      </div>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="h-[4px]" />
                  <Panel minSize={20}>
                    <UserInfoHistory />
                  </Panel>
                </PanelGroup>
              </div>

              {/* TradingPanel + AccountInfo */}
              <div className="flex-1 max-w-[340px] flex-shrink-0 flex flex-col min-h-0 overflow-hidden">
                <div className="h-[680px] flex-shrink-0 overflow-hidden border-b border-solid border-rb-neutral-line">
                  <TradingPanel />
                </div>
                <div className="flex-1 min-h-[366px] overflow-auto">
                  <AccountInfo />
                </div>
              </div>
            </div>
          </div>
        </div>

        <StatusBar />
      </Wrap>
      {/* <AddAddressModal
        visible={action === 'add-address'}
        onCancel={() => {
          setPopupType(null);
        }}
        destroyOnClose
      /> */}

      <DepositWithdrawModal
        visible={action === 'deposit' || action === 'withdraw'}
        type={action === 'deposit' ? 'deposit' : 'withdraw'}
        onCancel={closePerpsPopup}
      />

      <SpotSwapModal
        visible={action === 'swap'}
        sourceAsset={source}
        targetAsset={target}
        disableSwitch={disableSwitch}
        onDeposit={() => {
          openPerpsPopup('deposit');
        }}
        onClose={closePerpsPopup}
      />

      <EnableUnifiedAccountModal
        visible={action === 'enable-unified'}
        onCancel={closePerpsPopup}
        onConfirm={async () => {
          const ok = await handleEnableUnifiedAccount();
          if (ok && next) {
            // We took over the close path by advancing to the chained popup.
            // Return false so the modal skips its own onCancel call, which
            // would otherwise wipe the freshly pushed URL params.
            advancePerpsPopup();
            return false;
          }
          return ok;
        }}
      />

      <TransferToPerpsModal
        visible={action === 'transfer-to-perps'}
        onClose={closePerpsPopup}
      />
    </>
  );
};
