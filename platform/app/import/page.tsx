import { ImportForm } from "@/components/ImportForm";
import { ImportStatusList } from "@/components/ImportStatusList";
import { Page } from "@/components/Page";
import { getCatalog } from "@/lib/engine/data";
import { AUDIO_EXTENSIONS, listJobs, VIDEO_EXTENSIONS } from "@/lib/engine/importer";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Import | Knowledge Warranty" };

export default async function ImportPage() {
  const user = await currentUser();
  const catalog = getCatalog();
  const missions = catalog.missions.filter((m) => user.missions.includes(m.id)).map((m) => ({ id: m.id, name: m.name }));
  const people = catalog.people.map((p) => p.name);
  const me = catalog.people.find((p) => p.id === user.personId)?.name;
  const jobs = listJobs().filter((j) => j.user === user.email);

  return (
    <Page
      title="Import a"
      accent="meeting"
      intro="Add a recording to one of your missions. It is transcribed on Synchrone's own machine, indexed, and searchable a few minutes later. The same file is never imported twice."
      width="max-w-4xl"
    >
      <ImportForm
        missions={missions}
        people={people}
        me={me}
        accept={[...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS].map((e) => `.${e}`).join(",")}
      />
      <section className="mt-12">
        <h2 className="display text-2xl">Your imports</h2>
        <p className="mt-1 text-ink-soft">Each recording goes through transcription, then indexing. This list updates by itself.</p>
        <ImportStatusList key={jobs.map((j) => j.id + j.status).join()} initial={jobs} scope="import" />
      </section>
    </Page>
  );
}
