import { useRabbySelector, useRabbyDispatch } from '@/ui/store';
import { CHAINS_ENUM, CHAINS } from '@debank/common';
import { DEX_ENUM, DEX_SUPPORT_CHAINS } from '@rabby-wallet/rabby-swap';
import { Button, Drawer } from 'antd';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useCss } from 'react-use';
import styled from 'styled-components';
import { ReactComponent as IconClose } from 'ui/assets/swap/modal-close.svg';
import ImageOx from 'ui/assets/swap/0xswap.png';
import ImageOpenOcean from 'ui/assets/swap/openocean.png';
import ImagePara from 'ui/assets/swap/paraswap.png';
import { Checkbox } from '@/ui/component';

interface DexSelectDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const DexSelectDrawer = (props: DexSelectDrawerProps) => {
  const history = useHistory();
  const { visible, onClose } = props;
  const drawClassName = useCss({
    '& .ant-drawer-content': {
      boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
      borderRadius: '16px 16px 0px 0',
    },
  });

  const dexId = useRabbySelector((state) => state.swap.selectedDex);
  const dispatch = useRabbyDispatch();

  const [checkedId, setCheckedId] = useState(() => dexId || '');

  const close = () => {
    if (!dexId) {
      return history.replace('/');
    }
    onClose();
  };

  const handleDexId = async () => {
    if (!checkedId) return;
    await dispatch.swap.setSwapDexId(checkedId as DEX_ENUM);
    onClose();
  };

  return (
    <Drawer
      maskClosable={false}
      closable={false}
      placement="bottom"
      height="540"
      visible={visible}
      // onClose={close}
      destroyOnClose
      className={drawClassName}
      bodyStyle={{
        padding: '20px 0',
        overflow: 'hidden',
      }}
      push={false}
    >
      <div className="absolute top-20 left-0 w-full bg-white">
        <div className="text-20 font-medium text-center text-gray-title">
          Swap tokens on different DEXes
        </div>
        <div className="absolute top-1/2 -translate-y-1/2  right-[20px]">
          <IconClose
            className="cursor-pointer w-16 h-16"
            viewBox="0 0 20 20"
            onClick={close}
          />
        </div>
      </div>
      <div
        className="flex flex-col gap-[12px] items-center"
        style={{
          marginTop: 43,
        }}
      >
        {Object.entries(DEX).map(([id, { name, chains, logo }]) => {
          return (
            <DexItem
              key={id}
              checked={checkedId === id}
              imgSrc={logo}
              name={name}
              onChecked={(bool) => {
                setCheckedId((oId) => {
                  if (bool) {
                    return id;
                  }
                  if (oId === id) {
                    return '';
                  }
                  return oId;
                });
              }}
              chainList={chains}
            />
          );
        })}
      </div>
      <div className="flex flex-col items-center">
        {checkedId ? (
          <span className="py-18 text-13 font-medium text-gray-title">
            The quotes and order will be directly provided by {checkedId}
          </span>
        ) : (
          <span className="py-18 text-13  text-gray-subTitle">
            Select the DEX you're looking for or switch it at any time
          </span>
        )}

        <ButtonWrapper
          type="primary"
          className="w-[360px] h-[52px] "
          onClick={handleDexId}
          disabled={!checkedId}
        >
          Confirm
        </ButtonWrapper>
      </div>
    </Drawer>
  );
};

export const DEX = {
  // [DEX_ENUM.ONEINCH]: {
  //   logo: Image1inch,
  //   name: '1inch',
  //   chains: DEX_SUPPORT_CHAINS[DEX_ENUM.ONEINCH],
  // },

  [DEX_ENUM.ZEROXAPI]: {
    logo: ImageOx,
    name: '0x',
    chains: DEX_SUPPORT_CHAINS[DEX_ENUM.ZEROXAPI],
  },
  [DEX_ENUM.OPENOCEAN]: {
    logo: ImageOpenOcean,
    name: 'OpenOcean',
    chains: DEX_SUPPORT_CHAINS[DEX_ENUM.OPENOCEAN],
  },
  [DEX_ENUM.PARASWAP]: {
    logo: ImagePara,
    name: 'ParaSwap',
    chains: DEX_SUPPORT_CHAINS[DEX_ENUM.PARASWAP],
  },
};

const ButtonWrapper = styled(Button)`
  &.ant-btn-primary[disabled] {
    background-color: #b6c1ff;
    box-shadow: 0px 12px 24px rgba(134, 151, 255, 0.12);
    border-color: rgba(134, 151, 255, 0.12);
    cursor: not-allowed;
  }
`;

const DexItemBox = styled.div`
  width: 360px;
  background: #f5f6fa;
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 16px;
  cursor: pointer;
  &:hover {
    background: rgba(134, 151, 255, 0.2);
    border: 1px solid #8697ff;

    .dex {
      border-bottom-color: rgba(229, 233, 239, 0.7);
    }
  }
  .dex {
    padding-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e5e9ef;
  }

  .chain {
    display: flex;
    align-items: center;
    margin-top: 11px;

    .chain-tips {
      font-weight: 400;
      font-size: 12px;
      line-height: 14px;
      color: #707280;
    }

    .chain-logo {
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 6px;
      flex: 1;
    }
  }
`;
interface DexItemProps {
  imgSrc: string;
  name: string;
  checked?: boolean;
  onChecked: (check: boolean) => void;
  chainList: CHAINS_ENUM[];
}
const DexItem = (props: DexItemProps) => {
  const { imgSrc, name, onChecked, chainList, checked = false } = props;

  return (
    <DexItemBox
      onClick={() => {
        onChecked(!checked);
      }}
    >
      <div className="dex">
        <div className="flex items-center">
          <img className="w-[32px] h-[32px] rounded-full mr-8" src={imgSrc} />
          <span className="text-15 text-gray-title font-medium">{name}</span>
        </div>
        <Checkbox
          width="20px"
          height="20px"
          unCheckBackground={'#B4BDCC'}
          checked={checked}
          onChange={onChecked}
        />
      </div>
      <div className="chain">
        <span className="chain-tips">Support Chains: </span>
        <div className="chain-logo">
          {chainList.map((e) => {
            const chainInfo = CHAINS[e];
            return (
              <img
                key={chainInfo.name}
                src={chainInfo.logo}
                alt={chainInfo.name}
                className="w-[14px] h-[14px] rounded-full"
              />
            );
          })}
        </div>
      </div>
    </DexItemBox>
  );
};
