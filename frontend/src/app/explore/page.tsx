import type { Metadata } from "next";
import ExploreExperience from "@/components/explore/ExploreExperience";

export const metadata: Metadata = {
  title: "Explore My Journal & My Letters",
  description:
    "Discover how Between Letters lets you keep personal journals and heartfelt letters, and try both writing experiences without logging in.",
};

export default function ExplorePage() {
  return <ExploreExperience />;
}
