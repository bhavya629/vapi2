import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import { validateVariantProductPayload } from "@/server/validation/variantValidation";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import styles from "@/styles/variantAdmin.module.css";

const uid = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const defaultImage = (imageType = "FRONT", displayOrder = 0) => ({
  clientId: uid("image"),
  imageUrl: "/images/product-placeholder.svg",
  altText: "",
  imageType,
  isPrimary: displayOrder === 0,
  displayOrder,
});
const newSpecification = (displayOrder = 0, key = "", value = "") => ({
  clientId: uid("specification"),
  key,
  value,
  displayOrder,
});
const newColour = (name = "Titanium Blue") => ({
  clientId: uid("colour"),
  name,
  slug: name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""),
  hexCode: "#2563eb",
  isActive: true,
  isDefault: true,
  displayOrder: 0,
});
const newCombination = (colour) => ({
  clientId: uid("combo"),
  colourClientId: colour.clientId,
  sku: "",
  price: "",
  originalPrice: "",
  stock: 0,
  lowStockThreshold: 3,
  isActive: true,
  isDefault: colour.isDefault,
  displayOrder: colour.displayOrder,
  images: ["FRONT", "BACK", "SIDE", "ANGLE"].map((type, index) =>
    defaultImage(type, index),
  ),
  specifications: [],
});
const newVariant = (colours, ram = "12GB", storage = "256GB") => ({
  clientId: uid("variant"),
  ram,
  storage,
  isActive: true,
  isDefault: true,
  displayOrder: 0,
  combinations: colours.map(newCombination),
});
const isCombinationValid = (combination) =>
  Boolean(
    combination.sku &&
    Number(combination.price) > 0 &&
    (!combination.originalPrice ||
      Number(combination.originalPrice) >= Number(combination.price)) &&
    Number(combination.stock) >= 0 &&
    combination.images.length &&
    combination.images.filter((image) => image.isPrimary).length === 1 &&
    (!combination.isActive || combination.specifications?.length),
  );
const basic = (p) => ({
  name: p?.name || "",
  slug: p?.slug || "",
  brandId: p?.brand?.id || p?.brandId || "",
  categoryId: p?.category?.id || p?.categoryId || "",
  shortDescription: p?.shortDescription || "",
  description: p?.description || "",
  specifications: p?.specifications || {},
  compatibility: p?.compatibility || {},
  isActive: p?.isActive !== false,
  isFeatured: Boolean(p?.isFeatured),
  displayOrder: p?.displayOrder || 0,
});
function initial(p) {
  if (!p?.hasVariants) {
    const colours = [newColour()];
    return { product: basic(p), colours, variants: [newVariant(colours)] };
  }
  const colours = p.colours.map((c) => ({ ...c, clientId: c.id }));
  return {
    product: basic(p),
    colours,
    variants: p.variants.map((v) => ({
      ...v,
      clientId: v.id,
      combinations: v.combinations.map((c) => ({
        ...c,
        clientId: c.id,
        colourClientId: c.productColourId,
        price: Number(c.price),
        originalPrice: c.originalPrice == null ? "" : Number(c.originalPrice),
        images: c.images.map((i) => ({ ...i, clientId: i.id })),
        specifications: (c.specifications || []).map((specification) => ({
          ...specification,
          clientId: specification.id,
        })),
      })),
    })),
  };
}

export default function VariantProductForm({ product, onAccessory }) {
  const router = useRouter(),
    edit = Boolean(product),
    [data, setData] = useState(() => initial(product)),
    [specRows, setSpecRows] = useState(() =>
      Object.entries(product?.specifications || {}).map(([key, value]) => ({
        id: uid("spec"),
        key,
        value: String(value ?? ""),
      })),
    ),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false),
    [specSourceId, setSpecSourceId] = useState(null),
    { data: brandData } = useAdminApi("/api/admin/brands"),
    { data: categoryData } = useAdminApi("/api/admin/categories");
  const brands = brandData?.brands?.filter((b) => b.isActive) || [],
    categories =
      categoryData?.categories?.filter(
        (c) => c.isActive && c.productType === "SMARTPHONE",
      ) || [];
  const combos = useMemo(
    () =>
      data.variants.flatMap((v, vi) =>
        v.combinations.map((c, ci) => ({
          v,
          c,
          vi,
          ci,
          colour: data.colours.find((x) => x.clientId === c.colourClientId),
        })),
      ),
    [data],
  );
  const productChange = (key, value) =>
    setData((d) => ({ ...d, product: { ...d.product, [key]: value } }));
  function setDefaultColour(id) {
    setData((d) => ({
      ...d,
      colours: d.colours.map((c) => ({ ...c, isDefault: c.clientId === id })),
      variants: d.variants.map((v) => ({
        ...v,
        combinations: v.combinations.map((c) => ({
          ...c,
          isDefault: v.isDefault && c.colourClientId === id,
        })),
      })),
    }));
  }
  function addColour() {
    setData((d) => {
      const colour = {
        ...newColour("New Colour"),
        isDefault: false,
        displayOrder: d.colours.length,
      };
      return {
        ...d,
        colours: [...d.colours, colour],
        variants: d.variants.map((v) => ({
          ...v,
          combinations: [...v.combinations, newCombination(colour)],
        })),
      };
    });
  }
  function removeColour(id) {
    setData((d) =>
      d.colours.length === 1
        ? d
        : {
            ...d,
            colours: d.colours.filter((c) => c.clientId !== id),
            variants: d.variants.map((v) => ({
              ...v,
              combinations: v.combinations.filter(
                (c) => c.colourClientId !== id,
              ),
            })),
          },
    );
  }
  function addVariant() {
    setData((d) => {
      const v = {
        ...newVariant(d.colours, "8GB", "128GB"),
        isDefault: false,
        displayOrder: d.variants.length,
      };
      return { ...d, variants: [...d.variants, v] };
    });
  }
  function setDefaultVariant(id) {
    setData((d) => {
      const defaultColour = d.colours.find((c) => c.isDefault);
      return {
        ...d,
        variants: d.variants.map((v) => ({
          ...v,
          isDefault: v.clientId === id,
          combinations: v.combinations.map((c) => ({
            ...c,
            isDefault:
              v.clientId === id && c.colourClientId === defaultColour?.clientId,
          })),
        })),
      };
    });
  }
  function updateCombo(vi, ci, key, value) {
    setData((d) => ({
      ...d,
      variants: d.variants.map((v, x) =>
        x !== vi
          ? v
          : {
              ...v,
              combinations: v.combinations.map((c, y) =>
                y !== ci ? c : { ...c, [key]: value },
              ),
            },
      ),
    }));
  }
  function updateImages(vi, ci, fn) {
    setData((d) => ({
      ...d,
      variants: d.variants.map((v, x) =>
        x !== vi
          ? v
          : {
              ...v,
              combinations: v.combinations.map((c, y) =>
                y !== ci ? c : { ...c, images: fn(c.images) },
              ),
            },
      ),
    }));
  }
  function updateSpecifications(vi, ci, fn) {
    setData((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex !== vi
          ? variant
          : {
              ...variant,
              combinations: variant.combinations.map(
                (combination, combinationIndex) =>
                  combinationIndex !== ci
                    ? combination
                    : {
                        ...combination,
                        specifications: fn(combination.specifications || []),
                      },
              ),
            },
      ),
    }));
  }
  function copySpecifications(sourceId, mode, targetId) {
    setData((current) => {
      const sourceVariant = current.variants.find((variant) =>
        variant.combinations.some(
          (combination) => combination.clientId === sourceId,
        ),
      );
      const source = sourceVariant?.combinations.find(
        (combination) => combination.clientId === sourceId,
      );
      if (!source) return current;
      const copied = () =>
        (source.specifications || []).map((specification, index) => ({
          ...specification,
          id: undefined,
          clientId: uid("specification"),
          displayOrder: index,
        }));
      return {
        ...current,
        variants: current.variants.map((variant) => ({
          ...variant,
          combinations: variant.combinations.map((combination) => {
            const matches =
              combination.clientId !== sourceId &&
              (mode === "all" ||
                (mode === "colour" &&
                  combination.colourClientId === source.colourClientId) ||
                (mode === "variant" &&
                  variant.clientId === sourceVariant.clientId) ||
                (mode === "target" && combination.clientId === targetId));
            return matches
              ? { ...combination, specifications: copied() }
              : combination;
          }),
        })),
      };
    });
  }
  function removeCombinationImage(imageUrl, vi, ci, ii) {
    const sharedUpload = imageUrl?.startsWith("/uploads/products/");
    setData((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => ({
        ...variant,
        combinations: variant.combinations.map(
          (combination, combinationIndex) => {
            const remainingImages = combination.images.filter(
              (image, imageIndex) =>
                sharedUpload
                  ? image.imageUrl !== imageUrl
                  : !(
                      variantIndex === vi &&
                      combinationIndex === ci &&
                      imageIndex === ii
                    ),
            );
            const hasPrimary = remainingImages.some((image) => image.isPrimary);
            const images = remainingImages.map((image, imageIndex) => ({
              ...image,
              isPrimary: hasPrimary ? image.isPrimary : imageIndex === 0,
              displayOrder: imageIndex,
            }));
            return { ...combination, images };
          },
        ),
      })),
    }));
  }
  function copyFirstCombinationValues() {
    const source = combos[0]?.c;
    if (!source) return;
    setData((d) => ({
      ...d,
      variants: d.variants.map((v) => ({
        ...v,
        combinations: v.combinations.map((c) => ({
          ...c,
          price: source.price,
          originalPrice: source.originalPrice,
          stock: source.stock,
          lowStockThreshold: source.lowStockThreshold,
        })),
      })),
    }));
  }
  function copyImagesByColour() {
    setData((d) => ({
      ...d,
      variants: d.variants.map((v) => ({
        ...v,
        combinations: v.combinations.map((c) => {
          const source = d.variants
            .flatMap((x) => x.combinations)
            .find(
              (x) => x.colourClientId === c.colourClientId && x.images.length,
            );
          return source
            ? {
                ...c,
                images: source.images.map((image, index) => ({
                  ...image,
                  id: undefined,
                  clientId: uid("image"),
                  displayOrder: index,
                })),
              }
            : c;
        }),
      })),
    }));
  }
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...data,
        product: {
          ...data.product,
          brandId: data.product.brandId || brands[0]?.id || "",
          categoryId: data.product.categoryId || categories[0]?.id || "",
          specifications: Object.fromEntries(
            specRows
              .filter((x) => x.key.trim())
              .map((x) => [x.key.trim(), x.value]),
          ),
          displayOrder: Number(data.product.displayOrder),
        },
      };
      const checked = validateVariantProductPayload(payload);
      if (checked.error) {
        setErrors(checked.error);
        document
          .querySelector(`.${styles.error}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        toast.error("Please correct the highlighted variant fields.");
        return;
      }
      await adminRequest(
        edit ? `/api/admin/products/${product.id}` : "/api/admin/products",
        edit ? "PATCH" : "POST",
        payload,
      );
      toast.success(
        edit
          ? "Smartphone variants updated."
          : "Smartphone and variants created.",
      );
      router.push("/admin/products");
    } catch (e) {
      setErrors(e.fields || { _form: e.message });
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <header className={styles.intro}>
        <div>
          <span>SMARTPHONE VARIANT PRODUCT</span>
          <h2>
            {edit ? "Edit smartphone combinations" : "Create a smartphone"}
          </h2>
          <p>
            Stock and SKU belong to each exact RAM, storage and colour
            combination.
          </p>
        </div>
        {!edit && (
          <button type="button" onClick={onAccessory}>
            Create simple accessory instead
          </button>
        )}
      </header>
      {Object.keys(errors).length > 0 && (
        <div className={styles.error} role="alert">
          <strong>Please correct the variant configuration.</strong>
          <ul>
            {Object.entries(errors)
              .slice(0, 12)
              .map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
          </ul>
        </div>
      )}
      <Section title="Product Details">
        <div className={styles.grid}>
          {[
            ["Product name", "name"],
            ["Slug", "slug"],
            ["Short description", "shortDescription"],
          ].map(([l, k]) => (
            <Field
              key={k}
              label={l}
              value={data.product[k]}
              onChange={(e) => productChange(k, e.target.value)}
            />
          ))}
          <label>
            Brand
            <select
              value={data.product.brandId || brands[0]?.id || ""}
              onChange={(e) => productChange("brandId", e.target.value)}
            >
              {brands.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={data.product.categoryId || categories[0]?.id || ""}
              onChange={(e) => productChange("categoryId", e.target.value)}
            >
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Display order"
            type="number"
            value={data.product.displayOrder}
            onChange={(e) => productChange("displayOrder", e.target.value)}
          />
          <label className={styles.wide}>
            Description
            <textarea
              value={data.product.description}
              onChange={(e) => productChange("description", e.target.value)}
              required
            />
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={data.product.isActive}
              onChange={(e) => productChange("isActive", e.target.checked)}
            />{" "}
            Active
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={data.product.isFeatured}
              onChange={(e) => productChange("isFeatured", e.target.checked)}
            />{" "}
            Featured
          </label>
        </div>
      </Section>
      <Section
        title="Colours"
        action={
          <button type="button" onClick={addColour}>
            Add colour
          </button>
        }
      >
        <div className={styles.colours}>
          {data.colours.map((c, i) => (
            <article key={c.clientId}>
              <Field
                label="Name"
                value={c.name}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    colours: d.colours.map((x) =>
                      x.clientId === c.clientId
                        ? {
                            ...x,
                            name: e.target.value,
                            slug: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-"),
                          }
                        : x,
                    ),
                  }))
                }
              />
              <Field
                label="Slug"
                value={c.slug}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    colours: d.colours.map((x) =>
                      x.clientId === c.clientId
                        ? { ...x, slug: e.target.value }
                        : x,
                    ),
                  }))
                }
              />
              <Field
                label="Hex"
                value={c.hexCode || ""}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    colours: d.colours.map((x) =>
                      x.clientId === c.clientId
                        ? { ...x, hexCode: e.target.value }
                        : x,
                    ),
                  }))
                }
              />
              {c.hexCode && (
                <span
                  className={styles.colourPreview}
                  style={{ backgroundColor: c.hexCode }}
                  aria-label={`${c.name} colour preview`}
                />
              )}
              <Field
                label="Display order"
                type="number"
                min="0"
                value={c.displayOrder}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    colours: d.colours.map((x) =>
                      x.clientId === c.clientId
                        ? { ...x, displayOrder: e.target.value }
                        : x,
                    ),
                  }))
                }
              />
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={c.isActive}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      colours: d.colours.map((x) =>
                        x.clientId === c.clientId
                          ? { ...x, isActive: e.target.checked }
                          : x,
                      ),
                    }))
                  }
                />{" "}
                Active
              </label>
              <label className={styles.check}>
                <input
                  type="radio"
                  name="default-colour"
                  checked={c.isDefault}
                  onChange={() => setDefaultColour(c.clientId)}
                />{" "}
                Default
              </label>
              <button
                type="button"
                disabled={data.colours.length === 1}
                onClick={() => removeColour(c.clientId)}
              >
                Remove
              </button>
              <small>Order {i + 1}</small>
            </article>
          ))}
        </div>
      </Section>
      <Section
        title="RAM & Storage Variants"
        action={
          <button type="button" onClick={addVariant}>
            Add variant
          </button>
        }
      >
        <div className={styles.variants}>
          {data.variants.map((v, vi) => (
            <article key={v.clientId}>
              <Field
                label="RAM"
                value={v.ram}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    variants: d.variants.map((x) =>
                      x.clientId === v.clientId
                        ? { ...x, ram: e.target.value }
                        : x,
                    ),
                  }))
                }
              />
              <Field
                label="Storage"
                value={v.storage}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    variants: d.variants.map((x) =>
                      x.clientId === v.clientId
                        ? { ...x, storage: e.target.value }
                        : x,
                    ),
                  }))
                }
              />
              <Field
                label="Display order"
                type="number"
                min="0"
                value={v.displayOrder}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    variants: d.variants.map((x) =>
                      x.clientId === v.clientId
                        ? { ...x, displayOrder: e.target.value }
                        : x,
                    ),
                  }))
                }
              />
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={v.isActive}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      variants: d.variants.map((x) =>
                        x.clientId === v.clientId
                          ? { ...x, isActive: e.target.checked }
                          : x,
                      ),
                    }))
                  }
                />{" "}
                Active
              </label>
              <label className={styles.check}>
                <input
                  type="radio"
                  name="default-variant"
                  checked={v.isDefault}
                  onChange={() => setDefaultVariant(v.clientId)}
                />{" "}
                Default
              </label>
              <button
                type="button"
                disabled={data.variants.length === 1}
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    variants: d.variants.filter(
                      (x) => x.clientId !== v.clientId,
                    ),
                  }))
                }
              >
                Remove
              </button>
              <small>Order {vi + 1}</small>
            </article>
          ))}
        </div>
      </Section>
      <Section
        title="Combination Matrix"
        action={
          <button type="button" onClick={copyFirstCombinationValues}>
            Copy price and stock to all
          </button>
        }
      >
        <div className={styles.matrix}>
          <div className={styles.matrixHead}>
            <span>RAM</span>
            <span>Storage</span>
            <span>Colour</span>
            <span>SKU</span>
            <span>Selling Price</span>
            <span>Original Price</span>
            <span>Stock</span>
            <span>Low Stock Threshold</span>
            <span>Active</span>
            <span>Images</span>
            <span>Status</span>
          </div>
          {combos.map(({ v, c, colour, vi, ci }) => (
            <div
              className={styles.matrixRow}
              key={c.clientId || `${v.clientId}-${c.colourClientId}`}
            >
              <b>{v.ram}</b>
              <b>{v.storage}</b>
              <b>{colour?.name}</b>
              <input
                aria-label="SKU"
                value={c.sku}
                onChange={(e) =>
                  updateCombo(vi, ci, "sku", e.target.value.toUpperCase())
                }
              />
              <input
                aria-label="Selling price"
                type="number"
                min="1"
                value={c.price}
                onChange={(e) => updateCombo(vi, ci, "price", e.target.value)}
              />
              <input
                aria-label="Original price"
                type="number"
                min="1"
                value={c.originalPrice}
                onChange={(e) =>
                  updateCombo(vi, ci, "originalPrice", e.target.value)
                }
              />
              <input
                aria-label="Stock"
                type="number"
                min="0"
                value={c.stock}
                onChange={(e) => updateCombo(vi, ci, "stock", e.target.value)}
              />
              <input
                aria-label="Low stock threshold"
                type="number"
                min="0"
                value={c.lowStockThreshold}
                onChange={(e) =>
                  updateCombo(vi, ci, "lowStockThreshold", e.target.value)
                }
              />
              <label className={styles.matrixToggle}>
                <input
                  aria-label={`Active ${v.ram} ${v.storage} ${colour?.name || "combination"}`}
                  type="checkbox"
                  checked={Boolean(c.isActive)}
                  onChange={(e) =>
                    updateCombo(vi, ci, "isActive", e.target.checked)
                  }
                />
              </label>
              <span className={styles.imageCount}>
                {c.images.length} image(s)
              </span>
              <span
                className={
                  isCombinationValid(c) ? styles.valid : styles.invalid
                }
              >
                {isCombinationValid(c) ? "Valid" : "Needs attention"}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section
        title="Images & Specifications for Each Combination"
        action={
          <button type="button" onClick={copyImagesByColour}>
            Copy images by colour
          </button>
        }
      >
        <div className={styles.imageGroups}>
          {combos.map(({ v, c, colour, vi, ci }) => (
            <article key={`images-${c.clientId}`}>
              <div className={styles.combinationHeader}>
                <h3>
                  {v.ram} / {v.storage} / {colour?.name}
                </h3>
                <button
                  type="button"
                  aria-pressed={specSourceId === c.clientId}
                  onClick={() => setSpecSourceId(c.clientId)}
                >
                  {specSourceId === c.clientId
                    ? "Selected copy source"
                    : "Use as copy source"}
                </button>
              </div>
              {c.images.map((im, ii) => (
                <div className={styles.imageRow} key={im.clientId || im.id}>
                  <ProductImageUploader
                    className={styles.variantUploader}
                    value={im.imageUrl}
                    productSlug={data.product.slug || data.product.name}
                    colourSlug={colour?.slug || colour?.name}
                    imageType={im.imageType}
                    imageKey={im.clientId || im.id || `${vi}-${ci}-${ii}`}
                    alt={im.altText || `${colour?.name} ${im.imageType}`}
                    onChange={(imageUrl) =>
                      updateImages(vi, ci, (ims) =>
                        ims.map((x, n) => (n === ii ? { ...x, imageUrl } : x)),
                      )
                    }
                    onRemove={() =>
                      removeCombinationImage(im.imageUrl, vi, ci, ii)
                    }
                  />
                  <input
                    aria-label="Alt text"
                    value={im.altText || ""}
                    onChange={(e) =>
                      updateImages(vi, ci, (ims) =>
                        ims.map((x, n) =>
                          n === ii ? { ...x, altText: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label="Image type"
                    value={im.imageType}
                    onChange={(e) =>
                      updateImages(vi, ci, (ims) =>
                        ims.map((x, n) =>
                          n === ii ? { ...x, imageType: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {["FRONT", "BACK", "SIDE", "ANGLE", "OTHER"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <label>
                    <input
                      type="radio"
                      name={`primary-${v.clientId}-${c.colourClientId}`}
                      checked={im.isPrimary}
                      onChange={() =>
                        updateImages(vi, ci, (ims) =>
                          ims.map((x, n) => ({ ...x, isPrimary: n === ii })),
                        )
                      }
                    />{" "}
                    Primary
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateImages(vi, ci, (ims) => [
                    ...ims,
                    {
                      ...defaultImage(),
                      isPrimary: false,
                      imageType: "OTHER",
                      displayOrder: ims.length,
                    },
                  ])
                }
              >
                Add image
              </button>
              <section className={styles.combinationSpecifications}>
                <div className={styles.specificationHeader}>
                  <div>
                    <h4>Specifications</h4>
                    <p>Only for this exact RAM, storage and colour.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateSpecifications(vi, ci, (rows) => [
                        ...rows,
                        newSpecification(rows.length),
                      ])
                    }
                  >
                    Add specification
                  </button>
                </div>
                <div className={styles.specCopyActions}>
                  <button
                    type="button"
                    disabled={!c.specifications?.length}
                    onClick={() => copySpecifications(c.clientId, "all")}
                  >
                    Copy to all combinations
                  </button>
                  <button
                    type="button"
                    disabled={!c.specifications?.length}
                    onClick={() => copySpecifications(c.clientId, "colour")}
                  >
                    Copy to same colour
                  </button>
                  <button
                    type="button"
                    disabled={!c.specifications?.length}
                    onClick={() => copySpecifications(c.clientId, "variant")}
                  >
                    Copy to same RAM/storage
                  </button>
                  <button
                    type="button"
                    disabled={!specSourceId || specSourceId === c.clientId}
                    onClick={() =>
                      copySpecifications(specSourceId, "target", c.clientId)
                    }
                  >
                    Copy from selected combination
                  </button>
                </div>
                <div className={styles.combinationSpecRows}>
                  {(c.specifications || []).map((specification, specIndex) => (
                    <div
                      className={styles.combinationSpecRow}
                      key={specification.clientId || specification.id}
                    >
                      <input
                        aria-label={`${v.ram} ${v.storage} ${colour?.name} specification key`}
                        placeholder="Display"
                        value={specification.key}
                        onChange={(event) =>
                          updateSpecifications(vi, ci, (rows) =>
                            rows.map((row, index) =>
                              index === specIndex
                                ? { ...row, key: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label={`${v.ram} ${v.storage} ${colour?.name} specification value`}
                        placeholder="6.9-inch AMOLED"
                        value={specification.value}
                        onChange={(event) =>
                          updateSpecifications(vi, ci, (rows) =>
                            rows.map((row, index) =>
                              index === specIndex
                                ? { ...row, value: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label={`${v.ram} ${v.storage} ${colour?.name} specification display order`}
                        type="number"
                        min="0"
                        value={specification.displayOrder}
                        onChange={(event) =>
                          updateSpecifications(vi, ci, (rows) =>
                            rows.map((row, index) =>
                              index === specIndex
                                ? { ...row, displayOrder: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateSpecifications(vi, ci, (rows) =>
                            rows.filter((_, index) => index !== specIndex),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {!c.specifications?.length && (
                    <p className={styles.emptySpecifications}>
                      {c.isActive
                        ? "Add at least one specification for this active combination."
                        : "No specifications added."}
                    </p>
                  )}
                </div>
              </section>
            </article>
          ))}
        </div>
      </Section>
      <Section
        title="Legacy Fallback Specifications"
        action={
          <button
            type="button"
            onClick={() =>
              setSpecRows((rows) => [
                ...rows,
                { id: uid("spec"), key: "", value: "" },
              ])
            }
          >
            Add specification
          </button>
        }
      >
        <div className={styles.specifications}>
          {specRows.length ? (
            specRows.map((row) => (
              <div className={styles.specRow} key={row.id}>
                <input
                  aria-label="Specification name"
                  placeholder="Display"
                  value={row.key}
                  onChange={(e) =>
                    setSpecRows((rows) =>
                      rows.map((x) =>
                        x.id === row.id ? { ...x, key: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Specification value"
                  placeholder="6.9-inch AMOLED"
                  value={row.value}
                  onChange={(e) =>
                    setSpecRows((rows) =>
                      rows.map((x) =>
                        x.id === row.id ? { ...x, value: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setSpecRows((rows) => rows.filter((x) => x.id !== row.id))
                  }
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p>No specifications added.</p>
          )}
        </div>
      </Section>
      <footer className={styles.actions}>
        <button type="button" onClick={() => router.push("/admin/products")}>
          Cancel
        </button>
        <button type="submit" disabled={saving}>
          {saving
            ? "Saving…"
            : edit
              ? "Save smartphone variants"
              : "Create smartphone"}
        </button>
      </footer>
    </form>
  );
}
function Section({ title, action, children }) {
  return (
    <section className={styles.section}>
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
function Field({ label, ...props }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
