import React from 'react';
import { TBody, THeadCell, THeader, Table } from './Table';
import { TokenItem, Props as TokenItemProps } from '../TokenItem';
import { Virtuoso } from 'react-virtuoso';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { TokenItem as TokenItemType } from '@/background/service/openapi';
import { useTranslation } from 'react-i18next';

export interface Props {
  list?: TokenItemProps['item'][];
  virtual?: {
    height: number;
    itemSize: number;
  };
  EmptyComponent?: React.ReactNode;
}

type OnSelectToken = (item: TokenItemProps['item']) => void;

// Each row is exactly fixedItemHeight (virtual.itemSize, via
// --token-row-height) tall. TokenItem keeps its own h-[60px] mt-8 inside the
// row; flow-root stops that top margin collapsing out of the row.
const renderVirtualTokenRow = (
  _index: number,
  item: TokenItemProps['item'],
  onSelect: OnSelectToken
) => (
  <div className="flow-root h-(--token-row-height)">
    <TokenItem onClick={() => onSelect(item)} item={item} />
  </div>
);

export const TokenTable: React.FC<Props> = ({
  list,
  virtual,
  EmptyComponent,
}) => {
  const [selected, setSelected] = React.useState<TokenItemProps['item']>();
  const [visible, setVisible] = React.useState(false);
  const [token, setToken] = React.useState<TokenItemType>();
  const { t } = useTranslation();

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

  return (
    <>
      {EmptyComponent && !list?.length ? (
        EmptyComponent
      ) : (
        <Table className="w-full ml-0 mr-0">
          {/* <THeader>
            <THeadCell className="w-[160px]">
              {t('page.dashboard.assets.table.assetAmount')}
            </THeadCell>
            <THeadCell className="w-[90px]">
              {t('page.dashboard.assets.table.price')}
            </THeadCell>
            <THeadCell className="w-[110px] text-right">
              {t('page.dashboard.assets.table.useValue')}
            </THeadCell>
          </THeader> */}
          <TBody className="mt-0">
            {virtual ? (
              <Virtuoso
                style={
                  {
                    height: virtual.height,
                    width: '100%',
                    '--token-row-height': `${virtual.itemSize}px`,
                  } as React.CSSProperties
                }
                data={list}
                context={setSelected}
                fixedItemHeight={virtual.itemSize}
                itemContent={renderVirtualTokenRow}
              />
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
        </Table>
      )}
      <TokenDetailPopup
        variant="add"
        token={token}
        visible={visible}
        onClose={() => setSelected(undefined)}
      />
    </>
  );
};
