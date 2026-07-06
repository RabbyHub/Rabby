declare module 'csstype' {
  interface Properties {
    '--background'?: string;
    [index: string]: any;
  }
}

declare module '*.md';
declare module '*.less';
declare module '*.css';

interface HIDDevice {
  vendorId: number;
  productId: number;
}

interface HIDConnectionEvent extends Event {
  device: HIDDevice;
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options?: unknown): Promise<HIDDevice[]>;
  addEventListener(
    type: 'connect' | 'disconnect',
    listener: (event: HIDConnectionEvent) => void
  ): void;
  removeEventListener(
    type: 'connect' | 'disconnect',
    listener: (event: HIDConnectionEvent) => void
  ): void;
}

interface Navigator {
  hid?: HID;
}
