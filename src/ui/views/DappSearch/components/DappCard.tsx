import FallbackImage from '@/ui/component/FallbackSiteLogo';
import { openInTab } from '@/ui/utils';
import { BasicDappInfo } from '@rabby-wallet/rabby-api/dist/types';
import { Divider } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconArrow } from 'ui/assets/dapp-search/cc-arrow.svg';
import { ReactComponent as RcIconStarFill } from 'ui/assets/dapp-search/cc-star-fill.svg';
import { ReactComponent as RcIconStar } from 'ui/assets/dapp-search/cc-star.svg';

const Wraper = styled.div`
  border: 1px solid transparent;
  &:hover {
    border: 1px solid var(--r-blue-default, #7084ff);
    box-shadow: 0px 4px 4px 0px rgba(112, 132, 255, 0.12);
  }
`;

export const DappCard = ({
  data,
  isFavorite,
  onFavoriteChange,
}: {
  data: BasicDappInfo;
  isFavorite?: boolean;
  onFavoriteChange?: (v: boolean, info: BasicDappInfo) => void;
}) => {
  const [ellispsis, setEllipsis] = React.useState<boolean>(true);
  const { t } = useTranslation();

  return (
    <Wraper
      className={clsx(
        'p-[16px] bg-r-neutral-card1 cursor-pointer rounded-[8px]'
      )}
      onClick={() => {
        openInTab(`https://${data.id}`, false);
      }}
    >
      <div className="flex items-center pb-[4px]">
        <div className="flex items-center gap-[12px]">
          <FallbackImage
            url={data.logo_url || ''}
            origin={`https://${data.id}`}
            className="rounded-full flex-shrink-0"
            width="32px"
          />
          <div className="min-w-0">
            <div className="text-r-neutral-title1 font-medium text-[16px] leading-[19px] mb-[2px]">
              {data.id}
            </div>
            <div className="text-r-neutral-foot text-[13px] leading-[16px]">
              {data.name}
              <Divider type="vertical" />
              {data.user_range}
            </div>
          </div>
        </div>
        <div
          className="ml-auto p-[6px] mr-[-6px] cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteChange?.(!isFavorite, data);
          }}
        >
          {isFavorite ? (
            <span className="text-r-blue-default">
              <RcIconStarFill />
            </span>
          ) : (
            <span className="text-r-neutral-foot">
              <RcIconStar />
            </span>
          )}
        </div>
      </div>
      {data?.description ? (
        <div className="relative p-[8px] bg-r-neutral-card3 mt-[10px] rounded-[4px]">
          <div className="text-r-neutral-card3 absolute top-[-11px] left-[8px]">
            <RcIconArrow />
          </div>
          <Paragraph
            className="mb-0 text-r-neutral-body text-[14px] leading-[20px]"
            ellipsis={
              ellispsis
                ? {
                    rows: 1,
                    expandable: true,
                    symbol: (
                      <span
                        className="text-r-blue-default cursor-pointer underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEllipsis(false);
                        }}
                      >
                        {t('page.dappSearch.expand')}
                      </span>
                    ),
                  }
                : false
            }
          >
            {data.description}
          </Paragraph>
        </div>
      ) : null}
    </Wraper>
  );
};
