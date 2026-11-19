import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ArrowSVG } from '@/ui/assets/arrow-cc.svg';
import { Dropdown, Menu, Skeleton } from 'antd';
import { ReactComponent as GasLevelCustomSVG } from '@/ui/assets/sign/gas-level-custom.svg';
import { ReactComponent as GasLevelFastSVG } from '@/ui/assets/sign/gas-level-fast.svg';
import { ReactComponent as GasLevelNormalSVG } from '@/ui/assets/sign/gas-level-normal.svg';
import { ReactComponent as GasLevelInstantSVG } from '@/ui/assets/sign/gas-level-instant.svg';
import { ReactComponent as CheckSVG } from '@/ui/assets/sign/check.svg';
import BigNumber from 'bignumber.js';
import { Divide } from '../Divide';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import clsx from 'clsx';
import { ReactComponent as IconArrowDownCC } from 'ui/assets/swap/arrow-down-cc.svg';
import IconUnknown from '@/ui/assets/token-default.svg';
import type { GasTokenInfo } from '@/utils/transaction';
import { cn } from '@/ui/utils/cn';
import styles from './GasMenuButton.module.css';

export const MenuButtonStyled = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center rounded-[100px] py-4 px-8 text-[14px] leading-[16px]',
      'text-r-neutral-body font-medium border border-solid border-r-neutral-line',
      'cursor-pointer hover:border-r-blue-default hover:bg-r-blue-light1',
      className
    )}
    {...rest}
  />
));

interface Props {
  gasList: GasLevel[];
  selectedGas: GasLevel | null;
  onSelect: (gas: GasLevel) => void;
  onCustom: () => void;
  showCustomGasPrice: boolean;
  showTempoGasTokenSelector?: boolean;
  onOpenTempoGasToken?: () => void;
  tempoGasToken?: GasTokenInfo;
}

export const GasLevelIcon: React.FC<{
  level: string;
  isActive;
  overWriteClass?: string;
}> = ({ level, isActive, overWriteClass }) => {
  const GasLevelSVG =
    level === 'slow'
      ? GasLevelNormalSVG
      : level === 'normal'
      ? GasLevelFastSVG
      : level === 'fast'
      ? GasLevelInstantSVG
      : GasLevelCustomSVG;
  return (
    <div>
      <GasLevelSVG
        className={clsx(
          overWriteClass
            ? overWriteClass
            : {
                'text-r-neutral-body': !isActive,
                'text-r-blue-default': isActive,
              }
        )}
      />
    </div>
  );
};

export const GasMenuButton: React.FC<Props> = ({
  gasList,
  selectedGas,
  onSelect,
  onCustom,
  showCustomGasPrice,
  showTempoGasTokenSelector = false,
  onOpenTempoGasToken,
  tempoGasToken,
}) => {
  const { t } = useTranslation();
  const orderedGasList = [...gasList].reverse();
  const customGasInfo = gasList.find((g) => g.level === 'custom')!;

  return (
    <Dropdown
      placement="topCenter"
      trigger={['click']}
      overlay={
        <Menu className={styles.menu}>
          <Menu.ItemGroup
            title={
              <div className="pt-8 px-20 pb-12 text-r-neutral-title1 text-center text-13 not-italic font-semibold relative whitespace-nowrap">
                <div>{t('page.sign.transactionSpeed')}</div>
                <Divide className="absolute left-16 right-16 w-auto bottom-4" />
              </div>
            }
          >
            {showTempoGasTokenSelector ? (
              <>
                <Menu.Item
                  className={cn(styles.menuItem, 'justify-between')}
                  key="tempo-gas-token"
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    onOpenTempoGasToken?.();
                  }}
                >
                  <span className="text-r-neutral-title-1 text-[13px]">
                    {t('page.gasAccount.gasToken')}
                  </span>
                  <div className="flex items-center flex-1">
                    <img
                      src={tempoGasToken?.logoUrl || IconUnknown}
                      className="w-14 h-14 rounded-full mr-6"
                    />
                    <span className="text-[13px] text-r-neutral-title1 font-medium mr-2">
                      {tempoGasToken?.symbol || '-'}
                    </span>
                    <IconArrowDownCC className="text-r-neutral-foot" />
                  </div>
                </Menu.Item>
              </>
            ) : null}
            {orderedGasList.map((gas) => {
              const isSelected = selectedGas?.level === gas.level;

              return (
                <Menu.Item
                  key={gas.level}
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    onSelect(gas);
                    if (gas.level === 'custom') {
                      onCustom();
                    }
                  }}
                  className={cn(styles.menuItem, {
                    'bg-r-blue-light-1 border-r-blue-default': isSelected,
                  })}
                >
                  <GasLevelIcon isActive={isSelected} level={gas.level} />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="text-13 leading-[16px] text-r-neutral-title1 font-medium">
                      {t(getGasLevelI18nKey(gas.level))}
                    </div>
                    {(gas.level !== 'custom' || showCustomGasPrice) && (
                      <div className="text-12 text-r-neutral-foot">
                        {new BigNumber(
                          (gas.level === 'custom'
                            ? customGasInfo.price
                            : gas.price) / 1e9
                        )
                          .toFixed()
                          .slice(0, 8)}{' '}
                        Gwei
                      </div>
                    )}
                  </div>
                  {isSelected && <CheckSVG className="text-r-blue-default" />}
                  {!isSelected && gas.level === 'custom' && (
                    <RcIconArrowRight className="text-r-neutral-foot" />
                  )}
                </Menu.Item>
              );
            })}
          </Menu.ItemGroup>
        </Menu>
      }
      // getPopupContainer={() =>
      //   document.querySelector('.js-rabby-popup-container') || document.body
      // }
    >
      {selectedGas ? (
        <MenuButtonStyled>
          <span>{t(getGasLevelI18nKey(selectedGas.level ?? 'slow'))}</span>
          {/* {(selectedGas.level !== 'custom' || showCustomGasPrice) && (
            <GweiStyled>
              {new BigNumber(selectedGas.price / 1e9).toFixed().slice(0, 8)}
            </GweiStyled>
          )} */}
          <ArrowSVG className="text-r-neutral-foot ml-2" />
        </MenuButtonStyled>
      ) : (
        <Skeleton.Input className="rounded w-[100px] h-[20px]" active />
      )}
    </Dropdown>
  );
};
