import React from 'react';
import { DbkButton } from '../../components/DbkButton';
import bridgeImg from '@/ui/assets/ecology/bridge-img.svg';
import dkbNftImg from '@/ui/assets/ecology/dbk-nft.png';
import { useHistory, useRouteMatch } from 'react-router-dom';

export const DbkChainHome = () => {
  const history = useHistory();
  const { url } = useRouteMatch();

  return (
    <div className="px-[20px] py-[40px] flex flex-col gap-[20px]">
      <div
        className="rounded-[8px] bg-r-neutral-card1 p-[24px] relative"
        style={{ boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.08)' }}
      >
        <div className="text-r-neutral-title1 font-semibold text-[20px] leading-[24px] mb-[8px]">
          Bridge To DBK Chain
        </div>
        <div className="text-r-neutral-foot text-[13px] leading-[16px] mb-[28px]">
          Powered by OP Superchain
        </div>
        <DbkButton
          className="w-[100px]"
          onClick={() => {
            history.push(`${url}/bridge`);
          }}
        >
          Bridge
        </DbkButton>

        <img
          src={bridgeImg}
          alt=""
          className="absolute bottom-[12px] right-[12px]"
        />
      </div>
      <div
        className="rounded-[8px] bg-r-neutral-card1 p-[24px] relative"
        style={{ boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.08)' }}
      >
        <div className="text-r-neutral-title1 font-semibold text-[20px] leading-[24px] mb-[8px]">
          Mint DBK Genesis NFT
        </div>
        <div className="text-r-neutral-foot text-[13px] leading-[16px] mb-[28px]">
          Be a witness of DBK Chain
        </div>
        <DbkButton
          className="w-[100px]"
          onClick={() => {
            history.push(`${url}/mintNft`);
          }}
        >
          Mint
        </DbkButton>

        <img
          src={dkbNftImg}
          alt=""
          className="absolute bottom-[12px] right-[12px]"
        />
      </div>
    </div>
  );
};
