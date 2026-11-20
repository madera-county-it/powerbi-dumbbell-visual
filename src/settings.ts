"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import Card = formattingSettings.SimpleCard;
import Slice = formattingSettings.Slice;
import Model = formattingSettings.Model;
import ValidatorType = powerbi.visuals.ValidatorType;

/** Formatting model only — no rendering logic lives here. */

function numRange(min: number, max: number) {
    return {
        minValue: { type: ValidatorType.Min as const, value: min },
        maxValue: { type: ValidatorType.Max as const, value: max }
    };
}

class PointCard extends Card {
    color: formattingSettings.ColorPicker;
    radius: formattingSettings.NumUpDown;
    name: string = "";
    displayName: string = "";
    slices: Slice[] = [];

    constructor(name: string, displayName: string, defaultColor: string) {
        super();
        this.name = name;
        this.displayName = displayName;
        this.color = new formattingSettings.ColorPicker({
            name: "color", displayName: "Color", value: { value: defaultColor }
        });
        this.radius = new formattingSettings.NumUpDown({
            name: "radius", displayName: "Radius", value: 6, options: numRange(1, 30)
        });
        this.slices = [this.color, this.radius];
    }
}

class ConnectorCard extends Card {
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color", value: { value: "#B3B3B3" }
    });
    width = new formattingSettings.NumUpDown({
        name: "width", displayName: "Width", value: 3, options: numRange(1, 20)
    });
    name = "connector";
    displayName = "Connector line";
    slices: Slice[] = [this.color, this.width];
}

class DataLabelsCard extends Card {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });
    topLevelSlice = this.show;
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color", value: { value: "#444444" }
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Text size", value: 10, options: numRange(6, 40)
    });
    displayUnits = new formattingSettings.AutoDropdown({
        name: "displayUnits", displayName: "Display units", value: 0
    });
    decimals = new formattingSettings.NumUpDown({
        name: "decimals", displayName: "Decimal places", value: 0, options: numRange(0, 10)
    });
    name = "dataLabels";
    displayName = "Data labels";
    slices: Slice[] = [this.color, this.fontSize, this.displayUnits, this.decimals];
}

class CategoryAxisCard extends Card {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });
    topLevelSlice = this.show;
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color", value: { value: "#605E5C" }
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Text size", value: 11, options: numRange(6, 40)
    });
    name = "categoryAxis";
    displayName = "Category axis";
    slices: Slice[] = [this.color, this.fontSize];
}

class ValueAxisCard extends formattingSettings.CompositeCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });
    topLevelSlice = this.show;

    // Labels
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color", value: { value: "#605E5C" }
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Text size", value: 10, options: numRange(6, 40)
    });

    // Range
    customRange = new formattingSettings.ToggleSwitch({
        name: "customRange", displayName: "Custom range", value: false
    });
    min = new formattingSettings.NumUpDown({ name: "min", displayName: "Minimum", value: 0 });
    max = new formattingSettings.NumUpDown({ name: "max", displayName: "Maximum", value: 100 });

    // Gridlines
    gridlines = new formattingSettings.ToggleSwitch({
        name: "gridlines", displayName: "Gridlines", value: true
    });

    // Highlighted gridlines
    highlight = new formattingSettings.ToggleSwitch({
        name: "highlight", displayName: "Highlighted gridlines", value: false
    });
    highlightInterval = new formattingSettings.NumUpDown({
        name: "highlightInterval", displayName: "Every", value: 100,
        options: { minValue: { type: ValidatorType.Min, value: 0 } }
    });
    highlightOffset = new formattingSettings.NumUpDown({
        name: "highlightOffset", displayName: "Offset", value: 0
    });
    highlightColor = new formattingSettings.ColorPicker({
        name: "highlightColor", displayName: "Color", value: { value: "#8A8886" }
    });
    highlightWidth = new formattingSettings.NumUpDown({
        name: "highlightWidth", displayName: "Width", value: 1.5, options: numRange(0.5, 10)
    });

    name = "valueAxis";
    displayName = "Value axis";
    groups: formattingSettings.Group[] = [
        new formattingSettings.Group({
            name: "labels", displayName: "Labels", slices: [this.color, this.fontSize]
        }),
        new formattingSettings.Group({
            name: "range", displayName: "Range", topLevelSlice: this.customRange, slices: [this.min, this.max]
        }),
        new formattingSettings.Group({
            name: "gridlines", displayName: "Gridlines", topLevelSlice: this.gridlines, slices: []
        }),
        new formattingSettings.Group({
            name: "highlightedGridlines", displayName: "Highlighted gridlines", topLevelSlice: this.highlight,
            slices: [this.highlightInterval, this.highlightOffset, this.highlightColor, this.highlightWidth]
        })
    ];
}

export type LegendPosition = "top" | "bottom";
const legendPositionItems: powerbi.IEnumMember[] = [
    { value: "top", displayName: "Top" },
    { value: "bottom", displayName: "Bottom" }
];

class LegendCard extends Card {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });
    topLevelSlice = this.show;
    position = new formattingSettings.ItemDropdown({
        name: "position", displayName: "Position", items: legendPositionItems, value: legendPositionItems[0]
    });
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color", value: { value: "#605E5C" }
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Text size", value: 10, options: numRange(6, 40)
    });
    name = "legend";
    displayName = "Legend";
    slices: Slice[] = [this.position, this.color, this.fontSize];
}

const tooltipDecimalItems: powerbi.IEnumMember[] = [
    { value: "auto", displayName: "Auto" },
    ...[0, 1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), displayName: String(n) }))
];

class TooltipCard extends Card {
    decimals = new formattingSettings.ItemDropdown({
        name: "decimals", displayName: "Decimal places", items: tooltipDecimalItems, value: tooltipDecimalItems[0]
    });
    name = "tooltipFormat";
    displayName = "Tooltips";
    slices: Slice[] = [this.decimals];

    /** null = use the measure's own format. */
    get decimalPlaces(): number | null {
        const v = String(this.decimals.value?.value ?? "auto");
        return v === "auto" ? null : Number(v);
    }
}

export type SortMode = "data" | "category" | "start" | "end" | "difference";
export type SortDirection = "asc" | "desc";

const sortModeItems: powerbi.IEnumMember[] = [
    { value: "data", displayName: "Data order" },
    { value: "category", displayName: "Category name" },
    { value: "start", displayName: "Value 1" },
    { value: "end", displayName: "Value 2" },
    { value: "difference", displayName: "Difference (Value 2 − Value 1)" }
];
const sortDirectionItems: powerbi.IEnumMember[] = [
    { value: "asc", displayName: "Ascending" },
    { value: "desc", displayName: "Descending" }
];

class SortingCard extends Card {
    mode = new formattingSettings.ItemDropdown({
        name: "mode", displayName: "Sort by", items: sortModeItems, value: sortModeItems[0]
    });
    direction = new formattingSettings.ItemDropdown({
        name: "direction", displayName: "Direction", items: sortDirectionItems, value: sortDirectionItems[0]
    });
    name = "sorting";
    displayName = "Sorting";
    slices: Slice[] = [this.mode, this.direction];
}

export class VisualFormattingSettingsModel extends Model {
    startPoint = new PointCard("startPoint", "Value 1 point", "#118DFF");
    endPoint = new PointCard("endPoint", "Value 2 point", "#E66C37");
    legend = new LegendCard();
    connector = new ConnectorCard();
    dataLabels = new DataLabelsCard();
    categoryAxis = new CategoryAxisCard();
    valueAxis = new ValueAxisCard();
    tooltip = new TooltipCard();
    sorting = new SortingCard();

    cards: formattingSettings.Cards[] = [
        this.legend, this.startPoint, this.endPoint, this.connector, this.dataLabels,
        this.categoryAxis, this.valueAxis, this.tooltip, this.sorting
    ];
}
