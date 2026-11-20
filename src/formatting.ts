"use strict";

import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { ValueFormatter } from "./types";

/**
 * Builds a formatter honouring the model's format string, display units
 * (0 = auto, scaled from the largest magnitude) and decimal places.
 */
export function createFormatter(
    formatString: string | undefined,
    displayUnits: number,
    decimals: number | null,
    maxMagnitude: number,
    locale?: string
): ValueFormatter {
    const formatter = valueFormatter.create({
        format: formatString,
        value: displayUnits === 0 ? maxMagnitude : displayUnits,
        precision: decimals ?? undefined,
        cultureSelector: locale
    });
    return (v: number) => formatter.format(v);
}
