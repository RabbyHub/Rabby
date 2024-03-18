import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomTestnetTokenDetailPopup } from '../CustomTestnetTokenDetailPopup';
import {
  CustomTestnetTokenItem,
  Props as TokenItemProps,
} from '../CustomTestnetAssetList/CustomTestnetTokenItem';
import { TBody, THeadCell, THeader, Table } from './Table';

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
            {virtual ? (
              <>
                {
                  // <FixedSizeList
                  //   height={virtual.height}
                  //   width="100%"
                  //   itemData={list}
                  //   itemCount={list?.length || 0}
                  //   itemSize={virtual.itemSize}
                  // >
                  //   {({ data, index, style }) => {
                  //     const item = data[index];
                  //     return (
                  //       <TokenItem
                  //         onClick={() => setSelected(item)}
                  //         style={style}
                  //         key={`${item.chain}-${item.id}`}
                  //         item={item}
                  //       />
                  //     );
                  //   }}
                  // </FixedSizeList>
                }
              </>
            ) : (
              list?.map((item) => {
                return (
                  <CustomTestnetTokenItem
                    onClick={() => setSelected(item)}
                    key={`${item.chainId}-${item.id}`}
                    item={item}
                  />
                );
              })
            )}
          </TBody>
        </Table>
      )}
      <CustomTestnetTokenDetailPopup
        token={token}
        isAdded={
          !!list?.find(
            (item) => item.id === token?.id && item.chainId === token?.chainId
          )
        }
        onAdd={onAdd}
        onRemove={onRemove}
        visible={visible}
        onClose={() => setSelected(undefined)}
      />
    </>
  );
};
