import { Popup } from '@/ui/component';
import { Button, Input } from 'antd';
import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ReactComponent as IconDice } from 'ui/assets/rabby-points/dice-cc.svg';

const StyledInput = styled(Input)`
  border-radius: 8px;
  border: 1px solid var(--r-neutral-line, #d3d8e0);
  height: 52px;
  font-size: 14px;
  font-weight: 510;
  text-align: left;
`;

export const SetReferralCode = () => {
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');

  const isValidCode = useMemo(() => false, [input]);
  const [desc, isError] = useMemo(() => {
    if (!input) {
      return ['Referral code cannot be empty', true];
    }
    if (isValidCode) {
      return ['Referral code available', false];
    }
    return ['Referral code already exists', true];
  }, [input, isValidCode]);

  const disabled = useMemo(() => {
    return !input || isError;
  }, [input, isError]);

  const openPopup = React.useCallback(() => {
    setVisible(true);
  }, []);

  const closePopup = React.useCallback(() => {
    setVisible(false);
  }, []);

  const inputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const getCode = () => {
    //TODO
    closePopup();
  };

  return (
    <div className="bg-r-blue-light1 rounded-[8px] px-[16px] py-[12px] flex items-center justify-between">
      <div className="flex flex-col gap-[4px] text-r-blue-default">
        <span className="text-[15px] font-medium">My referral code</span>
        <span className="text-[12px]">推荐一个新用户可获得50积分</span>
      </div>
      <Button
        type="primary"
        className="w-[130px] h-[34px] text-r-neutral-title2 text-[15] font-medium"
        onClick={openPopup}
      >
        Set my code
      </Button>
      <Popup
        visible={visible}
        onCancel={closePopup}
        title="Set my referral code"
        height={336}
        isSupportDarkMode
      >
        <StyledInput
          bordered
          autoFocus
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
            <div className="group w-[32px] h-[32px] flex items-center justify-center bg-transparent hover:bg-r-blue-light-1 cursor-pointer text-r-neutral-foot hover:text-r-blue-default">
              <IconDice className="w-[24px] h-[24px]" onClick={getCode} />
            </div>
          }
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
        <ol className="list-inside list-decimal bg-r-neutral-card-3 rounded-[8px] h-[87px] p-[12px] text-[13px] leading-[20px] text-r-neutral-body">
          <li>Once set, this referral code is permanent and cannot change</li>
          <li>Max 15 characters, use numbers and letters only.</li>
        </ol>

        <Button
          disabled={disabled}
          type="primary"
          className="mt-[22px] w-full h-[52px] text-[15] font-medium text-r-neutral-title2"
        >
          Confirm
        </Button>
      </Popup>
    </div>
  );
};
