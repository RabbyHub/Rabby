import { useRabbySelector } from '@/ui/store';
import React from 'react';
import styled from 'styled-components';
import IconArrowdown from '@/ui/assets/arrow-down.svg';
import { Popup } from '@/ui/component';
import { Radio } from 'antd';

const Container = styled.div`
  display: flex;
  align-items: center;
  box-shadow: 0px -8px 24px 0px rgba(0, 0, 0, 0.1);
  padding: 11px 20px;
`;
export const SignTestnetPermission = () => {
  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );

  const [isShowPopup, setIsShowPopup] = React.useState(false);

  if (!isShowTestnet) {
    return null;
  }

  return (
    <>
      <Container>
        <div className="text-13 text-[#3E495E]">Signing permission</div>
        <div
          className="flex items-center ml-auto gap-[2px] font-medium text-15 text-gray-title cursor-pointer"
          onClick={() => {
            setIsShowPopup(true);
          }}
        >
          Only Testnets
          <img src={IconArrowdown} alt="" />
        </div>
      </Container>
      <Popup
        title="Signing Permission"
        visible={isShowPopup}
        onCancel={() => {
          setIsShowPopup(false);
        }}
        height={204}
      >
        <Radio.Group>
          <Radio value={1}>a</Radio>
          <Radio value={2}>b</Radio>
        </Radio.Group>
      </Popup>
    </>
  );
};
