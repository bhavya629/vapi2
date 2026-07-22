import AdminLayout from "@/components/admin/AdminLayout";
import ContentManager from "@/components/admin/ContentManager";
export default function Coupons() {
  return (
    <AdminLayout title="Coupons" eyebrow="PROMOTIONS">
      <ContentManager type="coupon" />
    </AdminLayout>
  );
}
