import { WALLET_BRAND_CATEGORY } from '@/constant';
import React from 'react';
import { useHistory } from 'react-router-dom';
import IconBack from 'ui/assets/icon-back.svg';
import IconCoboArgus from 'ui/assets/walletlogo/CoboArgus.svg';

export const Header: React.FC<{
  hasBack?: boolean;
}> = ({ children, hasBack = true }) => {
  const history = useHistory();

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
      sessionStorage.setItem(
        'SELECTED_WALLET_TYPE',
        WALLET_BRAND_CATEGORY.INSTITUTIONAL
      );
    } else {
      history.replace('/');
    }
  };
  return (
    <div className="create-new-header create-password-header h-[180px] py-[20px] dark:bg-r-blue-disable">
      {hasBack ? (
        <img
          src={IconBack}
          className="icon-back mb-0 relative z-10"
          onClick={handleClickBack}
        />
      ) : (
        <div className="h-24" />
      )}
      <div className="relative w-[60px] h-[60px] mb-16 mx-auto mt-[-4px]">
        <img className="unlock-logo w-full h-full" src={IconCoboArgus} />
      </div>
      <p className="text-[17px] leading-none mb-8 mt-0 text-white text-center font-medium">
        {children}
      </p>
    </div>
  );
};
