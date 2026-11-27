import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildHeadTags, getSeo } from "@/seo/seo";
import { applyHeadTags, applyJsonLd } from "@/seo/head";
import { buildJsonLd } from "@/seo/structuredData";

/**
 * Renders nothing; sets the head for the current route. Mounted once, inside the router
 * (STS-021), and keeps the JSON-LD in step with the route too (STS-024).
 */
const Seo = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    applyHeadTags(document, buildHeadTags(getSeo(pathname)));
    applyJsonLd(document, buildJsonLd(pathname));
  }, [pathname]);
  return null;
};

export default Seo;
