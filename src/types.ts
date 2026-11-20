"use strict";

import powerbi from "powerbi-visuals-api";
import { ScaleBand, ScaleLinear } from "d3-scale";

import ISelectionId = powerbi.visuals.ISelectionId;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

export interface DumbbellDataPoint {
    category: string;
    start: number | null;
    end: number | null;
    /** True when the host is highlighting and this row is part of the highlight. */
    highlighted: boolean;
    selectionId: ISelectionId;
    tooltip: VisualTooltipDataItem[];
    /** Original index in the dataView (used for "data order" sorting). */
    index: number;
}

export interface DumbbellViewModel {
    points: DumbbellDataPoint[];
    min: number;
    max: number;
    startName: string;
    endName: string;
    hasHighlights: boolean;
    formatString: string | undefined;
}

export interface ChartLayout {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    x: ScaleLinear<number, number>;
    y: ScaleBand<string>;
    /** Vertical centre of the legend row, or null when hidden. */
    legendY: number | null;
    /** True when a custom axis range is set, so out-of-range marks must be clipped. */
    clipped: boolean;
}

/** Converts a raw value to a formatted string (shared by labels, axis, tooltips). */
export type ValueFormatter = (value: number) => string;
