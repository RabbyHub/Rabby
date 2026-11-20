// Shared classes of the private-key and seed-phrase backup pages.
export const backupPage =
  'min-h-[100vh] h-[100vh] overflow-auto px-20 bg-r-neutral-bg-2';

export const backupHeader =
  'h-[60px] mx-[-20px] mt-0 mb-20 py-18 px-20 bg-r-blue-default text-center font-medium text-20 leading-[23px] text-r-neutral-title2';

export const backupAlert =
  'alert flex items-start gap-8 p-12 rounded-[4px] bg-r-red-light text-r-red-default font-normal text-14';

export const backupMask = [
  'mask absolute inset-0 z-10 flex flex-col justify-center items-center rounded-[6px] cursor-pointer',
  'bg-[linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5))] bg-[rgba(0,0,0,0.5)] opacity-95 backdrop-blur-[5px]',
  'font-normal text-14 text-center text-white',
].join(' ');

export const backupFooter =
  'footer fixed left-0 bottom-0 w-full p-20 bg-r-neutral-bg-1 text-center';
