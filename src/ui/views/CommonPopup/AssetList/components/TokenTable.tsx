import React from 'react';
import { TBody, THeadCell, THeader, Table } from './Table';
import { TokenItem, Props as TokenItemProps } from '../TokenItem';
import { FixedSizeList } from 'react-window';
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

type TokenTableRowData = {
  list: TokenItemProps['item'][];
  onSelect: (item: TokenItemProps['item']) => void;
};

// NOTE: keep this row renderer's reference stable and pass per-render data via
// `itemData`. `react-window` renders each row through `createElement(children)`,
// so an inline/changing renderer is treated as a new component type and remounts
// the whole row subtree on every render — which resets any hovered tooltip
// inside `TokenItem` (the arrow tooltip would flash and vanish).
const TokenTableRow = ({
  index,
  data,
  style,
}: {
  index: number;
  data: TokenTableRowData;
  style: React.CSSProperties;
}) => {
  const item = data.list[index];
  return (
    <TokenItem onClick={() => data.onSelect(item)} style={style} item={item} />
  );
};

export const TokenTable: React.FC<Props> = ({
  list,
  virtual,
  EmptyComponent,
}) => {
  const [selected, setSelected] = React.useState<TokenItemProps['item']>();
  const [visible, setVisible] = React.useState(false);
  const [token, setToken] = React.useState<TokenItemType>();
  const { t } = useTranslation();

  const itemData = React.useMemo<TokenTableRowData>(
    () => ({ list: list || [], onSelect: setSelected }),
    [list]
  );

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
              <FixedSizeList
                height={virtual.height}
                width="100%"
                itemData={itemData}
                itemCount={list?.length || 0}
                itemSize={virtual.itemSize}
              >
                {TokenTableRow}
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
