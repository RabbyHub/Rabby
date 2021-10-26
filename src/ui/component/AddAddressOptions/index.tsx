import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import Field from '../Field';
import IconArrowRight from 'ui/assets/bookmark.svg';
import IconHighLight from 'ui/assets/walletlogo/highlightstar.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';
import IconAddwatchmodo from 'ui/assets/walletlogo/addwatchmode.svg';
import IconMnemonics from 'ui/assets/walletlogo/mnemonics.svg';
import IconCreatenewaddr from 'ui/assets/walletlogo/createnewaddr.svg';
import IconKeystore from 'ui/assets/walletlogo/keystore.svg';
import IconPrivatekey from 'ui/assets/walletlogo/privatekey.svg';
import { WALLET_BRAND_CONTENT } from 'consts';
const AddAddressOptions = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [savedWallet, setSavedWallet] = useState([]);
  const [savedWalletData, setSavedWalletData] = useState([]);
  const init = async () => {
    const walletSavedList = await wallet.getHighlightWalletList();
    const savedTemp: [] = renderSavedData();
    setSavedWalletData(savedTemp);
    if (walletSavedList.toString() !== savedWallet.toString()) {
      setSavedWallet(walletSavedList);
    }
  };

  useEffect(() => {
    init();
  }, [savedWallet]);
  const connectRouter = (item) => {
    if (item.connectType === 'TrezorConnect') {
      history.push('/import');
    } else if (item.connectType === 'LedgerConnect') {
      history.push('/import/hardware/ledger');
    } else if (item.connectType === 'OneKeyConnect') {
      history.push('/import/hardware/ledger');
    } else {
      history.push({
        pathname: '/import/wallet-connect',
        state: {
          brand: item,
        },
      });
    }
  };
  const brandWallet = Object.values(WALLET_BRAND_CONTENT).map((item) => {
    return {
      leftIcon: item.icon,
      content: t(item.name),
      brand: item.brand,
      connectType: item.connectType,
      image: item.image,
      onClick: () => connectRouter(item),
    };
  });
  const renderData = [
    {
      leftIcon: IconCreatenewaddr,
      content: t('createAddress'),
      onClick: async () => {
        if (await wallet.checkHasMnemonic()) {
          await wallet.deriveNewAccountFromMnemonic();
          message.success({
            icon: <img src={IconSuccess} className="icon icon-success" />,
            content: t('Successfully created'),
          });

          history.push('/dashboard');
        } else {
          history.push('/create-mnemonics');
        }
      },
    },
    {
      leftIcon: IconAddwatchmodo,
      content: t('Add Watch Mode Address'),
      subText: t('Add address without private keys'),
      onClick: () => history.push('/import/watch-address'),
    },
    {
      leftIcon: IconPrivatekey,
      content: t('Import Private Key'),
      onClick: () => history.push('/import/key'),
    },
    {
      leftIcon: IconMnemonics,
      content: t('Import Mnemonic'),
      onClick: () => history.push('/import/mnemonics'),
    },
    {
      leftIcon: IconKeystore,
      content: t('Import Key Store'),
      onClick: () => history.push('/import/json'),
    },
  ];
  const renderSavedData = () => {
    if (savedWallet.length > 0) {
      const result = [] as any;
      savedWallet.map((item) => {
        const savedItem = Object.values(WALLET_BRAND_CONTENT).find(
          (wallet) => wallet.brand.toString() === item
        );
        result.push({
          leftIcon: savedItem!.icon,
          content: t(savedItem!.name),
          brand: savedItem!.brand,
          image: savedItem!.image,
          connectType: savedItem!.connectType,
          onClick: () => connectRouter(savedItem),
        });
      });
      return result;
    }
    return [];
  };
  return (
    <>
      <div className="saved-list">
        {savedWalletData.length > 0 &&
          savedWalletData.map((data: any) => (
            <Field
              key={`saved${data.content}`}
              brand={data.brand}
              leftIcon={
                <img src={data.leftIcon} className="icon wallet-icon" />
              }
              rightIcon={
                <img src={IconHighLight} className="icon icon-arrow-right" />
              }
              showWalletConnect={data.connectType === 'WalletConnect'}
              onClick={data.onClick}
              callback={init}
              unselect
            >
              {data.content}
            </Field>
          ))}
      </div>
      <div className="add-address-options">
        <div className="connect-hint">{t('Connect with')}</div>
        {brandWallet.map((data, index) => (
          <Field
            key={data.content}
            brand={data.brand}
            leftIcon={<img src={data.leftIcon} className="icon wallet-icon" />}
            rightIcon={
              !savedWallet.toString().includes(data.brand) ? (
                <img src={IconArrowRight} className="icon icon-arrow-right" />
              ) : null
            }
            showWalletConnect={data.connectType === 'WalletConnect'}
            onClick={data.onClick}
            callback={init}
          >
            {data.content}
          </Field>
        ))}
        <div className="bg-white border-gray-divider border-t"></div>
        {renderData.map((data) => (
          <Field
            key={data.content}
            leftIcon={<img src={data.leftIcon} className="icon" />}
            rightIcon={null}
            subText={data.subText}
            onClick={data.onClick}
          >
            {data.content}
          </Field>
        ))}
      </div>
    </>
  );
};

export default AddAddressOptions;
