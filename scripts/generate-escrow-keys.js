/**
 * Generates an X25519 Curve25519 keypair for the Dead-Man's Switch Escrow Delivery service.
 *
 * 1. Writes the private key strictly to `.escrow_private.key` (chmod 600, gitignored).
 * 2. Appends `EXPO_PUBLIC_ESCROW_PUBLIC_KEY` directly to your local `.env` if not already present.
 * 3. Never prints or logs the private key.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nacl = require('tweetnacl');

// Bind TweetNaCl to Node's CSPRNG
nacl.setPRNG((x, n) => {
  const buf = crypto.randomBytes(n);
  for (let i = 0; i < n; i++) x[i] = buf[i];
});

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const keyPath = path.join(projectRoot, '.escrow_private.key');

// Generate X25519 keypair
const keypair = nacl.box.keyPair();
const publicKey = Buffer.from(keypair.publicKey).toString('base64url');
const privateKey = Buffer.from(keypair.secretKey).toString('base64url');

// 1. Save private key securely (chmod 600)
fs.writeFileSync(keyPath, privateKey.trim(), { mode: 0o600 });

// 2. Append or update EXPO_PUBLIC_ESCROW_PUBLIC_KEY in .env
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('EXPO_PUBLIC_ESCROW_PUBLIC_KEY=')) {
    envContent = envContent.replace(
      /EXPO_PUBLIC_ESCROW_PUBLIC_KEY=.*/g,
      `EXPO_PUBLIC_ESCROW_PUBLIC_KEY=${publicKey}`
    );
  } else {
    envContent += `\n# Dead-man's switch delivery escrow public key\nEXPO_PUBLIC_ESCROW_PUBLIC_KEY=${publicKey}\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Added EXPO_PUBLIC_ESCROW_PUBLIC_KEY to your local .env file.');
} else {
  console.log('⚠️  No .env file found. Created one with EXPO_PUBLIC_ESCROW_PUBLIC_KEY.');
  fs.writeFileSync(envPath, `EXPO_PUBLIC_ESCROW_PUBLIC_KEY=${publicKey}\n`, 'utf8');
}

console.log('✅ Generated new Escrow Keypair:');
console.log('----------------------------------------------------------------------');
console.log('Public Key (safe in .env):', publicKey);
console.log('Private Key saved to   :', '.escrow_private.key (chmod 600, gitignored)');
console.log('----------------------------------------------------------------------');
console.log('Next step: push the private key to Supabase Edge Function secrets:');
console.log('  npx supabase secrets set ESCROW_PRIVATE_KEY=$(cat .escrow_private.key)');
console.log('Then delete the local private key:');
console.log('  rm .escrow_private.key');
console.log('----------------------------------------------------------------------');
