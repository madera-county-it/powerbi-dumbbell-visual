"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import { VisualFormattingSettingsModel, SortDirection, SortMode } from "./settings";
import { transform } from "./dataTransform";
import { computeLayout } from "./layout";
import { createFormatter } from "./formatting";
import { DumbbellRenderer } from "./renderer/DumbbellRenderer";
import { SelectionBehavior } from "./interactivity/selection";
import { bindTooltips } from "./interactivity/tooltips";

/**
 * Orchestrator: owns lifecycle and services, delegates to
 * dataTransform → layout → renderer → interactivity.
 */
export class Visual implements IVisual {
    private readonly host: IVisualHost;
    private readonly events: IVisualEventService;
    private readonly formattingSettingsService: FormattingSettingsService;
    private readonly renderer: DumbbellRenderer;
    private readonly selection: SelectionBehavior;
    private formattingSettings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.formattingSettingsService = new FormattingSettingsService();
        this.renderer = new DumbbellRenderer(options.element);
        this.selection = new SelectionBehavior(this.host);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            const dataView = options.dataViews?.[0];
            this.formattingSettings = this.formattingSettingsService
                .populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);
            const s = this.formattingSettings;
            const { width, height } = options.viewport;
            this.renderer.resize(width, height);

            const locale = this.host.locale;
            const vm = transform(dataView, this.host, {
                sortMode: s.sorting.mode.value.value as SortMode,
                sortDirection: s.sorting.direction.value.value as SortDirection,
                tooltipFormat: fmt => createFormatter(fmt, 1, s.tooltip.decimalPlaces, 0, locale)
            });

            if (!vm || vm.points.length === 0) {
                this.renderer.clear("Add a Category and Value 1 / Value 2 fields");
                this.events.renderingFinished(options);
                return;
            }

            const maxMagnitude = Math.max(Math.abs(vm.min), Math.abs(vm.max));
            const labelFormat = createFormatter(
                vm.formatString, Number(s.dataLabels.displayUnits.value) || 0, s.dataLabels.decimals.value, maxMagnitude, locale);
            const axisFormat = createFormatter(vm.formatString, 0, null, maxMagnitude, locale);

            const layout = computeLayout(vm, options.viewport, s, labelFormat);
            if (!layout) {
                this.renderer.clear(); // viewport too small to draw anything meaningful
                this.events.renderingFinished(options);
                return;
            }

            const rows = this.renderer.render(vm, layout, s, labelFormat, axisFormat);
            // Interactions are disabled in some hosts (e.g. dashboard tiles).
            if (this.host.hostCapabilities.allowInteractions !== false) {
                this.selection.bind(this.renderer.svg, rows, vm.hasHighlights);
            }
            bindTooltips(rows, this.host.tooltipService);

            this.events.renderingFinished(options);
        } catch (error) {
            console.error("Dumbbell visual update failed", error);
            this.events.renderingFailed(options, String(error));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
