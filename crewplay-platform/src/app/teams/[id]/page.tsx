import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamCoverImage } from "@/components/TeamCoverImage";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";
import { feeSummary, formatIntroduce } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const raw = await getTeamById(id);
  if (!raw) notFound();
  const team = enrichTeamFromIntro(raw);
  const lines = formatIntroduce(team.introduce);
  const fee = feeSummary(team);
  const mapQuery = encodeURIComponent(team.location || team.region);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/teams" className="text-sm text-brand-600 hover:underline">
        ← 返回列表
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative aspect-[21/9] bg-gradient-to-br from-brand-50 via-white to-brand-100 sm:aspect-[2/1]">
          <TeamCoverImage
            team={team}
            priority
            sizes="100vw"
            logoClassName="object-contain p-12 sm:p-16"
          />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              {team.sport}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{team.region}</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">{team.arena_name}</h1>
          {team.location && <p className="mt-2 text-slate-600">{team.location}</p>}
          {fee && <p className="mt-4 text-lg font-semibold text-brand-700">{fee}</p>}

          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-800">
            免預付 · 到場向團主繳費
          </p>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">團介紹</h2>
            <ul className="mt-3 space-y-1 text-sm leading-relaxed text-slate-700">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/book/${team.id}`}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-brand-700"
            >
              快速報名（現場付費）
            </Link>
            {mapQuery && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                地圖
              </a>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
