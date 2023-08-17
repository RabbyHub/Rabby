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
        <Table>
          <THeader>
            <THeadCell className="w-[160px]">
              {t('page.dashboard.assets.table.assetAmount')}
            </THeadCell>
            <THeadCell className="w-[90px]">
              {t('page.dashboard.assets.table.price')}
            </THeadCell>
            <THeadCell className="w-[110px] text-right">
              {t('page.dashboard.assets.table.useValue')}
            </THeadCell>
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
