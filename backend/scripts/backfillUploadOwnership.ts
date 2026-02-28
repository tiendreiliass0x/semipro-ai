import { basename } from 'path';
import { createDatabase } from '../data/database';
import { accounts, media, accountUploads } from '../data/drizzle-schema';
import { eq, like, sql } from 'drizzle-orm';

type CliOptions = {
  accountId: string;
  apply: boolean;
  limit: number;
  showAll: boolean;
};

const printUsage = () => {
  console.log('Backfill ownership for legacy /uploads URLs found in anecdotes media records.');
  console.log('');
  console.log('Usage:');
  console.log('  bun scripts/backfillUploadOwnership.ts [--account-id=<id>] [--apply] [--limit=<n>] [--all]');
  console.log('');
  console.log('Options:');
  console.log('  --account-id=<id>  Target account to own unmatched upload files');
  console.log('  --apply            Persist ownership changes (default is dry-run)');
  console.log('  --limit=<n>        Max candidate filenames to process (default: 5000)');
  console.log('  --all              Print all unmatched filenames (default prints up to 25)');
};

const parseArgs = (argv: string[]): CliOptions => {
  let accountId = '';
  let apply = false;
  let limit = 5000;
  let showAll = false;

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--all') {
      showAll = true;
      continue;
    }
    if (arg.startsWith('--account-id=')) {
      accountId = arg.slice('--account-id='.length).trim();
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length));
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.floor(parsed);
      }
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return { accountId, apply, limit, showAll };
};

const extractUploadFilename = (url: string): string | null => {
  if (!url.startsWith('/uploads/')) return null;
  const file = basename(url.split('?')[0] || '').trim();
  return file || null;
};

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://yenengalabs:yenengalabs@localhost:5432/yenengalabs';
const options = parseArgs(Bun.argv.slice(2));
const db = createDatabase(DATABASE_URL);

if (options.apply && !options.accountId) {
  console.error('Missing required argument: --account-id=<id> when using --apply');
  process.exit(1);
}

if (options.accountId) {
  const [account] = await db.select({ id: accounts.id, name: accounts.name }).from(accounts).where(eq(accounts.id, options.accountId));
  if (!account?.id) {
    console.error(`Account not found: ${options.accountId}`);
    process.exit(1);
  }
  console.log(`Target account: ${account.id} (${account.name || 'unnamed'})`);
}

const mediaRows = await db.select({ url: media.url }).from(media).where(like(media.url, '/uploads/%')).limit(options.limit);
const filenames = Array.from(new Set(mediaRows.map(row => extractUploadFilename(String(row.url || ''))).filter(Boolean) as string[]));

const ownedRows = await db.select({ filename: accountUploads.filename }).from(accountUploads);
const ownedSet = new Set(ownedRows.map(r => r.filename));
const unmatched = filenames.filter(filename => !ownedSet.has(filename));

console.log(`Scanned media rows: ${mediaRows.length}`);
console.log(`Unique /uploads filenames: ${filenames.length}`);
console.log(`Unmatched filenames: ${unmatched.length}`);

if (!unmatched.length) {
  console.log('No unmatched uploads found.');
  process.exit(0);
}

const previewLimit = options.showAll ? unmatched.length : 25;
console.log(`Preview (${Math.min(previewLimit, unmatched.length)}):`);
unmatched.slice(0, previewLimit).forEach((filename, index) => {
  console.log(`${index + 1}. ${filename}`);
});

if (!options.apply) {
  console.log('Dry run only. Re-run with --apply --account-id=<id> to persist ownership.');
  process.exit(0);
}

const now = Date.now();
for (const filename of unmatched) {
  await db.insert(accountUploads).values({
    filename,
    accountId: options.accountId,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: accountUploads.filename,
    set: { accountId: options.accountId, updatedAt: now },
  });
}

console.log(`Applied ownership for ${unmatched.length} filename(s).`);
process.exit(0);
