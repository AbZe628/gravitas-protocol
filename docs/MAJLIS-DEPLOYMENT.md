# Deploying Majlis

Written to be followed exactly. Every value you must supply is marked `<<< YOU >>>`.
Nothing here touches `gravitasprotocol.xyz`, which stays on GitHub Pages.

**Do not skip section 4.** The assistant endpoint spends money on every request and is
unauthenticated by design. It must not be publicly reachable until rate limiting, the
spend cap and basic auth are all in place.

---

## 0. What you are deploying, and what you are not

| | Where | Changes in this deploy |
|---|---|---|
| Public site | GitHub Pages, `gravitasprotocol.xyz` | Content only — no hosting change |
| Majlis | New: `majlis.gravitasprotocol.xyz` | New service |
| Contracts | Arbitrum Sepolia | **Nothing.** Redeployment is sequenced separately |

Majlis is **Stage One**: read-only, no governance write route, no signing. The API exposes
exactly one mutating route (`POST /api/assistant/ask`) and a test asserts that the set of
mutating routes is exactly that one.

---

## 1. Before you start

You need:

- An Anthropic API key with a **workspace spend limit already set** (section 4.3).
- A Render account (or Fly.io / Railway — the steps are equivalent; Render is used below
  because its single-instance guarantee is explicit in the dashboard).
- Access to the DNS for `gravitasprotocol.xyz`.

Generate the basic-auth password now and keep it somewhere you can retrieve it:

```bash
openssl rand -base64 18  # the basic-auth password
```

---

## 2. Confirm the model ids resolve

**Do this first.** If a model id 404s, the classifier fails, the assistant fails closed,
and every question is refused with *"I could not reach the check…"*. Majlis will look
broken and the cause will not be obvious.

```bash
export ANTHROPIC_API_KEY='<<< YOU >>>'
for m in claude-sonnet-4-6 claude-haiku-4-5; do
  printf '%-22s ' "$m"
  curl -s -o /dev/null -w '%{http_code}\n' https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" -H 'anthropic-version: 2023-06-01' \
    -H 'content-type: application/json' \
    -d "{\"model\":\"$m\",\"max_tokens\":5,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"
done
```

`200` on both — continue. `404` on either — set `ASSISTANT_MODEL` / `CLASSIFIER_MODEL` in
section 4.1 to ids that do resolve. Both are read from the environment; no code change.

### 2.1 The classifier model is running an UNVERIFIED configuration

> **Read this before the board sees Majlis.**
>
> Gate 2 — the semantic classifier, the only gate that catches an evaluative request phrased
> innocently — was verified against a **Sonnet-class** model: 21 ruling-seeking questions all
> correctly refused, 9 legitimate mechanical questions all correctly allowed, across English,
> Arabic and Urdu.
>
> **The deployed default is `claude-haiku-4-5`, and that configuration has never been
> tested.** The prompt is the same. Whether a Haiku-class model reads intent as reliably —
> particularly in Arabic and Urdu, where gate 1's lexical patterns are a coarser net — is
> unknown. It is not a claim that it fails. It is a claim that nobody has checked.

**Switching to the verified configuration is one environment variable.** No code change, no
redeploy of anything else:

```
CLASSIFIER_MODEL=claude-sonnet-4-6
```

The cost of that variable:

| | Per question | 500 questions/month |
|---|---|---|
| Haiku classifier (unverified) | ~$0.0007 | ~$0.35 |
| Sonnet classifier (verified) | ~$0.0027 | ~$1.35 |
| **Difference** | **~$0.002** | **~$1.00** |

One dollar a month, against the risk of a machine appearing to issue a fatwa.

You have chosen to run Haiku for now, which is a legitimate call — it is cheap to reverse and
gate 1 and gate 3 both still stand in front of and behind it. But the configuration is
unverified, it is written here so it cannot be forgotten, and **section 6 runs the probe
against whichever model you actually deploy.** Run it. If Haiku leaks anything in Arabic,
change the one variable.

---

## 3. Create the service

Render → **New** → **Web Service** → connect the repository.

| Field | Value |
|---|---|
| Name | `gravitas-majlis` |
| Region | Frankfurt (closest to a Gulf audience of the options) |
| Branch | `main` |
| Root directory | `apps/majlis` |
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Instance type | **Starter ($7/mo) or higher — not Free** |
| Instances | **1. Do not enable autoscaling.** See 3.1 |
| Health check path | `/api/health` |

`render.yaml` is committed at the repository root and encodes all of the above. If you
prefer, use **New → Blueprint** and point it at the repo instead of filling the form.

### 3.1 Why one instance, and what breaks if you add a second

The rate limiter and the spend cap are in-process (`apps/majlis/server/src/services/limits.ts`).
Two instances keep two independent counters, so a `$5` cap becomes `$10` and a 10/minute
limit becomes 20/minute — silently. **Do not scale horizontally.** If you ever need to,
move the counters to Redis first. This is written in the file header as well.

Free-tier instances also cold-start after inactivity. A scholar opening a link and waiting
thirty seconds is a bad first impression, which is the other reason for Starter.

---

## 4. Environment variables

Render → your service → **Environment**. Mark every one of these **secret** where offered.

### 4.1 Required

```
ANTHROPIC_API_KEY        = <<< YOU >>>          # never in a file, never in the repo
BASIC_AUTH_USER          = board
BASIC_AUTH_PASSWORD      = <<< YOU >>>          # openssl rand -base64 18
NODE_ENV                 = production
PORT                     = 4000
RPC_URL                  = https://sepolia-rollup.arbitrum.io/rpc
POLICY_REGISTRY_ADDRESS  = 0x6f3bfb896DD9964C9c05dA88692bDf1b1b2C3F23
TELEPORT_V3_ADDRESS      = 0x6702C2CE6eD58ca3934eBBd785CaC1De8DCd85B4
```

Optional. Set `ASSISTANT_MODEL` only if section 2 told you to. `CLASSIFIER_MODEL` is left
unset, which means the **unverified** Haiku default is in use — see §2.1. To move to the
verified configuration, add this one line and redeploy:

```
CLASSIFIER_MODEL = claude-sonnet-4-6
```

### 4.2 Limits — the values that stop the budget being drained

```
RATE_LIMIT_PER_IP          = 10
RATE_LIMIT_WINDOW_MS       = 60000
RATE_LIMIT_GLOBAL_PER_DAY  = 2000
ASSISTANT_DAILY_USD_CAP    = 5
ASSISTANT_USD_PER_QUESTION = 0.02
```

`ASSISTANT_DAILY_USD_CAP=5` is set as you asked, replacing the previous default of 20.
At the measured cost of roughly $0.023 a question that is about **215 questions a day**,
which is far above what a board of nine will ever ask and far below anything that matters
if someone finds the endpoint.

When the cap is reached the endpoint returns `429` with a plain-language message and stops.
It does not warn and continue.

### 4.3 The cap that does not depend on our code

The in-process cap protects against traffic. It does not protect against a bug that loops,
because a loop inside the process spends money without going through the limiter.

**Anthropic Console → Settings → Limits → set a monthly spend limit of $25 and an email
alert at $10.** Do this before the service is reachable. It is the only control that holds
if our own code is wrong.

---

## 5. Basic auth

Majlis is a board's internal record. It should not be world-readable, and this also lets
you review it before anyone else sees it.

`apps/majlis/server/src/middleware/basicAuth.ts` is committed and wired in `app.ts`. It
covers **every route including `/api/export/:boardId`**, which was previously
unauthenticated and was an open item in the last report. It is active whenever
`BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` are both set, and it exempts only
`/api/health` so the platform health check keeps working.

One limitation, stated plainly: a single shared credential means everyone who can open
Majlis can read `/api/assistant/log`, which is every question every board member has asked.
That is a real weakness, not a control. Stage Two's roles are what fix it. Until then, treat
the credential as board-wide rather than personal.

**If those two variables are unset in production the server refuses to start.** That is
deliberate: the failure mode of forgetting them should be a service that does not boot,
not a board's deliberation record on the open internet.

Credentials to give the board:

```
URL:      https://majlis.gravitasprotocol.xyz
User:     board
Password: <<< the value you generated in section 1 >>>
```

Send the password by a different channel from the URL.

---

## 6. Deploy, then verify before announcing

Deploy. Then, from your machine:

```bash
BASE=https://majlis.gravitasprotocol.xyz
USER=board:'<<< YOU >>>'

# 1. Health is open (the platform needs it)
curl -s $BASE/api/health | jq

# 2. Everything else is closed — MUST be 401
curl -s -o /dev/null -w 'no-auth matters: %{http_code}\n'  $BASE/api/matters
curl -s -o /dev/null -w 'no-auth export:  %{http_code}\n'  $BASE/api/export/demo-board
curl -s -o /dev/null -w 'no-auth log:     %{http_code}\n'  $BASE/api/assistant/log

# 3. With auth — MUST be 200
curl -s -u "$USER" -o /dev/null -w 'auth matters:   %{http_code}\n' $BASE/api/matters

# 4. No governance write route — MUST be 404
curl -s -u "$USER" -o /dev/null -w 'POST rules:     %{http_code}\n' -X POST $BASE/api/rules

# 5. Rate limit bites — expect 200s then 429
for i in $(seq 1 14); do
  curl -s -u "$USER" -o /dev/null -w "%{http_code} " -X POST $BASE/api/assistant/ask \
    -H 'content-type: application/json' \
    -d '{"question":"What does a timelock do, mechanically?"}'
done; echo
```

Then run the gate probe against the deployed configuration — the same models, the same
prompts:

```bash
cd apps/majlis/server
ANTHROPIC_API_KEY='<<< YOU >>>' \
CLASSIFIER_MODEL='<<< whatever you set in 4.1 >>>' \
npx tsx test/gate-probe.ts --out=probe.md
echo "exit: $?"     # 1 means something was answered — read probe.md
```

**Do not send the URL to anyone until steps 2 and 4 return the codes above and the probe
comes back clean.**

---

## 7. DNS

Only after section 6 passes.

Render → your service → **Settings → Custom Domain** → add `majlis.gravitasprotocol.xyz`.
Render shows you a target hostname. At your registrar:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `majlis` | `<the target Render shows you>` | 3600 |

Do not touch the apex `A`/`ALIAS` records — those are GitHub Pages and the public site.

Certificate issuance takes a few minutes. Confirm:

```bash
curl -sI https://majlis.gravitasprotocol.xyz/api/health | head -1
```

---

## 8. The public site — a problem you should know about

**The live site is served from the committed `apps/web/dist/` build output, and there is no
`deploy-frontend.yml` workflow, despite `README.md` having claimed there was one.**

This means source edits to `apps/web/client/src` have never reached production by
themselves. The content corrections in this delivery — the AAOIFI removals, the dates, the
test count, the contract-address banner — are in the source **and** in a freshly built
`dist/`, so committing this tree publishes them.

### 8.1 One setting you must change, or the workflow publishes nothing

`actions/deploy-pages` only works when the repository's Pages **source** is set to
**GitHub Actions**. If it is currently set to *Deploy from a branch* — which it must be,
because that is how the committed `dist/` is being served today — the new workflow will run,
go green, and publish nothing. A green tick over a site that did not update is precisely the
failure that created this problem in the first place.

**GitHub → repository → Settings → Pages → Build and deployment → Source → GitHub Actions.**

Do this immediately before or after the first push. Then confirm the site actually changed:

```bash
curl -s https://gravitasprotocol.xyz | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
```

It should print `index-D5mTSni7.js` (the build in this delivery), not `index-BXU9KwFC.js`
(the stale one). If it still prints the old hash, the source setting did not take.

### 8.2 What is in the repository now

Two things are now in the repository to stop this recurring:

- `.github/workflows/deploy-frontend.yml` — builds `apps/web` and publishes to Pages on
  every push that touches it.
- The README claim has been corrected to describe what actually exists.

After the first successful run of the new workflow, consider removing `apps/web/dist/` from
version control and adding it to `.gitignore`. Build output in git will drift from source
again otherwise. It is left committed for now because removing it in the same change that
introduces the workflow would take the site down if the workflow has any problem.

---

## 9. Running costs

Measured, not estimated — from the token counts of the actual prompts in this repository.

**Per question** (classifier + assistant, both called):

| Call | Model | In | Out | Cost |
|---|---|---|---|---|
| Gate 2 | Haiku-class | ~780 tok | 1–5 tok | ~$0.0007 |
| Assistant | Sonnet-class | ~1,450 tok | ~1,250 tok incl. thinking | ~$0.0225 |
| **Total** | | | | **≈ $0.023** |

A question refused at gate 1 costs **nothing** — no model call is made. On the current
corpus that is 38 of 47 adversarial questions. A question refused at gate 2 costs $0.0007.
So the realistic average is below $0.023.

| | Monthly |
|---|---|
| Render Starter | $7 |
| Model calls, 500 questions | ~$12 |
| **Total** | **≈ $19** |

At 2,000 questions/month: ~$46 in model calls, ~$53 total. The `$5`/day cap binds first at
about 215 questions/day.

---

## 10. Rollback

```
Render → Events → the previous deploy → Rollback
```

The service is stateless in Stage One — the seed record is compiled in and the assistant
log is in memory. Nothing is lost by rolling back, and nothing needs migrating.

This changes the moment Stage Two adds a database. When it does, this section needs a
backup step before every deploy, and that must be written before Stage Two ships.
