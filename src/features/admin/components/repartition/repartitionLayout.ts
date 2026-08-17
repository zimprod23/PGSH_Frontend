import type { RepartitionRow } from '../../types/admin.types';

/**
 * How wide the répartition's columns have to be, and which partitions can be told apart by colour.
 *
 * Both answers depend on the promotion being printed, not on the template, which is why they are
 * computed rather than written into the stylesheet.
 */

/**
 * The group numbers of one cell, as the pieces a line may be broken between.
 *
 * The server has already collapsed consecutive runs (`GroupNumberRanges`), so a token is either a
 * number or a range. ⚠ A range must never be split across two lines: « 47- » at the end of one line
 * and « 50 » at the start of the next reads as two different things, and the cell is a promise about
 * which students go where.
 */
export const groupTokens = (groups: string): string[] =>
  groups.split(',').map((token) => token.trim()).filter(Boolean);

/**
 * The width one période column needs, in px.
 *
 * ⚠ **The cell is not one line.** A stage with few services and a whole promotion to place puts
 * every group of a partition in one cell — Médecine Sociale in the 5th year is a single service
 * taking 6 or 7 groups per période — and how long that reads depends on how the promotion was cut.
 * Contiguous partitions collapse to « 21-27 » (5 characters, which is what the faculty's own
 * document prints); interleaved ones cannot collapse at all and give « 3, 12, 21, 30, 39, 48, 57 »
 * — 25 characters in a column sized for 5. Held to one line with `nowrap`, that overflowed the cell
 * and painted over its neighbours, so the period a group was actually in became unreadable.
 *
 * The fix has two halves: the cell wraps (see `.repartition-doc__groups`), and the columns are sized
 * from the densest cell in *this* table so that wrapping stays a second line rather than a paragraph.
 * Two lines is the target — a column wide enough for the whole string would push a 9-column table
 * past 2,500px and shrink every service name to nothing.
 *
 * They stay **equal to each other** whatever their content: reading one période down the page is the
 * comparison this table exists for, and columns of different widths make it a guess.
 */
export function periodColumnWidth(rows: RepartitionRow[]): number {
  const MIN = 84;   // the pre-existing width, and enough for « 47-50 » with room to breathe
  const MAX = 168;  // past this the identity columns start losing service names
  const CHAR = 7;   // ≈ one tabular digit at 12px, plus the letter-spacing the cells carry

  let widest = 0;
  for (const row of rows)
    for (const cell of row.cells)
      if (cell) widest = Math.max(widest, cell.groups.length);

  return Math.min(MAX, Math.max(MIN, Math.round(22 + Math.ceil(widest / 2) * CHAR)));
}

/** The identity half of the table: stage, then service (hospital + chef). Fixed — it is the same
 * information whatever the promotion, and it is what the reader scans down. */
export const STAGE_COLUMN_PX = 132;
export const SERVICE_COLUMN_PX = 328;

/** How many tints the stage palette cycles through. */
export const STAGE_TINT_COUNT = 5;

/**
 * Which tint each stage prints in, in the order the stages appear down the page.
 *
 * ⚠ **The document is read by a student looking for his group, and a partition means nothing to
 * him.** It is an internal division scolarité makes to build the rotation — the reader's question is
 * "where am I in janvier", and what he navigates by is the *stage*. So the colour names the stage
 * block, and the partition is not mentioned at all. (It is still a real fact about a cell, and the
 * planning screens still show it — `ScheduleGridModal`, `AssignmentsPage`. It is the published
 * document that has no business printing it.)
 *
 * ⚠ **This is not the old per-row partition band coming back.** That one claimed a row belonged to
 * one partition, which is false — a row visits every partition over the year, and that is precisely
 * what the crossover is. A row *does* belong to exactly one stage, so tinting it by stage states
 * something true, and it states the same thing the first column already says in words.
 *
 * Which is why the palette may safely cycle where the partition palette could not: stages arrive in
 * contiguous blocks separated by a heavy rule, every row names its own, and the colour is a
 * navigation aid rather than a key. Two distant blocks sharing a tint costs nothing; a partition
 * palette that wrapped printed A and G identically under a legend swearing they differed.
 */
export function stageTints(rows: RepartitionRow[]): Map<number, number> {
  const tints = new Map<number, number>();
  for (const row of rows)
    if (!tints.has(row.stageId)) tints.set(row.stageId, tints.size % STAGE_TINT_COUNT);
  return tints;
}
