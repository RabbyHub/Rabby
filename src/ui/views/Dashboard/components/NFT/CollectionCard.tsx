import { UserCollection } from '@/background/service/openapi';
import React, { useMemo } from 'react';
import IconArrowDown from 'ui/assets/arrow-down-circle.svg';
import IconArrowLeft from 'ui/assets/arrow-left-circle.svg';
import ChainIcon from './ChainIcon';
import NFTAvatar from './NFTAvatar';
import NFTModal from './NFTModal';
import './style.less';

export interface CollectionCardProps {
  data: UserCollection[];
  index: number;
  style?: React.CSSProperties;
  onChange?: (id: string, v: boolean) => void;
  expaned?: boolean;
}
const CollectionCard = (props: CollectionCardProps) => {
  const { data, index, expaned = false, onChange } = props;
  const { collection, list } = data[index];

  // const renderList = useMemo(() => (expaned ? list : list.slice(0, 5)), [
  //   list,
  //   expaned,
  // ]);

  return (
    <div className={'collection-card'}>
      <div className="collection-card-header">
        <div className="collection-card-title">{collection.name}</div>
        <div className="collection-card-count">({list.length})</div>
        <div className="collection-card-chain">
          {list[0].chain && list[0].chain !== 'eth' && (
            <ChainIcon chain={list[0].chain}></ChainIcon>
          )}
        </div>
        {/* {list.length > 5 && (
          <div
            className="collection-card-extra cursor-pointer"
            onClick={() => {
              onChange && onChange(collection.id, !expaned);
            }}
          >
            {expaned ? (
              <img src={IconArrowDown} alt="" />
            ) : (
              <img src={IconArrowLeft} alt="" />
            )}
          </div>
        )} */}
      </div>
      <div className="collection-card-body">
        {list.map((item) => {
          return (
            <NFTAvatar
              onPreview={() => {
                NFTModal.open({
                  data: item,
                });
              }}
              type={item.content_type}
              amount={item.amount}
              content={item.content}
              chain={item.chain}
              key={item.id}
            ></NFTAvatar>
          );
        })}
      </div>
    </div>
  );
};

export default CollectionCard;
