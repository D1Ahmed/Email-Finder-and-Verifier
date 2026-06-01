export class ProxyManager {
  constructor(proxies = []) {
    this.proxies = proxies.map((uri) => this.parse(uri));
    this.index = 0;
  }

  parse(uri) {
    const url = new URL(uri);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10),
      userId: url.username || undefined,
      password: url.password || undefined,
    };
  }

  next() {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.index % this.proxies.length];
    this.index++;
    return proxy;
  }

  hasProxies() {
    return this.proxies.length > 0;
  }
}
