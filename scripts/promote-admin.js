const { Client } = require("pg");
require("dotenv").config();

const candidate = process.argv[2] || process.env.ADMIN_EMAIL || "";
const email = candidate.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Provide a valid existing customer email with ADMIN_EMAIL or as the first argument.");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query('UPDATE "User" SET role=\'ADMIN\', "updatedAt"=NOW() WHERE email=$1 RETURNING id, email, role', [email]);
    if (!result.rowCount) { console.error("No existing user was found for that email. Register the customer account first."); process.exitCode = 2; return; }
    console.log(result.rows[0].role === "ADMIN" ? `Admin access is enabled for ${result.rows[0].email}.` : "Admin promotion failed.");
  } finally { await client.end(); }
})().catch((error) => { console.error("Admin promotion failed:", error.message); process.exit(1); });
