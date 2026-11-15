/**
 * Welsh coverage: how much of the live directory has Welsh text. Pure model so
 * the numbers and ranking can be tested without a database.
 */

export interface WelshCoverageBusinessInput {
  id: string;
  tradingName: string;
  slug: string;
  welshName: string | null;
  welshSummary: string | null;
  welshDescription: string | null;
  updatedAt: Date;
  services: number;
  servicesWithWelsh: number;
  photos: number;
  photosWithWelshAlt: number;
}

export interface WelshCoverageGaps {
  name: boolean;
  summary: boolean;
  description: boolean;
  services: number;
  photos: number;
}

export interface WelshCoverageRow {
  id: string;
  tradingName: string;
  slug: string;
  updatedAt: Date;
  gaps: WelshCoverageGaps;
  gapCount: number;
}

export interface CoverageFigure {
  label: string;
  covered: number;
  total: number;
  percent: number;
}

export interface WelshCoverage {
  figures: CoverageFigure[];
  rows: WelshCoverageRow[];
  businessesWithGaps: number;
  businessesTotal: number;
}

const blank = (value: string | null): boolean =>
  value === null || value.trim() === "";

export function percentOf(covered: number, total: number): number {
  return total <= 0 ? 100 : Math.round((covered / total) * 100);
}

export function buildWelshCoverage(
  inputs: readonly WelshCoverageBusinessInput[],
): WelshCoverage {
  const totals = {
    name: { covered: 0, total: 0 },
    summary: { covered: 0, total: 0 },
    description: { covered: 0, total: 0 },
    services: { covered: 0, total: 0 },
    photos: { covered: 0, total: 0 },
  };
  const rows: WelshCoverageRow[] = [];

  for (const input of inputs) {
    const gaps: WelshCoverageGaps = {
      name: blank(input.welshName),
      summary: blank(input.welshSummary),
      description: blank(input.welshDescription),
      services: Math.max(input.services - input.servicesWithWelsh, 0),
      photos: Math.max(input.photos - input.photosWithWelshAlt, 0),
    };
    totals.name.total += 1;
    totals.summary.total += 1;
    totals.description.total += 1;
    if (!gaps.name) totals.name.covered += 1;
    if (!gaps.summary) totals.summary.covered += 1;
    if (!gaps.description) totals.description.covered += 1;
    totals.services.total += input.services;
    totals.services.covered += input.services - gaps.services;
    totals.photos.total += input.photos;
    totals.photos.covered += input.photos - gaps.photos;

    const gapCount =
      Number(gaps.name) +
      Number(gaps.summary) +
      Number(gaps.description) +
      gaps.services +
      gaps.photos;
    if (gapCount > 0) {
      rows.push({
        id: input.id,
        tradingName: input.tradingName,
        slug: input.slug,
        updatedAt: input.updatedAt,
        gaps,
        gapCount,
      });
    }
  }

  // Most gaps first; recently updated (more likely to be active) breaks ties.
  rows.sort(
    (a, b) =>
      b.gapCount - a.gapCount ||
      b.updatedAt.getTime() - a.updatedAt.getTime() ||
      a.tradingName.localeCompare(b.tradingName, "en-GB"),
  );

  const figure = (
    label: string,
    value: { covered: number; total: number },
  ): CoverageFigure => ({
    label,
    covered: value.covered,
    total: value.total,
    percent: percentOf(value.covered, value.total),
  });

  return {
    figures: [
      figure("Business names", totals.name),
      figure("Summaries", totals.summary),
      figure("Descriptions", totals.description),
      figure("Services", totals.services),
      figure("Photo descriptions", totals.photos),
    ],
    rows,
    businessesWithGaps: rows.length,
    businessesTotal: inputs.length,
  };
}
