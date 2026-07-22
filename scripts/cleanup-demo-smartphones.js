const { Client } = require("pg");
require("dotenv").config();

const confirmed = process.argv.includes("--confirm");
const demoWhere = `"productType" = 'SMARTPHONE' AND ("sku" LIKE 'DEMO-SP-%' OR "slug" IN (
  'samsung-galaxy-s25-ultra','apple-iphone-16-pro-max','vivo-x200-pro','oppo-find-x8-pro',
  'realme-gt-7-pro','redmi-note-14-pro-plus','oneplus-13','nothing-phone-3'
))`;

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const rows = (
      await client.query(`SELECT p.id,p.name,p.slug,p.sku, EXISTS(
      SELECT 1 FROM "OrderItem" oi WHERE oi."productId"=p.id
      UNION ALL SELECT 1 FROM "Review" r WHERE r."productId"=p.id
      UNION ALL SELECT 1 FROM "WishlistItem" w WHERE w."productId"=p.id
      UNION ALL SELECT 1 FROM "InventoryMovement" m WHERE m."productId"=p.id AND m."referenceType" <> 'CATALOGUE_SEED'
    ) AS referenced FROM "Product" p WHERE ${demoWhere} ORDER BY p.name`)
    ).rows;
    const archived = rows.filter((r) => r.referenced);
    const deletable = rows.filter((r) => !r.referenced);
    console.log(
      JSON.stringify(
        {
          mode: confirmed ? "CONFIRMED" : "DRY_RUN",
          matched: rows.length,
          wouldArchive: archived.length,
          wouldDelete: deletable.length,
          products: rows,
        },
        null,
        2,
      ),
    );
    if (!confirmed) return;
    await client.query("BEGIN");
    if (archived.length)
      await client.query(
        `UPDATE "Product" SET "isActive"=false,"updatedAt"=NOW() WHERE id=ANY($1::text[])`,
        [archived.map((x) => x.id)],
      );
    if (deletable.length) {
      await client.query(
        `DELETE FROM "InventoryMovement" WHERE "productId"=ANY($1::text[]) AND "referenceType"='CATALOGUE_SEED'`,
        [deletable.map((x) => x.id)],
      );
      await client.query(`DELETE FROM "Product" WHERE id=ANY($1::text[])`, [
        deletable.map((x) => x.id),
      ]);
    }
    await client.query("COMMIT");
    console.log(
      JSON.stringify({
        archived: archived.length,
        deleted: deletable.length,
        brandsDeleted: 0,
        categoriesDeleted: 0,
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
  console.error(error);
  process.exit(1);
});
