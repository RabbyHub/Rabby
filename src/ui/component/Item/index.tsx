import clsx from 'clsx';
import React, {
  ComponentPropsWithoutRef,
  CSSProperties,
  PropsWithChildren,
} from 'react';
import { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import IconArrowRight, {
  ReactComponent as RcIconArrowRight,
} from 'ui/assets/address/right-arrow.svg';
import ArrowLeftWhiteBack from 'ui/assets/import/arrow-left-white.svg';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { ThemeIconType } from '@/constant';
import { cn } from '@/ui/utils/cn';
import styles from './index.module.css';

const toCssLength = (v: number | string) =>
  typeof v === 'number' ? v + 'px' : v;

const RightIconSvg = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <RcIconArrowRight {...props} className={clsx(styles.rightIcon, className)} />
);

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
  disabled?: boolean;
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
    hoverBgColor = 'var(--r-blue-light-2, #eef1ff)',
    className = '',
    leftIconClassName = '',
    rightIconClassName = '',
    children,
    ...rest
  } = props;

  return (
    <div
      className={cn(
        styles.item,
        props.disabled && styles.itemDisabled,
        hoverBorder && !props.disabled && styles.itemHoverable,
        className
      )}
      {...rest}
      style={
        {
          '--item-bg': bgColor,
          '--item-hover-bg': hoverBgColor,
          '--item-px': toCssLength(px),
          '--item-py': toCssLength(py),
          ...rest.style,
        } as CSSProperties
      }
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
    </div>
  );
};

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
  }, [onBack, history]);

  const { fixed, className, ...divProps } = rest;

  return (
    <>
      <div
        className={cn(
          styles.blueHeader,
          fixed && styles.blueHeaderFixed,
          className
        )}
        {...divProps}
      >
        {showBackIcon && (
          <div
            className={clsx('back top-1/2 -translate-y-2/4', leftIconClassName)}
            onClick={goBack}
          >
            <img src={ArrowLeftWhiteBack} />
          </div>
        )}

        <div className="title">{children}</div>
      </div>
      {rest.fixed && (
        <div className={cn(styles.polyfillHeightBox, fillClassName)} />
      )}
    </>
  );
};
