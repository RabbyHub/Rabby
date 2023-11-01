import React from 'react';
import clsx from 'clsx';

export type ThemeIconType = string | React.FC<React.SVGProps<SVGSVGElement>>;

export default function ThemeIcon({
  src: ImgSrcOrSvg,
  // darkModeIcon,
  className,
  imgClassName,
  svgClassName,
  ...props
}: React.HTMLAttributes<HTMLImageElement | SVGSVGElement> & {
  src: ThemeIconType;
  // darkModeIcon?: React.ReactNode,
  className?: string;
  imgClassName?: string;
  svgClassName?: string;
}) {
  if (typeof ImgSrcOrSvg === 'string') {
    return (
      <img
        {...props}
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

  return <ImgSrcOrSvg {...props} className={clsx(className, svgClassName)} />;
}
