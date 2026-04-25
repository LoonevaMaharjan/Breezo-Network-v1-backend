// scripts/sign-challenge.ts
import nacl from "tweetnacl";
import bs58 from "bs58";

const challenge = "de23a09ffec50e35d4f8f205295a4cf0a2585d7367f0c8dab0ea50b4ddfbcb99"; // from step 2
const devicePrivateKeyBase58 = "29SkFS1ZoGJ448Lm329zZX1xJQR9JZbbyqf61waoh58qfkiNgE34KaVhFnqJXsEQaHQVkyyZtF9qyJ7mVEU89AWR";

const keypair = nacl.sign.keyPair.fromSecretKey(bs58.decode(devicePrivateKeyBase58));
const signature = nacl.sign.detached(new TextEncoder().encode(challenge), keypair.secretKey);

console.log("signature:", bs58.encode(signature));
console.log("publicKey:", bs58.encode(keypair.publicKey));
