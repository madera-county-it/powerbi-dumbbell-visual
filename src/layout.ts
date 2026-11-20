"use strict";

import powerbi from "powerbi-visuals-api";
import { scaleBand, scaleLinear } from "d3-scale";
import { textMeasurementService } from "powerbi-visuals-utils-formattingutils";
import { ChartLayout, DumbbellViewModel, ValueFormatter } from "./types";
import { VisualFormattingSettingsModel } from "./settings";

/** Pure layout computation: view model + viewport + settings → margins & scales. */

export const FONT_FAMILY = "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif";
const MAX_CATEGORY_SHARE = 0.35;
const MIN_PLOT = 20;

let measureCtx: CanvasRenderingContext2D | null | undefined;
function getMeasureContext(): CanvasRenderingContext2D | null {
    if (measureCtx === undefined) {
        measureCtx = document.createElement("canvas").getContext("2d");
    }
    return measureCtx;
}

export function measureText(text: string, fontSize: number): number {
    // Canvas-based measurement: works even when the SVG isn't laid out yet
    // (SVG getBBox-based measurement can return 0, which truncated every label to "...").
    const ctx = getMeasureContext();
    if (ctx) {
        ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        return ctx.measureText(text).width;
    }
    return textMeasurementService.measureSvgTextWidth({
        text, fontFamily: FONT_FAMILY, fontSize: `${fontSize}px`
    });
}

const ELLIPSIS = "\u2026";

export function truncateText(text: string, fontSize: number, maxWidth: number): string {
    // +1px tolerance for sub-pixel rounding between layout and render.
    if (measureText(text, fontSize) <= maxWidth + 1) {
        return text;
    }
    let lo = 0, hi = text.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (measureText(text.slice(0, mid) + ELLIPSIS, fontSize) <= maxWidth) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    return lo > 0 ? text.slice(0, lo) + ELLIPSIS : ELLIPSIS;
}

export function computeLayout(
    vm: DumbbellViewModel,
    viewport: powerbi.IViewport,
    s: VisualFormattingSettingsModel,
    labelFormat: ValueFormatter
): ChartLayout | null {
    const { width, height } = viewport;
    const maxRadius = Math.max(s.startPoint.radius.value, s.endPoint.radius.value);

    let left = 4;
    if (s.categoryAxis.show.value) {
        const fs = s.categoryAxis.fontSize.value;
        const longest = vm.points.reduce((m, p) => Math.max(m, measureText(p.category, fs)), 0);
        left = Math.ceil(Math.min(longest, width * MAX_CATEGORY_SHARE)) + 12;
    }

    let top = 6;
    let bottom = s.valueAxis.show.value ? s.valueAxis.fontSize.value + 12 : 4;

    let legendY: number | null = null;
    if (s.legend.show.value) {
        const legendHeight = Math.max(s.legend.fontSize.value, Math.min(6, maxRadius) * 2) + 8;
        if (s.legend.position.value.value === "bottom") {
            legendY = height - legendHeight / 2;
            bottom += legendHeight;
        } else {
            legendY = legendHeight / 2;
            top += legendHeight;
        }
    }

    // Reserve horizontal room so the outermost dots and their labels are not clipped.
    let sidePad = maxRadius + 2;
    if (s.dataLabels.show.value) {
        const fs = s.dataLabels.fontSize.value;
        const w = Math.max(measureText(labelFormat(vm.min), fs), measureText(labelFormat(vm.max), fs));
        sidePad += w + 6;
    }
    const right = 8;

    const rangeStart = left + sidePad;
    const rangeEnd = width - right - sidePad;
    if (rangeEnd - rangeStart < MIN_PLOT || height - top - bottom < MIN_PLOT) {
        return null;
    }

    let [dMin, dMax] = [vm.min, vm.max];
    if (dMin === dMax) {
        const pad = Math.abs(dMin) * 0.1 || 1;
        dMin -= pad;
        dMax += pad;
    }

    const x = scaleLinear().domain([dMin, dMax]).range([rangeStart, rangeEnd]);
    const lo = s.valueAxis.min.value, hi = s.valueAxis.max.value;
    const custom = s.valueAxis.customRange.value && Number.isFinite(lo) && Number.isFinite(hi) && lo < hi;
    if (custom) {
        x.domain([lo, hi]);
    } else {
        x.nice();
    }
    const y = scaleBand<string>()
        .domain(vm.points.map(p => String(p.index)))
        .range([top, height - bottom])
        .paddingInner(0.2)
        .paddingOuter(0.1);

    return { width, height, margin: { top, right, bottom, left }, x, y, legendY, clipped: custom };
}
