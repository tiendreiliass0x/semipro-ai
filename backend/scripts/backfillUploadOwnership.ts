import { Database } from 'bun:sqlite';
import { basename, join } from 'path';

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

const options = parseArgs(Bun.argv.slice(2));
const dbPath = join(import.meta.dir, '..', 'data', 'anecdotes.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS account_uploads (
    filename TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
  )
`);

if (options.apply && !options.accountId) {
  console.error('Missing required argument: --account-id=<id> when using --apply');
  process.exit(1);
}

if (options.accountId) {
  const account = db.query('SELECT id, name FROM accounts WHERE id = ?').get(options.accountId) as { id?: string; name?: string } | null;
  if (!account?.id) {
    console.error(`Account not found: ${options.accountId}`);
    process.exit(1);
  }
  console.log(`Target account: ${account.id} (${account.name || 'unnamed'})`);
}

const mediaRows = db.query('SELECT url FROM media WHERE url LIKE ? LIMIT ?').all('/uploads/%', options.limit) as Array<{ url?: string }>;
const filenames = Array.from(new Set(mediaRows.map(row => extractUploadFilename(String(row.url || ''))).filter(Boolean) as string[]));

const getOwner = db.query('SELECT accountId FROM account_uploads WHERE filename = ?');
const unmatched = filenames.filter(filename => {
  const row = getOwner.get(filename) as { accountId?: string } | null;
  return !row?.accountId;
});

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
const upsert = db.query(`
  INSERT INTO account_uploads (filename, accountId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(filename) DO UPDATE SET accountId = excluded.accountId, updatedAt = excluded.updatedAt
`);

db.transaction(() => {
  unmatched.forEach(filename => {
    upsert.run(filename, options.accountId, now, now);
  });
})();

console.log(`Applied ownership for ${unmatched.length} filename(s).`);
