import net from 'net';
import { SocksClient } from 'socks';

const TIMEOUT_MS = 10_000;
const SENDER = 'verify@probe-check.net';

function parseCode(response) {
  const match = response.match(/^(\d{3})/);
  return match ? parseInt(match[1], 10) : null;
}

function readLine(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const onData = (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('\r\n')) {
        cleanup();
        resolve(buffer.trim());
      }
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    const onClose = () => {
      cleanup();
      if (buffer.length > 0) {
        resolve(buffer.trim());
      } else {
        reject(new Error('Socket closed before response'));
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('SMTP read timeout'));
    }, TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeListener('data', onData);
      socket.removeListener('error', onError);
      socket.removeListener('close', onClose);
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
}

function sendCommand(socket, command) {
  return new Promise((resolve, reject) => {
    socket.write(command + '\r\n', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function createDirectSocket(mxHost, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: mxHost, port, timeout: TIMEOUT_MS });

    socket.once('connect', () => resolve(socket));
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error(`Connection to ${mxHost}:${port} timed out`));
    });
    socket.once('error', reject);
  });
}

async function createProxySocket(mxHost, port, proxy) {
  const { socket } = await SocksClient.createConnection({
    proxy: {
      host: proxy.host,
      port: proxy.port,
      type: 5,
      userId: proxy.userId || undefined,
      password: proxy.password || undefined,
    },
    command: 'connect',
    destination: { host: mxHost, port },
    timeout: TIMEOUT_MS,
  });
  return socket;
}

export async function verifyEmail(email, mxHost, proxy = null) {
  const port = 25;
  let socket;

  try {
    socket = proxy
      ? await createProxySocket(mxHost, port, proxy)
      : await createDirectSocket(mxHost, port);

    const banner = await readLine(socket);
    const bannerCode = parseCode(banner);
    if (bannerCode !== 220) {
      return { email, result: 'error', code: bannerCode, message: banner };
    }

    await sendCommand(socket, `EHLO probe-check.net`);
    const ehloResp = await readLine(socket);
    const ehloCode = parseCode(ehloResp);
    if (ehloCode !== 250) {
      return { email, result: 'error', code: ehloCode, message: ehloResp };
    }

    await sendCommand(socket, `MAIL FROM:<${SENDER}>`);
    const mailResp = await readLine(socket);
    const mailCode = parseCode(mailResp);
    if (mailCode !== 250) {
      return { email, result: 'error', code: mailCode, message: mailResp };
    }

    await sendCommand(socket, `RCPT TO:<${email}>`);
    const rcptResp = await readLine(socket);
    const rcptCode = parseCode(rcptResp);

    let result;
    if (rcptCode === 250) {
      result = 'valid';
    } else if (rcptCode === 550 || rcptCode === 551 || rcptCode === 553) {
      result = 'invalid';
    } else if (rcptCode === 421 || rcptCode === 451 || rcptCode === 452) {
      result = 'greylisted';
    } else {
      result = 'unknown';
    }

    return { email, result, code: rcptCode, message: rcptResp };
  } catch (err) {
    return { email, result: 'error', code: null, message: err.message };
  } finally {
    if (socket) {
      try {
        await sendCommand(socket, 'QUIT');
      } catch {}
      socket.destroy();
    }
  }
}
