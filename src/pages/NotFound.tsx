import { Link } from "react-router-dom";
import Seo from "../components/ui/Seo";

export default function NotFound() {
  return (
    <>
      <Seo
        title="Page not found | Spire Hub"
        description="The page you were looking for doesn't exist."
        path="/404"
        noindex
      />
      <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-32 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-spire-blue">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-spire-navy">
          We couldn't find that page
        </h1>
        <p className="mt-4 text-spire-gray">
          The link may be broken or the page may have moved.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-lg bg-spire-navy px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to home
        </Link>
      </section>
    </>
  );
}
