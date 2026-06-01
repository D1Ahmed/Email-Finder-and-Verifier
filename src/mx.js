import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

export async function getMxHost(domain) {
  const records = await resolveMx(domain);

  if (!records || records.length === 0) {
    throw new Error(`No MX records found for ${domain}`);
  }

  records.sort((a, b) => a.priority - b.priority);
  return records[0].exchange;
}
