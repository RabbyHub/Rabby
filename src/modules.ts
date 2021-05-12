declare module 'browser-passworder' {
  export function encrypt(
    password: string,
    privateKey: Buffer
  ): Promise<string>;
  export function decrypt(password: string, encrypted: string): Promise<Buffer>;
}

declare module '*.svg' {
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const content: string;

  export { ReactComponent };
  export default content;
}
