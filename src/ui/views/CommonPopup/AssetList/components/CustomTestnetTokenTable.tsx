import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomTestnetTokenDetailPopup } from '../CustomTestnetTokenDetailPopup';
import {
  CustomTestnetTokenItem,
  Props as TokenItemProps,
} from '../CustomTestnetAssetList/CustomTestnetTokenItem';
import { TBody, THeadCell, THeader, Table } from './Table';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';

export interface Props {
  list?: TokenItemProps['item'][];
  onAdd?: (item: TokenItemProps['item']) => void;
  onRemove?: (item: TokenItemProps['item']) => void;
  virtual?: {
    height: number;
    itemSize: number;
  };
  EmptyComponent?: React.ReactNode;
}

export const CustomTestnetTokenTable: React.FC<Props> = ({
  list,
  virtual,
  EmptyComponent,
  onAdd,
  onRemove,
}) => {
  const [selected, setSelected] = React.useState<TokenItemProps['item']>();
  const [visible, setVisible] = React.useState(false);
  const [token, setToken] = React.useState<TokenItemProps['item']>();
  const { t } = useTranslation();
  const wallet = useWallet();

  React.useEffect(() => {
    setVisible(!!selected);

    if (selected) {
      setToken({
        ...selected,
      });
    } else {
      setToken(undefined);
    }
  }, [selected]);

  return (
    <>
      {EmptyComponent && !list?.length ? (
        EmptyComponent
      ) : (
        <Table>
          <THeader>
            <THeadCell className="w-[160px]">ASSET</THeadCell>
            <THeadCell className="ml-auto text-right">Amount</THeadCell>
          </THeader>
          <TBody className="mt-8">
            {list?.map((item) => {
              return (
                <CustomTestnetTokenItem
                  onClick={() => setSelected(item)}
                  key={`${item.chainId}-${item.id}`}
                  item={item}
                />
              );
            })}
          </TBody>
        </Table>
      )}
      <CustomTestnetTokenDetailPopup
        token={token}
        onAdd={(item) => {
          onAdd?.(item);
        }}
        onRemove={(item) => {
          onRemove?.(item);
        }}
        visible={visible}
        onClose={() => setSelected(undefined)}
      />
    </>
  );
};
