import { useRabbySelector } from '@/ui/store';
import React from 'react';
import styled from 'styled-components';
import IconArrowdown from '@/ui/assets/arrow-down.svg';
import { Popup } from '@/ui/component';
import { Radio } from 'antd';
import { SIGN_PERMISSION_OPTIONS, SIGN_PERMISSION_TYPES } from '@/constant';

const Container = styled.div`
  display: flex;
  align-items: center;
  box-shadow: 0px -8px 24px 0px rgba(0, 0, 0, 0.1);
  padding: 11px 20px;
`;

const SelectPopup = styled(Popup)`
  .ant-drawer-title {
    text-align: left;
  }
  .ant-radio-group {
    width: 100%;
  }
  .ant-radio-wrapper {
    margin: 0;
  }
  .ant-radio-inner {
    background-color: transparent;
    border-color: #707280;
  }
  .options {
    display: flex;
    flex-direction: column;
    border-radius: 6px;
    background-color: #f2f4f7;

    .option {
      display: flex;
      color: #192945;
      font-size: 15px;
      line-height: 18px;
      font-weight: 500;
      align-items: center;
      padding: 17px 16px;
      cursor: pointer;
      justify-content: space-between;
      position: relative;
      &:not(:last-child)::after {
        position: absolute;
        content: '';
        left: 16px;
        right: 16px;
        bottom: 0;
        height: 1px;
        height: 0.5px;
        background-color: #d3d8e0;
      }
    }
  }
`;

interface SignTestnetPermissionProps {
  value?: SIGN_PERMISSION_TYPES;
  onChange?: (value: SIGN_PERMISSION_TYPES) => void;
}
export const SignTestnetPermission = ({
  value: _value,
  onChange,
}: SignTestnetPermissionProps) => {
  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );

  const value = _value || SIGN_PERMISSION_TYPES.MAINNET_AND_TESTNET;

  const [isShowPopup, setIsShowPopup] = React.useState(false);

  const label = React.useMemo(() => {
    return SIGN_PERMISSION_OPTIONS.find((item) => item.value === value)?.label;
  }, [value]);

  if (!isShowTestnet) {
    return null;
  }

  return (
    <>
      <Container>
        <div className="text-13 text-[#3E495E] leading-[18px]">
          Signing permission
        </div>
        <div
          className="flex items-center ml-auto gap-[2px] font-medium text-15 leading-[18px] text-gray-title cursor-pointer"
          onClick={() => {
            setIsShowPopup(true);
          }}
        >
          {label}
          <img src={IconArrowdown} alt="" />
        </div>
      </Container>
      <SelectPopup
        title="Signing Permission"
        visible={isShowPopup}
        onCancel={() => {
          setIsShowPopup(false);
        }}
        closable={true}
        height={208}
      >
        <Radio.Group
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            setIsShowPopup(false);
          }}
        >
          <div className="options">
            {SIGN_PERMISSION_OPTIONS.map((item) => {
              return (
                <label className="option" key={item.value}>
                  <div>{item.label}</div>
                  <Radio value={item.value}></Radio>
                </label>
              );
            })}
          </div>
        </Radio.Group>
      </SelectPopup>
    </>
  );
};
