import type { LevelRepartitionResponse, RepartitionRow } from '../../types/admin.types';
import { levelTitle, printDate, yearHeading } from './repartitionLabels';
import './repartitionDocument.css';

/**
 * The published document itself, and nothing around it — no controls, no chrome.
 *
 * The same markup is printed, previewed and serialized into the standalone .html an admin uploads
 * to the faculty site (see `buildRepartitionFile`), so it stays plain elements with plain classes:
 * anything Mantine renders here would lose its styling the moment the file leaves the app.
 */

// The faculty's own letterhead. There is no institution entity in the schema and one faculty
// publishes these, so it lives here rather than being invented as configuration.
const INSTITUTION = 'Université Mohammed V de Rabat\nFaculté de Médecine et de Pharmacie';

/**
 * Which tint each partition prints in, mapped in first-seen order so the colours stay stable whatever
 * the faculty called its partitions.
 *
 * ⚠ **The band belongs to the cell, not to the row.** A row visits every partition over the year —
 * that is precisely what a crossover is — so "the row's partition" can only mean the one it opens on.
 * With two partitions that is the same thing as the stage: every Médecine row opens on A and every
 * Chirurgie row on B, so the table printed one colour per *stage* under a legend reading
 * « Partition A / Partition B ». Reading the labels off the cells, and tinting the cells, is what
 * makes the mirror visible instead of inventing a fact about the row.
 */
function bandIndexes(rows: RepartitionRow[]): Map<string, number> {
  const labels = [
    ...new Set(
      rows.flatMap((r) => r.cells.map((c) => c?.rotationGroup)).filter((l): l is string => !!l),
    ),
  ].sort();
  return new Map(labels.map((label, i) => [label, i % 6]));
}

interface Props {
  report: LevelRepartitionResponse;
}

export function RepartitionDocument({ report }: Props) {
  const bands = bandIndexes(report.rows);
  const hasTable = report.columns.length > 0 && report.rows.length > 0;
  const hasEmptyCell = report.summary.emptyCells > 0;

  // A planned cell whose cohorts come from more than one partition. Rare, and worth a key of its own:
  // untinted would otherwise be indistinguishable from "this promotion has no partitions at all".
  const hasMixedCell = report.rows.some((r) => r.cells.some((c) => c != null && c.rotationGroup == null));

  return (
    <div className="repartition-doc">
      <div className="repartition-doc__header">
        <div className="repartition-doc__institution">{INSTITUTION}</div>
        <div className="repartition-doc__title">
          <strong>{levelTitle(report.levelYear, report.program)}</strong>
          <span>Répartition annuelle des stages</span>
        </div>
        <div className="repartition-doc__year">
          Année universitaire: {yearHeading(report.academicYearLabel)}
        </div>
      </div>

      {!hasTable ? (
        <div className="repartition-doc__empty">
          {/* Two different states, and saying "aucune période" for both is what made a freshly applied
              axis read as though the apply had failed. The wording stays descriptive — this block is
              inside the document, which is the thing that gets exported; what to *do* about it belongs
              to the page around it. */}
          {report.summary.declaredSlotCount === 0
            ? `Aucune période n’est planifiée pour ce niveau en ${yearHeading(report.academicYearLabel)}.`
            : `Les périodes de ce niveau sont définies (${report.columns.length} colonne${
                report.columns.length > 1 ? 's' : ''
              }, ${report.summary.declaredSlotCount} créneau${
                report.summary.declaredSlotCount > 1 ? 'x' : ''
              }) mais aucun groupe n’y est encore réparti.`}
        </div>
      ) : (
        <div className="repartition-doc__scroll">
          <table style={{ minWidth: 520 + report.columns.length * 92 }}>
            {/* Explicit widths, because the period columns are what the reader compares down the
                page and they must be identical. Left to itself the table sized them from the service
                names and they came out ragged. The identity columns keep a fixed share; the periods
                split the rest evenly however many there are (4 for Med3, 10 for Med6). */}
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '31%' }} />
              {report.columns.map((column) => (
                <col key={`w-${column.index}`} style={{ width: `${60 / report.columns.length}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="repartition-doc__spacer" colSpan={2} />
                {report.columns.map((column) => (
                  <th key={`start-${column.index}`}>{printDate(column.startDate)}</th>
                ))}
              </tr>
              <tr>
                <th className="repartition-doc__spacer" colSpan={2} />
                {report.columns.map((column) => (
                  <th key={`end-${column.index}`} className="repartition-doc__date-to">
                    au {printDate(column.endDate)}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="repartition-doc__identity">Stage</th>
                <th className="repartition-doc__identity">Service (Chef de Service)</th>
                {report.columns.map((column) => (
                  <th
                    key={`label-${column.index}`}
                    className="repartition-doc__identity repartition-doc__identity--period"
                  >
                    Période {column.index}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, i) => (
                <tr
                  key={`${row.stageId}-${row.serviceId}`}
                  className={
                    // Rows arrive grouped by stage, so a change of stage is a block boundary and
                    // gets a heavier rule — the eye finds Chirurgie without reading the column.
                    i > 0 && report.rows[i - 1].stageId !== row.stageId
                      ? 'repartition-doc__row--stage-start'
                      : undefined
                  }
                >
                  <td className="repartition-doc__stage">{row.stageName}</td>
                  {/* Three facts of unequal weight in one cell: the service is what the reader is
                      looking for, the hospital locates it, the chef attributes it. */}
                  <td className="repartition-doc__service">
                    <span className="repartition-doc__hospital">{row.hospitalName}&nbsp;:</span>{' '}
                    {row.serviceName}
                    {row.chefName && (
                      <span
                        className="repartition-doc__chef"
                        // Native title, not a tooltip component: this renders once per row and the
                        // document is also written to a standalone file, where React is not around.
                        title={row.chefIsFromSourceNote
                          ? 'Nom repris de la fiche du service (import). Désignez un chef de service pour que cette attribution soit datée et survive à une réimpression.'
                          : undefined}
                      >
                        {' '}— {row.chefName}
                      </span>
                    )}
                  </td>
                  {row.cells.map((cell, index) => (
                    <td
                      key={report.columns[index].index}
                      className={[
                        'repartition-doc__groups',
                        cell ? '' : 'repartition-doc__groups--empty',
                        // A cell whose cohorts disagree on their partition gets no tint: the backend
                        // sends null rather than picking one, and inventing a colour here would undo
                        // that on the only surface anyone reads.
                        cell?.rotationGroup != null && bands.has(cell.rotationGroup)
                          ? `repartition-doc__cell--band-${bands.get(cell.rotationGroup)}`
                          : '',
                      ].filter(Boolean).join(' ')}
                      // The colour is a second encoding of a fact the cell does not otherwise state,
                      // so it is also written out for anyone reading in greyscale or with a reader.
                      title={cell?.rotationGroup ? `Partition ${cell.rotationGroup}` : undefined}
                    >
                      {cell?.groups ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The banding is the only information the document carries in colour alone, so it gets a
          key. Printed alongside the table, not in the app chrome, because the file is read away
          from here. */}
      {hasTable && (bands.size > 0 || hasEmptyCell) && (
        <div className="repartition-doc__legend">
          {[...bands.entries()].map(([label, index]) => (
            <span key={label} className="repartition-doc__legend-item">
              <span className={`repartition-doc__swatch repartition-doc__swatch--band-${index}`} />
              Partition {label}
            </span>
          ))}
          {hasMixedCell && (
            <span className="repartition-doc__legend-item">
              <span className="repartition-doc__swatch repartition-doc__swatch--mixed" />
              Partitions mêlées
            </span>
          )}
          {hasEmptyCell && (
            <span className="repartition-doc__legend-item">
              <span className="repartition-doc__swatch repartition-doc__swatch--empty" />
              Période non planifiée
            </span>
          )}
        </div>
      )}

      <div className="repartition-doc__footnote">
        <span>
          Les nombres désignent les numéros de groupe. Un intervalle « 47-50 » inclut les groupes
          47, 48, 49 et 50.
        </span>
        {hasTable && (
          <span>
            {report.summary.rowCount} service(s) · {report.summary.columnCount} période(s) ·{' '}
            {report.summary.groupCount} groupe(s)
          </span>
        )}
      </div>
    </div>
  );
}
