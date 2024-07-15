import React from 'react';
import MintNFTIcon from 'ui/assets/ecology/dbk-genesis-nft.png';
import { DbkButton } from '../../components/DbkButton';
import { useMintNFT } from './hooks/useDBKNFT';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { useTranslation } from 'react-i18next';
export const DbkChainMintNFT: React.FC = () => {
  const { mintNFT, totalMinted, userMinted } = useMintNFT();
  const { t } = useTranslation();

  return (
    <div className="p-[20px] " style={{ fontFamily: "'Lato', sans-serif" }}>
      <div className="bg-r-neutral-card1 flex flex-col items-center rounded-[8px]">
        <div className="flex flex-col pt-[32px] pb-[30px] items-center text-center">
          <img className="block w-[200px] h-[200px]" src={MintNFTIcon} alt="" />
          <div className="mt-[20px] text-gradient text-[24px] leading-[28.8px] font-bold">
            {t('page.ecology.dbk.minNFT.title')}
          </div>
        </div>
        <div
          className="flex flex-row justify-center text-center "
          style={{
            fontFamily: "'SF Pro', sans-serif",
          }}
        >
          <div className="w-[164px] h-[89px] flex flex-col">
            <div
              className="text-r-green-default text-[20px] leading-[24px] font-bold"
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              {numberWithCommasIsLtOne(totalMinted, 0)}
            </div>
            <div className="text-r-neutral-foot text-[13px] mt-[4px]">
              {t('page.ecology.dbk.minNFT.minted')}
            </div>
          </div>
          <div className="w-[164px] h-[89px] flex flex-col">
            <div
              className="text-r-green-default text-[20px] leading-[24px] font-bold"
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              {numberWithCommasIsLtOne(userMinted, 0)}
            </div>
            <div className="text-r-neutral-foot text-[13px] mt-[4px]">
              {t('page.ecology.dbk.minNFT.myBalance')}
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
          {t('page.ecology.dbk.minNFT.mintBtn')}
        </DbkButton>
      </footer>
    </div>
  );
};
