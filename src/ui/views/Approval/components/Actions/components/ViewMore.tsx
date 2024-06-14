import React, { useState } from 'react';
import styled from 'styled-components';
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

type Props =
  | SpenderPopupProps
  | NFTSpenderPopupProps
  | ContractPopupProps
  | ReceiverPopupProps
  | NFTPopupProps
  | CollectionPopupProps;

const PopupContainer = styled.div`
  .title {
    font-size: 15px;
    line-height: 18px;
    display: flex;
    margin-bottom: 17px;
    color: var(--r-neutral-body, #3e495e);

    .value-address {
      color: var(--r-neutral-title-1, #192945);
      font-weight: 500;
      margin-left: 7px;
      display: flex;
      align-items: center;
    }
  }
  .view-more-table {
    border-radius: 8px;
    background: var(--r-neutral-card1, #fff);
    padding: 0px 16px;
    display: flex;
    flex-direction: column;
    font-weight: 400;

    .col {
      display: flex;
      width: 100%;
      justify-content: space-between;
      padding: 12px 0;
    }

    .row {
      &:nth-child(1) {
        color: var(--r-neutral-body, #3e495e);
        font-weight: 400;
        justify-content: flex-start;
        align-items: center;
      }
    }
  }
`;

const ViewMore = (
  props: Props & {
    children?: React.ReactNode;
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

  return (
    <>
      {props.children ? (
        <div className="max-w-full" onClick={handleClickViewMore}>
          {props.children}
        </div>
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
        <PopupContainer>
          {props.type === 'contract' && <ContractPopup data={props.data} />}
          {props.type === 'spender' && <SpenderPopup data={props.data} />}
          {props.type === 'nftSpender' && <NFTSpenderPopup data={props.data} />}
          {props.type === 'receiver' && <ReceiverPopup data={props.data} />}
          {props.type === 'nft' && <NFTPopup data={props.data} />}
          {props.type === 'collection' && <CollectionPopup data={props.data} />}
        </PopupContainer>
      </Popup>
    </>
  );
};

export default ViewMore;
