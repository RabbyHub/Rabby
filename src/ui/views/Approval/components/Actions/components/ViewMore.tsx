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
    font-size: 16px;
    line-height: 19px;
    color: var(--r-neutral-title-1, #192945);
    display: flex;
    margin-bottom: 14px;
    .value-address {
      font-weight: 500;
      margin-left: 7px;
    }
  }
  .view-more-table {
    .row {
      min-height: 48px;
      display: flex;
      align-items: center;
      font-size: 15px;

      &:nth-child(1) {
        max-width: 140px;
        border-right: 0.5px solid var(--r-neutral-line);
        flex-shrink: 0;
      }
    }
  }
`;

const ViewMore = (props: Props) => {
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
      <span className="underline cursor-pointer" onClick={handleClickViewMore}>
        {t('page.approvals.component.ViewMore.text')}
      </span>
      <Popup
        visible={popupVisible}
        closable
        onClose={() => setPopupVisible(false)}
        height={height}
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
