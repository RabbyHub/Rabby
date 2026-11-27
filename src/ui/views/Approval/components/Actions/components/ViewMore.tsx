import React, { useState } from 'react';
import { Popup } from 'ui/component';
import { SpenderPopup, SpenderPopupProps } from './ViewMorePopup/SpenderPopup';
import {
  ContractPopup,
  ContractPopupProps,
} from './ViewMorePopup/ContractPopup';
import {
  ReceiverPopup,
  ReceiverPopupProps,
} from './ViewMorePopup/ReceiverPopup';
import { NFTPopupProps, NFTPopup } from './ViewMorePopup/NFTPopup';
import {
  CollectionPopup,
  CollectionPopupProps,
} from './ViewMorePopup/CollectionPopup';
import {
  NFTSpenderPopup,
  NFTSpenderPopupProps,
} from './ViewMorePopup/NFTSpenderPopup';
import { useTranslation } from 'react-i18next';
import styles from './ViewMore.module.css';

type Props =
  | SpenderPopupProps
  | NFTSpenderPopupProps
  | ContractPopupProps
  | ReceiverPopupProps
  | NFTPopupProps
  | CollectionPopupProps;

const ViewMore = (
  props: Props & {
    children?: React.ReactNode;
    inline?: boolean;
    title?: React.ReactNode;
  }
) => {
  const [popupVisible, setPopupVisible] = useState(false);
  const { t } = useTranslation();

  const handleClickViewMore = () => {
    setPopupVisible(true);
  };

  const height = React.useMemo(() => {
    switch (props.type) {
      case 'contract':
        return 380;
      case 'spender':
      case 'nftSpender':
        return 475;
      case 'receiver':
        return 400;
      case 'nft':
        return 230;
      case 'collection':
        return 180;
      default:
        return 400;
    }
  }, [props.type]);

  const Trigger = props.inline ? 'span' : 'div';

  return (
    <>
      {props.children ? (
        <Trigger className="max-w-full" onClick={handleClickViewMore}>
          {props.children}
        </Trigger>
      ) : (
        <span
          className="underline cursor-pointer"
          onClick={handleClickViewMore}
        >
          {t('page.approvals.component.ViewMore.text')}
        </span>
      )}
      <Popup
        isNew
        visible={popupVisible}
        closable
        onClose={() => setPopupVisible(false)}
        contentWrapperStyle={{
          maxHeight: `${height}px`,
          height: 'auto',
        }}
      >
        <div className={styles.popupContainer}>
          {props.type === 'contract' && <ContractPopup data={props.data} />}
          {props.type === 'spender' && (
            <SpenderPopup data={props.data} title={props.title} />
          )}
          {props.type === 'nftSpender' && <NFTSpenderPopup data={props.data} />}
          {props.type === 'receiver' && <ReceiverPopup data={props.data} />}
          {props.type === 'nft' && <NFTPopup data={props.data} />}
          {props.type === 'collection' && <CollectionPopup data={props.data} />}
        </div>
      </Popup>
    </>
  );
};

export default ViewMore;
