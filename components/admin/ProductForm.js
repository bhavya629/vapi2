import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import VariantProductForm from "@/components/admin/VariantProductForm";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import styles from "@/styles/admin.module.css";
const blank = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  productType: "SMARTPHONE",
  brandId: "",
  categoryId: "",
  price: "",
  originalPrice: "",
  stock: "0",
  lowStockThreshold: "3",
  imageUrl: "/images/product-placeholder.svg",
  imageAltText: "",
  specifications: "{}",
  compatibility: "{}",
  isActive: true,
  isFeatured: false,
  displayOrder: "0",
};
export default function ProductForm({ product }) {
  const [mode, setMode] = useState(product?.productType || "SMARTPHONE");
  if (mode === "SMARTPHONE" && (!product || product.hasVariants))
    return (
      <VariantProductForm
        product={product}
        onAccessory={() => setMode("ACCESSORY")}
      />
    );
  return (
    <LegacyProductForm
      product={product}
      legacySmartphone={product?.productType === "SMARTPHONE"}
    />
  );
}
function LegacyProductForm({ product, legacySmartphone }) {
  const edit = Boolean(product);
  const router = useRouter();
  const [form, setForm] = useState(() =>
    product
      ? {
          ...blank,
          ...product,
          originalPrice: product.originalPrice ?? "",
          specifications: JSON.stringify(product.specifications || {}, null, 2),
          compatibility: JSON.stringify(product.compatibility || {}, null, 2),
          imageAltText: product.images?.find((x) => x.isPrimary)?.altText || "",
        }
      : blank,
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { data: brandData } = useAdminApi("/api/admin/brands");
  const { data: categoryData } = useAdminApi("/api/admin/categories");
  const brands = brandData?.brands || [],
    categories = (categoryData?.categories || []).filter(
      (c) => c.productType === form.productType && c.isActive,
    );
  useEffect(() => {
    if (categories.length && !categories.some((c) => c.id === form.categoryId))
      setForm((v) => ({ ...v, categoryId: categories[0].id }));
  }, [categories, form.categoryId]);
  useEffect(() => {
    if (brands.length && !form.brandId)
      setForm((v) => ({
        ...v,
        brandId: brands.find((b) => b.isActive)?.id || "",
      }));
  }, [brands, form.brandId]);
  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
    setErrors((v) => ({ ...v, [name]: undefined }));
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice:
          form.originalPrice === "" ? null : Number(form.originalPrice),
        lowStockThreshold: Number(form.lowStockThreshold),
        displayOrder: Number(form.displayOrder),
        ...(!edit ? { stock: Number(form.stock) } : {}),
      };
      await adminRequest(
        edit ? `/api/admin/products/${product.id}` : "/api/admin/products",
        edit ? "PATCH" : "POST",
        payload,
      );
      toast.success(edit ? "Product updated." : "Product created.");
      router.push("/admin/products");
    } catch (error) {
      setErrors(error.fields || { _form: error.message });
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate>
      {legacySmartphone && (
        <p role="status">
          <strong>Legacy Product:</strong> this smartphone uses the old
          single-SKU structure. New smartphones use the variant editor.
        </p>
      )}
      {errors._form && (
        <div className={styles.state}>
          <p>{errors._form}</p>
        </div>
      )}
      <Section title="Basic Information">
        <Grid>
          <Field
            label="Product name"
            name="name"
            value={form.name}
            onChange={update}
            error={errors.name}
          />
          <Field
            label="Slug"
            name="slug"
            value={form.slug}
            onChange={update}
            error={errors.slug}
          />
          <Field
            label="SKU"
            name="sku"
            value={form.sku || ""}
            onChange={update}
            error={errors.sku}
          />
          <Field
            label="Short description"
            name="shortDescription"
            value={form.shortDescription || ""}
            onChange={update}
            error={errors.shortDescription}
          />
          <Field
            full
            textarea
            label="Full description"
            name="description"
            value={form.description}
            onChange={update}
            error={errors.description}
          />
        </Grid>
      </Section>
      <Section title="Classification">
        <Grid>
          <Select
            label="Product type"
            name="productType"
            value={form.productType}
            onChange={update}
            error={errors.productType}
            options={[
              ["SMARTPHONE", "Smartphone"],
              ["ACCESSORY", "Accessory"],
            ]}
          />
          <Select
            label="Brand"
            name="brandId"
            value={form.brandId}
            onChange={update}
            error={errors.brandId}
            options={brands
              .filter((b) => b.isActive)
              .map((b) => [b.id, b.name])}
          />
          <Select
            label="Category"
            name="categoryId"
            value={form.categoryId}
            onChange={update}
            error={errors.categoryId}
            options={categories.map((c) => [c.id, c.name])}
          />
        </Grid>
      </Section>
      <Section title="Pricing & Stock Configuration">
        <Grid>
          <Field
            label="Selling price (INR)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={update}
            error={errors.price}
          />
          <Field
            label="Original price (INR)"
            name="originalPrice"
            type="number"
            min="0"
            step="0.01"
            value={form.originalPrice}
            onChange={update}
            error={errors.originalPrice}
          />
          {!edit ? (
            <Field
              label="Initial stock"
              name="stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={update}
              error={errors.stock}
            />
          ) : (
            <label className={styles.field}>
              Current stock
              <input value={product.stock} disabled />
              <small>
                <a href={`/admin/inventory?product=${product.id}`}>
                  Adjust through Inventory
                </a>
              </small>
            </label>
          )}
          <Field
            label="Low-stock threshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            step="1"
            value={form.lowStockThreshold}
            onChange={update}
            error={errors.lowStockThreshold}
          />
        </Grid>
      </Section>
      <Section title="Product Image">
        <Grid>
          <div className={styles.field}>
            <span>Primary product image</span>
            <ProductImageUploader
              value={form.imageUrl}
              onChange={(imageUrl) =>
                setForm((current) => ({ ...current, imageUrl }))
              }
              productSlug={form.slug || form.name}
              colourSlug="default"
              imageType="FRONT"
              imageKey={product?.id || "accessory-primary"}
              alt={form.imageAltText || form.name || "Product preview"}
            />
            {errors.imageUrl && <span role="alert">{errors.imageUrl}</span>}
          </div>
          <Field
            label="Image alt text"
            name="imageAltText"
            value={form.imageAltText}
            onChange={update}
            error={errors.imageAltText}
          />
        </Grid>
      </Section>
      <Section title="Specifications">
        <Grid>
          <Field
            full
            textarea
            label="Specifications JSON"
            name="specifications"
            value={form.specifications}
            onChange={update}
            error={errors.specifications}
          />
          <Field
            full
            textarea
            label="Compatibility JSON"
            name="compatibility"
            value={form.compatibility}
            onChange={update}
            error={errors.compatibility}
          />
        </Grid>
      </Section>
      <Section title="Visibility and Display">
        <Grid>
          <Field
            label="Display order"
            name="displayOrder"
            type="number"
            min="0"
            step="1"
            value={form.displayOrder}
            onChange={update}
            error={errors.displayOrder}
          />
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={update}
            />
            Active
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="isFeatured"
              checked={form.isFeatured}
              onChange={update}
            />
            Featured
          </label>
        </Grid>
      </Section>
      <div className={styles.formActions}>
        <button
          className={styles.secondary}
          type="button"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </button>
        <button className={styles.primary} disabled={saving}>
          {saving
            ? "Saving Product..."
            : edit
              ? "Save Changes"
              : "Create Product"}
        </button>
      </div>
    </form>
  );
}
function Section({ title, children }) {
  return (
    <section className={styles.formCard}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children }) {
  return <div className={styles.formGrid}>{children}</div>;
}
function Field({ label, error, textarea, full, ...props }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ""}`}>
      {label}
      <Tag {...props} aria-invalid={Boolean(error)} />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
function Select({ label, error, options, ...props }) {
  return (
    <label className={styles.field}>
      {label}
      <select {...props} aria-invalid={Boolean(error)}>
        <option value="">Select</option>
        {options.map(([value, text]) => (
          <option value={value} key={value}>
            {text}
          </option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
