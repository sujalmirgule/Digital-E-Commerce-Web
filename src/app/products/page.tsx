import { redirect } from "next/navigation";

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      params.set(key, value[0]);
    }
  }

  const queryStr = params.toString();
  redirect(queryStr ? `/discover?${queryStr}` : "/discover");
}
