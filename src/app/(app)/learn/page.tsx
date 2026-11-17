import Link from "next/link";
import { NAV } from "@/lib/nav";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Learn" };

export default function Learn() {
  const groups = NAV.filter((g) => g.label === "Learn");
  return (
    <>
      <PageHeader title="Learn" intro="Choose a module, or start from a topic to see everything about it in one place." />
      {groups.map((g) => (
        <section key={g.label} className="mb-8">
          <h2 className="eyebrow mb-3">{g.label}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} className="card card-link flex h-full flex-col gap-3 p-4 ">
                  <it.icon size={22} className="text-primary" aria-hidden="true" />
                  <span className="font-semibold">{it.label}</span>
                  {it.soon && <span className="chip w-fit">Coming soon</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
