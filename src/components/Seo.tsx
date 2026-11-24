import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildHeadTags, getSeo } from "@/seo/seo";
import { applyHeadTags } from "@/seo/head";

/** Renders nothing; sets the head for the current route. Mounted once, inside the router (STS-021). */
const Seo = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    applyHeadTags(document, buildHeadTags(getSeo(pathname)));
  }, [pathname]);
  return null;
};

export default Seo;
