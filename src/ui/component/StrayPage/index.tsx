import React, { ReactNode, FunctionComponent, useEffect, useMemo } from 'react';
import cx from 'clsx';
import { Form, FormInstance, FormProps } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { SvgIconSlogon } from 'assets';
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
  spinning?: boolean;
  noPadding?: boolean;
}

const StrayPage = ({
  header,
  headerClassName,
  children,
  footerRender,
  className,
  spinning = false,
  noPadding = false,
}: StrayPageProps) => (
  <div
    className={cx(
      'stray-page relative flex flex-col bg-gray-bg',
      { 'sm:pt-28': !noPadding },
      'lg:py-[60px] lg:w-[800px] sm:min-h-full lg:rounded-xl',
      className
    )}
  >
    <SvgIconSlogon className="absolute left-14 top-[-48px] hidden lg:block" />
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
  spinning?: boolean;
  noPadding?: boolean;
  isScrollContainer?: boolean;
}

export const StrayPageWithButton = ({
  header,
  headerClassName,
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
}: StrayPageWithButtonProps & StrayFooterNavProps) => {
  const { t } = useTranslation();

  const handleKeyDown = useMemo(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'enter') {
        if (onSubmit) return;
        if (onNextClick && !nextDisabled) {
          onNextClick();
        }
      }
    };
    return handler;
  }, [nextDisabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <StrayPage
      header={header}
      spinning={spinning}
      headerClassName={headerClassName}
      noPadding={noPadding}
    >
      <Form
        className={clsx('sm:pb-[98px] lg:pb-[72px]', {
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
          hasBack={hasBack}
          hasDivider={hasDivider}
          BackButtonContent={t('Back')}
          NextButtonContent={NextButtonContent || t('Next')}
          className="lg:w-[500px] lg:left-2/4 lg:-translate-x-2/4 lg:transform z-10"
        />
      </Form>
    </StrayPage>
  );
};

export default StrayPage;
