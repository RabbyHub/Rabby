import { getGasLevelI18nKey } from '@/ui/utils/trans';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
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

const MenuButtonStyled = styled.div`
  display: flex;
  align-items: center;
  border-radius: 100px;
  padding: 4px 8px;
  line-height: 16px;
  font-size: 14px;
  color: var(--r-neutral-body, #3e495e);
  font-weight: 500;
  border-width: 1px;
  border-width: 0.5px;
  border-style: solid;
  border-color: var(--r-neutral-line, #d3d8e0);
  cursor: pointer;

  &:hover {
    border-color: var(--r-blue-default, #7084ff);
    background: var(--r-blue-light1, #eef1ff);
  }
`;

const MenuItemStyled = styled(Menu.Item)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  border-width: 0.5px;
  border-style: solid;
  border-color: transparent;

  &:hover {
    background: var(--r-blue-light1, #eef1ff);
  }
`;

const LevelTextWrapStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
`;

const LevelTextStyled = styled.div`
  font-size: 13px;
  line-height: 16px;
  color: var(--r-neutral-title1, #192945);
  font-weight: 500;
`;

const LevelPriceStyled = styled.div`
  font-size: 12px;
  line-height: 14px;
  color: var(--r-neutral-foot, #6a7587);
`;

const MenuStyled = styled(Menu)`
  border-radius: 8px;
  box-shadow: 0px 8px 12px 0px rgba(0, 0, 0, 0.2);
  border: 0.5px solid var(--r-neutral-line, #d3d8e0);
  background: var(--r-neutral-bg1, #fff);
  padding: 4px;

  .ant-dropdown-menu-item-group-title {
    padding: 0;
    color: var(--r-neutral-title1, #192945);
  }

  .ant-dropdown-menu-item-group-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
`;

const MenuTitleStyled = styled.div`
  padding: 8px 20px 12px;
  color: var(--r-neutral-title1, #192945);
  text-align: center;
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  position: relative;
`;

const DivideStyled = styled(Divide)`
  position: absolute;
  left: 16px;
  right: 16px;
  width: auto;
  bottom: 4px;
}`;

const GweiStyled = styled.span`
  color: var(--r-neutral-foot, #6a7587);
  display: flex;
  align-items: center;

  &::before {
    content: ' ';
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: var(--r-neutral-foot, #6a7587);
    display: block;
    margin: 0 4px;
  }
`;

interface Props {
  gasList: GasLevel[];
  selectedGas: GasLevel | null;
  onSelect: (gas: GasLevel) => void;
  onCustom: () => void;
  showCustomGasPrice: boolean;
}

const GasLevelIcon: React.FC<{ level: string; isActive }> = ({
  level,
  isActive,
}) => {
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
        className={clsx({
          'text-r-neutral-body': !isActive,
          'text-r-blue-default': isActive,
        })}
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
}) => {
  const { t } = useTranslation();
  const orderedGasList = [...gasList].reverse();
  const customGasInfo = gasList.find((g) => g.level === 'custom')!;

  return (
    <Dropdown
      placement="topCenter"
      overlay={
        <MenuStyled>
          <Menu.ItemGroup
            title={
              <MenuTitleStyled>
                <div>{t('page.sign.transactionSpeed')}</div>
                <DivideStyled />
              </MenuTitleStyled>
            }
          >
            {orderedGasList.map((gas) => {
              const isSelected = selectedGas?.level === gas.level;

              return (
                <MenuItemStyled
                  key={gas.level}
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    onSelect(gas);
                    if (gas.level === 'custom') {
                      onCustom();
                    }
                  }}
                  className={clsx({
                    'bg-r-blue-light-1 border-r-blue-default': isSelected,
                  })}
                >
                  <GasLevelIcon isActive={isSelected} level={gas.level} />
                  <LevelTextWrapStyled>
                    <LevelTextStyled>
                      {t(getGasLevelI18nKey(gas.level))}
                    </LevelTextStyled>
                    {(gas.level !== 'custom' || showCustomGasPrice) && (
                      <LevelPriceStyled>
                        {new BigNumber(
                          (gas.level === 'custom'
                            ? customGasInfo.price
                            : gas.price) / 1e9
                        )
                          .toFixed()
                          .slice(0, 8)}{' '}
                        Gwei
                      </LevelPriceStyled>
                    )}
                  </LevelTextWrapStyled>
                  {isSelected && <CheckSVG className="text-r-blue-default" />}
                  {!isSelected && gas.level === 'custom' && (
                    <RcIconArrowRight className="text-r-neutral-foot" />
                  )}
                </MenuItemStyled>
              );
            })}
          </Menu.ItemGroup>
        </MenuStyled>
      }
    >
      {selectedGas ? (
        <MenuButtonStyled>
          <span>{t(getGasLevelI18nKey(selectedGas.level ?? 'slow'))}</span>
          {(selectedGas.level !== 'custom' || showCustomGasPrice) && (
            <GweiStyled>
              {new BigNumber(selectedGas.price / 1e9).toFixed().slice(0, 8)}
            </GweiStyled>
          )}
          <ArrowSVG className="text-r-neutral-foot ml-2" />
        </MenuButtonStyled>
      ) : (
        <Skeleton.Input className="rounded w-[100px] h-[20px]" active />
      )}
    </Dropdown>
  );
};
