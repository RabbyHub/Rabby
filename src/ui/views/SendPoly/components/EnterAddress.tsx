import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Input, Form, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { isValidAddress } from '@ethereumjs/util';
import { debounce, flatten } from 'lodash';
import styled from 'styled-components';
import clsx from 'clsx';

import type { Input as AntdInput } from 'antd';

import { isSameAddress, useAlias, useCexId, useWallet } from 'ui/utils';

import { IconClearCC } from '@/ui/assets/component/IconClear';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { AccountList } from './AccountList';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { AddressTypeCard } from '@/ui/component/AddressRiskAlert';
import { KEYRING_TYPE } from '@/constant';
import { ellipsisAddress } from '@/ui/utils/address';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

const StyledInputWrapper = styled.div<{ $hasError?: boolean }>`
  border-radius: 8px;
  overflow: hidden;
  .ant-input {
    font-size: 15px;
    ${({ $hasError }) =>
      $hasError && 'border-color: var(--r-red-default) !important;'}
  }
  .ant-input-clear-icon {
    top: unset !important;
    bottom: 8px !important;
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const WhitelistAddressTypeCard = ({
  address,
  type,
  brandName,
}: {
  address: string;
  type: string;
  brandName: string;
}) => {
  const [cexInfo] = useCexId(address);
  const [aliasName] = useAlias(address);
  return (
    <div className="mt-[20px] w-full">
      <AddressTypeCard
        address={address}
        type={type}
        brandName={brandName}
        aliasName={aliasName || ellipsisAddress(address)}
        className="bg-r-neutral-card1"
        cexInfo={{
          id: cexInfo?.id,
          name: cexInfo?.name,
          logo: cexInfo?.logo,
          isDeposit: !!cexInfo?.id,
        }}
      />
    </div>
  );
};

export const EnterAddress = ({
  onNext,
  onCancel,
}: {
  onNext: (address: string, type?: string) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const { fetchAllAccounts, allSortedAccountList } = useAccounts();
  const dispatch = useRabbyDispatch();

  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));

  const inputRef = useRef<AntdInput>(null);

  const [inputAddress, setInputAddress] = useState('');
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isValidAddr, setIsValidAddr] = useState(true);

  const [isFocusAddress, setIsFocusAddress] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const filteredAccounts = useMemo(() => {
    const lowerFilterText = inputAddress?.toLowerCase() || '';
    const flattenedAccounts = flatten(allSortedAccountList);
    if (!lowerFilterText) {
      return flattenedAccounts;
    }
    return flattenedAccounts.filter((account) => {
      const address = account.address.toLowerCase();
      const brandName = account.brandName?.toLowerCase() || '';
      const aliasName = account.alianName?.toLowerCase() || '';
      return (
        address.includes(lowerFilterText) ||
        brandName.includes(lowerFilterText) ||
        aliasName.includes(lowerFilterText)
      );
    });
  }, [allSortedAccountList, inputAddress]);

  useEffect(() => {
    // delay footer render to avoid layout animation
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  useEffect(() => {
    dispatch.whitelist.getWhitelist();
  }, [dispatch.whitelist]);

  const handleConfirmENS = useCallback(
    (result: string) => {
      setInputAddress(result);
      setIsValidAddr(true);
      setTags([`ENS: ${ensResult?.name || ''}`]);
      setEnsResult(null);
    },
    [ensResult?.name]
  );

  const handleKeyDown = useMemo(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'enter') {
        if (ensResult) {
          e.preventDefault();
          handleConfirmENS(ensResult.addr);
        }
      }
    };
    return handler;
  }, [ensResult, handleConfirmENS]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleValuesChange = useMemo(
    () =>
      debounce(async ({ address }: { address: string }) => {
        setTags([]);
        if (!isValidAddress(address)) {
          try {
            const result = await wallet.openapi.getEnsAddressByName(address);
            if (result && result.addr) {
              setEnsResult(result);
              setIsValidAddr(true);
            } else {
              setEnsResult(null);
              setIsValidAddr(!address.length);
            }
          } catch (e) {
            setEnsResult(null);
            setIsValidAddr(false);
          }
        } else {
          setIsValidAddr(true);
          setEnsResult(null);
        }
      }, 300),
    [wallet]
  );

  const handleNextClick = () => {
    const address = ensResult?.addr || inputAddress;
    if (address && isValidAddress(address)) {
      onNext(address);
    } else {
      setIsValidAddr(false);
    }
  };
  const isValidateAddress = useMemo(() => {
    return isValidAddress(inputAddress);
  }, [inputAddress]);

  return (
    <Form
      autoComplete="off"
      onFinish={handleNextClick}
      className="flex flex-1 flex-col"
    >
      <div
        className="relative overflow-auto"
        onClick={() => {
          if (!inputAddress) {
            onCancel();
          }
        }}
      >
        <Form.Item name="address">
          <StyledInputWrapper
            onClick={(e) => e.stopPropagation()}
            className="relative"
            $hasError={!isValidAddr && !filteredAccounts.length}
          >
            <Input.TextArea
              maxLength={44}
              placeholder={t('page.sendPoly.enterAddressOrENS')}
              allowClear={false}
              autoFocus
              ref={inputRef}
              onFocus={() => setIsFocusAddress(true)}
              onBlur={() => setIsFocusAddress(false)}
              value={inputAddress}
              onChange={(e) => {
                setInputAddress(e.target.value);
                handleValuesChange({ address: e.target.value });
              }}
              size="large"
              spellCheck={false}
              rows={4}
              className={clsx(
                'border-bright-on-active bg-r-neutral-card1 rounded-[8px] leading-normal pt-[14px] pl-[15px] h-[80px]'
              )}
            />
            <div className="absolute w-[20px] h-[20px] right-[16px] bottom-[16px]">
              <IconClearCC
                onClick={() => {
                  setInputAddress('');
                  handleValuesChange({ address: '' });
                  inputRef.current?.focus();
                }}
                className={clsx(
                  isFocusAddress && inputAddress.length > 0
                    ? 'opacity-100 cursor-pointer'
                    : 'opacity-0 cursor-text'
                )}
              />
            </div>
          </StyledInputWrapper>
          {!isValidAddr && !filteredAccounts.length && (
            <div className="text-r-red-default text-[13px] font-medium flex gap-[4px] items-center mt-[8px]">
              <div className="text-r-red-default">
                <RcIconWarningCC />
              </div>
              <div>{t('page.whitelist.invalidAddress')}</div>
            </div>
          )}
        </Form.Item>
        {tags.length > 0 && (
          <ul className="mt-[13px]">
            {tags.map((tag) => (
              <li
                className="border-none pl-0 py-0 text-[13px] text-r-neutral-body font-medium"
                key={tag}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        {ensResult && (
          <div
            className="mt-[12px] p-[12px] bg-r-neutral-card1 rounded-[8px] cursor-pointer"
            onClick={() => handleConfirmENS(ensResult.addr)}
          >
            <div className="flex items-center gap-[8px] break-all">
              <span className="flex-1">{ensResult.addr}</span>
            </div>
          </div>
        )}
        {isValidateAddress &&
          (whitelist.some((item) => isSameAddress(item, inputAddress)) ||
            !!filteredAccounts.length) && (
            <WhitelistAddressTypeCard
              address={inputAddress}
              type={
                filteredAccounts?.[0]?.address &&
                isSameAddress(inputAddress, filteredAccounts[0].address)
                  ? filteredAccounts[0].type
                  : KEYRING_TYPE.WatchAddressKeyring
              }
              brandName={
                filteredAccounts?.[0]?.address &&
                isSameAddress(inputAddress, filteredAccounts[0].address)
                  ? filteredAccounts[0].brandName
                  : KEYRING_TYPE.WatchAddressKeyring
              }
            />
          )}
      </div>
      {shouldRender && (
        <>
          <div className="flex-1 pt-[20px] overflow-y-scroll">
            {!isValidateAddress && (
              <AccountList
                list={filteredAccounts}
                whitelist={whitelist}
                onChange={(acc) => onNext(acc.address, acc.type)}
              />
            )}
          </div>
          <div className={'footer'}>
            <div className="btn-wrapper w-[100%] px-[16px] flex justify-center">
              <Button
                disabled={(!isValidAddr || !inputAddress) && !ensResult?.addr}
                type="primary"
                htmlType="submit"
                size="large"
                className="w-[100%] h-[48px] text-[16px]"
              >
                {t('global.confirm')}
              </Button>
            </div>
          </div>
        </>
      )}
    </Form>
  );
};
