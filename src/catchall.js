import crypto from 'crypto';
import { verifyEmail } from './smtp.js';

function generateFakeAddress(domain) {
  const random = crypto.randomBytes(8).toString('hex');
  return `test-fake-${random}@${domain}`;
}

export async function isCatchAll(domain, mxHost, proxy = null) {
  const fakeEmail = generateFakeAddress(domain);
  const result = await verifyEmail(fakeEmail, mxHost, proxy);

  if (result.result === 'valid') {
    return { catchAll: true, testedWith: fakeEmail, response: result };
  }

  return { catchAll: false, testedWith: fakeEmail, response: result };
}
