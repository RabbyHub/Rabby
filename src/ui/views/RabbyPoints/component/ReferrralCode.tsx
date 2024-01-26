import { Popup } from '@/ui/component';
import { Button, Input, message } from 'antd';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { ReactComponent as IconDice } from 'ui/assets/rabby-points/dice-cc.svg';
import { useRabbyPointsInvitedCodeCheck } from '../hooks';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'react-i18next';
import useDebounceValue from '@/ui/hooks/useDebounceValue';

const StyledInput = styled(Input)`
  border-radius: 8px;
  border: 1px solid var(--r-neutral-line, #d3d8e0);
  height: 52px;
  font-size: 14px;
  font-weight: 510;
  text-align: left;
  background: var(--r-neutral-bg1, #fff);
  & > input.ant-input {
    background: var(--r-neutral-bg1, #fff);
    color: var(--r-neutral-title1, #192945);
  }
  &:hover,
  &.ant-input-affix-wrapper-focused {
    border: 1px solid var(--r-blue-default, #7084ff);
  }
`;

export const SetReferralCode = ({
  onSetCode,
  onOpen,
  onClose,
  visible,
}: {
  onSetCode: (code: string) => Promise<void>;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const changedRef = useRef(false);

  const debounceInput = useDebounceValue(input, 200);

  const { codeStatus, codeLoading } = useRabbyPointsInvitedCodeCheck(
    debounceInput
  );

  const isValidCode = useMemo(() => false, [input]);
  const [desc, isError] = useMemo(() => {
    if (!input) {
      if (!changedRef.current) {
        return [' ', false];
      }
      return [
        t('page.rabbyPoints.referralCode.referral-code-cannot-be-empty'),
        true,
      ];
    }
    if (input.length > 15) {
      return [
        t(
          'page.rabbyPoints.referralCode.referral-code-cannot-exceed-15-characters'
        ),
        true,
      ];
    }
    if (codeStatus?.invite_code_exist) {
      return [
        t('page.rabbyPoints.referralCode.referral-code-already-exists'),
        true,
      ];
    }
    if (codeLoading) {
      return [' ', false];
    }
    return [t('page.rabbyPoints.referralCode.referral-code-available'), false];
  }, [input, codeStatus, codeLoading]);

  const disabled = useMemo(() => {
    return !input || isError || codeLoading;
  }, [input, isError, codeLoading]);

  const openPopup = React.useCallback(() => {
    onOpen();
    changedRef.current = false;
  }, [onOpen]);

  const closePopup = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const inputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (/^[a-zA-Z0-9]+$/.test(e.target.value) || e.target.value === '') {
        setInput(e.target.value?.toUpperCase());
        changedRef.current = true;
      }
    },
    []
  );

  const getDiceReferralCode = () => {
    const nanoId = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
    const id = nanoId();
    setInput(id);
  };

  const submitReferralCode = React.useCallback(async () => {
    try {
      await onSetCode(input);
      closePopup();
    } catch (error) {
      message.error(String(error?.message || error));
    }
  }, [onSetCode, input]);

  const inputRef = useRef<Input>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.input?.focus();
      });
    }
  }, [visible]);

  return (
    <div className="bg-r-blue-light1 rounded-[8px] px-[16px] py-[12px] flex items-center justify-between ">
      <div className="flex flex-col gap-[2px] text-r-blue-default">
        <span className="text-[15px] font-medium">
          {t('page.rabbyPoints.referralCode.my-referral-code')}
        </span>
        <span className="text-[12px]">
          {t('page.rabbyPoints.referralCode.refer-a-new-user-to-get-50-points')}
        </span>
      </div>
      <Button
        type="primary"
        className="w-[120px] h-[34px] text-r-neutral-title2 text-[15] font-medium"
        onClick={openPopup}
      >
        {t('page.rabbyPoints.referralCode.set-my-code')}
      </Button>
      <Popup
        visible={visible}
        onCancel={closePopup}
        title={t('page.rabbyPoints.referralCode.set-my-referral-code')}
        height={336}
        isSupportDarkMode
        bodyStyle={{
          overflow: 'hidden',
          paddingBottom: 20,
        }}
        destroyOnClose
      >
        <div className="flex flex-col h-full">
          <StyledInput
            bordered
            autoCapitalize="false"
            autoComplete="false"
            autoCorrect="false"
            value={input}
            onChange={inputChange}
            className={clsx(
              'border-[1px] bg-transparent',
              isError && 'border-rabby-red-default',
              isValidCode && 'border-rabby-blue-default'
            )}
            suffix={
              <div className="rounded group w-[32px] h-[32px] flex items-center justify-center bg-transparent hover:bg-r-blue-light-1 cursor-pointer text-r-neutral-foot hover:text-r-blue-default">
                <IconDice
                  className="w-[24px] h-[24px]"
                  onClick={getDiceReferralCode}
                />
              </div>
            }
            ref={inputRef}
          />
          {desc && (
            <div
              className={clsx(
                'text-[13px] my-[12px]',
                isError ? 'text-r-red-default' : 'text-r-green-default'
              )}
            >
              {desc}
            </div>
          )}
          <ol className="mb-[22px] list-outside list-decimal bg-r-neutral-card-3 rounded-[8px] h-[87px] p-[12px] pl-[26px] text-[13px] leading-[20px] text-r-neutral-body">
            <li>
              {t(
                'page.rabbyPoints.referralCode.once-set-this-referral-code-is-permanent-and-cannot-change'
              )}
            </li>
            <li>
              {t(
                'page.rabbyPoints.referralCode.max-15-characters-use-numbers-and-letters-only'
              )}
            </li>
          </ol>

          <Button
            disabled={disabled}
            type="primary"
            className="mt-auto w-full h-[52px] text-[15] font-medium text-r-neutral-title2"
            onClick={submitReferralCode}
          >
            {t('page.rabbyPoints.referralCode.confirm')}
          </Button>
        </div>
      </Popup>
    </div>
  );
};
