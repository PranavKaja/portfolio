# Deploy flow

Three environments. Never edit prod directly.

| Env   | URL                          | Branch  | How it deploys                            |
| ----- | ---------------------------- | ------- | ----------------------------------------- |
| Local | http://localhost:8742        | working | `preview_start portfolio` (or the launch config) |
| Test  | https://test.pranavkaja.com  | `test`  | Vercel auto-deploys on push to `test`     |
| Prod  | https://pranavkaja.com       | `main`  | Vercel auto-deploys on push to `main`     |

**The two sites share one Supabase project.** There is no staging database. Anything written to a table the site reads (`projects`, most of all) is live on prod immediately, with no deploy and no PR. Only HTML, CSS and JS respect the branch split. Plan data changes and the code that renders them to land together.

## Keeping test out of Google

`vercel.json` serves `X-Robots-Tag: noindex, nofollow` on `test.pranavkaja.com` via a `has` host rule. That is what keeps staging from ranking or competing with prod for the same content.

Crawling stays allowed in `robots.txt` on purpose. Do not "tighten" it to `Disallow: /`: a crawler blocked in robots.txt never fetches the page, so it never sees the noindex header, and the URL can still get indexed from an inbound link. Allow the fetch, then refuse the index. Every page also carries a canonical pointing at pranavkaja.com, which is the second layer.

Check it after any change to `vercel.json`:

```sh
curl -sI https://test.pranavkaja.com/ | grep -i x-robots   # expect: noindex, nofollow
curl -sI https://pranavkaja.com/      | grep -i x-robots   # expect: nothing
```

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
