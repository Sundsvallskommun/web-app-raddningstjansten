// Cleanup orphan egensotning errands.
//
// Lists (and optionally deletes) errands that are stuck in
// AWAITING_SUPPLEMENTATION but have NO egensotning-details record — i.e. the
// legacy errands created by the old multi-call flow that can never resolve.
//
// Usage (dry-run by default — prints candidates, deletes nothing):
//   node scripts/cleanup-orphan-errands.mjs --base=http://<rtj-host>
//   node scripts/cleanup-orphan-errands.mjs --base=http://<rtj-host> --delete
//
// Args / env:
//   --base / RTJ_MANAGEMENT_BASE_URL   (required)  rtj-management base URL
//   --municipality / MUNICIPALITY_ID   (def 2281)
//   --namespace / RTJ_NAMESPACE        (def EGENSOTNING)
//   --status                           (def AWAITING_SUPPLEMENTATION)
//   --delete                           actually delete the candidates

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const BASE = args.base || process.env.RTJ_MANAGEMENT_BASE_URL;
const MUNI = args.municipality || process.env.MUNICIPALITY_ID || '2281';
const NS = args.namespace || process.env.RTJ_NAMESPACE || 'EGENSOTNING';
const STATUS = args.status || 'AWAITING_SUPPLEMENTATION';
const DO_DELETE = Boolean(args.delete);

if (!BASE) {
  console.error('Missing rtj base URL. Pass --base=http://<host> or set RTJ_MANAGEMENT_BASE_URL.');
  process.exit(1);
}

const root = `${BASE.replace(/\/$/, '')}/${MUNI}/${NS}`;

async function findByStatus() {
  const errands = [];
  let page = 0;
  let totalPages = 1;
  do {
    const url = `${root}/errands?filter=${encodeURIComponent(`status:'${STATUS}'`)}&page=${page}&size=100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    errands.push(...(body.errands ?? []));
    totalPages = body._meta?.totalPages ?? 1;
    page += 1;
  } while (page < totalPages);
  return errands;
}

async function hasDetails(id) {
  const res = await fetch(`${root}/errands/${id}/egensotning-details`);
  return res.status === 200; // 404 => orphan (no details)
}

async function main() {
  console.log(`rtj: ${root}`);
  console.log(`Looking for ${STATUS} errands without egensotning-details...\n`);

  const errands = await findByStatus();
  const orphans = [];
  for (const e of errands) {
    const ok = await hasDetails(e.id);
    if (!ok) orphans.push(e);
  }

  if (orphans.length === 0) {
    console.log(`No orphan ${STATUS} errands found (of ${errands.length} in that status).`);
    return;
  }

  console.log(`Found ${orphans.length} orphan(s) of ${errands.length} ${STATUS} errands:`);
  for (const e of orphans) {
    console.log(`  - ${e.id}  "${e.title ?? ''}"  reporter=${e.reporterUserId ?? '-'}  created=${e.created ?? '-'}`);
  }

  if (!DO_DELETE) {
    console.log(`\nDry-run. Re-run with --delete to remove these ${orphans.length} errand(s).`);
    return;
  }

  console.log(`\nDeleting ${orphans.length} errand(s)...`);
  let ok = 0;
  for (const e of orphans) {
    const res = await fetch(`${root}/errands/${e.id}`, { method: 'DELETE' });
    console.log(`  ${res.ok ? 'deleted' : 'FAILED ' + res.status}: ${e.id}`);
    if (res.ok) ok += 1;
  }
  console.log(`\nDone. Deleted ${ok}/${orphans.length}.`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
