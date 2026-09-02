import { forwardRef } from 'react';
import './occupancyDocument.css';
import type {
  OccupancyMonthBar,
  OccupancyReportResponse,
  OccupancyServiceRow,
} from '../../types/occupancyReport.types';

/**
 * «Charge des services» — the printable cross-service occupancy report.
 *
 * ⚠ **Every figure is inline SVG or a CSS box.** The page serializes this very node into a
 * standalone .html (see `common/utils/printableDocument`), so a canvas would serialize empty and a
 * charting library that measures the DOM on mount would draw nothing in a file opened elsewhere —
 * a document with holes where the charts were, and nothing anywhere saying so. It is also why
 * nothing here is theme-aware.
 *
 * ⚠ **Nothing is recomputed.** Peaks, saturations, overflows and the month bars all arrive computed,
 * from the same `OccupancyTimeline` the service page uses and the same capacity branch
 * `SchedulePublisher` takes. A document that measured the load differently from the guard would
 * explain a refusal with a number that never produced it.
 */

interface Props {
  report: OccupancyReportResponse;
  /** How many services the strip and the saturation chart draw before the tables take over. */
  chartLimit?: number;
}

const DEFAULT_CHART_LIMIT = 26;

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const printDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : '—');
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

/** The one place a fill ratio becomes a colour, so the strip, the bars and the legend agree. */
function fillClass(students: number, ceiling: number, overflow: number): 'ok' | 'tight' | 'over' {
  if (overflow > 0) return 'over';
  if (ceiling > 0 && students / ceiling > 0.85) return 'tight';
  return 'ok';
}

const FILL_COLOR: Record<'ok' | 'tight' | 'over' | 'unused', string> = {
  ok: '#1f8a5f',
  tight: '#c98a12',
  over: '#c0392b',
  unused: '#8896a4',
};

/**
 * One colour per promotion, assigned by position in the report's own `levels` list so a promotion
 * keeps the same colour across every figure in the document. Six is enough — a year never runs more
 * promotions than that at once — and the palette avoids the fill scale's green/amber/red so a
 * promotion is never mistaken for a saturation level.
 */
const LEVEL_PALETTE = ['#0f4c81', '#3d7ea6', '#7b5ea7', '#0d7f7f', '#a0522d', '#4a5568'];

const levelColors = (report: OccupancyReportResponse): Map<number, string> =>
  new Map(report.levels.map((l, i) => [l.levelId, LEVEL_PALETTE[i % LEVEL_PALETTE.length]]));

export const OccupancyDocument = forwardRef<HTMLDivElement, Props>(function OccupancyDocument(
  { report, chartLimit = DEFAULT_CHART_LIMIT }, ref,
) {
  const { totals } = report;
  const drawn = report.services.slice(0, chartLimit);
  const nothingPlanned = totals.placementCount === 0;

  return (
    <div className="charge-doc" ref={ref}>
      <header className="charge-doc__header">
        <h1 className="charge-doc__title">Charge des services hospitaliers</h1>
        <p className="charge-doc__scope">{report.scope}</p>
        <p className="charge-doc__issued">
          Année {report.academicYearLabel} — du {printDate(report.yearStart)} au{' '}
          {printDate(report.yearEnd)}. Édité le {dateFormat.format(new Date())}.
        </p>
      </header>

      {report.notes.length > 0 && (
        <div className="charge-doc__notes">
          {report.notes.map((note) => <p key={note}>{note}</p>)}
        </div>
      )}

      {/* ── Totals ─────────────────────────────────────────────────────────────────────────── */}
      <section className="charge-doc__section charge-doc__section--figure">
        <h2 className="charge-doc__h2">Vue d’ensemble</h2>
        {/* ⚠ « Étudiants placés » a été retiré et ne doit pas revenir. C'était la somme des effectifs
            de cohorte sur chaque cellule — donc un compte de *placements*, pas de personnes : 11 148
            pour 933 étudiants réels de 3ᵉ année, parce qu'un étudiant compte une fois par cellule
            qu'il occupe. Un chiffre qui ressemble à un effectif et n'en est pas est pire qu'un
            chiffre absent. Le pic simultané, lui, est une vraie mesure de personnes. */}
        <div className="charge-doc__stats">
          <Stat value={totals.servicesInScope}   label="services" />
          <Stat value={totals.servicesOccupied}  label="occupés" />
          <Stat value={totals.servicesNeverUsed} label="jamais utilisés"
                warn={totals.servicesNeverUsed > 0 && !nothingPlanned} />
          <Stat value={totals.servicesOverCapacity} label="en dépassement"
                warn={totals.servicesOverCapacity > 0} />
          <Stat value={totals.peakStudents}      label="pic simultané" accent />
          <Stat value={totals.placementCount}    label="cellules réparties" />
          <Stat value={totals.distinctStages}    label="stages" />
          <Stat value={totals.distinctLevels}    label="promotions" />
        </div>

        <p className="charge-doc__lede" style={{ marginTop: 8 }}>
          {nothingPlanned ? (
            <>
              Aucune cellule de répartition n’existe sur cette année, donc aucune charge à mesurer.
            </>
          ) : (
            <>
              Pic de présence simultanée&nbsp;:{' '}
              <strong>{totals.peakStudents.toLocaleString('fr-FR')} étudiants</strong>
              {totals.peakStart && (
                <>
                  , atteint du {printDate(totals.peakStart)} au {printDate(totals.peakEnd)}
                  {(totals.peakDays ?? 0) > 0 && <> — soit {totals.peakDays} jours à ce niveau</>}
                </>
              )}
              .{' '}
              {/* ⚠ « jours-service », jamais « jours » : un service au-dessus pendant dix jours et
                  dix services au-dessus pendant un jour donnent tous deux 10. */}
              Pression totale&nbsp;:{' '}
              <strong>
                {(totals.serviceDaysOverCapacity ?? 0).toLocaleString('fr-FR')} jours-service
              </strong>{' '}
              au-dessus d’une limite (un service, un jour = 1).
              {totals.servicesAdmittingNobody > 0 && (
                <> {totals.servicesAdmittingNobody} service(s) accueillent une promotion que leurs
                  quotas n’admettent pas — ce refus-là ne se force pas à la publication.</>
              )}
            </>
          )}
        </p>
      </section>

      {/* ── Chart 1 · the faculty's load, month by month ───────────────────────────────────── */}
      {report.months.length > 0 && (
        <section className="charge-doc__section charge-doc__section--figure">
          <h2 className="charge-doc__h2">Présence simultanée, mois par mois</h2>
          <p className="charge-doc__lede">
            ⚠ Chaque barre est le <strong>maximum</strong> atteint dans le mois, lu sur les
            intervalles exacts — pas une moyenne. Un mois dont une seule semaine est saturée se lit
            confortable en moyenne, et c’est cette semaine qu’il faut traiter.
          </p>
          <MonthChart report={report} />
          <LevelLegend report={report} />
        </section>
      )}

      {/* ── Chart 2 · the shape of the estate ──────────────────────────────────────────────── */}
      {!nothingPlanned && report.services.length > 1 && (
        <section className="charge-doc__section charge-doc__section--figure">
          <h2 className="charge-doc__h2">Répartition des services par taux d’occupation</h2>
          <p className="charge-doc__lede">
            Un classement montre les pires services&nbsp;; il ne montre pas que l’essentiel du parc
            est vide pendant qu’une poignée porte tout. C’est cette forme-là qui se corrige, et elle
            ne se voit que comme une distribution.
          </p>
          <SaturationHistogram report={report} />
        </section>
      )}

      {/* ── Chart 2 · saturation per service ───────────────────────────────────────────────── */}
      {drawn.length > 0 && !nothingPlanned && (
        <section className="charge-doc__section charge-doc__section--figure">
          <h2 className="charge-doc__h2">Pic d’occupation par service</h2>
          <p className="charge-doc__lede">
            Le trait pointillé est la limite en vigueur&nbsp;: la capacité du service quand il
            n’a pas de quota, sinon la somme des quotas des promotions réellement présentes — le seul
            dénominateur honnête quand le plafond est par promotion.
          </p>
          <ServiceBarChart services={drawn} />
          <Legend />
        </section>
      )}

      {/* ── Chart 3 · the year strip ───────────────────────────────────────────────────────── */}
      {/* Skipped outright when nothing is planned: twenty-six rows all reading « aucun occupant »
          is noise, and the note above already says why in one sentence. */}
      {drawn.length > 0 && !nothingPlanned && (
        <section className="charge-doc__section">
          <h2 className="charge-doc__h2">Occupation sur l’année, service par service</h2>
          <p className="charge-doc__lede">
            ⚠ Chaque bande est un intervalle pendant lequel les occupants <em>ne changent pas</em> —
            ce n’est pas une période de stage. Rien ne lie les périodes de deux stages entre elles,
            donc le pic se trouve dans leur <strong>chevauchement</strong>, qu’un tableau période par
            période ne montrerait jamais.
          </p>
          <YearStrip report={report} services={drawn} />
          <Legend />
        </section>
      )}

      {report.services.length > drawn.length && (
        <p className="charge-doc__lede" style={{ padding: '0 16px' }}>
          Les figures ci-dessus portent sur les {drawn.length} services les plus chargés&nbsp;; le
          tableau qui suit les liste tous ({report.services.length}).
        </p>
      )}

      {/* ── Table · services ───────────────────────────────────────────────────────────────── */}
      <section className="charge-doc__section">
        <h2 className="charge-doc__h2">Détail par service</h2>
        <table className="charge-doc__table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Hôpital</th>
              <th className="charge-doc__num">Pic</th>
              <th className="charge-doc__num">Limite</th>
              <th className="charge-doc__num">Taux</th>
              <th className="charge-doc__num">Jours &gt; limite</th>
              <th>Promotions</th>
            </tr>
          </thead>
          <tbody>
            {report.services.map((service) => (
              <tr key={service.serviceId}>
                <td>
                  {service.serviceName}
                  {service.levelsNotAdmitted.length > 0 && (
                    <>
                      {' '}
                      <span className="charge-doc__flag charge-doc__flag--closed">
                        n’admet pas {service.levelsNotAdmitted.join(', ')}
                      </span>
                    </>
                  )}
                </td>
                <td className="charge-doc__muted">
                  {service.hospitalName}
                  {service.hospitalCity && ` · ${service.hospitalCity}`}
                </td>
                <td className="charge-doc__num">
                  {service.segmentCount === 0 ? (
                    <span className="charge-doc__flag charge-doc__flag--unused">inutilisé</span>
                  ) : (
                    service.peakStudents
                  )}
                </td>
                <td className="charge-doc__num">
                  {service.ceiling > 0 ? service.ceiling : '—'}
                  {service.rule === 'PerLevel' && <span className="charge-doc__muted"> (quotas)</span>}
                </td>
                <td className="charge-doc__num">
                  {service.saturation != null ? `${Math.round(service.saturation * 100)} %` : '—'}
                </td>
                <td className="charge-doc__num">
                  {service.daysOverCapacity > 0 ? (
                    <span className="charge-doc__flag charge-doc__flag--over">
                      {service.daysOverCapacity}
                    </span>
                  ) : (
                    <span className="charge-doc__muted">0</span>
                  )}
                </td>
                <td className="charge-doc__muted">
                  {service.levels.length === 0
                    ? '—'
                    : service.levels.map((l) => `${l.levelLabel} (${l.peakStudents})`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Table · stages ─────────────────────────────────────────────────────────────────── */}
      {report.stages.length > 0 && (
        <section className="charge-doc__section">
          <h2 className="charge-doc__h2">Par stage — services autorisés et services utilisés</h2>
          <p className="charge-doc__lede">
            <strong>Placements</strong> = le nombre de cases occupées, pas un effectif&nbsp;: un
            étudiant compte une fois par créneau où il se trouve. Le nombre de personnes réellement
            présentes en même temps est le <strong>pic</strong>.
          </p>
          <p className="charge-doc__lede">
            ⚠ La colonne <strong>inutilisés</strong> est la raison d’être de ce rapport. Un stage qui
            liste cinq services et place tout le monde dans deux a un défaut de répartition
            qu’aucune fiche de service ne peut montrer&nbsp;: les trois autres ressemblent
            simplement à des services sans rien de prévu.
          </p>
          <table className="charge-doc__table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Promotion</th>
                <th className="charge-doc__num">Autorisés</th>
                <th className="charge-doc__num">Utilisés</th>
                <th className="charge-doc__num">Inutilisés</th>
                <th className="charge-doc__num">Placements</th>
                <th>Service le plus chargé</th>
              </tr>
            </thead>
            <tbody>
              {report.stages.map((stage) => (
                <tr key={stage.stageId}>
                  <td>{stage.stageName}</td>
                  <td className="charge-doc__muted">{stage.levelLabel}</td>
                  <td className="charge-doc__num">{stage.servicesAllowed}</td>
                  <td className="charge-doc__num">{stage.servicesUsed}</td>
                  <td className="charge-doc__num">
                    {stage.servicesUnused > 0 ? (
                      <span className="charge-doc__flag charge-doc__flag--over">
                        {stage.servicesUnused}
                      </span>
                    ) : (
                      <span className="charge-doc__muted">0</span>
                    )}
                  </td>
                  <td className="charge-doc__num">{stage.placedStudents}</td>
                  <td className="charge-doc__muted">
                    {stage.heaviestServiceName
                      ? `${stage.heaviestServiceName} — ${stage.heaviestServiceLoad} à la fois`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Table · promotions ─────────────────────────────────────────────────────────────── */}
      {report.levels.length > 0 && (
        <section className="charge-doc__section">
          <h2 className="charge-doc__h2">Par promotion</h2>
          <table className="charge-doc__table">
            <thead>
              <tr>
                <th>Promotion</th>
                <th className="charge-doc__num">Services utilisés</th>
                <th className="charge-doc__num">Cellules</th>
                <th className="charge-doc__num">Placements</th>
                <th className="charge-doc__num">Pic simultané</th>
                <th className="charge-doc__num">Services qui ne l’admettent pas</th>
              </tr>
            </thead>
            <tbody>
              {report.levels.map((level) => (
                <tr key={level.levelId}>
                  <td>{level.levelLabel}</td>
                  <td className="charge-doc__num">{level.servicesUsed}</td>
                  <td className="charge-doc__num">{level.cells}</td>
                  <td className="charge-doc__num">{level.placedStudents}</td>
                  <td className="charge-doc__num">{level.peakStudents}</td>
                  <td className="charge-doc__num">
                    {level.servicesNotAdmitting > 0 ? (
                      <span className="charge-doc__flag charge-doc__flag--closed">
                        {level.servicesNotAdmitting}
                      </span>
                    ) : (
                      <span className="charge-doc__muted">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="charge-doc__footer">
        La charge d’un service est comptée comme la garde de publication la compte&nbsp;: les
        affectations des cohortes présentes sur la fenêtre, et non les périodes déjà publiées. Un
        plan vaut d’être inspecté avant d’être publié. Un dépassement d’<em>effectif</em> se force à
        la publication&nbsp;; un refus d’<em>admission</em> ne se force pas.
      </footer>
    </div>
  );
});

// ─── Figures ─────────────────────────────────────────────────────────────────

function Stat({
  value, label, warn, accent,
}: { value: number; label: string; warn?: boolean; accent?: boolean }) {
  const modifier = warn ? ' charge-doc__stat--warn' : accent ? ' charge-doc__stat--accent' : '';

  return (
    <div className={`charge-doc__stat${modifier}`}>
      <b>{value.toLocaleString('fr-FR')}</b>
      <span>{label}</span>
    </div>
  );
}

/** Which colour is which promotion — the same mapping every figure in the document uses. */
function LevelLegend({ report }: { report: OccupancyReportResponse }) {
  const colors = levelColors(report);

  if (report.levels.length === 0) return null;

  return (
    <div className="charge-doc__legend">
      {report.levels.map((level) => (
        <span key={level.levelId}>
          <i style={{ background: colors.get(level.levelId) }} />
          {level.levelLabel} — pic {level.peakStudents.toLocaleString('fr-FR')}
        </span>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="charge-doc__legend">
      <span><i style={{ background: FILL_COLOR.ok }} />moins de 85 % de la limite</span>
      <span><i style={{ background: FILL_COLOR.tight }} />85 % et plus</span>
      <span><i style={{ background: FILL_COLOR.over }} />au-dessus de la limite</span>
      <span><i style={{ background: FILL_COLOR.unused }} />aucun occupant</span>
    </div>
  );
}

/**
 * The faculty's simultaneous load per month, **stacked by promotion**.
 *
 * ⚠ The split is read off the month's peak *segment*, so the parts add up to the total exactly. Each
 * promotion's own peak would sum to more than the whole, because two promotions do not peak on the
 * same day — a stacked bar whose parts do not add up is worse than no bar.
 */
function MonthChart({ report }: { report: OccupancyReportResponse }) {
  const width = 720;
  const height = 210;
  const padLeft = 38;
  const padRight = 8;
  const padTop = 14;
  const padBottom = 46;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const colors = levelColors(report);
  const max = Math.max(1, ...report.months.map((m) => m.peakStudents));

  // ⚠ Defaulted, not assumed. The AppHost is long-lived here, so an API still serving the previous
  // response shape is an ordinary state during development — and reading `.map` off an absent
  // collection takes the whole document down through the error boundary, which is what it did.
  const split = (m: OccupancyMonthBar) =>
    m.levels?.length ? m.levels : [{ levelId: 0, levelLabel: '', students: m.peakStudents }];
  const step = plotW / report.months.length;
  const barW = Math.max(3, Math.min(46, step * 0.6));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <svg className="charge-doc__chart" viewBox={`0 0 ${width} ${height}`} role="img"
         aria-label="Présence simultanée par mois, par promotion">
      {ticks.map((tick) => {
        const y = padTop + plotH - (tick / max) * plotH;
        return (
          <g key={tick}>
            <line className="charge-doc__gridline" x1={padLeft} x2={width - padRight} y1={y} y2={y} />
            <text className="charge-doc__tick" x={padLeft - 5} y={y + 3} textAnchor="end">
              {tick.toLocaleString('fr-FR')}
            </text>
          </g>
        );
      })}

      <line className="charge-doc__axis" x1={padLeft} x2={width - padRight}
            y1={padTop + plotH} y2={padTop + plotH} />

      {report.months.map((month, i) => {
        const x = padLeft + i * step + (step - barW) / 2;
        const centre = padLeft + i * step + step / 2;
        let cursor = padTop + plotH;

        return (
          <g key={month.label}>
            {split(month).map((level) => {
              const h = (level.students / max) * plotH;
              cursor -= h;
              return (
                <rect
                  key={level.levelId}
                  x={x}
                  y={cursor}
                  width={barW}
                  height={Math.max(0, h)}
                  fill={colors.get(level.levelId) ?? '#4a5568'}
                >
                  <title>{`${month.label} — ${level.levelLabel} : ${level.students}`}</title>
                </rect>
              );
            })}

            <text className="charge-doc__value" x={centre}
                  y={padTop + plotH - (month.peakStudents / max) * plotH - 4} textAnchor="middle">
              {month.peakStudents.toLocaleString('fr-FR')}
            </text>

            <text className="charge-doc__tick" x={centre} y={padTop + plotH + 13} textAnchor="middle">
              {month.label.split(' ')[0]}
            </text>
            <text className="charge-doc__tick" x={centre} y={padTop + plotH + 23} textAnchor="middle">
              {month.label.split(' ')[1]}
            </text>
            {month.servicesOverCapacity > 0 && (
              <text className="charge-doc__tick" x={centre} y={padTop + plotH + 35}
                    textAnchor="middle" fill={FILL_COLOR.over}>
                {month.servicesOverCapacity} sat.
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * How the 148 services actually distribute — the shape of the problem in one figure.
 *
 * A list ranked by saturation shows the worst; it does not show that **most of the estate is empty**
 * while a handful carries everything. That is the finding an administrator acts on, and it is only
 * visible as a distribution.
 */
function SaturationHistogram({ report }: { report: OccupancyReportResponse }) {
  const buckets = [
    { label: 'aucun occupant', color: FILL_COLOR.unused, n: report.services.filter((x) => x.segmentCount === 0).length },
    { label: '< 85 %',        color: FILL_COLOR.ok,     n: report.services.filter((x) => x.segmentCount > 0 && x.saturation != null && x.saturation < 0.85).length },
    { label: '85 – 100 %',    color: FILL_COLOR.tight,  n: report.services.filter((x) => x.saturation != null && x.saturation >= 0.85 && x.saturation <= 1).length },
    { label: '100 – 200 %',   color: FILL_COLOR.over,   n: report.services.filter((x) => x.saturation != null && x.saturation > 1 && x.saturation <= 2).length },
    { label: '> 200 %',       color: '#8e2419',         n: report.services.filter((x) => x.saturation != null && x.saturation > 2).length },
  ];

  const width = 720;
  const rowH = 26;
  const labelW = 118;
  const padRight = 44;
  const height = buckets.length * rowH + 6;
  const plotW = width - labelW - padRight;
  const max = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <svg className="charge-doc__chart" viewBox={`0 0 ${width} ${height}`} role="img"
         aria-label="Répartition des services par taux d’occupation">
      {buckets.map((bucket, i) => {
        const y = i * rowH + 4;
        const barH = rowH - 11;
        const barW = (bucket.n / max) * plotW;

        return (
          <g key={bucket.label}>
            <text className="charge-doc__tick" x={labelW - 8} y={y + barH - 1} textAnchor="end">
              {bucket.label}
            </text>
            <rect x={labelW} y={y} width={Math.max(bucket.n > 0 ? 2 : 0, barW)} height={barH}
                  fill={bucket.color} />
            <text className="charge-doc__value" x={labelW + Math.max(2, barW) + 6} y={y + barH - 1}>
              {bucket.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Peak against ceiling, one row per service.
 *
 * ⚠ The bar is clipped at the ceiling but the *number* is not. On a service holding 85 against 20 a
 * full bar says only « plein », which is what it also says at 21.
 */
function ServiceBarChart({ services }: { services: OccupancyServiceRow[] }) {
  const rowH = 15;
  const width = 720;
  const labelW = 168;
  const padRight = 46;
  const height = services.length * rowH + 8;
  const plotW = width - labelW - padRight;

  // Scaled on the worst case, ceiling included, so a service at 85/20 and one at 18/20 are on one
  // ruler — otherwise each bar is drawn against its own and the chart compares nothing.
  const max = Math.max(1, ...services.map((s) => Math.max(s.peakStudents, s.ceiling)));

  return (
    <svg className="charge-doc__chart" viewBox={`0 0 ${width} ${height}`} role="img"
         aria-label="Pic d’occupation par service">
      {services.map((service, i) => {
        const y = i * rowH + 4;
        const barH = rowH - 5;
        const barW = (service.peakStudents / max) * plotW;
        const ceilingX = labelW + (service.ceiling / max) * plotW;

        const cls = service.segmentCount === 0
          ? 'unused'
          : fillClass(service.peakStudents, service.ceiling, service.daysOverCapacity > 0 ? 1 : 0);

        return (
          <g key={service.serviceId}>
            <text className="charge-doc__tick" x={labelW - 6} y={y + barH - 2} textAnchor="end">
              {service.serviceName.length > 30
                ? `${service.serviceName.slice(0, 29)}…`
                : service.serviceName}
            </text>

            <rect className={`charge-doc__bar--${cls}`} x={labelW} y={y}
                  width={Math.max(1, barW)} height={barH} />

            {service.ceiling > 0 && (
              <line className="charge-doc__ceiling" x1={ceilingX} x2={ceilingX} y1={y - 1} y2={y + barH + 1} />
            )}

            <text className="charge-doc__value" x={width - padRight + 4} y={y + barH - 2}>
              {service.segmentCount === 0
                ? '—'
                : `${service.peakStudents}${service.ceiling > 0 ? ` / ${service.ceiling}` : ''}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * One row per service; each band positioned by its real dates across the academic year.
 *
 * This is the figure the per-service page cannot give: read down a column and you see which services
 * are full in the same fortnight, which is the question asked before moving a group.
 */
function YearStrip({
  report,
  services,
}: {
  report: OccupancyReportResponse;
  services: OccupancyServiceRow[];
}) {
  const start = day(report.yearStart);
  const end = day(report.yearEnd);
  const span = Math.max(1, end - start);

  const pct = (iso: string) => ((day(iso) - start) / span) * 100;

  // ⚠ The header used to carry one date range and nothing else, so a band's *position* said nothing:
  // you could see a service was full without being able to say when. The axis is the figure's whole
  // point, and it was missing.
  const ticks = monthTicks(report.yearStart, report.yearEnd).filter((t) => t.pct >= 0 && t.pct <= 100);

  return (
    <div className="charge-doc__strip">
      <div className="charge-doc__strip-head">Service</div>
      <div className="charge-doc__strip-head charge-doc__strip-axis">
        {ticks.map((tick) => (
          <span key={tick.key} className="charge-doc__strip-tick" style={{ left: `${tick.pct}%` }}>
            {tick.label}
          </span>
        ))}
      </div>
      <div className="charge-doc__strip-head charge-doc__strip-figure">Pic / limite</div>

      {services.map((service) => (
        <Row key={service.serviceId} service={service} pct={pct} ticks={ticks} />
      ))}
    </div>
  );

  function monthTicks(from: string, to: string) {
    const out: { key: string; label: string; pct: number }[] = [];
    const end = new Date(`${to}T00:00:00Z`);
    const cursor = new Date(`${from}T00:00:00Z`);
    cursor.setUTCDate(1);

    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      out.push({
        key: iso,
        // Just the initial in a strip this narrow: twelve « sept. » would collide, and the year is
        // already stated in the caption above.
        label: MONTH_INITIALS[cursor.getUTCMonth()],
        pct: ((day(iso) - start) / span) * 100,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return out;
  }

  function Row({
    service,
    pct: position,
    ticks: gridlines,
  }: {
    service: OccupancyServiceRow;
    pct: (iso: string) => number;
    ticks: { key: string; pct: number }[];
  }) {
    return (
      <>
        <div className="charge-doc__strip-name">
          {service.serviceName}
          <small>{service.hospitalName}</small>
        </div>

        <div className="charge-doc__strip-track">
          {/* Month gridlines behind the bands: without them a band's position is unreadable, which
              is exactly what made this figure « pas très claire ». */}
          {gridlines.map((tick) => (
            <span key={tick.key} className="charge-doc__strip-grid" style={{ left: `${tick.pct}%` }} />
          ))}
          {service.bands.length === 0 ? (
            <span className="charge-doc__strip-empty">aucun occupant de toute l’année</span>
          ) : (
            service.bands.map((band) => {
              const left = position(band.startDate);
              const right = position(band.endDate);

              return (
                <span
                  key={`${band.startDate}-${band.endDate}`}
                  className="charge-doc__strip-band"
                  style={{
                    left: `${Math.max(0, left)}%`,
                    width: `${Math.max(0.4, right - left)}%`,
                    background: FILL_COLOR[fillClass(band.students, service.ceiling, band.overflow)],
                  }}
                  title={`${printDate(band.startDate)} → ${printDate(band.endDate)} · ${band.students} étudiant(s)`}
                />
              );
            })
          )}
        </div>

        <div className="charge-doc__strip-figure">
          {service.segmentCount === 0
            ? '—'
            : `${service.peakStudents}${service.ceiling > 0 ? `/${service.ceiling}` : ''}`}
        </div>
      </>
    );
  }
}
