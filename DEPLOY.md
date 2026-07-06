# Deploy flow

Three environments. Never edit prod directly.

| Env   | URL                          | Branch  | How it deploys                            |
| ----- | ---------------------------- | ------- | ----------------------------------------- |
| Local | http://localhost:8742        | working | `preview_start portfolio` (or the launch config) |
| Test  | https://test.pranavkaja.com  | `test`  | Vercel auto-deploys on push to `test`     |
| Prod  | https://pranavkaja.com       | `main`  | Vercel auto-deploys on push to `main`     |

Non-prod pages show a small orange **TEST / PREVIEW / LOCAL** badge in the top-right corner. If you see it on `pranavkaja.com`, something is misconfigured.

## Making a change

```sh
# make sure you're on test, pull latest
git checkout test
git pull

# edit, commit
git add -p
git commit -m "..."

# push -> auto-deploys to test.pranavkaja.com in ~30s
git push
```

Verify on `test.pranavkaja.com`. When it looks right, promote:

```sh
git checkout main
git pull
git merge --ff-only test
git push
```

If the merge isn't fast-forward, something landed on `main` you didn't expect. Investigate before forcing anything.

## Rolling back

Vercel keeps every deployment. If prod breaks, open the Vercel dashboard → Deployments → find the last-known-good build → "Promote to Production." Faster than a git revert. Fix the branch after.

## Hotfix (skip test, use sparingly)

Only for outages or a truly obvious one-liner:

```sh
git checkout main
# fix, commit, push
```

Then immediately merge `main` back into `test` so the branches don't diverge:

```sh
git checkout test
git merge main
git push
```
