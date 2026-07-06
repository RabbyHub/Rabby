import { of } from 'rxjs';

const mockStartDiscovering = jest.fn();
const mockStopDiscovering = jest.fn();
const mockConnect = jest.fn();
const mockClose = jest.fn();

jest.mock(
  '@ledgerhq/device-management-kit',
  () => ({
    DeviceManagementKitBuilder: jest.fn().mockImplementation(() => ({
      addTransport: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({
        startDiscovering: mockStartDiscovering,
        stopDiscovering: mockStopDiscovering,
        connect: mockConnect,
        close: mockClose,
      })),
    })),
  }),
  { virtual: true }
);

jest.mock(
  '@ledgerhq/device-transport-kit-web-hid',
  () => ({
    webHidIdentifier: 'webhid',
    webHidTransportFactory: jest.fn(),
  }),
  { virtual: true }
);

import { requestLedgerHIDPermission } from '@/ui/utils/ledger-dmk';

describe('requestLedgerHIDPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartDiscovering.mockReturnValue(of({ id: 'ledger' }));
    mockStopDiscovering.mockResolvedValue(undefined);
  });

  test('requests WebHID access without opening the Ledger device', async () => {
    await requestLedgerHIDPermission();

    expect(mockStartDiscovering).toHaveBeenCalledWith({
      transport: 'webhid',
    });
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockStopDiscovering).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
