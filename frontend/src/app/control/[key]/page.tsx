import AdminControlWorkspace from "@/components/admin/AdminControlWorkspace";

export function generateStaticParams() {
  return [{ key: "panel" }];
}

export default function ControlPanelPage() {
  return <AdminControlWorkspace />;
}
