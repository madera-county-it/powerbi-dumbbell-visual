# Dumbbell Chart (Power BI custom visual)

![Version](https://img.shields.io/badge/version-1.0.0.0-blue) ![Power BI](https://img.shields.io/badge/Power%20BI-custom%20visual-F2C811?logo=powerbi&logoColor=black) ![License](https://img.shields.io/badge/license-MIT-green)

A dumbbell chart that compares two values for each category. Each row shows a dot for **Value 1**, a dot for **Value 2**, and a line joining them, which makes the gap between the two values easy to see. Typical uses are this year vs last year, target vs actual, or before vs after.

## Installing the visual

You need the visual's `.pbiviz` file. Either:

- **Download it:** get the latest `.pbiviz` from the [Releases](../../releases) page of this repository (under **Assets**), or
- **Build it yourself:** see [Building the visual](#building-the-visual).

Then add it to a report:

1. Open your report in **Power BI Desktop**, or open it in **Power BI Service** and select **Edit**.
2. In the **Visualizations** pane, select **…** (Get more visuals) → **Import a visual from a file**, and choose the `.pbiviz` file.
3. A new dumbbell icon appears in the Visualizations pane. Select it to add the visual to the page, then drag fields into **Category**, **Value 1** and **Value 2**.

The visual is saved inside the report, so anyone who opens the report sees it without importing it themselves. To upgrade, import the newer `.pbiviz` the same way; Power BI replaces the old one in that report.

> If your organization blocks uncertified visuals, a Power BI admin may need to allow it (*Admin portal → Tenant settings → Allow visuals created using the Power BI SDK*) or add it to the organizational visuals list (*Admin portal → Organizational visuals*), which makes it available to everyone without importing a file.

## Using the visual

### Fields

| Field well | Required | Description |
|---|---|---|
| **Category** | Yes | One row per category (up to 1,000). |
| **Value 1** | One of the two | First measure. |
| **Value 2** | One of the two | Second measure. |
| **Tooltips** | No | Extra measures shown in the tooltip. |

The order of the two values only matters for **Difference**, which is always calculated as *Value 2 − Value 1*. The legend and tooltips use the names of the measures you add.

### Format options

| Section | Options |
|---|---|
| **Legend** | Show, position (top/bottom), color, text size |
| **Value 1 point / Value 2 point** | Color, radius |
| **Connector line** | Color, width |
| **Data labels** | Show, color, text size, display units, decimal places |
| **Category axis** | Show, color, text size. Long labels are shortened with "…", and the full text shows on hover. |
| **Value axis** | Show, plus groups for **Labels** (color, text size), **Range** (custom min/max), **Gridlines** (on/off) and **Highlighted gridlines** (every *N* units starting from an offset, color, width) |
| **Tooltips** | Decimal places (Auto uses the measure's own format) |
| **Sorting** | By data order, category name, Value 1, Value 2 or difference; ascending or descending |

### Interaction

- Hover over a dumbbell to see its tooltip.
- Click a dumbbell to select it and filter the other visuals on the page. Ctrl+click adds to the selection, and clicking empty space clears it.
- Right-click opens the Power BI context menu.
- Rows can be reached with the keyboard: Tab to a row, then Enter or Space to select it.
- Highlights from other visuals on the page are supported.
- With a custom value-axis range, points outside the range are hidden at the axis edge.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- Power BI visuals tools: `npm install -g powerbi-visuals-tools`

### Building the visual

```bash
git clone <this repository's URL>
cd powerbi-dumbbell-visual
npm install            # install dependencies (once, and after package.json changes)
pbiviz package         # build the visual
```

The finished file is written to `dist/` (for example `dist/<name>.1.0.0.0.pbiviz`). Import it into Power BI as described in [Installing the visual](#installing-the-visual). Run `npm run lint` to check the code with ESLint.

### Testing in Power BI Service

> [!IMPORTANT]
> Live testing requires **Power BI developer mode** to be turned on in Power BI Service (*Settings → Developer → Power BI developer mode*). If the option is missing, a Power BI admin must first enable *Allow developer visuals for testing* in the tenant settings. See Microsoft's instructions: [Enable developer mode](https://learn.microsoft.com/power-bi/developer/visuals/environment-setup#enable-developer-mode).

`pbiviz start` serves the visual from your machine so Power BI Service can load it live. Changes you save are rebuilt and reloaded automatically.

1. **One-time setup:** install the local HTTPS certificate with `pbiviz --install-cert` and follow the prompts (on Windows, place it in *Trusted Root Certification Authorities*). Restart your browser afterwards.
2. Run `pbiviz start` and leave it running. To check the certificate, open <https://localhost:8080/assets> in the same browser; it should load without a security warning.
3. In Power BI Service, open any report you can edit (or create one from a dataset) and select **Edit**.
4. In the **Visualizations** pane, select the **Developer Visual** icon (the `</>` icon) and add fields as usual.
5. Edit code, save, and the visual refreshes. The toolbar above the developer visual has buttons to reload it and to toggle auto-reload.

> [!NOTE]
> The Developer Visual only works while `pbiviz start` is running, and only for you. It does not work in Power BI Desktop; to test there, or to share with others, build with `pbiviz package` and import the file from `dist/`.

### Changing the version

Update the version in **both** `visual.version` and the top-level `version` in [pbiviz.json](pbiviz.json), and in [package.json](package.json), plus the badge at the top of this file. Power BI only replaces an imported visual when the version number goes up.

## Version history

- **1.0.0.0**: Initial release.
  - Legend, custom value-axis range, highlighted gridline intervals and a tooltip decimal-places option.
  - Tooltips and clicks trigger only near the dumbbell itself.
  - Long category labels are shortened with "…", with the full text on hover.
