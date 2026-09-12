require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('./db');

const {
  COOKIE_NAME,
  createSessionToken,
  hashToken,
  signSessionJwt,
  setSessionCookie,
  clearSessionCookie
} = require('./auth');

const app = express();
const PORT = process.env.PORT || 10000;

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('DATABASE_URL and JWT_SECRET are required.');
  process.exit(1);
}

const envOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([
  'https://elon-musk12.github.io',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...envOrigins
])];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'GEL backend' });
});

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getSession(req) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  const result = await db.query(`
    SELECT s.id, s.user_id, s.device_id, s.expires_at,
           d.revoked_at AS device_revoked,
           u.email, u.display_name
    FROM sessions s
    JOIN devices d ON d.id = s.device_id
    JOIN users u ON u.id = s.user_id
    WHERE s.id = $1 AND s.user_id = $2
      AND s.revoked_at IS NULL AND s.expires_at > NOW()
      AND d.revoked_at IS NULL
  `, [payload.sessionId, payload.userId]);

  return result.rows[0] || null;
}

async function requireAuth(req, res, next) {
  try {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'UNAUTHORIZED' });

    await db.query(
      'UPDATE devices SET last_seen_at = NOW() WHERE id = $1',
      [session.device_id]
    );

    req.session = session;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || 'Seyi').trim() || 'Seyi';

    if (!validEmail(email))
      return res.status(400).json({ error: 'INVALID_EMAIL' });

    if (password.length < 12)
      return res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });

    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );

    if (existing.rows.length)
      return res.status(409).json({ error: 'EMAIL_IN_USE' });

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(`
      INSERT INTO users (email, password_hash, display_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, display_name
    `, [email, passwordHash, displayName]);

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const deviceName = String(req.body.deviceName || 'Unknown device').trim() || 'Unknown device';

    const result = await db.query(`
      SELECT id, email, password_hash, display_name
      FROM users WHERE email = $1
    `, [email]);

    if (!result.rows[0])
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    const user = result.rows[0];

    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    const count = await db.query(`
      SELECT COUNT(*)::int AS count FROM devices
      WHERE user_id = $1 AND revoked_at IS NULL
    `, [user.id]);

    if (count.rows[0].count >= 4)
      return res.status(409).json({ error: 'DEVICE_LIMIT_REACHED' });

    const device = await db.query(`
      INSERT INTO devices (user_id, device_name, user_agent, last_ip)
      VALUES ($1, $2, $3, $4)
      RETURNING id, device_name
    `, [user.id, deviceName, req.get('user-agent') || '', req.ip]);

    const rawToken = createSessionToken();
    const tokenHash = hashToken(rawToken);

    const session = await db.query(`
      INSERT INTO sessions (user_id, device_id, token_hash, expires_at)
      VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
      RETURNING id, device_id
    `, [user.id, device.rows[0].id, tokenHash]);

    const jwtToken = signSessionJwt(
      user.id, session.rows[0].id, device.rows[0].id
    );

    setSessionCookie(res, jwtToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name
      },
      device: device.rows[0]
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const session = await getSession(req);
    if (session) {
      await db.query(
        'UPDATE sessions SET revoked_at = NOW() WHERE id = $1',
        [session.id]
      );
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    clearSessionCookie(res);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.post('/api/auth/logout-all', requireAuth, async (req, res) => {
  await db.query(`
    UPDATE sessions SET revoked_at = NOW()
    WHERE user_id = $1 AND revoked_at IS NULL
  `, [req.session.user_id]);

  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.session.user_id,
      email: req.session.email,
      displayName: req.session.display_name
    },
    deviceId: req.session.device_id
  });
});

app.get('/api/devices', requireAuth, async (req, res) => {
  const result = await db.query(`
    SELECT id, device_name, user_agent, last_ip,
           created_at, last_seen_at, revoked_at
    FROM devices WHERE user_id = $1
    ORDER BY created_at ASC
  `, [req.session.user_id]);

  res.json({ devices: result.rows });
});

app.delete('/api/devices/:deviceId', requireAuth, async (req, res) => {
  const result = await db.query(`
    UPDATE devices SET revoked_at = NOW()
    WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
    RETURNING id
  `, [req.params.deviceId, req.session.user_id]);

  if (!result.rows[0])
    return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });

  await db.query(`
    UPDATE sessions SET revoked_at = NOW()
    WHERE device_id = $1 AND revoked_at IS NULL
  `, [req.params.deviceId]);

  if (req.params.deviceId === req.session.device_id)
    clearSessionCookie(res);

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`GEL backend listening on port ${PORT}`);
  console.log('Allowed CORS origins:', allowedOrigins);
});
