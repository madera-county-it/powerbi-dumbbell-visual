"use strict";

import powerbi from "powerbi-visuals-api";
import { Selection } from "d3-selection";
import { DumbbellDataPoint } from "../types";
import { RowSelection } from "../renderer/DumbbellRenderer";

import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

const DIMMED_OPACITY = 0.3;

/**
 * Wires click / ctrl-click / keyboard selection, background clear, and context menu,
 * and applies dimming for both selection and host cross-highlighting.
 */
export class SelectionBehavior {
    private readonly manager: ISelectionManager;
    private rows: RowSelection | null = null;
    private hasHighlights = false;

    constructor(host: IVisualHost) {
        this.manager = host.createSelectionManager();
        // Fires when selection is restored by bookmarks or changed by the host.
        this.manager.registerOnSelectCallback(() => this.applyState());
    }

    bind(
        svg: Selection<SVGSVGElement, unknown, null, undefined>,
        rows: RowSelection,
        hasHighlights: boolean
    ): void {
        this.rows = rows;
        this.hasHighlights = hasHighlights;

        const selectRow = (d: DumbbellDataPoint, multi: boolean) => {
            this.manager.select(d.selectionId, multi).then(() => this.applyState());
        };

        rows.on("click", (event: MouseEvent, d) => {
            event.stopPropagation();
            selectRow(d, event.ctrlKey || event.metaKey || event.shiftKey);
        });

        rows.on("keydown", (event: KeyboardEvent, d) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                selectRow(d, event.ctrlKey || event.metaKey || event.shiftKey);
            }
        });

        rows.on("contextmenu", (event: MouseEvent, d) => {
            event.preventDefault();
            event.stopPropagation();
            this.manager.showContextMenu(d.selectionId, { x: event.clientX, y: event.clientY });
        });

        svg.on("click", () => {
            this.manager.clear().then(() => this.applyState());
        });

        svg.on("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            this.manager.showContextMenu({} as ISelectionId, { x: event.clientX, y: event.clientY });
        });

        this.applyState();
    }

    private applyState(): void {
        if (!this.rows) return;
        const selected = this.manager.getSelectionIds() as ISelectionId[];
        const hasSelection = selected.length > 0;
        const isSelected = (d: DumbbellDataPoint) => selected.some(id => id.equals(d.selectionId));

        this.rows
            .attr("aria-selected", d => hasSelection && isSelected(d))
            .style("opacity", d => {
                if (hasSelection) return isSelected(d) ? 1 : DIMMED_OPACITY;
                if (this.hasHighlights) return d.highlighted ? 1 : DIMMED_OPACITY;
                return 1;
            });
    }
}
