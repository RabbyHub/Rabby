declare module 'csstype' {
  interface Properties {
    '--background'?: string;
    [index: string]: any;
  }
}

declare module '*.md';
declare module '*.less';
declare module '*.css';

declare module '@zumer/snapdom' {
  export const snapdom: {
    toPng: (
      node: HTMLElement,
      options?: {
        backgroundColor?: string;
        dpr?: number;
        fast?: boolean;
        height?: number;
        width?: number;
      }
    ) => Promise<{ src: string }>;
  };
}
