declare module 'browser-passworder' {
  export function encrypt(password: string, privateKey: any): Promise<string>;
  export function decrypt(password: string, encrypted: string): Promise<Buffer>;
}

declare module '*.svg' {
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const content: string;

  export { ReactComponent };
  export default content;
}

declare module '*.png' {
  const value: string;
  export default value;
}
