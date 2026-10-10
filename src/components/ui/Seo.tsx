import { Head } from "vite-react-ssg";

const SITE_URL = "https://spire.bh";

interface SeoProps {
  title: string;
  description: string;
  /** Path with leading slash, e.g. "/coworking". */
  path: string;
  /** Optional JSON-LD object injected into the page head. */
  jsonLd?: Record<string, unknown>;
  image?: string;
  noindex?: boolean;
}

export default function Seo({
  title,
  description,
  path,
  jsonLd,
  image = `${SITE_URL}/og-image.jpg`,
  noindex = false,
}: SeoProps) {
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Spire Hub" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Head>
  );
}
