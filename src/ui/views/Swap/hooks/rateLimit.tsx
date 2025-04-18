export class RequestRateLimiter {
  private requestTimestamps: number[] = [];
  private readonly timeWindow: number;
  private readonly maxRequests: number;

  constructor(timeWindow: number, maxRequests: number) {
    this.timeWindow = timeWindow;
    this.maxRequests = maxRequests;
  }

  checkRateLimit(): boolean {
    const currentTime = Date.now();

    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => currentTime - timestamp <= this.timeWindow
    );

    this.requestTimestamps.push(currentTime);

    return this.requestTimestamps.length > this.maxRequests;
  }
}
