import { ErrorAlert } from '@/ui/component/Alert/ErrorAlert';
import clsx from 'clsx';
import React from 'react';

interface Props {
  header: {
    content: string;
    signTextContent: string;
    color: string;
    desc?: string;
    image: string;
  };
  errorMessage: string;
  isSignText?: boolean;
}

const TooltipTitle: React.FC = ({ children }) => {
  return (
    <h2 className=" mb-8 mt-16 font-bold first:mt-0 leading-none">
      {children}
    </h2>
  );
};

const TooltipContent: React.FC = ({ children }) => {
  return (
    <p className="leading-snug text-[#4B4D59] font-normal m-0">{children}</p>
  );
};

export const LedgerHardwareFailed: React.FC<Props> = ({
  header,
  errorMessage,
  isSignText,
  children,
}) => {
  const isBlindSign = errorMessage.includes('EthAppPleaseEnableContractData');

  return (
    <div>
      <img
        src="/images/ledger-status/header.png"
        className={isBlindSign ? '' : 'mb-[92px]'}
      />
      <div className={clsx('px-20 py-8', isBlindSign ? 'mb-16' : 'mb-[170px]')}>
        <img src={header.image} className="w-[200px] mb-12 m-auto" />
        <h1
          className={clsx(
            'text-center text-24 leading-none',
            isBlindSign ? 'mb-16' : 'mb-24'
          )}
          style={{
            color: header.color,
          }}
        >
          {isSignText ? header.signTextContent : header.content}
        </h1>
        {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}
        {isBlindSign && (
          <div className="mt-16 bg-[#F5F6FA] rounded p-16  text-13">
            <TooltipTitle>Why is enabling blind signing required?</TooltipTitle>
            <TooltipContent>
              Enabling blind signing is required to sign most transactions
              involving smart contracts. For example, you will need to enable
              blind signing when using an Ethereum dApp through Rabby.
            </TooltipContent>
            <TooltipTitle>How to enable blind signing?</TooltipTitle>
            <TooltipContent>
              <ol className="list-decimal ml-16">
                <li>Connect and unlock your Ledger device.</li>
                <li>Open the Ethereum (ETH) application.</li>
                <li>
                  Press the right button to navigate to Settings. Then press
                  both buttons to validate. Your Ledger device displays Blind
                  Signing.
                </li>
                <li>
                  Press both buttons to enable transaction blind signing. The
                  device displays Enabled. You're done.
                </li>
              </ol>
            </TooltipContent>
            <p className="mt-12 text-[#707280] text-12 mb-0 whitespace-nowrap">
              The content above is from &nbsp;
              <a
                className="underline text-[#707280]"
                href="https://support.ledger.com/hc/en-us/articles/4405481324433-Enable-blind-signing-in-the-Ethereum-ETH-app?docs=true"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(
                    e.currentTarget.href,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
              >
                the official instruction from Ledger
              </a>
              .
            </p>
          </div>
        )}
      </div>
      {children}
    </div>
  );
};
