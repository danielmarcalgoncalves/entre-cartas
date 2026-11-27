import type { Metadata } from "next";
import ExploreExperience from "@/components/explore/ExploreExperience";

export const metadata: Metadata = {
  title: "Explore My Journal",
  description:
    "Discover how Between Letters lets you keep personal leather-bound journals and scrapbook pages, and try the writing experience without logging in.",
};

export default function ExplorePage() {
  return <ExploreExperience />;
}
