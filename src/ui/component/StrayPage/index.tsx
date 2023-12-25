import React, { ReactNode, FunctionComponent, useEffect, useMemo } from 'react';
import cx from 'clsx';
import { Form, FormInstance, FormProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactComponent as SvgIconSlogon } from 'ui/assets/logo.svg';
import { AppColorsVariants } from '@/constant/theme';

import StrayHeader, { StrayHeaderProps } from '../StrayHeader';
import StrayFooter, { StrayFooterNavProps } from '../StrayFooter';
import Spin from '../Spin';

import './index.css';

interface StrayPageProps {
  header?: StrayHeaderProps;
  headerClassName?: string;
  children?: ReactNode;
  footerRender?: FunctionComponent;
  className?: string;
  backgroundClassName?: `bg-r-${keyof AppColorsVariants}`;
  spinning?: boolean;
  noPadding?: boolean;
  style?: React.CSSProperties;
}

const StrayPage = ({
  header,
  headerClassName,
  children,
  footerRender,
  className,
  backgroundClassName = 'bg-r-neutral-bg-2',
  spinning = false,
  noPadding = false,
  style,
}: StrayPageProps) => (
  <div
    className={cx(
      'stray-page relative flex flex-col',
      backgroundClassName,
      { 'sm:pt-28': !noPadding },
      'lg:py-[60px] lg:w-[800px] sm:min-h-full lg:rounded-xl',
      className
    )}
    style={style}
  >
    <SvgIconSlogon className="absolute top-[-48px] hidden lg:block" />
    <Spin spinning={spinning} size="large">
      <div className={cx({ 'sm:px-20': !noPadding }, 'h-full flex flex-col')}>
        {header && (
          <StrayHeader className={headerClassName || 'mb-60'} {...header} />
        )}
        {children && (
          <div className="lg:flex lg:items-center lg:flex-col flex-1">
            {children}
          </div>
        )}
      </div>
      {footerRender && footerRender({})}
    </Spin>
  </div>
);

interface StrayPageWithButtonProps {
  header?: StrayHeaderProps;
  headerClassName?: string;
  form?: FormInstance<any>;
  formProps?: FormProps;
  initialValues?: any;
  onSubmit?(values: any): any;
  children;
  className?: string;
  backgroundClassName?: StrayPageProps['backgroundClassName'];
  spinning?: boolean;
  noPadding?: boolean;
  isScrollContainer?: boolean;
  disableKeyDownEvent?: boolean;
  custom?: boolean;
}

export const StrayPageWithButton = ({
  header,
  headerClassName,
  style,
  form,
  formProps,
  onSubmit,
  children,
  onNextClick,
  onBackClick,
  backDisabled,
  nextDisabled,
  hasBack,
  hasDivider,
  initialValues,
  NextButtonContent,
  spinning,
  footerFixed,
  noPadding = false,
  isScrollContainer = false,
  className,
  backgroundClassName,
  disableKeyDownEvent = false,
  nextLoading = false,
  custom = false,
}: StrayPageWithButtonProps &
  StrayFooterNavProps & {
    style?: React.CSSProperties;
  }) => {
  const { t } = useTranslation();

  const handleKeyDown = useMemo(() => {
    const handler = (e: KeyboardEvent) => {
      if (disableKeyDownEvent) return;
      if (e.key.toLowerCase() === 'enter') {
        if (onSubmit) return;
        if (onNextClick && !nextDisabled) {
          onNextClick();
        }
      }
    };
    return handler;
  }, [nextDisabled, disableKeyDownEvent]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (custom) {
    return (
      <div className={className}>
        <Form
          className={cx('sm:pb-[98px] lg:pb-[72px]', {
            'scroll-container': isScrollContainer,
          })}
          autoComplete="off"
          {...formProps}
          onFinish={onSubmit}
          initialValues={initialValues}
          form={form}
        >
          {children}
          <StrayFooter.Nav
            footerFixed={footerFixed}
            onNextClick={onNextClick}
            onBackClick={onBackClick}
            backDisabled={backDisabled}
            nextDisabled={nextDisabled}
            nextLoading={nextLoading}
            hasBack={hasBack}
            hasDivider={hasDivider}
            BackButtonContent={t('global.back')}
            NextButtonContent={NextButtonContent || t('global.next')}
            className="z-10 footer"
          />
        </Form>
      </div>
    );
  }

  return (
    <StrayPage
      header={header}
      spinning={spinning}
      headerClassName={headerClassName}
      noPadding={noPadding}
      className={className}
      backgroundClassName={backgroundClassName}
      style={style}
    >
      <Form
        className={cx('sm:pb-[98px] lg:pb-[72px]', {
          'scroll-container': isScrollContainer,
        })}
        autoComplete="off"
        {...formProps}
        onFinish={onSubmit}
        initialValues={initialValues}
        form={form}
      >
        {children}
        <StrayFooter.Nav
          footerFixed={footerFixed}
          onNextClick={onNextClick}
          onBackClick={onBackClick}
          backDisabled={backDisabled}
          nextDisabled={nextDisabled}
          nextLoading={nextLoading}
          hasBack={hasBack}
          hasDivider={hasDivider}
          BackButtonContent={t('global.back')}
          NextButtonContent={NextButtonContent || t('global.next')}
          className="lg:w-[500px] lg:left-2/4 lg:-translate-x-2/4 lg:transform z-10"
        />
      </Form>
    </StrayPage>
  );
};

export default StrayPage;
