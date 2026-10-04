# Updating the Typfallsmodellen data

`src/data/typfall.json` holds the tables the calculator needs from Pensionsmyndighetens
typfallsmodell (index series, historical fund returns, delningstal, life expectancy,
arvsvinstfaktorer, municipal tax and riktåldrar).
To update it from a new version of the workbook:

```sh
mkdir /tmp/typfall && cp typfallsmodellen.xlsb /tmp/typfall/typfall.xlsb && cd /tmp/typfall
npm install xlsx@0.18.5          # only for this script; not a site dependency
node /path/to/repo/scripts/typfall/load.cjs      # writes sheets.json
python3 /path/to/repo/scripts/typfall/extract.py # writes typfall.json
cp typfall.json /path/to/repo/src/data/typfall.json
```

Do not commit the workbook itself.

`tests/fixtures/typfall-1959.json` is the model's own output (sheets Utdata and Start) for the
typfall that was last run in the workbook. `tests/typfall.test.ts` checks that the port gives the
same kronor. If the rules in the VBA code change, port the changes to `src/lib/typfall/` and
refresh the fixture from a new run.

## Municipal tax rates

`src/data/kommuner-2026.json` has the total municipal tax rate (kommun and region, without the church
and burial fees) of every municipality, from SCB's table "Totala kommunala skattesatser 2026,
kommunvis". It was taken from the model's web version (`typfallsmodellen.html`) and is not in the
workbook. Replace it with the new year's table when SCB publishes it; `tests/typfall-kommuner.test.ts`
checks the number of municipalities and SCB's highest and lowest rate.

## Checking against the web version

`tests/fixtures/typfall-web-mikrosim.json` has 188 rows with the results of Mikrosim in the model's web
version (`typfallsmodellen.html`) with the normal settings: born 1959-2005, ages, salaries up to 1,2
million, all eight occupational schemes, inflation, growth and return, and private saving.
`tests/typfall-mikrosim.test.ts` checks that the calculator gives the same kronor. To make more
rows, open the web version, choose Mikrosim, import a CSV file with the nine input columns and read
the result table. Where the web version and the VBA differ (the KAP-KL benefit part, and the base
amount of PA-KL), the calculator follows the web version.
