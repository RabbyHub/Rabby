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
import {
  NFTSpenderPopup,
  NFTSpenderPopupProps,
} from './ViewMorePopup/NFTSpenderPopup';
import { NFTPopupProps, NFTPopup } from './ViewMorePopup/NFTPopup';
import {
  CollectionPopup,
  CollectionPopupProps,
} from './ViewMorePopup/CollectionPopup';

type Props =
  | SpenderPopupProps
  | ContractPopupProps
  | ReceiverPopupProps
  | NFTSpenderPopupProps
  | NFTPopupProps
  | CollectionPopupProps;

const PopupContainer = styled.div`
  .title {
    font-size: 16px;
    line-height: 19px;
    color: #333333;
    display: flex;
    margin-bottom: 14px;
    .value-address {
      font-weight: 500;
      margin-left: 7px;
    }
  }
  .view-more-table {
    .row {
      &:nth-child(1) {
        max-width: 140px;
        border-right: 1px solid #ededed;
        flex-shrink: 0;
      }
    }
  }
`;

const ViewMore = (props: Props) => {
  const [popupVisible, setPopupVisible] = useState(false);

  const handleClickViewMore = () => {
    setPopupVisible(true);
  };

  const height = React.useMemo(() => {
    switch (props.type) {
      case 'contract':
        return 304;
      case 'spender':
      case 'nftSpender':
        return 480;
      case 'receiver':
        return 400;
      case 'nft':
        return 220;
      case 'collection':
        return 150;
      default:
        return 400;
    }
  }, [props.type]);

  return (
    <>
      <span className="underline cursor-pointer" onClick={handleClickViewMore}>
        View more
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
          {props.type === 'receiver' && <ReceiverPopup data={props.data} />}
          {props.type === 'nftSpender' && <NFTSpenderPopup data={props.data} />}
          {props.type === 'nft' && <NFTPopup data={props.data} />}
          {props.type === 'collection' && <CollectionPopup data={props.data} />}
        </PopupContainer>
      </Popup>
    </>
  );
};

export default ViewMore;
