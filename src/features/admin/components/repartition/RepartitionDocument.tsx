import type { LevelRepartitionResponse } from '../../types/admin.types';
import { levelTitle, printDate, yearHeading } from './repartitionLabels';
import {
  SERVICE_COLUMN_PX,
  STAGE_COLUMN_PX,
  groupTokens,
  periodColumnWidth,
  stageTints,
} from './repartitionLayout';
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

interface Props {
  report: LevelRepartitionResponse;
}

export function RepartitionDocument({ report }: Props) {
  const tints = stageTints(report.rows);
  const hasTable = report.columns.length > 0 && report.rows.length > 0;
  const hasEmptyCell = report.summary.emptyCells > 0;

  // The geometry is a property of this promotion, not of the template: a 5th year whose Médecine
  // Sociale cell holds seven scattered group numbers needs columns a 3rd year does not.
  const periodPx = periodColumnWidth(report.rows);
  const tablePx = STAGE_COLUMN_PX + SERVICE_COLUMN_PX + report.columns.length * periodPx;
  const share = (px: number) => `${((px / tablePx) * 100).toFixed(3)}%`;

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
          <table style={{ minWidth: tablePx }}>
            {/* Explicit widths, because the période columns are what the reader compares down the
                page and they must be identical. Left to itself the table sized them from the service
                names and they came out ragged.

                Stated as shares of a px budget rather than as flat percentages: the identity columns
                need a fixed amount of room whatever the number of périodes (4 for Med3, 10 for Med6),
                while the périodes need a width that follows how much each cell actually has to say —
                see `periodColumnWidth`. Splitting a fixed 60% evenly gave a 5th-year column 81px for
                a cell reading « 3, 12, 21, 30, 39, 48, 57 ». */}
            <colgroup>
              <col style={{ width: share(STAGE_COLUMN_PX) }} />
              <col style={{ width: share(SERVICE_COLUMN_PX) }} />
              {report.columns.map((column) => (
                <col key={`w-${column.index}`} style={{ width: share(periodPx) }} />
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
                  className={[
                    // Rows arrive grouped by stage, so a change of stage is a block boundary and
                    // gets a heavier rule — the eye finds Chirurgie without reading the column.
                    i > 0 && report.rows[i - 1].stageId !== row.stageId
                      ? 'repartition-doc__row--stage-start'
                      : '',
                    // …and the block wears its own tint, for the same reason: the reader is a student
                    // hunting for his group, and the stage is what he navigates by.
                    `repartition-doc__row--tint-${tints.get(row.stageId) ?? 0}`,
                  ].filter(Boolean).join(' ')}
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
                      ].filter(Boolean).join(' ')}
                    >
                      {/* One span per run, so a line breaks *between* « 12 » and « 21 » and never
                          inside « 47-50 »: a range split across two lines reads as two ranges, and
                          the cell is a promise about which students go where. */}
                      {cell
                        ? groupTokens(cell.groups).map((token, i, all) => (
                            <span key={token} className="repartition-doc__grp">
                              {token}
                              {i < all.length - 1 ? ',' : ''}
                            </span>
                          ))
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The hatch is the one thing the document says in ink and nothing else, so it keeps its key.
          The stage tint needs none — every row names its stage in the first column, which is what
          made it safe to cycle the palette in the first place.

          There is deliberately no partition key here any more. A partition is scolarité's internal
          division for building the rotation; the reader of this page is a student looking for his
          own group, and naming a partition to him explains nothing he can act on. It is still shown
          where it is actionable — the planning grid and the affectations screen. */}
      {hasTable && hasEmptyCell && (
        <div className="repartition-doc__legend">
          <span className="repartition-doc__legend-item">
            <span className="repartition-doc__swatch repartition-doc__swatch--empty" />
            Période non planifiée
          </span>
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
