// The calculators of the site that are re-written in React from a file in github.com/mathiasboos/Calculators cannot be
// fetched like the Pensionsplaneraren and the Typfallsmodellen, so they cannot update themselves. src/data/ported-sources.json
// says which file each of them was ported from and the commit of that file the port was last checked against (the commit
// that last changed the file); scripts/check-ported-sources.mjs compares that with the file on `main` today, and the
// GitHub Action .github/workflows/watch-calculators.yml opens an issue for every file that has changed since. These are the
// plain functions of that, tested in tests/ported-sources.test.ts.

export const ISSUE_PREFIX = "Originalen har ändrats: ";

/**
 * The sources whose file has a newer commit than the one the port was checked against, with what is new.
 * `latest` maps a file name to `{ commit, committedAt, subject }`, or to nothing if the file is gone from `main`.
 */
export function findChanged(sources, latest) {
  return sources.flatMap((source) => {
    const now = latest[source.file];
    if (!now) return [{ ...source, missing: true }];
    return now.commit === source.commit ? [] : [{ ...source, latest: now }];
  });
}

export function issueTitle(source) {
  return `${ISSUE_PREFIX}${source.calculator}`;
}

/** The text of the issue, in Swedish like the other issues the Actions open. */
export function issueBody(source, repository) {
  const file = `\`${source.file}\``;
  const lines = source.missing
    ? [`Filen ${file} finns inte längre på \`main\` i ${repository}. Kalkylatorn ${source.calculator} på sajten (${source.page}) bygger på den.`]
    : [
        `Filen ${file} i ${repository} har ändrats sedan ${source.calculator} på sajten (${source.page}) senast stämdes av mot den.`,
        "",
        `- Senaste ändringen: [${source.latest.commit.slice(0, 7)}](${repository}/commit/${source.latest.commit}) – ${source.latest.subject} (${source.latest.committedAt.slice(0, 10)})`,
        `- Alla ändringar sedan senaste avstämningen: ${repository}/compare/${source.commit}...${source.latest.commit}`,
      ];
  return [
    ...lines,
    "",
    `Sajtens version är omskriven i React och uppdateras därför inte av sig själv. Portad kod: ${source.port.map((p) => `\`${p}\``).join(", ")}.`,
    "",
    "Säg till Claude att porta ändringen. Då uppdateras kalkylatorn, testerna och `src/data/ported-sources.json`, och ärendet stängs av sig självt vid nästa kontroll.",
  ].join("\n");
}
