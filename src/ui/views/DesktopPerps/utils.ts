import { PositionAndOpenOrder } from '@/ui/models/perps';

export const getPositionDirection = (
  position: PositionAndOpenOrder['position']
): 'Long' | 'Short' => {
  return Number(position.szi || 0) > 0 ? 'Long' : 'Short';
};