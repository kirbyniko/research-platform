const { exec } = require('child_process');

const command = `vercel env add STRIPE_WEBHOOK_SECRET production`;
const secret = 'whsec_dVhx2pnPxvV1hjYDCEZSDOxknWKIfjRd';

const child = exec(command);

child.stdin.write('y\n'); // Mark as sensitive
child.stdin.write(secret + '\n'); // Enter the secret value
child.stdin.end();

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
