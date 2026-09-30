import PaymentStatus from "@/components/PaymentStatus";

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <div className="mx-auto max-w-md px-4 py-16 text-center"><PaymentStatus id={id ?? ""} /></div>;
}
