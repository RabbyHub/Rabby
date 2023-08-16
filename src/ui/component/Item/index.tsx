import LessPalette from '@/ui/style/var-defs';
import clsx from 'clsx';
import React, {
  ComponentPropsWithoutRef,
  CSSProperties,
  PropsWithChildren,
} from 'react';
import { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css } from 'styled-components';
import IconArrowRight from 'ui/assets/address/right-arrow.svg';
import ArrowLeftWhiteBack from 'ui/assets/import/arrow-left-white.svg';

const ItemWrapper = styled.div<{
  hoverBorder: boolean;
  px: number | string;
  py: number | string;
  //default white;
  bgColor: string;
  //default rgba(134, 151, 255, 0.1);
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
            border-color: ${LessPalette['@primary-color']};
          }
        `
      : ''}
`;

export const IconImg = styled.img`
  width: 24px;
  height: 24px;
`;

const RightIconImg = styled(IconImg)`
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
  //default rgba(134, 151, 255, 0.1);
  hoverBgColor?: string;
  className?: string;

  leftIcon?: string;
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
    py = 16,
    bgColor = '#fff',
    hoverBgColor = 'rgba(134, 151, 255, 0.1)',
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
        <IconImg src={leftIcon} className={leftIconClassName} alt="" />
      ) : null}
      {children}
      {right ? (
        right
      ) : rightIcon ? (
        <RightIconImg src={rightIcon} className={rightIconClassName} alt="" />
      ) : null}
    </ItemWrapper>
  );
};

const BlueHeaderWrapper = styled.div<{ fixed?: boolean }>`
  position: relative;
  height: 56px;
  background: linear-gradient(97.59deg, #8ba8ff 0%, #8c96ff 99.49%);
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
          <div className={clsx('back', leftIconClassName)} onClick={goBack}>
            <img src={ArrowLeftWhiteBack} />
          </div>
        )}

        <div className="title">{children}</div>
      </BlueHeaderWrapper>
      {rest.fixed && <PolyfillHeightBox className={fillClassName} />}
    </>
  );
};
