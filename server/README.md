Here's a clean summary:

---

## 🌿 NodeService — What It Does

This service is the **core backend brain** of your DePIN (Decentralized Physical Infrastructure) project. It manages air quality sensor nodes (ESP32 devices), links them to Solana wallets, ingests their data, and distributes token rewards on-chain.

---

### 📡 `ingestData` — Receive Sensor Reading from ESP32
The ESP32 device sends air quality data (temperature, humidity, PM2.5, PM10, AQI) to your backend. The service:
- Checks the node exists and is linked
- Rejects requests older than 60 seconds (replay attack protection)
- Verifies the device's **NaCl cryptographic signature** so fake data can't be submitted
- Saves the latest reading to the database
- Calculates a **token reward** based on PM2.5 value
- If accumulated reward hits **10 tokens**, automatically triggers a Solana sync

---

### 🔗 `requestLink` — Start Device Linking
When a user wants to link their ESP32 to their wallet, this generates a **random challenge string** and saves it against the device. The device must sign this challenge to prove it owns the private key.

---

### 🔐 `verifyLink` — Complete Device Linking
Takes the signed challenge back from the device, verifies the signature, then:
- Creates a **Node PDA account on Solana**
- Saves the wallet + email association to the database
- The node is now fully linked and ready to earn rewards

---

### 🧱 `createNodeOnChain` — Deploy Node PDA to Solana
Derives a **Program Derived Address (PDA)** from the device's public key and calls `initNode` on your Anchor program to register it on-chain. This is the permanent on-chain identity of the sensor.

---

### 🔄 `syncToSolanaAsync` — Fire-and-Forget Solana Sync
A safe wrapper around the actual sync. Calls `syncToSolana`, then resets the reward counter. If anything fails, it logs the error. The `syncing` flag is **always cleared** in the `finally` block so the node never gets stuck in a locked state.

---

### ⛓️ `syncToSolana` — Write Reward to Solana
The actual on-chain call. Verifies the on-chain owner matches the expected wallet (security check), then calls `addReward` on your Anchor program to **credit tokens to the node account** on-chain.

---

### 💰 `claimReward` — User Claims Their Tokens
A user calls this to withdraw earned tokens. Verifies they own the node, checks there's a reward balance, then calls `claimReward` on Solana — transferring tokens to the **owner's wallet**. Resets the reward counter after.

---

### 🧠 `calculateReward` — Reward Engine Logic
Simple pure function. Better air quality = higher reward:

| PM2.5 | Reward |
|---|---|
| Under 50 (Clean) | 0.02 tokens |
| 50–100 (Moderate) | 0.01 tokens |
| 100–300 (Polluted) | 0.005 tokens |
| Over 300 (Hazardous) | 0 tokens |

---

### 📊 `getUserDashboard` — Fetch All User Nodes
Returns all nodes and their latest readings for a given user email. Powers the frontend dashboard.

---

### 🧱 `createNode` — Register a New Node (Off-chain)
Admin/setup function. Registers a new ESP32 device in the database with its nodeId and device public key, and creates an empty `NodeLatest` record ready to receive data.

---

### 🔁 Overall Data Flow

```
ESP32 Device
    │
    ▼
ingestData() ──► verify signature ──► save reading ──► calculate reward
                                                              │
                                              reward >= 10?  │
                                                    ▼
                                          syncToSolana() ──► addReward (on-chain)

User App
    │
    ▼
claimReward() ──► verify ownership ──► claimReward (on-chain) ──► tokens in wallet
```
