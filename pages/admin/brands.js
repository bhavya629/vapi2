import AdminLayout from "@/components/admin/AdminLayout";
import EntityManager from "@/components/admin/EntityManager";
export default function BrandsAdmin() {
  return (
    <AdminLayout title="Brands" eyebrow="CATALOGUE STRUCTURE">
      <EntityManager type="brand" />
    </AdminLayout>
  );
}
