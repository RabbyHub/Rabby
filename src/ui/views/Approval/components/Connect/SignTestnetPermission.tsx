import { useRabbySelector } from '@/ui/store';
import React from 'react';
import styled from 'styled-components';
import IconArrowdown from '@/ui/assets/arrow-down.svg';
import { Popup } from '@/ui/component';
import { Radio } from 'antd';
import { SIGN_PERMISSION_OPTIONS, SIGN_PERMISSION_TYPES } from '@/constant';
import { useTranslation } from 'react-i18next';

const Container = styled.div`
  display: flex;
  align-items: center;
  box-shadow: 0px -8px 24px 0px rgba(0, 0, 0, 0.1);
  background: var(--r-neutral-card-1, #fff);
  padding: 11px 20px;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
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
    background-color: var(--r-neutral-card2);

    .option {
      display: flex;
      color: var(--r-neutral-title1);
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
        background-color: var(--r-neutral-line);
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
  const { t } = useTranslation();
  const options = SIGN_PERMISSION_OPTIONS.map((item) => {
    return {
      ...item,
      label: t(`constant.SIGN_PERMISSION_OPTIONS.${item.value}` as const),
    };
  });
  const label = React.useMemo(() => {
    return options.find((item) => item.value === value)?.label;
  }, [value]);

  if (!isShowTestnet) {
    return null;
  }

  return (
    <>
      <Container>
        <div className="text-13 text-r-neutral-body leading-[18px]">
          {t('page.connect.SignTestnetPermission.title')}
        </div>
        <div
          className="flex items-center ml-auto gap-[2px] font-medium text-15 leading-[18px] text-r-neutral-title1 cursor-pointer"
          onClick={() => {
            setIsShowPopup(true);
          }}
        >
          {label}
          <img src={IconArrowdown} alt="" />
        </div>
      </Container>
      <SelectPopup
        title={t('page.connect.SignTestnetPermission.title')}
        visible={isShowPopup}
        onCancel={() => {
          setIsShowPopup(false);
        }}
        closable={true}
        height={208}
        isSupportDarkMode
      >
        <Radio.Group
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            setIsShowPopup(false);
          }}
        >
          <div className="options">
            {options.map((item) => {
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
