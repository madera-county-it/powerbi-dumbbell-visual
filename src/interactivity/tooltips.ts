"use strict";

import powerbi from "powerbi-visuals-api";
import { DumbbellDataPoint } from "../types";
import { RowSelection } from "../renderer/DumbbellRenderer";

import ITooltipService = powerbi.extensibility.ITooltipService;

/** Shows Power BI host tooltips for each dumbbell row. */
export function bindTooltips(rows: RowSelection, service: ITooltipService): void {
    if (!service.enabled()) return;

    const args = (event: PointerEvent, d: DumbbellDataPoint) => ({
        dataItems: d.tooltip,
        identities: [d.selectionId],
        coordinates: [event.clientX, event.clientY],
        isTouchEvent: event.pointerType === "touch"
    });

    rows
        .on("pointerover.tooltip", (event: PointerEvent, d) => service.show(args(event, d)))
        .on("pointermove.tooltip", (event: PointerEvent, d) => service.move(args(event, d)))
        .on("pointerout.tooltip", (event: PointerEvent) =>
            service.hide({ immediately: false, isTouchEvent: event.pointerType === "touch" }));
}
