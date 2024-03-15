import clsx from 'clsx';
import React, {
  ComponentPropsWithoutRef,
  CSSProperties,
  PropsWithChildren,
} from 'react';
import { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css } from 'styled-components';
import IconArrowRight, {
  ReactComponent as RcIconArrowRight,
} from 'ui/assets/address/right-arrow.svg';
import ArrowLeftWhiteBack from 'ui/assets/import/arrow-left-white.svg';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { ThemeIconType } from '@/constant';

const ItemWrapper = styled.div<{
  hoverBorder: boolean;
  px: number | string;
  py: number | string;
  // default var(--r-neutral-card-1, #fff);
  bgColor: string;
  // default var(--r-blue-light-1, #eef1ff);
  hoverBgColor: string;
}>`
  width: 100%;

  background-color: ${(p) => p.bgColor};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: 1px solid transparent;
  padding-top: ${({ py: y }) => (typeof y === 'number' ? y + 'px' : y)};
  padding-bottom: ${({ py: y }) => (typeof y === 'number' ? y + 'px' : y)};
  padding-left: ${({ px: x }) => (typeof x === 'number' ? x + 'px' : x)};
  padding-right: ${({ px: x }) => (typeof x === 'number' ? x + 'px' : x)};

  ${(p) =>
    p.hoverBorder
      ? css`
          &:hover {
            background-color: ${p.hoverBgColor};
            border-color: var(--r-blue-default, #7084ff);
          }
        `
      : ''}
`;

const RightIconSvg = styled(RcIconArrowRight)`
  margin-left: auto;
  width: 16px;
  height: 16px;
`;

interface ItemProps extends ComponentPropsWithoutRef<'div'> {
  hoverBorder?: boolean;
  px?: number | string;
  py?: number | string;
  //default white;
  bgColor?: string;
  //default var(--r-blue-light-1, #eef1ff);
  hoverBgColor?: string;
  className?: string;

  leftIcon?: ThemeIconType;
  rightIcon?: string | null;
  leftIconClassName?: string;
  rightIconClassName?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export const Item = (props: PropsWithChildren<ItemProps>) => {
  const {
    left,
    right,
    leftIcon,
    rightIcon = IconArrowRight,
    hoverBorder = true,
    px = 16,
    py = 15,
    bgColor = 'var(--r-neutral-card-1, #fff)',
    hoverBgColor = 'var(--r-blue-light-2, rgba(222, 227, 252, 1))',
    className = '',
    leftIconClassName = '',
    rightIconClassName = '',
    children,
    ...rest
  } = props;

  return (
    <ItemWrapper
      bgColor={bgColor}
      hoverBgColor={hoverBgColor}
      hoverBorder={hoverBorder}
      px={px}
      py={py}
      className={className}
      {...rest}
    >
      {left ? (
        left
      ) : leftIcon ? (
        <ThemeIcon
          src={leftIcon}
          className={clsx(leftIconClassName, 'w-24 h-24')}
        />
      ) : null}
      {children}
      {right ? (
        right
      ) : rightIcon ? (
        // <RightIconImg src={rightIcon} className={rightIconClassName} alt="" />
        <ThemeIcon src={RightIconSvg} className={rightIconClassName} />
      ) : null}
    </ItemWrapper>
  );
};

const BlueHeaderWrapper = styled.div<{ fixed?: boolean }>`
  position: relative;
  height: 56px;
  background: var(--r-blue-default, #7084ff);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;

  ${(p) =>
    p.fixed
      ? css`
          position: fixed;
          width: 100%;
          top: 0;
        `
      : ''}

  .title {
    font-weight: 500;
    font-size: 20px;
    line-height: 23px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
  }

  .back {
    position: absolute;
    top: 16px;
    left: 20px;
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    & img {
      width: 9px;
      height: 16px;
    }
  }
`;

const PolyfillHeightBox = styled.div`
  height: 56px;
`;

interface BlueHeaderProps extends ComponentPropsWithoutRef<'div'> {
  onBack?: () => void;
  showBackIcon?: boolean;
  className?: string;
  leftIconClassName?: string;
  fixed?: boolean;
  fillClassName?: string;
}
export const BlueHeader = ({
  onBack,
  showBackIcon = true,
  leftIconClassName,
  fillClassName,
  children,
  ...rest
}: BlueHeaderProps) => {
  const history = useHistory();

  const goBack = React.useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      history.goBack();
    }
  }, [onBack]);

  return (
    <>
      <BlueHeaderWrapper {...rest}>
        {showBackIcon && (
          <div
            className={clsx('back top-1/2 -translate-y-2/4', leftIconClassName)}
            onClick={goBack}
          >
            <img src={ArrowLeftWhiteBack} />
          </div>
        )}

        <div className="title">{children}</div>
      </BlueHeaderWrapper>
      {rest.fixed && <PolyfillHeightBox className={fillClassName} />}
    </>
  );
};
