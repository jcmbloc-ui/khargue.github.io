const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

const root = __dirname;
const dataDirectory = path.join(root, 'server-data');
const paymentsFile = path.join(dataDirectory, 'payments.json');
const port = Number(process.env.PORT || 3000);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const provider = process.env.PAYMENT_PROVIDER || 'mock';

const allowedOrigins = new Set([publicBaseUrl, 'http://localhost:3000', 'http://127.0.0.1:3000']);

async function readPayments() {
  try {
    return JSON.parse(await fs.readFile(paymentsFile, 'utf8'));
  } catch {
    return [];
  }
}

async function writePayments(payments) {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(paymentsFile, JSON.stringify(payments, null, 2));
}

function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function setCors(response, origin) {
  response.setHeader('access-control-allow-origin', allowedOrigins.has(origin) ? origin : publicBaseUrl);
  response.setHeader('access-control-allow-headers', 'content-type, x-webhook-signature');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  response.setHeader('vary', 'Origin');
}

async function body(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100000) throw new Error('Payload trop volumineux');
  }
  return raw ? JSON.parse(raw) : {};
}

function paymentId() {
  return `KHG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

async function createProviderPayment(payment) {
  if (provider === 'mock') {
    return { provider: 'mock', status: 'pending', checkoutUrl: `${publicBaseUrl}/?payment=${payment.id}` };
  }
  if (!process.env.PAYMENT_API_URL || !process.env.PAYMENT_API_KEY) {
    throw new Error('PAYMENT_API_URL et PAYMENT_API_KEY sont requis hors mode mock');
  }
  const providerResponse = await fetch(process.env.PAYMENT_API_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.PAYMENT_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount: payment.amount, currency: payment.currency, reference: payment.id, description: payment.description, returnUrl: `${publicBaseUrl}/?payment=${payment.id}` })
  });
  if (!providerResponse.ok) throw new Error(`Le prestataire a répondu ${providerResponse.status}`);
  const result = await providerResponse.json();
  return { provider, status: result.status || 'pending', checkoutUrl: result.checkoutUrl || result.paymentUrl, providerId: result.id || result.transactionId };
}

function validPayment(input) {
  return Number.isInteger(Number(input.amount)) && Number(input.amount) >= 10000 && typeof input.projectId !== 'undefined' && typeof input.paymentMethod === 'string' && input.paymentMethod.length > 0;
}

async function handle(request, response, url) {
  const origin = request.headers.origin || publicBaseUrl;
  setCors(response, origin);
  if (request.method === 'OPTIONS') return json(response, 204, {});
  if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true, provider });
  if (request.method === 'GET' && url.pathname.startsWith('/api/payments/')) {
    const id = url.pathname.split('/').pop();
    const payment = (await readPayments()).find(item => item.id === id);
    return payment ? json(response, 200, payment) : json(response, 404, { error: 'Paiement introuvable' });
  }
  if (request.method === 'POST' && url.pathname === '/api/payments/create') {
    let input;
    try { input = await body(request); } catch { return json(response, 400, { error: 'JSON invalide' }); }
    if (!validPayment(input)) return json(response, 400, { error: 'projectId, paymentMethod et un montant entier d’au moins 10 000 GNF sont requis' });
    const payment = { id: paymentId(), projectId: input.projectId, amount: Number(input.amount), currency: input.currency || 'GNF', paymentMethod: input.paymentMethod, description: input.description || 'Contribution KHARGUE', status: 'created', createdAt: new Date().toISOString() };
    try {
      Object.assign(payment, await createProviderPayment(payment));
      const payments = await readPayments();
      payments.push(payment);
      await writePayments(payments);
      return json(response, 201, payment);
    } catch (error) { return json(response, 502, { error: error.message }); }
  }
  if (request.method === 'POST' && url.pathname === '/api/payments/webhook') {
    const signature = request.headers['x-webhook-signature'];
    const raw = await new Promise((resolve, reject) => { let value = ''; request.on('data', chunk => { value += chunk; }); request.on('end', () => resolve(value)); request.on('error', reject); });
    const expected = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET || 'change-me').update(raw).digest('hex');
    const receivedSignature = Buffer.from(String(signature || ''));
    const expectedSignature = Buffer.from(expected);
    if (receivedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(receivedSignature, expectedSignature)) return json(response, 401, { error: 'Signature webhook invalide' });
    const event = JSON.parse(raw);
    const payments = await readPayments();
    const payment = payments.find(item => item.id === event.reference || item.providerId === event.transactionId);
    if (!payment) return json(response, 404, { error: 'Paiement introuvable' });
    payment.status = event.status || payment.status;
    payment.updatedAt = new Date().toISOString();
    await writePayments(payments);
    return json(response, 200, { received: true });
  }
  return serveStatic(request, response, url);
}

async function serveStatic(request, response, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root)) return json(response, 403, { error: 'Accès refusé' });
  try {
    const content = await fs.readFile(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
    response.writeHead(200, { 'content-type': types[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  } catch { json(response, 404, { error: 'Ressource introuvable' }); }
}

http.createServer((request, response) => {
  handle(request, response, new URL(request.url, publicBaseUrl)).catch(error => json(response, 500, { error: error.message }));
}).listen(port, () => console.log(`KHARGUE écoute sur ${publicBaseUrl}`));
