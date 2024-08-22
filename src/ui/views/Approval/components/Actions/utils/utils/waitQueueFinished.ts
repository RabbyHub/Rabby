import PQueue from 'p-queue';

export const waitQueueFinished = (q: PQueue) => {
  return new Promise((resolve) => {
    q.on('empty', () => {
      if (q.pending <= 0) resolve(null);
    });
  });
};
