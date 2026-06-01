# Email Finder & Verifier

SMTP-based email verification engine that finds and validates corporate email addresses using raw socket handshakes.

## How it works

1. Takes a person's name + company domain
2. Generates common email permutations (first.last@, flast@, etc.)
3. Resolves the domain's MX records
4. Checks if the domain is a catch-all (accepts everything)
5. Verifies each permutation via SMTP `RCPT TO` handshake
6. Returns which emails are valid, invalid, or greylisted

## Setup

```bash
npm install
```

Requires Redis running locally for the job queue:
```bash
redis-server
```

## Running

Start the API server and worker in separate terminals:

```bash
npm start        # Express API on port 3000
npm run worker   # BullMQ background worker
```

## API

**Queue a verification job:**
```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{"firstName":"john","lastName":"doe","domain":"example.com"}'
```

**Check job status:**
```bash
curl http://localhost:3000/verify/<jobId>
```

## Proxy Support

Set SOCKS5 proxies via environment variable (comma-separated):
```bash
SOCKS_PROXIES=socks5://user:pass@host:port,socks5://host2:port2 npm run worker
```

## Project Structure

```
src/
├── index.js      # Express API server
├── worker.js     # BullMQ job processor
├── smtp.js       # Raw SMTP socket engine
├── mx.js         # MX record resolver
├── catchall.js   # Catch-all domain detection
├── patterns.js   # Email permutation generator
└── proxy.js      # SOCKS5 proxy rotation
```
