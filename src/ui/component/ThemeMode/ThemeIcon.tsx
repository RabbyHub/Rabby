import React from 'react';
import clsx from 'clsx';
import { ThemeIconType } from '@/constant';

export default function ThemeIcon<T extends ThemeIconType>({
  src: ImgSrcOrSvg,
  // darkModeIcon,
  className,
  imgClassName,
  svgClassName,
  ...props
}: (T extends string
  ? React.HTMLAttributes<HTMLImageElement>
  : React.SVGProps<SVGSVGElement>) & {
  src: T;
  // darkModeIcon?: React.ReactNode,
  className?: string;
  imgClassName?: string;
  svgClassName?: string;
}) {
  if (typeof ImgSrcOrSvg === 'string') {
    return (
      <img
        {...(props as React.HTMLAttributes<HTMLImageElement>)}
        src={ImgSrcOrSvg}
        className={clsx(className, imgClassName)}
      />
    );
  }

  if (!ImgSrcOrSvg) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `ThemeIcon: src is ${ImgSrcOrSvg}, see more details from trace stack`
      );
    }
    return null;
  }

  const SvgComponet = ImgSrcOrSvg as React.FC<React.SVGProps<SVGSVGElement>>;

  return <SvgComponet className={clsx(className, svgClassName)} />;
}
