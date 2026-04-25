# Breezo Network

> **DePIN air quality monitoring** — ESP32 nodes collect real-world sensor data, sign it cryptographically, and earn on-chain Solana rewards proportional to air quality.

---

## Table of contents

- [What is Breezo?](#what-is-breezo)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Environment setup](#environment-setup)
- [Database models](#database-models)
- [API reference](#api-reference)
  - [POST /auth/signup](#post-authsignup)
  - [POST /auth/login](#post-authlogin)
  - [POST /node/create](#post-nodecreate)
  - [POST /node/link/request](#post-nodelinkrequest)
  - [POST /node/link/verify](#post-nodelinkverify)
  - [POST /node/ingest](#post-nodeingest)
  - [GET /node/dashboard](#get-nodedashboard)
  - [POST /node/reward/claim](#post-noderewardclaim)
- [Reward engine](#reward-engine)
- [Solana program](#solana-program)
- [ESP32 firmware](#esp32-firmware)
- [Complete test walkthrough](#complete-test-walkthrough)
- [Signature helper scripts](#signature-helper-scripts)

---

## What is Breezo?

Breezo is a **Decentralized Physical Infrastructure Network (DePIN)** for air quality monitoring. Physical ESP32 devices equipped with DHT22, SDS011, and MQ135 sensors collect real-world air quality data every 15 seconds and submit it to a Node.js backend.

Every submission is cryptographically signed with the device's **Ed25519 private key** — the backend verifies the signature before accepting any data, making spoofing impossible.

Nodes accumulate reward tokens based on the air quality they report. Once the balance reaches 10 tokens, the backend automatically syncs the reward to a **Solana smart contract** on devnet. Users can then claim their lamports directly to their wallet.

---

## Architecture

```
┌─────────────────┐        signed payload         ┌──────────────────────┐
│   ESP32 Node    │ ────────────────────────────► │   Node.js Backend    │
│                 │                                │                      │
│  DHT22 (temp)   │                                │  Auth (JWT)          │
│  SDS011 (PM)    │                                │  Sig verification    │
│  MQ135 (CO2)    │                                │  Reward engine       │
│  Ed25519 key    │                                │  Solana sync         │
└─────────────────┘                                └──────────┬───────────┘
                                                              │
                                          ┌───────────────────┼───────────────────┐
                                          │                   │                   │
                                   ┌──────▼──────┐   ┌───────▼───────┐           │
                                   │   MongoDB   │   │ Solana devnet │           │
                                   │             │   │               │           │
                                   │ Node        │   │ initNode      │           │
                                   │ NodeLatest  │   │ addReward     │           │
                                   │ User        │   │ claimReward   │           │
                                   └─────────────┘   └───────────────┘           │
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Hardware | ESP8266 / ESP32, DHT22, SDS011, MQ135 |
| Firmware | C++ / Arduino |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT, bcrypt |
| Cryptography | NaCl (tweetnacl), bs58, Ed25519 |
| Blockchain | Solana devnet, Anchor framework |
| Smart contract | Rust |

---

## Project structure

```
breezo/
├── server/
│   └── src/
│       ├── blockchain/
│       │   └── solana.client.ts         # Anchor provider + wallet
│       ├── config/
│       │   └── index.ts                 # env vars (JWT_SECRET, PRIVATE_KEY, MONGO_URI)
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   └── node.controller.ts
│       ├── dto/
│       │   └── auth.dto.ts              # SignUpDTO, LoginDTO
│       ├── idl/
│       │   └── breezo.json              # Anchor IDL (copy from target/idl after build)
│       ├── middlewares/
│       │   ├── isAuth.middleware.ts     # JWT verification → req.user
│       │   └── error.middleware.ts      # global error handler
│       ├── models/
│       │   ├── user.model.ts
│       │   ├── node.model.ts            # device registry (static)
│       │   └── nodeLatest.model.ts      # live sensor state + rewards
│       ├── repositories/
│       │   ├── user.repository.ts
│       │   ├── node.repository.ts
│       │   └── nodeLatest.repository.ts
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   └── node.routes.ts
│       ├── service/
│       │   ├── auth.service.ts
│       │   └── node.service.ts          # core business logic
│       ├── utils/
│       │   ├── jwt/token.utils.ts
│       │   └── errors/app.error.ts
│       └── validators/
│           └── auth.validator.ts
│
├── solana/
│   └── programs/breezo/src/
│       └── lib.rs                       # Anchor smart contract
│
├── firmware/
│   └── breezo_node.ino                  # ESP32 firmware
│
└── scripts/
    ├── sign-link-verify.ts              # generate link/verify signature
    └── sign-ingest.ts                   # generate ingest signature
```

---

## Environment setup

Create a `.env` file in `server/`:

```env
PORT=3501
MONGO_URI=mongodb://localhost:27017/breezo
JWT_SECRET=your_jwt_secret_here

# Backend Solana wallet private key (base58) — this wallet pays for on-chain accounts
PRIVATE_KEY=your_solana_wallet_private_key_base58
```

Install dependencies and run:

```bash
cd server
npm install
npm run dev
```

Deploy the Solana program:

```bash
cd solana
anchor build
anchor deploy --provider.cluster devnet
cp target/idl/breezo.json ../server/src/idl/breezo.json
```

---

## Database models

### User

| Field | Type | Description |
|---|---|---|
| `fullName` | String | User's display name |
| `email` | String | Unique, used for login |
| `password` | String | bcrypt hashed |
| `role` | Enum | `User` \| `Node` \| `Admin` |
| `wallet` | String | Solana wallet address |

### Node (device registry)

| Field | Type | Description |
|---|---|---|
| `nodeId` | String | Unique device identifier e.g. `NODE_001` |
| `devicePublicKey` | String | Ed25519 public key (base58) |
| `ownerEmail` | String | Links to User |
| `ownerWallet` | String | Solana wallet of owner |
| `nodeAccount` | String | On-chain Solana account address (set after linking) |
| `isLinked` | Boolean | True after link/verify completes |
| `linkChallenge` | String | Temporary challenge for signing (cleared after use) |

### NodeLatest (live state)

| Field | Type | Description |
|---|---|---|
| `nodeId` | String | References Node |
| `temperature` | Number | °C from DHT22 |
| `humidity` | Number | % from DHT22 |
| `pm25` | Number | µg/m³ from SDS011 |
| `pm10` | Number | µg/m³ from SDS011 |
| `aqi` | Number | Computed AQI score |
| `aqiLevel` | String | `GOOD` \| `MODERATE` \| `UNHEALTHY_SENSITIVE` \| `VERY_UNHEALTHY` \| `HAZARDOUS` |
| `reward` | Number | Accumulated reward (resets after Solana sync) |
| `syncing` | Boolean | True while Solana sync is in progress |
| `location` | Object | `{ lat, lng }` |
| `lastSeen` | Date | Timestamp of last ingest |

---

## API reference

### POST /auth/signup

Register a new user account. Returns a JWT immediately.

**Request**
```json
{
  "fullName": "Aether Node Owner",
  "email":    "owner@breezo.io",
  "password": "SecurePass123!",
  "wallet":   "44dZCzJ3nevs1KEYFwDgzDXTbqCnPBkxaeTK5RaA47gy"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id":       "68ebdbd2bd05c0bcfaa9cc19",
    "fullName": "Aether Node Owner",
    "email":    "owner@breezo.io",
    "role":     "User",
    "wallet":   "44dZCzJ3nevs1KEYFwDgzDXTbqCnPBkxaeTK5RaA47gy",
    "token":    "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**What it does internally**
1. Check email uniqueness — throw `ConflictError` if taken
2. Hash password with `bcrypt` (10 rounds)
3. Save user to MongoDB including `wallet`
4. Sign JWT with `{ userId, email, role, wallet }` — expiry 1 year
5. Return user object + token

---

### POST /auth/login

Authenticate and get a fresh JWT. Always re-login after adding `wallet` to the schema to get a token that includes it.

**Request**
```json
{
  "email":    "owner@breezo.io",
  "password": "SecurePass123!"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id":     "68ebdbd2bd05c0bcfaa9cc19",
    "email":  "owner@breezo.io",
    "wallet": "44dZCzJ3nevs1KEYFwDgzDXTbqCnPBkxaeTK5RaA47gy",
    "token":  "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**What it does internally**
1. Find user by email — throw `NotFoundError` if missing
2. `bcrypt.compare` password against hash
3. Sign JWT including `wallet: user.wallet`
4. Return token

> **Save this token.** Use it as `Authorization: Bearer <token>` on all authenticated routes.

---

### POST /node/create

Register an ESP32 device in MongoDB. This is a setup step — does not touch Solana. The `devicePublicKey` must match the Ed25519 key stored on the physical device.

**Headers**
```
Authorization: Bearer <token>
```

**Request**
```json
{
  "nodeId":          "NODE_001",
  "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz",
  "ownerEmail":      "owner@breezo.io",
  "ownerWallet":     "44dZCzJ3nevs1KEYFwDgzDXTbqCnPBkxaeTK5RaA47gy"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "nodeId":          "NODE_001",
    "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz",
    "ownerEmail":      "owner@breezo.io",
    "isLinked":        false,
    "nodeAccount":     null
  }
}
```

**What it does internally**
1. Check `nodeId` not already registered
2. Create `Node` document in MongoDB (`isLinked: false`, `nodeAccount: null`)
3. Create `NodeLatest` placeholder document with all sensors at 0

---

### POST /node/link/request

Step 1 of the device linking flow. Issues a cryptographic challenge that the device must sign. Proves the caller physically controls the device's private key.

**Headers**
```
Authorization: Bearer <token>
```

**Request**
```json
{
  "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz",
    "challenge":       "a3f9c12e847b3d1f0e...64-char hex...91f0c2"
  }
}
```

**What it does internally**
1. Find device by `devicePublicKey`
2. Generate `crypto.randomBytes(32).toString('hex')` as challenge
3. Store challenge in `Node.linkChallenge`
4. Return challenge to caller

> **Save the challenge string.** You must sign it in the next step.

---

### POST /node/link/verify

Step 2 of the device linking flow. Verifies the Ed25519 signature of the challenge, then creates a Solana `NodeAccount` on devnet. The backend wallet pays rent. The user's wallet is stored as the owner on-chain but does not need to sign.

**Headers**
```
Authorization: Bearer <token>
```

**Request**
```json
{
  "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz",
  "signature":       "3Vge8JU8UxgeAsyH...base58 Ed25519 signature of challenge...fAf4"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "nodeId":      "NODE_001",
    "isLinked":    true,
    "nodeAccount": "J9WpHHwftv7JFGcZjiDH4vXePcGV7ddL3K9YiMycww22"
  }
}
```

**What it does internally**
1. Fetch node, verify `linkChallenge` exists
2. `nacl.sign.detached.verify(challenge, signature, devicePublicKey)`
3. Generate fresh `Keypair` for the on-chain `NodeAccount`
4. Call `program.methods.initNode()` with accounts: `nodeAccount`, `owner` (user wallet), `authority` (backend wallet — signer + payer), `devicePublicKey`, `systemProgram`
5. Save `nodeAccount` address to MongoDB, set `isLinked: true`

---

### POST /node/ingest

Hot path — called by the ESP32 every 15 seconds. No JWT. The payload must be signed with the device's Ed25519 private key. Timestamp must be within 60 seconds (replay protection).

**No auth header — device route only**

**Request**
```json
{
  "nodeId":    "NODE_001",
  "timestamp": 1745123456789,
  "signature": "4Tz9...base58 sig of JSON.stringify({payload,timestamp})...Xm1",
  "payload": {
    "temperature": 28.5,
    "humidity":    62.3,
    "pm25":        42.0,
    "pm10":        67.8,
    "aqi":         112,
    "aqiLevel":    "MODERATE",
    "location":    { "lat": 28.6139, "lng": 77.2090 }
  }
}
```

> **Critical:** `signature` must be the Ed25519 signature of the exact string `JSON.stringify({ payload, timestamp })` — key order matters.

**Response**
```json
{
  "success": true,
  "data": {
    "nodeId":      "NODE_001",
    "temperature": 28.5,
    "humidity":    62.3,
    "pm25":        42.0,
    "pm10":        67.8,
    "aqi":         112,
    "aqiLevel":    "MODERATE",
    "reward":      0.02,
    "syncing":     false,
    "lastSeen":    "2026-04-25T10:30:00.000Z"
  }
}
```

**What it does internally**
1. Find node by `nodeId` — reject if not found or `isLinked: false`
2. Reject if `timestamp` older than 60 seconds (replay protection)
3. Reconstruct `message = JSON.stringify({ payload, timestamp })`
4. `nacl.sign.detached.verify(message, signature, devicePublicKey)`
5. `calculateReward(pm25)` → upsert `NodeLatest`, accumulate reward
6. If `reward >= 10` and not already `syncing` → `markSyncing()` → fire `syncToSolanaAsync()` (fire-and-forget)

---

### GET /node/dashboard

Returns all `NodeLatest` records for the authenticated user. This is the data source for a frontend dashboard.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "nodeId":      "NODE_001",
      "temperature": 28.5,
      "humidity":    62.3,
      "pm25":        42.0,
      "pm10":        67.8,
      "aqi":         112,
      "aqiLevel":    "MODERATE",
      "reward":      3.14,
      "syncing":     false,
      "location":    { "lat": 28.6139, "lng": 77.2090 },
      "lastSeen":    "2026-04-25T10:30:00.000Z"
    }
  ]
}
```

---

### POST /node/reward/claim

Triggers the `claimReward` Solana instruction — transfers lamports from the `NodeAccount` to the owner's wallet. Resets the reward counter in MongoDB.

> **Note:** `claimReward` requires the owner to sign the transaction. In production this should return an unsigned transaction for the frontend (Phantom wallet) to sign. The current backend implementation works only when the backend wallet is also the owner (dev/test only).

**Headers**
```
Authorization: Bearer <token>
```

**Request**
```json
{
  "nodeId": "NODE_001"
}
```

**Response**
```json
{
  "success": true,
  "data": { "success": true }
}
```

---

## Reward engine

```typescript
calculateReward(pm25: number): number {
  if (pm25 > 300) return 0;      // sensor fault or extreme pollution
  if (pm25 < 50)  return 0.02;   // clean air bonus
  if (pm25 < 100) return 0.01;   // moderate
  return 0.005;                   // polluted but reporting
}
```

When `reward >= 10`, the backend fires `syncToSolanaAsync()` which calls `addReward` on-chain (converting to lamports via `reward * 1e9`), then resets the local counter. The `syncing` flag prevents concurrent sync attempts.

---

## Solana program

Program ID: `5ygRCA7pF2h7GeGxP9RaiNQNTNb5J5GnB9XSzxh75gVw`

### NodeAccount struct

```rust
pub struct NodeAccount {
    pub owner:             Pubkey,  // user wallet stored on-chain
    pub device_public_key: Pubkey,  // ESP32 Ed25519 public key
    pub reward_balance:    u64,     // lamports accumulated
}
```

### Instructions

| Instruction | Signer | Description |
|---|---|---|
| `initNode` | `authority` (backend), `nodeAccount` (new keypair) | Creates the account. Backend pays rent. Owner stored but does not sign. |
| `addReward(amount: u64)` | `authority` (backend) | Adds lamports to `reward_balance`. Checks caller is the stored owner. |
| `claimReward` | `owner` (user wallet) | Transfers all lamports to owner. Requires user signature. |

---

## ESP32 firmware

The firmware (`breezo_node.ino`) handles:

- WiFi connection + NTP time sync (UTC milliseconds)
- DHT22 reading (temperature, humidity)
- SDS011 reading (PM2.5, PM10)
- MQ135 reading (CO2 approximation)
- Hybrid AQI computation
- Ed25519 message signing via `Ed25519.h`
- JSON payload construction via `ArduinoJson`
- HTTP POST to `/node/ingest` every 15 seconds

**Required Arduino libraries:**
```
ArduinoJson        — Benoit Blanchon
DHT sensor library — Adafruit
SdsDustSensor      — lewapek
Ed25519            — rweather/arduinolibs
ArduinoBase58      — eranpeer
```

---

## Complete test walkthrough

### Step 1 — Sign up
```http
POST /auth/signup
Content-Type: application/json

{
  "fullName": "Aether Node Owner",
  "email":    "owner@breezo.io",
  "password": "SecurePass123!",
  "wallet":   "44dZCzJ3nevs1KEYFwDgzDXTbqCnPBkxaeTK5RaA47gy"
}
```

### Step 2 — Login (get fresh JWT with wallet)
```http
POST /auth/login
Content-Type: application/json

{
  "email":    "owner@breezo.io",
  "password": "SecurePass123!"
}
```
> Save the `token` from the response.

### Step 3 — Register device
```http
POST /node/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "nodeId":          "NODE_001",
  "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz",
  "ownerEmail":      "owner@breezo.io",
  "ownerWallet":     "44dZCzJ3nevs1KEYFwDgzDXTbqCnPBkxaeTK5RaA47gy"
}
```

### Step 4 — Request link challenge
```http
POST /node/link/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz"
}
```
> Save the `challenge` hex string from the response.

### Step 5 — Sign the challenge
```bash
npx ts-node scripts/sign-link-verify.ts
# paste the challenge into the script first
```

### Step 6 — Verify link (creates Solana account)
```http
POST /node/link/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "devicePublicKey": "4eHdNksHQ1dFspgWVxkS5japDtT8nvSySFJhNQz27GDz",
  "signature":       "<base58 output from sign-link-verify.ts>"
}
```

### Step 7 — Generate ingest signature
```bash
npx ts-node scripts/sign-ingest.ts
# copy the timestamp and signature from output
```

### Step 8 — Submit sensor reading
```http
POST /node/ingest
Content-Type: application/json

{
  "nodeId":    "NODE_001",
  "timestamp": <timestamp from script>,
  "signature": "<signature from script>",
  "payload": {
    "temperature": 28.5,
    "humidity":    62.3,
    "pm25":        42.0,
    "pm10":        67.8,
    "aqi":         112,
    "aqiLevel":    "MODERATE",
    "location":    { "lat": 28.6139, "lng": 77.2090 }
  }
}
```

### Step 9 — View dashboard
```http
GET /node/dashboard
Authorization: Bearer <token>
```

### Step 10 — Claim reward
```http
POST /node/reward/claim
Authorization: Bearer <token>
Content-Type: application/json

{
  "nodeId": "NODE_001"
}
```

---

## Signature helper scripts

### scripts/sign-link-verify.ts
```typescript
import nacl from "tweetnacl";
import bs58  from "bs58";

const DEVICE_PRIVATE_KEY = "2GZkTAT6eK3Upt...your key...JMjNAY";
const challenge          = "PASTE_CHALLENGE_HEX_HERE";

const keypair   = nacl.sign.keyPair.fromSecretKey(bs58.decode(DEVICE_PRIVATE_KEY));
const signature = nacl.sign.detached(new TextEncoder().encode(challenge), keypair.secretKey);

console.log("devicePublicKey:", bs58.encode(keypair.publicKey));
console.log("signature:      ", bs58.encode(signature));
```

### scripts/sign-ingest.ts
```typescript
import nacl from "tweetnacl";
import bs58  from "bs58";

const DEVICE_PRIVATE_KEY = "2GZkTAT6eK3Upt...your key...JMjNAY";

const timestamp = Date.now();
const payload   = {
  temperature: 28.5, humidity: 62.3,
  pm25: 42.0,        pm10: 67.8,
  aqi: 112,          aqiLevel: "MODERATE",
  location: { lat: 28.6139, lng: 77.2090 }
};

const message   = JSON.stringify({ payload, timestamp });
const keypair   = nacl.sign.keyPair.fromSecretKey(bs58.decode(DEVICE_PRIVATE_KEY));
const signature = nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey);

console.log("timestamp:", timestamp);
console.log("signature:", bs58.encode(signature));
```
