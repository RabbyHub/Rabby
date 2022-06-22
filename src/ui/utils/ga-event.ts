import { useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { query2obj } from './url';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace IGAEventSource {
  export type ISendToken = 'dashboard' | 'contact' | 'tokendetail';
  export type ISendNFT = 'nftdetail';
  export type IReceive = 'dashboard' | 'tokendetail';
}

export function filterRbiSource(
  _case: 'sendToken' | 'sendNFT' | 'Receive',
  rbisource: string
) {
  switch (_case) {
    case 'sendToken':
      switch (rbisource) {
        default:
          return null;
        case 'dashboard':
        case 'contact':
        case 'tokendetail':
          return rbisource as IGAEventSource.ISendToken;
      }
    case 'sendNFT':
      switch (rbisource) {
        default:
          return null;
        case 'nftdetail':
          return rbisource as IGAEventSource.ISendNFT;
      }
    case 'Receive':
      switch (rbisource) {
        default:
          return null;
        case 'dashboard':
        case 'tokendetail':
          return rbisource as IGAEventSource.IReceive;
      }
  }

  return null;
}

/**
 * @description parse `rbisource` field from location params
 * or react-router-dom's location state
 */
export function useRbiSource() {
  const history = useHistory();
  const { state } = useLocation<any>();
  const rbisource = useMemo(() => {
    return query2obj(history.location.search).rbisource;
  }, [history]);

  return state?.rbisource || rbisource;
}
