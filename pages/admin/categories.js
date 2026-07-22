import AdminLayout from "@/components/admin/AdminLayout";
import EntityManager from "@/components/admin/EntityManager";
export default function CategoriesAdmin() {
  return (
    <AdminLayout title="Categories" eyebrow="CATALOGUE STRUCTURE">
      <EntityManager type="category" />
    </AdminLayout>
  );
}
