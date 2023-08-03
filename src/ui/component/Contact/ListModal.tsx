import React, { useEffect, useMemo, useState } from 'react';
import { Button, message } from 'antd';
import styled from 'styled-components';
import { useRabbyDispatch, useRabbySelector, connectStore } from 'ui/store';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import { Popup } from 'ui/component';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import EditWhitelist from './EditWhitelist';
import AccountItem from './AccountItem';
import { UIContactBookItem } from 'background/service/contactBook';
import { isSameAddress, useWallet } from 'ui/utils';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';
import clsx from 'clsx';

interface ListModalProps {
  address?: string;
  visible: boolean;
  onOk(account: UIContactBookItem): void;
  onCancel(): void;
}

const ListScrollWrapper = styled.div`
  flex: 1;
  overflow: auto;
`;

const ListFooterWrapper = styled.div`
  height: 80px;
  padding: 20px 0;
  display: flex;
  justify-content: center;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
`;

const ListModal = ({ visible, onOk, onCancel }: ListModalProps) => {
  const [editWhitelistVisible, setEditWhitelistVisible] = useState(false);
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();

  const { accountsList, whitelist, whitelistEnabled } = useRabbySelector(
    (s) => ({
      currentAccount: s.account.currentAccount,
      accountsList: s.accountToDisplay.accountsList,
      whitelist: s.whitelist.whitelist,
      whitelistEnabled: s.whitelist.enabled,
    })
  );

  const sortedAccountsList = useMemo(() => {
    if (!whitelistEnabled) {
      return accountsList;
    }
    return [...accountsList].sort((a, b) => {
      let an = 0,
        bn = 0;
      if (whitelist?.some((w) => isSameAddress(w, a.address))) {
        an = 1;
      }
      if (whitelist?.some((w) => isSameAddress(w, b.address))) {
        bn = 1;
      }
      return bn - an;
    });
  }, [accountsList, whitelist]);

  const handleSelectAddress = (account: IDisplayedAccountWithBalance) => {
    onOk({
      address: account.address,
      name: account.alianName,
    });
  };

  const handleClickEditWhitelist = () => {
    setEditWhitelistVisible(true);
  };

  const fetchData = async () => {
    dispatch.accountToDisplay.getAllAccountsToDisplay();
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
  };

  const handleSaveWhitelist = async (list: string[]) => {
    await AuthenticationModalPromise({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      title: 'Save to Whitelist',
      validationHandler: async (password: string) =>
        wallet.setWhitelist(password, list),
      onFinished() {
        setEditWhitelistVisible(false);
        dispatch.whitelist.getWhitelist();
        message.success({
          duration: 3,
          icon: <i />,
          content: (
            <div>
              <div className="flex gap-4 mb-4">
                <img src={IconSuccess} alt="" />
                Whitelist Updated
              </div>
            </div>
          ),
        });
      },
      onCancel() {
        // do nothing
      },
      wallet,
    });
  };

  useEffect(() => {
    if (visible) fetchData();
  }, [visible]);

  return (
    <Popup
      className="whitelist-selector"
      visible={visible}
      onClose={onCancel}
      title="Select Address"
      placement="bottom"
      height={580}
      closable
    >
      <div
        className={clsx('flex flex-col pb-80 h-full', {
          'pb-20': !whitelistEnabled,
        })}
      >
        <div className="text-center mb-16 text-14 text-gray-content">
          {whitelistEnabled
            ? 'Whitelist is enabled. You can only send assets to a whitelisted address or you can disable it in "Settings"'
            : 'Whitelist is disabled. You can send assets to any address'}
        </div>
        <ListScrollWrapper>
          {sortedAccountsList.map((account) => (
            <AccountItem
              account={account}
              key={`${account.brandName}-${account.address}`}
              onClick={handleSelectAddress}
              disabled={
                whitelistEnabled
                  ? !whitelist.find((item) =>
                      isSameAddress(item, account.address)
                    )
                  : false
              }
            />
          ))}
        </ListScrollWrapper>
        {whitelistEnabled && (
          <ListFooterWrapper>
            <Button
              type="primary"
              size="large"
              className="w-[169px] h-[40px] text-15"
              onClick={handleClickEditWhitelist}
            >
              Edit Whitelist
            </Button>
          </ListFooterWrapper>
        )}
      </div>
      {editWhitelistVisible && (
        <EditWhitelist
          onCancel={() => setEditWhitelistVisible(false)}
          onConfirm={handleSaveWhitelist}
          whitelist={whitelist}
          accountsList={accountsList}
        />
      )}
    </Popup>
  );
};

export default connectStore()(ListModal);
