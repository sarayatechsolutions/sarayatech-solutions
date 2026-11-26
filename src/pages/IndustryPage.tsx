import { useParams } from "react-router-dom";
import LocalPage from "@/pages/LocalPage";
import NotFound from "@/pages/NotFound";
import { INDUSTRIES_BASE_PATH, INDUSTRIES_HUB, PUBLISHED_INDUSTRIES } from "@/content/industries/industries";

/** /industries/:slug (STS-042). Only a published entry renders; any other slug is the 404 page. */
const IndustryPage = () => {
  const { slug } = useParams();
  const entry = PUBLISHED_INDUSTRIES.find((e) => e.slug === slug);
  if (!entry) return <NotFound />;
  return <LocalPage entry={entry} kind="industry" hub={{ label: INDUSTRIES_HUB.breadcrumbLabel, path: INDUSTRIES_BASE_PATH }} />;
};

export default IndustryPage;
