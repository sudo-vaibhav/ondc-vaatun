export class SecuredTenantObject {
  /** Redis URL for Bun's native Redis client (e.g., rediss://default:xxx@your-instance.upstash.io:6379) */
  redisUrl: string;

  constructor(props: { redisUrl: string }) {
    this.redisUrl = props.redisUrl;
  }
}
