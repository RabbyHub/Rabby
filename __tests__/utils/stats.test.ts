const loadStats = async (shouldReport: boolean) => {
  jest.resetModules();

  const mockReport = jest.fn();
  const mockStatsReport = jest.fn().mockImplementation(() => ({
    report: mockReport,
  }));
  const mockShouldReportUserBehaviorData = jest
    .fn()
    .mockResolvedValue(shouldReport);

  jest.doMock('@debank/festats', () => ({
    __esModule: true,
    default: mockStatsReport,
    SITE: {
      rabby: 'rabby',
    },
  }));

  jest.doMock('@/utils/user-data-tracking', () => ({
    shouldReportUserBehaviorData: mockShouldReportUserBehaviorData,
  }));

  const stats = (await import('@/stats')).default;

  return {
    stats,
    mockReport,
    mockStatsReport,
    mockShouldReportUserBehaviorData,
  };
};

describe('stats reporter wrapper', () => {
  afterEach(() => {
    jest.dontMock('@debank/festats');
    jest.dontMock('@/utils/user-data-tracking');
  });

  test('filters undefined params before reporting', async () => {
    const { stats, mockReport } = await loadStats(true);

    await stats.report('testEvent', {
      value: 'ok',
      count: 1,
      enabled: false,
      skipped: undefined,
    });

    expect(mockReport).toHaveBeenCalledWith('testEvent', {
      value: 'ok',
      count: 1,
      enabled: false,
    });
  });

  test('does not initialize festats when user opted out', async () => {
    const { stats, mockReport, mockStatsReport } = await loadStats(false);

    await stats.report('testEvent', {
      value: 'ok',
    });

    expect(mockStatsReport).not.toHaveBeenCalled();
    expect(mockReport).not.toHaveBeenCalled();
  });
});
