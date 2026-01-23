import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useHistory, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { DESKTOP_NAV_HEIGHT } from '@/ui/component/DesktopNav';
import { DesktopLendingSelectAccountList } from '@/ui/component/DesktopSelectAccountList/LendingAccountList';
import { LendingList } from './components/LendingList';
import { SummaryBar } from './components/SummaryBar';
import { AddAddressModal } from '../DesktopProfile/components/AddAddressModal';
import './index.less';

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  flex-direction: column;
  padding-bottom: 88px;
`;

export type PopupType = 'add-address' | null;

export const DesktopLending: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const [popupType, setPopupType] = useState<PopupType>(null);

  const handleSetPopupType = useCallback((type: PopupType) => {
    setPopupType(type);
  }, []);

  const { action } = React.useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      action: searchParams.get('action'),
    };
  }, [location.search]);

  return (
    <>
      <Wrap>
        <div className="flex flex-1 pl-16 pr-8 pb-16">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <DesktopNav showRightItems={false} />
            </div>
            <div className="flex flex-col flex-1 min-w-0 border border-solid border-rb-neutral-line rounded-[16px] overflow-hidden bg-rb-neutral-bg-1 mt-[16px] relative">
              <div className="flex flex-1 min-h-[300px]">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <LendingList />
                </div>
              </div>
              <SummaryBar />
            </div>
          </div>
          <aside
            className={clsx(
              'min-w-[64px] flex-shrink-0 z-20 h-full overflow-auto pl-[16px] sticky'
            )}
            style={{ top: DESKTOP_NAV_HEIGHT }}
          >
            <DesktopLendingSelectAccountList
              handleSetPopupType={handleSetPopupType}
            />
          </aside>
        </div>
      </Wrap>
      <AddAddressModal
        visible={action === 'add-address'}
        onCancel={() => {
          setPopupType(null);
        }}
        destroyOnClose
      />
    </>
  );
};
