import type { Metadata } from "next";
import MyDeskPage from "@/components/MyDeskPage";

export const metadata: Metadata = {
  title: "My Desk — Personal Literary Workspace · Between Letters",
  description:
    "Your little corner of the world. A place for thoughts, stories, and words worth keeping.",
};

export default function MyDeskRoutePage() {
  return <MyDeskPage />;
}
