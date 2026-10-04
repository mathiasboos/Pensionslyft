# Updating the Typfallsmodellen data

`src/data/typfall.json` holds the tables the calculator needs from Pensionsmyndighetens
typfallsmodell (index series, delningstal, arvsvinstfaktorer, municipal tax and riktåldrar).
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
