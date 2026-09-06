import Link from "next/link";

export function ContactNameLink({
  name,
  contactId,
}: {
  name: string;
  contactId?: string;
}) {
  if (!name) return <span className="text-slate-300">—</span>;
  if (!contactId) return <span className="text-slate-700">{name}</span>;
  return (
    <Link
      href={`/sales/contacts/detail/${contactId}`}
      className="font-medium text-[#5A32A3] hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {name}
    </Link>
  );
}
