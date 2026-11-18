const { db } = require('../lib/onboarding-server');
const { decryptHealthData } = require('../lib/health-encryption');

async function main() {
  const id = process.argv[2];
  if (!id || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Supply a customer UUID');
  }
  const [customer] = await db('pulse_coaching_customers',
    `select=status,encryption_context_id,encrypted_answers&id=eq.${id}`);
  if (!customer) throw new Error('Customer not found');
  const answers = decryptHealthData(customer.encrypted_answers, customer.encryption_context_id);
  process.stdout.write(JSON.stringify({ status: customer.status, answers }, null, 2) + '\n');
}

main().catch(() => {
  console.error('PULSE customer could not be read. Check the customer ID and the secured database/encryption configuration.');
  process.exitCode = 1;
});
