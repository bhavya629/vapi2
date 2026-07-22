import AdminLayout from "@/components/admin/AdminLayout";
import ContentManager from "@/components/admin/ContentManager";
export default function Banners() {
  return (
    <AdminLayout title="Homepage Banners" eyebrow="CONTENT">
      <ContentManager type="banner" />
    </AdminLayout>
  );
}
