import fs from 'fs';
import path from 'path';

// Guard the user-visible scope: the existing venue row stays static, while only
// the Rabby row consumes the recorded-rate whitelist helper.
const source = fs.readFileSync(
  path.join(__dirname, '../../src/ui/views/Perps/popup/HistoryDetailPopup.tsx'),
  'utf8'
);

describe('standard history fee detail scope', () => {
  it('keeps the online Hyperliquid display independent of recorded builder fees', () => {
    const venueRow = source.slice(
      source.indexOf('<img src={IconHyperliquid}'),
      source.indexOf('<img src={IconRabby}')
    );
    expect(venueRow).toContain('0.045%');
    expect(venueRow).not.toContain('rabbyFeeRate');
    expect(venueRow).not.toContain('feeRates.exchange');
  });

  it('uses the Rabby-only rate in the Rabby row', () => {
    const rabbyRow = source.slice(source.indexOf('<img src={IconRabby}'));
    expect(rabbyRow).toContain('{rabbyFeeRate}');
    expect(source).toContain('const rabbyFeeRate = getRabbyFillFeeRate(fill);');
  });
});
