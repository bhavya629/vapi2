import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiRefreshCw } from "react-icons/fi";
import AdminState from "./AdminState";
import ConfirmDialog from "./ConfirmDialog";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";

export default function EntityManager({ type }) {
  const plural = type === "brand" ? "brands" : "categories";
  const { data, loading, error, retry } = useAdminApi(`/api/admin/${plural}`);
  const [editing, setEditing] = useState(null), [confirm, setConfirm] = useState(null), [saving, setSaving] = useState(false), [fields, setFields] = useState({});
  const items = data?.[plural] || [];
  const open = (item) => {
    const base = { name: item?.name || "", slug: item?.slug || "", description: item?.description || "", isActive: item?.isActive ?? true, displayOrder: item?.displayOrder || 0 };
    setEditing({ ...base, ...(item?.id ? { id: item.id } : {}), ...(type === "brand" ? { logoUrl: item?.logoUrl || "" } : { imageUrl: item?.imageUrl || "", productType: item?.productType || "ACCESSORY" }) });
    setFields({});
  };
  const submit = async (event) => { event.preventDefault(); setSaving(true); setFields({}); try { const { id, ...payload } = editing; await adminRequest(id ? `/api/admin/${plural}/${id}` : `/api/admin/${plural}`, id ? "PATCH" : "POST", payload); toast.success(`${type === "brand" ? "Brand" : "Category"} saved.`); setEditing(null); retry(); } catch (requestError) { setFields(requestError.fields || { _form: requestError.message }); toast.error(requestError.message); } finally { setSaving(false); } };
  const toggle = async () => { setSaving(true); try { await adminRequest(`/api/admin/${plural}/${confirm.id}`, "PATCH", { isActive: !confirm.isActive }); toast.success(confirm.isActive ? "Deactivated." : "Reactivated."); setConfirm(null); retry(); } catch (requestError) { toast.error(requestError.message); } finally { setSaving(false); } };
  return <>
    <button className={styles.primary} onClick={() => open()}><FiPlus /> Add {type === "brand" ? "Brand" : "Category"}</button><div style={{ height: 16 }} />
    {loading || error ? <AdminState loading={loading} error={error} retry={retry} /> : !items.length ? <AdminState empty={`No ${plural} found.`} /> : <div className={styles.cards}>{items.map((item) => <article className={styles.entityCard} key={item.id}><div className={styles.entityCardTop}>{(item.logoUrl || item.imageUrl) ? <Image src={item.logoUrl || item.imageUrl} alt="" width={70} height={45} unoptimized /> : <span />}<span className={`${styles.badge} ${item.isActive ? styles.activeBadge : styles.inactiveBadge}`}>{item.isActive ? "Active" : "Inactive"}</span></div><h2>{item.name}</h2><p>{item.description || "No description provided."}</p><div className={styles.entityMeta}><span>{item.productType || "Brand"}</span><strong>{item.productCount} products</strong></div><div className={styles.actions}><button onClick={() => open(item)}><FiEdit2 /> Edit</button><button onClick={() => setConfirm(item)}><FiRefreshCw /> {item.isActive ? "Deactivate" : "Reactivate"}</button></div></article>)}</div>}
    {editing && <div className={styles.dialogBack}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="entity-title"><h2 id="entity-title">{editing.id ? "Edit" : "Add"} {type === "brand" ? "Brand" : "Category"}</h2><form className={styles.modalForm} onSubmit={submit}><Field label="Name" value={editing.name} onChange={(value) => setEditing((item) => ({ ...item, name: value }))} error={fields.name} /><Field label="Slug (optional)" value={editing.slug} onChange={(value) => setEditing((item) => ({ ...item, slug: value }))} error={fields.slug} />{type === "category" && <label className={styles.field}>Product type<select value={editing.productType} onChange={(event) => setEditing((item) => ({ ...item, productType: event.target.value }))}><option value="SMARTPHONE">Smartphone</option><option value="ACCESSORY">Accessory</option></select>{fields.productType && <span>{fields.productType}</span>}</label>}<Field label={type === "brand" ? "Logo URL/path" : "Image URL/path"} value={(type === "brand" ? editing.logoUrl : editing.imageUrl) || ""} onChange={(value) => setEditing((item) => ({ ...item, [type === "brand" ? "logoUrl" : "imageUrl"]: value }))} error={fields.logoUrl || fields.imageUrl} /><Field label="Description" value={editing.description} onChange={(value) => setEditing((item) => ({ ...item, description: value }))} /><Field label="Display order" type="number" value={editing.displayOrder} onChange={(value) => setEditing((item) => ({ ...item, displayOrder: Number(value) }))} />{fields._form && <p>{fields._form}</p>}<div><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className={styles.primary} disabled={saving}>{saving ? "Saving..." : "Save"}</button></div></form></section></div>}
    {confirm && <ConfirmDialog title={`${confirm.isActive ? "Deactivate" : "Reactivate"} ${confirm.name}?`} message={confirm.isActive ? `This ${type} has ${confirm.activeProductCount ?? confirm.productCount} active products. The record will be retained.` : "The record will become available for catalogue management again."} confirmLabel={confirm.isActive ? "Deactivate" : "Reactivate"} onCancel={() => setConfirm(null)} onConfirm={toggle} busy={saving} />}
  </>;
}
function Field({ label, error, onChange, ...props }) { return <label className={styles.field}>{label}<input {...props} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />{error && <span>{error}</span>}</label>; }
