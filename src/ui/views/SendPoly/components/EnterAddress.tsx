import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input, Form, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { isValidAddress } from '@ethereumjs/util';
import { debounce } from 'lodash';
import styled from 'styled-components';
import clsx from 'clsx';

import type { Input as AntdInput } from 'antd';

import { useWallet } from 'ui/utils';

import { IconClearCC } from '@/ui/assets/component/IconClear';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { AccountList } from './AccountList';

const StyledInputWrapper = styled.div`
  border-radius: 8px;
  overflow: hidden;
  .ant-input {
    font-size: 15px;
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

export const EnterAddress = ({
  onNext,
  onCancel,
}: {
  onNext: (address: string, type?: string) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();

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

  useEffect(() => {
    // delay footer render to avoid layout animation
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleConfirmENS = (result: string) => {
    setInputAddress(result);
    setIsValidAddr(true);
    setTags([`ENS: ${ensResult?.name || ''}`]);
    setEnsResult(null);
  };

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
  }, [ensResult]);

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

  return (
    <Form
      autoComplete="off"
      onFinish={handleNextClick}
      className="flex flex-1 flex-col"
    >
      <div
        className="relative flex-1 overflow-auto"
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
              className="border-bright-on-active bg-r-neutral-card1 rounded-[8px] leading-normal pt-[14px] pl-[15px]"
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
          {!isValidAddr && (
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
      </div>
      {shouldRender && (
        <>
          <AccountList onChange={(acc) => onNext(acc.address, acc.type)} />
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
