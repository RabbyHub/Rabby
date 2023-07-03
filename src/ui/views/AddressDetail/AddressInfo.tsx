import { Button, Form, Input, message, Popover } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, NameAndAddress, PageHeader, Popup } from 'ui/component';
import {
  isSameAddress,
  splitNumberByStep,
  useAlias,
  useBalance,
  useAccountInfo,
  useWallet,
} from 'ui/utils';
import QRCode from 'qrcode.react';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconPen from 'ui/assets/editpen.svg';
import './style.less';
import { copyAddress } from '@/ui/utils/clipboard';
import { useForm } from 'antd/lib/form/Form';
import {
  CHAINS,
  CHAINS_ENUM,
  KEYRING_CLASS,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import { useLocation } from 'react-router-dom';
import { connectStore, useRabbyGetter, useRabbySelector } from '@/ui/store';
import IconTagYou from 'ui/assets/tag-you.svg';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { useAsync } from 'react-use';
import Safe, { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { crossCompareOwners } from '@/ui/utils/gnosis';
import { SvgIconLoading } from 'ui/assets';
import { SessionStatusBar } from '@/ui/component/WalletConnect/SessionStatusBar';
import { LedgerStatusBar } from '@/ui/component/ConnectStatus/LedgerStatusBar';
import { GridPlusStatusBar } from '@/ui/component/ConnectStatus/GridPlusStatusBar';
import { SeedPhraseBar } from './SeedPhraseBar';
import clsx from 'clsx';
import { Chain } from '@debank/common';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/dist/api';
import { sortBy } from 'lodash';

const GnonisSafeInfo = ({
  address,
  type,
  brandName,
}: {
  address: string;
  type: string;
  brandName: string;
}) => {
  const wallet = useWallet();
  const [activeData, setActiveData] = useState<
    | {
        chain?: Chain;
        data: BasicSafeInfo;
      }
    | undefined
  >(undefined);
  const { accountsList, highlightedAddresses } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));
  const { value: safeInfo, error, loading } = useAsync(async () => {
    const networks = await wallet.getGnosisNetworkIds(address);
    const res = await Promise.all(
      networks.map(async (networkId) => {
        const info = await wallet.getBasicSafeInfo({ address, networkId });

        const owners = await wallet.getGnosisOwners(
          {
            type,
            address,
            brandName,
          },
          address,
          info.version,
          networkId
        );

        const comparedOwners = crossCompareOwners(owners, info.owners);

        return {
          chain: Object.values(CHAINS).find(
            (chain) => chain.network === networkId
          ),
          data: {
            ...info,
            owners: comparedOwners,
          },
        };
      })
    );
    const list = sortBy(res, (item) => {
      return -(item?.data?.owners?.length || 0);
    });
    setActiveData(list[0]);
    return list;
  }, [address]);

  const { sortedAccountsList } = React.useMemo(() => {
    const restAccounts = [...accountsList];
    let highlightedAccounts: typeof accountsList = [];

    highlightedAddresses.forEach((highlighted) => {
      const idx = restAccounts.findIndex(
        (account) =>
          account.address === highlighted.address &&
          account.brandName === highlighted.brandName
      );
      if (idx > -1) {
        highlightedAccounts.push(restAccounts[idx]);
        restAccounts.splice(idx, 1);
      }
    });

    highlightedAccounts = sortAccountsByBalance(highlightedAccounts);

    return {
      sortedAccountsList: highlightedAccounts.concat(restAccounts),
    };
  }, [accountsList, highlightedAddresses]);

  if (loading) {
    return (
      <div className="rabby-list-item">
        <div className="rabby-list-item-content ">
          <SvgIconLoading
            className="animate-spin w-[20px] h-[20px]"
            fill="#707280"
            viewBox="0 0 36 36"
          />
        </div>
      </div>
    );
  }

  if (safeInfo) {
    return (
      <>
        <div className="rabby-list-item no-hover">
          <div className="rabby-list-item-content border-0">
            <div className="rabby-list-item-label">
              Admins
              <div className="tabs-container">
                <div className="tabs">
                  {safeInfo?.map((item) => {
                    return (
                      <div
                        className={clsx(
                          'tabs-item',
                          activeData?.chain?.enum === item?.chain?.enum &&
                            'is-active'
                        )}
                        onClick={() => {
                          setActiveData(item);
                        }}
                        key={item?.chain?.enum}
                      >
                        <div className="tabs-item-title">
                          {item?.chain?.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rabby-list-item-desc text-gray-subTitle">
                Any transaction requires{' '}
                <span className="text-gray-title text-14">
                  {activeData?.data?.threshold}/
                  {activeData?.data?.owners.length}
                </span>{' '}
                confirmations
              </div>
            </div>
            <div className="rabby-list-item-extra flex gap-[4px]"></div>
          </div>
        </div>
        {activeData?.data?.owners.map((owner, index) => (
          <GnosisAdminItem
            address={owner}
            accounts={sortedAccountsList.map((e) => e.address)}
            key={index}
          />
        ))}
      </>
    );
  }
  return null;
};

type Props = {
  address: string;
  type: string;
  brandName: string;
  source: string;
};

const AddressInfo1 = ({ address, type, brandName, source }: Props) => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const [alias, setAlias] = useAlias(address);
  const [balance] = useBalance(address);
  const [form] = useForm();
  const inputRef = useRef<Input>(null);
  const accountInfo = useAccountInfo(type, address);

  const isGnosis = type === KEYRING_CLASS.GNOSIS;

  const handleEditMemo = () => {
    form.setFieldsValue({
      memo: alias,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    const { destroy } = Popup.info({
      title: 'Edit address note',
      height: 215,
      content: (
        <div className="pt-[4px]">
          <Form
            form={form}
            onFinish={async () => {
              form
                .validateFields()
                .then((values) => {
                  return setAlias(values.memo);
                })
                .then(() => {
                  destroy();
                });
            }}
            initialValues={{
              memo: alias,
            }}
          >
            <Form.Item
              name="memo"
              className="h-[80px] mb-0"
              rules={[{ required: true, message: 'Please input address note' }]}
            >
              <Input
                ref={inputRef}
                className="popup-input h-[48px]"
                size="large"
                placeholder="Please input address note"
                autoFocus
                allowClear
                spellCheck={false}
                autoComplete="off"
                maxLength={50}
              ></Input>
            </Form.Item>
            <div className="text-center">
              <Button
                type="primary"
                size="large"
                className="w-[200px]"
                htmlType="submit"
              >
                Confirm
              </Button>
            </div>
          </Form>
        </div>
      ),
    });
  };

  return (
    <div className="rabby-list">
      <div className="rabby-list-item">
        <div className="rabby-list-item-content pr-11">
          <div className="rabby-list-item-label">
            Address
            <div className="rabby-list-item-desc flex gap-4 text-[13px]">
              {address}
              <img
                src={IconCopy}
                className="w-14 h-14 flex-shrink-0 cursor-pointer"
                onClick={() => {
                  copyAddress(address);
                }}
              />
            </div>
          </div>
          <div className="rabby-list-item-extra"></div>
          <div className="rabby-list-item-arrow"></div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">Address Note</div>
          <div
            className="rabby-list-item-extra flex gap-[10px]"
            onClick={handleEditMemo}
          >
            <div className="ellipsis" title={alias}>
              {alias}
            </div>
            <img src={IconPen} className="cursor-pointer" alt="" />
          </div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">Assets</div>
          <div
            className="rabby-list-item-extra truncate"
            title={splitNumberByStep((balance || 0).toFixed(0))}
          >
            ${splitNumberByStep((balance || 0).toFixed(0))}
          </div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">QR Code</div>
          <div className="rabby-list-item-extra">
            <Popover
              placement="bottomLeft"
              // trigger="click"
              overlayClassName="page-address-detail-qrcode-popover"
              align={{
                offset: [-16, 6],
              }}
              content={<QRCode value={address} size={140}></QRCode>}
            >
              <QRCode
                value={address}
                size={28}
                className="cursor-pointer"
              ></QRCode>
            </Popover>
          </div>
        </div>
      </div>
      <div className="rabby-list-item">
        <div className="rabby-list-item-content">
          <div className="rabby-list-item-label">Source</div>
          <div className="rabby-list-item-extra flex gap-[4px]">
            <img
              className="w-[16px] h-[16px]"
              src={
                KEYRING_ICONS[type] ||
                WALLET_BRAND_CONTENT[brandName as string]?.image
              }
            />
            {source}
          </div>
        </div>
        {type === KEYRING_CLASS.WALLETCONNECT && (
          <div className="pb-[20px]">
            <SessionStatusBar
              className="text-gray-subTitle bg-gray-bg connect-status"
              address={address}
              brandName={brandName}
            />
          </div>
        )}
        {type === KEYRING_CLASS.HARDWARE.LEDGER && (
          <div className="pb-[20px]">
            <LedgerStatusBar className="text-gray-subTitle bg-gray-bg connect-status" />
          </div>
        )}
        {type === KEYRING_CLASS.HARDWARE.GRIDPLUS && (
          <div className="pb-[20px]">
            <GridPlusStatusBar className="text-gray-subTitle bg-gray-bg connect-status" />
          </div>
        )}
        {type === KEYRING_CLASS.MNEMONIC && (
          <div className="pb-[20px]">
            <SeedPhraseBar address={address} />
          </div>
        )}
      </div>
      {accountInfo && (
        <div className="rabby-list-item">
          <div className="rabby-list-item-content">
            <div className="rabby-list-item-label">HD Path</div>
            <div className="rabby-list-item-extra flex gap-[4px]">{`${accountInfo.hdPathTypeLabel} #${accountInfo.index}`}</div>
          </div>
        </div>
      )}

      {isGnosis ? (
        <GnonisSafeInfo address={address} type={type} brandName={brandName} />
      ) : null}
    </div>
  );
};

export const AddressInfo = connectStore()(AddressInfo1);

const GnosisAdminItem = ({
  accounts,
  address,
}: {
  accounts: string[];
  address: string;
}) => {
  const addressInWallet = accounts.find((addr) => isSameAddress(addr, address));
  return (
    <div className="rabby-list-item">
      <div className="rabby-list-item-content py-0 min-h-[40px]">
        <NameAndAddress address={address} nameClass="max-143" />
        {addressInWallet ? (
          <img src={IconTagYou} className="icon icon-tag ml-[12px]" />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};
