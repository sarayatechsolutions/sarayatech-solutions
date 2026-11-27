import { useParams } from "react-router-dom";
import LocalPage from "@/pages/LocalPage";
import NotFound from "@/pages/NotFound";
import { PUBLISHED_AREAS } from "@/content/locations/locations";

/** /locations/:slug (STS-043). Only a published, owner-confirmed entry renders; any other slug is the 404 page. */
const AreaPage = () => {
  const { slug } = useParams();
  const entry = PUBLISHED_AREAS.find((e) => e.slug === slug);
  if (!entry) return <NotFound />;
  return <LocalPage entry={entry} kind="area" />;
};

export default AreaPage;
