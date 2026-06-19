import CompareClient from "./CompareClient";

type CompareSearchParams = {
  type?: string | string[];
  a?: string | string[];
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<CompareSearchParams>;
}) {
  const resolved = await searchParams;
  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;
  const a = Array.isArray(resolved.a) ? resolved.a[0] : resolved.a;

  return <CompareClient initialType={type} initialA={a} />;
}
