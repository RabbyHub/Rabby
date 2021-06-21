import React, { ReactNode, FunctionComponent } from 'react';
import cx from 'clsx';
import { Form, FormInstance, FormProps } from 'antd';
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
}

const StrayPage = ({
  header,
  headerClassName,
  children,
  footerRender,
  className,
  spinning = false,
}: StrayPageProps) => (
  <Spin
    spinning={spinning}
    size="large"
    className={cx(
      'stray-page relative flex flex-col bg-gray-bg',
      'sm:pt-28',
      'lg:pt-[60px] lg:w-[993px] sm:min-h-full lg:mt-[150px] lg:rounded-md lg:mx-auto',
      className
    )}
  >
    <SvgIconSlogon className="absolute left-28 top-[-116px] hidden lg:block" />
    <div className="sm:px-20 h-full flex flex-col">
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
}: StrayPageWithButtonProps & StrayFooterNavProps) => (
  <StrayPage
    header={header}
    spinning={spinning}
    headerClassName={headerClassName}
  >
    <Form
      className="sm:pb-[91px] lg:pb-[112px]"
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
        NextButtonContent={NextButtonContent}
        className="lg:w-[500px] lg:left-2/4 lg:-translate-x-2/4 lg:transform lg:mb-[36px] z-10"
      />
    </Form>
  </StrayPage>
);

export default StrayPage;
