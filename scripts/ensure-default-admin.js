const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Client } = require("pg");
require("dotenv").config();

const EMAIL = "admin123@gmail.com";
const PASSWORD = "Admin123@";

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DIRECT_URL or DATABASE_URL is required.");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN");
    const existing = (
      await client.query(
        `SELECT id, email, role, status, "passwordHash" FROM "User"
       WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
        [EMAIL],
      )
    ).rows[0];

    if (existing) {
      const passwordValid = await bcrypt.compare(
        PASSWORD,
        existing.passwordHash,
      );
      if (passwordValid) {
        await client.query(
          `UPDATE "User" SET role='ADMIN', status='ACTIVE', "updatedAt"=NOW()
           WHERE id=$1`,
          [existing.id],
        );
      } else {
        const passwordHash = await bcrypt.hash(PASSWORD, 12);
        await client.query(
          `UPDATE "User" SET role='ADMIN', status='ACTIVE', "passwordHash"=$2,
             "lastPasswordChangedAt"=NOW(), "failedLoginCount"=0,
             "lastFailedLoginAt"=NULL, "lockedUntil"=NULL, "suspendedAt"=NULL,
             "suspendedReason"=NULL, "updatedAt"=NOW() WHERE id=$1`,
          [existing.id, passwordHash],
        );
        await client.query(
          `INSERT INTO "PasswordHistory" (id,"userId","passwordHash","createdAt")
           VALUES ($1,$2,$3,NOW())`,
          [crypto.randomUUID(), existing.id, passwordHash],
        );
      }
      await client.query("COMMIT");
      console.log(
        JSON.stringify({
          email: EMAIL,
          action: "updated",
          role: "ADMIN",
          status: "ACTIVE",
          password: passwordValid
            ? "preserved-valid-hash"
            : "repaired-with-bcrypt",
        }),
      );
      return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO "User" (id,name,email,"passwordHash",role,status,
       "lastPasswordChangedAt","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,'ADMIN','ACTIVE',NOW(),NOW(),NOW())`,
      [id, "Administrator", EMAIL, passwordHash],
    );
    await client.query(
      `INSERT INTO "PasswordHistory" (id,"userId","passwordHash","createdAt")
       VALUES ($1,$2,$3,NOW())`,
      [crypto.randomUUID(), id, passwordHash],
    );
    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        email: EMAIL,
        action: "created",
        role: "ADMIN",
        status: "ACTIVE",
        password: "bcrypt-12",
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Default admin provisioning failed:", error.message);
  process.exit(1);
});
