import React from 'react';
import MintNFTIcon from 'ui/assets/ecology/dbk-genesis-nft.png';
import { DbkButton } from '../../components/DbkButton';
import { useMintNFT } from '../Bridge/hooks/useDBKNFT';

export const DbkChainMintNFT: React.FC = () => {
  const { mintNFT, totalMinted, userMinted } = useMintNFT();

  return (
    <div className="p-[20px] ">
      <div className="bg-r-neutral-card1 flex flex-col items-center rounded-[8px]">
        <div className="flex flex-col pt-[32px] pb-[35px] items-center text-center">
          <img className="block w-[200px] h-[200px]" src={MintNFTIcon} alt="" />
          <div className="mt-[20px] text-gradient text-[24px] leading-[28.8px] font-[700]">
            DBK Genesis
          </div>
        </div>
        <div className="flex flex-row mt-[20px] justify-center text-center ">
          <div className="w-[164px] h-[64px] flex flex-col">
            <div className="text-r-green-default text-[20px] leading-[24px] font-[700]">
              {totalMinted}
            </div>
            <div className="text-r-neutral-foot text-[13px] mt-[4px]">
              Minted
            </div>
          </div>
          <div className="w-[164px] h-[64px] flex flex-col">
            <div className="text-r-green-default text-[20px] leading-[24px] font-[700]">
              {userMinted}
            </div>
            <div className="text-r-neutral-foot text-[13px] mt-[4px]">
              My Balance
            </div>
          </div>
        </div>
      </div>
      <footer
        className={`absolute bottom-0 left-0 w-full px-[20px] py-[18px] 
          bg-r-neutral-bg1 border-t-[0.5px] border-t-r-neutral-line`}
      >
        <DbkButton
          style={{
            width: '100%',
            height: '44px',
          }}
          onClick={mintNFT}
        >
          Mint
        </DbkButton>
      </footer>
    </div>
  );
};
