"use strict";

import { select, Selection } from "d3-selection";
import { ChartLayout, DumbbellDataPoint, DumbbellViewModel, ValueFormatter } from "../types";
import { VisualFormattingSettingsModel } from "../settings";
import { FONT_FAMILY, measureText, truncateText } from "../layout";

/** SVG drawing only. Knows nothing about the DataView or Power BI services. */

export type RowSelection = Selection<SVGGElement, DumbbellDataPoint, SVGGElement, unknown>;

interface LabelSpec { text: string; x: number; anchor: "start" | "end" }

let clipCounter = 0;

export class DumbbellRenderer {
    readonly svg: Selection<SVGSVGElement, unknown, null, undefined>;
    private readonly gridGroup: Selection<SVGGElement, unknown, null, undefined>;
    private readonly valueAxisGroup: Selection<SVGGElement, unknown, null, undefined>;
    private readonly categoryAxisGroup: Selection<SVGGElement, unknown, null, undefined>;
    private readonly majorGridGroup: Selection<SVGGElement, unknown, null, undefined>;
    private readonly clipRect: Selection<SVGRectElement, unknown, null, undefined>;
    private readonly legendGroup: Selection<SVGGElement, unknown, null, undefined>;
    private readonly rowsGroup: Selection<SVGGElement, unknown, null, undefined>;
    private readonly message: Selection<SVGTextElement, unknown, null, undefined>;

    constructor(container: HTMLElement) {
        this.svg = select(container).append("svg").classed("dumbbell-chart", true);
        const clipId = `dumbbell-clip-${++clipCounter}`;
        this.clipRect = this.svg.append("defs").append("clipPath").attr("id", clipId).append("rect");
        this.gridGroup = this.svg.append("g").classed("gridlines", true);
        this.majorGridGroup = this.svg.append("g").classed("gridlines-major", true);
        this.valueAxisGroup = this.svg.append("g").classed("value-axis", true);
        this.categoryAxisGroup = this.svg.append("g").classed("category-axis", true);
        this.rowsGroup = this.svg.append("g").classed("rows", true).attr("data-clip", clipId);
        this.legendGroup = this.svg.append("g").classed("legend", true);
        this.message = this.svg.append("text").classed("message", true)
            .attr("text-anchor", "middle").attr("dominant-baseline", "middle");
    }

    resize(width: number, height: number): void {
        this.svg.attr("width", width).attr("height", height);
    }

    /** Clears the chart and optionally shows a centred message. */
    clear(messageText = ""): void {
        this.gridGroup.selectAll("*").remove();
        this.majorGridGroup.selectAll("*").remove();
        this.valueAxisGroup.selectAll("*").remove();
        this.categoryAxisGroup.selectAll("*").remove();
        this.rowsGroup.selectAll("*").remove();
        this.legendGroup.selectAll("*").remove();
        const w = Number(this.svg.attr("width")) || 0;
        const h = Number(this.svg.attr("height")) || 0;
        this.message.text(messageText).attr("x", w / 2).attr("y", h / 2)
            .style("font-family", FONT_FAMILY);
    }

    render(
        vm: DumbbellViewModel,
        layout: ChartLayout,
        s: VisualFormattingSettingsModel,
        labelFormat: ValueFormatter,
        axisFormat: ValueFormatter
    ): RowSelection {
        this.message.text("");
        this.renderValueAxis(layout, s, axisFormat);
        this.renderCategoryAxis(vm, layout, s);
        this.applyClip(layout, s);
        this.renderLegend(vm, layout, s);
        return this.renderRows(vm, layout, s, labelFormat);
    }

    /** With a custom range, hide marks that fall outside the axis (edge dots stay whole). */
    private applyClip(layout: ChartLayout, s: VisualFormattingSettingsModel): void {
        if (!layout.clipped) {
            this.rowsGroup.attr("clip-path", null);
            return;
        }
        const r = Math.max(s.startPoint.radius.value, s.endPoint.radius.value);
        const [x0, x1] = layout.x.range();
        this.clipRect.attr("x", x0 - r).attr("y", 0)
            .attr("width", Math.max(0, x1 - x0 + 2 * r)).attr("height", layout.height);
        this.rowsGroup.attr("clip-path", `url(#${this.rowsGroup.attr("data-clip")})`);
    }

    private renderLegend(vm: DumbbellViewModel, layout: ChartLayout, s: VisualFormattingSettingsModel): void {
        this.legendGroup.selectAll("*").remove();
        if (layout.legendY === null) return;

        const fs = s.legend.fontSize.value;
        const gap = 16;
        const items = [
            { name: vm.startName, color: s.startPoint.color.value.value, r: Math.min(6, s.startPoint.radius.value) },
            { name: vm.endName, color: s.endPoint.color.value.value, r: Math.min(6, s.endPoint.radius.value) }
        ];
        // Each item gets at most half the width; long measure names are truncated.
        const maxText = Math.max(10, layout.width / 2 - gap - 2 * Math.max(...items.map(i => i.r)) - 6);
        const laid = items.map(i => {
            const text = truncateText(i.name, fs, maxText);
            return { ...i, text, w: i.r * 2 + 5 + measureText(text, fs) };
        });
        const total = laid.reduce((m, i) => m + i.w, 0) + gap * (laid.length - 1);
        let cursor = Math.max(4, (layout.width - total) / 2);
        const y = layout.legendY;

        for (const item of laid) {
            const g = this.legendGroup.append("g").classed("legend-item", true);
            g.append("circle")
                .attr("cx", cursor + item.r).attr("cy", y).attr("r", item.r)
                .style("fill", item.color);
            g.append("text")
                .attr("x", cursor + item.r * 2 + 5).attr("y", y)
                .attr("dominant-baseline", "central")
                .style("font-family", FONT_FAMILY)
                .style("font-size", `${fs}px`)
                .style("fill", s.legend.color.value.value)
                .text(item.text)
                .append("title").text(item.name);
            cursor += item.w + gap;
        }
    }

    private renderValueAxis(layout: ChartLayout, s: VisualFormattingSettingsModel, fmt: ValueFormatter): void {
        const { x, y, height, margin } = layout;
        const plotWidth = x.range()[1] - x.range()[0];
        const ticks = x.ticks(Math.max(2, Math.floor(plotWidth / 80)));
        const [yTop, yBottom] = [y.range()[0], y.range()[1]];

        this.gridGroup.selectAll<SVGLineElement, number>("line")
            .data(s.valueAxis.gridlines.value ? ticks : [])
            .join("line")
            .attr("x1", d => x(d)).attr("x2", d => x(d))
            .attr("y1", yTop).attr("y2", yBottom);

        // Emphasised gridlines at offset + k × interval.
        const interval = s.valueAxis.highlightInterval.value;
        const offset = s.valueAxis.highlightOffset.value || 0;
        const [d0, d1] = x.domain();
        const majors: number[] = [];
        if (s.valueAxis.highlight.value && interval > 0 && (d1 - d0) / interval <= 500) {
            const first = Math.ceil((d0 - offset) / interval - 1e-9);
            const last = Math.floor((d1 - offset) / interval + 1e-9);
            for (let k = first; k <= last; k++) majors.push(offset + k * interval);
        }
        this.majorGridGroup.selectAll<SVGLineElement, number>("line")
            .data(majors)
            .join("line")
            .attr("x1", d => x(d)).attr("x2", d => x(d))
            .attr("y1", yTop).attr("y2", yBottom)
            .style("stroke", s.valueAxis.highlightColor.value.value)
            .style("stroke-width", s.valueAxis.highlightWidth.value);

        const fs = s.valueAxis.fontSize.value;
        this.valueAxisGroup.selectAll<SVGTextElement, number>("text")
            .data(s.valueAxis.show.value ? ticks : [])
            .join("text")
            .attr("x", d => x(d))
            .attr("y", height - margin.bottom + fs + 4)
            .attr("text-anchor", "middle")
            .style("font-family", FONT_FAMILY)
            .style("font-size", `${fs}px`)
            .style("fill", s.valueAxis.color.value.value)
            .text(d => fmt(d));
    }

    private renderCategoryAxis(vm: DumbbellViewModel, layout: ChartLayout, s: VisualFormattingSettingsModel): void {
        const { y, margin } = layout;
        const fs = s.categoryAxis.fontSize.value;
        const maxWidth = margin.left - 10;
        this.categoryAxisGroup.selectAll<SVGTextElement, DumbbellDataPoint>("text")
            .data(s.categoryAxis.show.value ? vm.points : [], d => String(d.index))
            .join("text")
            .attr("x", margin.left - 6)
            .attr("y", d => (y(String(d.index)) ?? 0) + y.bandwidth() / 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "central")
            .style("font-family", FONT_FAMILY)
            .style("font-size", `${fs}px`)
            .style("fill", s.categoryAxis.color.value.value)
            .text(d => truncateText(d.category, fs, maxWidth))
            .each(function (d) {
                // Native SVG title gives the full label when truncated.
                select(this).selectAll("title").data([d.category]).join("title").text(t => t);
            });
    }

    private renderRows(
        vm: DumbbellViewModel,
        layout: ChartLayout,
        s: VisualFormattingSettingsModel,
        labelFormat: ValueFormatter
    ): RowSelection {
        const { x, y } = layout;
        const rStart = s.startPoint.radius.value;
        const rEnd = s.endPoint.radius.value;
        const cy = (d: DumbbellDataPoint) => (y(String(d.index)) ?? 0) + y.bandwidth() / 2;

        const rows = this.rowsGroup.selectAll<SVGGElement, DumbbellDataPoint>("g.row")
            .data(vm.points, d => String(d.index))
            .join(enter => {
                const g = enter.append("g").classed("row", true);
                g.append("rect").classed("hit-area", true);
                g.append("line").classed("connector", true);
                g.append("circle").classed("dot start", true);
                g.append("circle").classed("dot end", true);
                g.append("text").classed("label start", true);
                g.append("text").classed("label end", true);
                return g;
            });

        rows.attr("tabindex", 0)
            .attr("role", "option")
            .attr("aria-label", d => `${d.category}: ${vm.startName} ${d.start ?? "blank"}, ${vm.endName} ${d.end ?? "blank"}`);

        // Transparent rectangle hugging the dots + connector, so tooltips and clicks
        // only trigger near the actual marks (with a little slack for thin lines).
        const pad = 4;
        const hitHeight = Math.min(y.bandwidth(), Math.max(rStart, rEnd, s.connector.width.value / 2) * 2 + pad * 2);
        const extent = (d: DumbbellDataPoint): [number, number] | null => {
            const xs: number[] = [];
            if (d.start !== null) xs.push(x(d.start) - rStart, x(d.start) + rStart);
            if (d.end !== null) xs.push(x(d.end) - rEnd, x(d.end) + rEnd);
            return xs.length ? [Math.min(...xs) - pad, Math.max(...xs) + pad] : null;
        };
        rows.select<SVGRectElement>("rect.hit-area")
            .attr("display", d => extent(d) ? null : "none")
            .attr("x", d => extent(d)?.[0] ?? 0)
            .attr("y", d => cy(d) - hitHeight / 2)
            .attr("width", d => { const e = extent(d); return e ? e[1] - e[0] : 0; })
            .attr("height", hitHeight);

        rows.select<SVGLineElement>("line.connector")
            .attr("display", d => d.start !== null && d.end !== null ? null : "none")
            .attr("x1", d => x(d.start ?? 0))
            .attr("x2", d => x(d.end ?? 0))
            .attr("y1", cy).attr("y2", cy)
            .style("stroke", s.connector.color.value.value)
            .style("stroke-width", s.connector.width.value);

        rows.select<SVGCircleElement>("circle.start")
            .attr("display", d => d.start !== null ? null : "none")
            .attr("cx", d => x(d.start ?? 0)).attr("cy", cy).attr("r", rStart)
            .style("fill", s.startPoint.color.value.value);

        rows.select<SVGCircleElement>("circle.end")
            .attr("display", d => d.end !== null ? null : "none")
            .attr("cx", d => x(d.end ?? 0)).attr("cy", cy).attr("r", rEnd)
            .style("fill", s.endPoint.color.value.value);

        const showLabels = s.dataLabels.show.value;
        const fs = s.dataLabels.fontSize.value;
        const labelSpec = (d: DumbbellDataPoint, which: "start" | "end"): LabelSpec | null => {
            const v = which === "start" ? d.start : d.end;
            if (!showLabels || v === null) return null;
            const other = which === "start" ? d.end : d.start;
            const r = which === "start" ? rStart : rEnd;
            // Equal values: only the end label is drawn, to the right.
            if (other !== null && other === v && which === "start") return null;
            const onLeft = other !== null && v < other;
            return {
                text: labelFormat(v),
                x: onLeft ? x(v) - r - 4 : x(v) + r + 4,
                anchor: onLeft ? "end" : "start"
            };
        };

        for (const which of ["start", "end"] as const) {
            rows.select<SVGTextElement>(`text.label.${which}`)
                .each(function (d) {
                    const spec = labelSpec(d, which);
                    const t = select(this);
                    if (!spec) {
                        t.attr("display", "none").text("");
                        return;
                    }
                    t.attr("display", null)
                        .attr("x", spec.x)
                        .attr("y", cy(d))
                        .attr("text-anchor", spec.anchor)
                        .attr("dominant-baseline", "central")
                        .style("font-family", FONT_FAMILY)
                        .style("font-size", `${fs}px`)
                        .style("fill", s.dataLabels.color.value.value)
                        .text(spec.text);
                });
        }

        return rows;
    }
}
