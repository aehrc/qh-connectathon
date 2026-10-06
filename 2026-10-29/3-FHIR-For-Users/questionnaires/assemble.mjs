// Assemble pam-root.json + modules/*.json into pam-assembled.json with @aehrc/sdc-assemble,
// the same library behind the Smart Forms $assemble service.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { assemble } from '@aehrc/sdc-assemble';

const here = new URL('.', import.meta.url);
const root = JSON.parse(readFileSync(new URL('pam-root.json', here)));
const modules = readdirSync(new URL('modules/', here))
  .map((f) => JSON.parse(readFileSync(new URL(`modules/${f}`, here))));

// The callback receives "url&version=x" and must return a searchset Bundle
const fetchQuestionnaire = async (canonical) => {
  const [url, version] = canonical.split('&version=');
  const found = modules.filter((m) => m.url === url && (!version || m.version === version));
  return { resourceType: 'Bundle', type: 'searchset', total: found.length, entry: found.map((resource) => ({ resource })) };
};

const result = await assemble({ resourceType: 'Parameters', parameter: [{ name: 'questionnaire', resource: root }] }, fetchQuestionnaire, {});
const assembled = result.resourceType === 'Parameters' ? result.parameter.find((p) => p.name === 'response')?.resource ?? result.parameter[0].resource : result;
const issues = result.resourceType === 'Parameters' ? result.parameter.find((p) => p.name === 'outcome')?.resource : null;
if (assembled.resourceType !== 'Questionnaire') {
  console.error(JSON.stringify(assembled, null, 2));
  process.exit(1);
}
if (issues) console.warn('Assemble issues:', JSON.stringify(issues.issue));
// Smart Forms looks for "<version>-assembled" before assembling on the fly
assembled.id = `${root.id}-assembled`;
assembled.version = `${root.version}-assembled`;
writeFileSync(new URL('pam-assembled.json', here), JSON.stringify(assembled, null, 2) + '\n');
console.log(`Wrote pam-assembled.json (${assembled.item[0].item.length} sections, ${assembled.contained?.length ?? 0} templates)`);
