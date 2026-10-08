# sythe-bumper

Sythe forum auto-bumper and thread editor, running on [Bun](https://bun.sh).

## Setup

```sh
bun install
cp .env.example .env # then fill in the values
```

Bun loads `.env` and `.env.local` automatically.

| Variable               | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `SYTHE_USER`           | Sythe username                                      |
| `SYTHE_PASS`           | Sythe password                                      |
| `SYTHE_THREAD`         | Thread ID to bump                                   |
| `SYTHE_POST`           | Post ID of the main post to keep updated            |
| `BUMP_HOUR_INTERVAL`   | Hours between bumps                                 |
| `EDIT_MINUTE_INTERVAL` | Minutes between main post edits                     |
| `SUPABASE_URL`         | Supabase project URL                                |
| `SUPABASE_ANON_KEY`    | Supabase anon key                                   |
| `ENVIRONMENT`          | `development` (log in, print posts) or `production` |

## Scripts

- `bun start`: run the bumper
- `bun dev`: run with file watching
- `bun run check`: type check
- `bun run lint`: prettier and eslint

## Deployment

Deployed on Coolify with Nixpacks, which detects Bun from `bun.lock` and runs `bun start`. Set the environment variables above in the Coolify resource settings.
