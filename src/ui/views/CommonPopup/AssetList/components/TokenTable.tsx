import React from 'react';
import { TBody, THeadCell, THeader, Table } from './Table';
import { TokenItem, Props as TokenItemProps } from '../TokenItem';
import { FixedSizeList } from 'react-window';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { TokenItem as TokenItemType } from '@/background/service/openapi';
import { useWallet } from '@/ui/utils';

export interface Props {
  list?: TokenItemProps['item'][];
  virtual?: {
    height: number;
    itemSize: number;
  };
}

export const TokenTable: React.FC<Props> = ({ list, virtual }) => {
  const [selected, setSelected] = React.useState<TokenItemProps['item']>();
  const [visible, setVisible] = React.useState(false);
  const [token, setToken] = React.useState<TokenItemType>();
  const wallet = useWallet();

  React.useEffect(() => {
    setVisible(!!selected);

    if (selected) {
      setToken({
        ...selected,
        id: selected._tokenId,
      });
    } else {
      setToken(undefined);
    }
  }, [selected]);

  const handleAddToken = React.useCallback(() => {
    if (!token) return;

    if (token?.is_core) {
      wallet.addBlockedToken({
        address: token.id,
        chain: token.chain,
      });
    } else {
      wallet.addCustomizedToken({
        address: token.id,
        chain: token.chain,
      });
    }
  }, [token]);

  const handleRemoveToken = React.useCallback(() => {
    if (!token) return;

    if (token?.is_core) {
      wallet.removeBlockedToken({
        address: token.id,
        chain: token.chain,
      });
    } else {
      wallet.removeCustomizedToken({
        address: token.id,
        chain: token.chain,
      });
    }
  }, [token]);

  return (
    <Table>
      <THeader>
        <THeadCell className="w-1/2">Asset / Amount</THeadCell>
        <THeadCell className="w-1/4">Price</THeadCell>
        <THeadCell className="w-1/4 text-right">USD Value</THeadCell>
      </THeader>
      <TBody className="mt-8">
        {virtual ? (
          <FixedSizeList
            height={virtual.height}
            width="100%"
            itemData={list}
            itemCount={list?.length || 0}
            itemSize={virtual.itemSize}
          >
            {({ data, index, style }) => {
              const item = data[index];
              return (
                <TokenItem
                  onClick={() => setSelected(item)}
                  style={style}
                  key={`${item.chain}-${item.id}`}
                  item={item}
                />
              );
            }}
          </FixedSizeList>
        ) : (
          list?.map((item) => {
            return (
              <TokenItem
                onClick={() => setSelected(item)}
                key={`${item.chain}-${item.id}`}
                item={item}
              />
            );
          })
        )}
      </TBody>
      <TokenDetailPopup
        variant="add"
        token={token}
        visible={visible}
        onClose={() => setSelected(undefined)}
      />
    </Table>
  );
};
