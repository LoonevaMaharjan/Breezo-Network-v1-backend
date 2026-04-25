// scripts/sign-link-verify.ts
import nacl from "tweetnacl";
import bs58 from "bs58";

// ✅ Same private key as your device
const devicePrivateKeyBase58 = "2QeDtYuNQ3VgEM4CWd6xe8PKh6QRezFyaGrTN8Cb7KdJ6pyJe2E2uttaLG6DzLfRm1VAbnBRg1DNQecB1AVfgBAf";

// ✅ Paste the challenge you got from POST /node/link/request
const challenge = "d029e71dae8cdc5b48c4bb9f926e763c0d4e6f3405bba7e68b92df352a3b848d";

const keypair = nacl.sign.keyPair.fromSecretKey(bs58.decode(devicePrivateKeyBase58));

// 🔐 Sign the raw challenge string (NOT JSON-wrapped)
const signature = nacl.sign.detached(
  new TextEncoder().encode(challenge),
  keypair.secretKey
);

console.log("devicePublicKey:", bs58.encode(keypair.publicKey));
console.log("signature:      ", bs58.encode(signature));
console.log("\n📋 Ready-to-paste body for POST /node/link/verify:");
console.log(JSON.stringify({
  devicePublicKey: bs58.encode(keypair.publicKey),
  signature: bs58.encode(signature),
  email: "owner@aether.io",       // 👈 change to your email
  wallet: "44dZCzJ3nevs1KEYFwDgzDXTbqCnPBkxaeTK5RaA47gy"    // 👈 change to your wallet address
}, null, 2));
