import { PageHeader } from "@/components/ui";
import { ListeningLibrary } from "@/components/ListeningLibrary";
import { listeningResources, listeningVerifiedOn, listeningNote } from "@/lib/listening";

export const metadata = { title: "Listening" };

export default function Listening() {
  return (
    <>
      <PageHeader eyebrow="Skills" title="Listening library" intro="Hand-picked podcasts, talks and lessons from trusted providers, graded B2 to C2. Filter by level, type and accent, listen on the provider's site, then log your session so it counts in your progress." />
      <ListeningLibrary resources={listeningResources} verifiedOn={listeningVerifiedOn} note={listeningNote} />
    </>
  );
}
