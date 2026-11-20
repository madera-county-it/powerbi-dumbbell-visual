"use strict";

import powerbi from "powerbi-visuals-api";
import { DumbbellDataPoint, DumbbellViewModel, ValueFormatter } from "./types";
import { SortDirection, SortMode } from "./settings";

import DataView = powerbi.DataView;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;

/** Pure data transformation: DataView → view model. No DOM access. */

function toNumber(v: PrimitiveValue | undefined): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function findRole(columns: DataViewValueColumn[], role: string): DataViewValueColumn | undefined {
    return columns.find(c => c.source.roles?.[role]);
}

export interface TransformOptions {
    sortMode: SortMode;
    sortDirection: SortDirection;
    /** Tooltip formatter for a given column format string. */
    tooltipFormat: (formatString: string | undefined) => ValueFormatter;
}

export function transform(
    dataView: DataView | undefined,
    host: IVisualHost,
    opts: TransformOptions
): DumbbellViewModel | null {
    const categorical = dataView?.categorical;
    const categoryColumn = categorical?.categories?.[0];
    const values = categorical?.values ?? [];
    const startCol = findRole(values, "startValue");
    const endCol = findRole(values, "endValue");

    if (!categoryColumn || (!startCol && !endCol)) {
        return null;
    }

    const tooltipCols = values.filter(c => c.source.roles?.["tooltips"]);
    const hasHighlights = !!(startCol?.highlights || endCol?.highlights);
    const startFmt = opts.tooltipFormat(startCol?.source.format);
    const endFmt = opts.tooltipFormat(endCol?.source.format);

    let min = Infinity;
    let max = -Infinity;
    const points: DumbbellDataPoint[] = [];

    categoryColumn.values.forEach((rawCategory, i) => {
        const start = toNumber(startCol?.values[i]);
        const end = toNumber(endCol?.values[i]);
        const highlighted = hasHighlights && (
            toNumber(startCol?.highlights?.[i]) !== null || toNumber(endCol?.highlights?.[i]) !== null
        );
        const category = rawCategory === null || rawCategory === undefined ? "(Blank)" : String(rawCategory);

        for (const v of [start, end]) {
            if (v !== null) {
                min = Math.min(min, v);
                max = Math.max(max, v);
            }
        }

        const tooltip: powerbi.extensibility.VisualTooltipDataItem[] = [
            { displayName: categoryColumn.source.displayName, value: category, header: category }
        ];
        if (startCol) {
            tooltip.push({ displayName: startCol.source.displayName, value: start === null ? "(Blank)" : startFmt(start) });
        }
        if (endCol) {
            tooltip.push({ displayName: endCol.source.displayName, value: end === null ? "(Blank)" : endFmt(end) });
        }
        if (start !== null && end !== null) {
            const diff = end - start;
            tooltip.push({ displayName: "Difference", value: (diff > 0 ? "+" : "") + endFmt(diff) });
        }
        for (const col of tooltipCols) {
            const v = col.values[i];
            const n = toNumber(v);
            tooltip.push({
                displayName: col.source.displayName,
                value: n !== null ? opts.tooltipFormat(col.source.format)(n) : String(v ?? "(Blank)")
            });
        }

        points.push({
            category,
            start,
            end,
            highlighted,
            index: i,
            tooltip,
            selectionId: host.createSelectionIdBuilder()
                .withCategory(categoryColumn, i)
                .createSelectionId()
        });
    });

    if (!Number.isFinite(min)) {
        min = 0;
        max = 0;
    }

    sortPoints(points, opts.sortMode, opts.sortDirection);

    return {
        points,
        min,
        max,
        startName: startCol?.source.displayName ?? "Value 1",
        endName: endCol?.source.displayName ?? "Value 2",
        hasHighlights,
        formatString: startCol?.source.format ?? endCol?.source.format
    };
}

/** Sorts in place. Nulls always go last. "data" keeps Power BI's (user-sortable) order. */
export function sortPoints(points: DumbbellDataPoint[], mode: SortMode, direction: SortDirection): void {
    if (mode === "data") {
        if (direction === "desc") points.reverse();
        return;
    }
    const dir = direction === "asc" ? 1 : -1;
    const key = (p: DumbbellDataPoint): number | null => {
        switch (mode) {
            case "start": return p.start;
            case "end": return p.end;
            case "difference": return p.start !== null && p.end !== null ? p.end - p.start : null;
            default: return null;
        }
    };
    points.sort((a, b) => {
        if (mode === "category") {
            return dir * a.category.localeCompare(b.category, undefined, { numeric: true });
        }
        const ka = key(a);
        const kb = key(b);
        if (ka === null && kb === null) return a.index - b.index;
        if (ka === null) return 1;
        if (kb === null) return -1;
        return dir * (ka - kb) || a.index - b.index;
    });
}
