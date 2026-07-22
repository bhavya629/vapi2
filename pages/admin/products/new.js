import AdminLayout from "@/components/admin/AdminLayout";
import ProductForm from "@/components/admin/ProductForm";
export default function NewProduct() {
  return (
    <AdminLayout title="Add Product" eyebrow="PRODUCT CATALOGUE">
      <ProductForm />
    </AdminLayout>
  );
}
