import { useRouter } from "next/router";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import ProductForm from "@/components/admin/ProductForm";
import { useAdminApi } from "@/hooks/useAdminApi";
export default function EditProduct() {
  const router = useRouter();
  const { data, loading, error, retry } = useAdminApi(
    router.isReady ? `/api/admin/products/${router.query.id}` : null,
  );
  return (
    <AdminLayout title="Edit Product" eyebrow="PRODUCT CATALOGUE">
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <ProductForm product={data.product} />
      )}
    </AdminLayout>
  );
}
