interface Window {
  wallet: any;
  ethereum: any;
  langLocales: any;
}

declare module 'browser-passworder' {
  export function encrypt(
    password: string,
    privateKey: Buffer
  ): Promise<string>;
  export function decrypt(password: string, encrypted: string): Promise<Buffer>;
}
