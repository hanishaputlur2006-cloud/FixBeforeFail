# How FixBeforeFail scores risk

Every report receives a **risk score from 0 to 100**. The score decides the report's priority and its place in the authority's queue.

The score is **rule-based, not an AI prediction**. Every point comes from a documented rule, and the app shows the breakdown next to each report, so anyone can check why a report ranks where it does.

The rules live in [`src/scoring/config.js`](../src/scoring/config.js) and the calculation in [`src/scoring/scoreReport.js`](../src/scoring/scoreReport.js). Run `npm test` to check that they still behave as described here.

## Priority levels

| Priority | Score |
|---|---|
| Critical | 75 to 100 |
| High | 50 to 74 |
| Medium | 25 to 49 |
| Low | 0 to 24 |

A report counts as **overdue** if it is still unresolved after its target time: 3 days for Critical, 7 for High, 14 for Medium and 30 for Low.

## The six factors

The score is the sum of six factors. Each factor has a maximum, and the maximums add up to 100.

### 1. Severity (up to 25)

How serious the reporter says the damage is.

| Minor | Moderate | Major | Critical |
|---|---|---|---|
| 6 | 13 | 20 | 25 |

### 2. Safety impact (up to 20)

Whether anyone is in danger.

| No danger | Possible risk | Immediate danger |
|---|---|---|
| 2 | 10 | 20 |

### 3. Public impact (up to 20)

How many people depend on the asset. This is the asset type's base score plus a bonus for busy places, capped at 20.

- **Base by category:** water and drainage 14, roads 13, public equipment 11, streetlights 10, pathways 9, public facilities 6.
- **Busy-place bonus:** +6 for main roads, transit stops, markets, hospitals and schools; +3 for residential streets; +2 for parks.

### 4. Repeat reports (up to 15)

More independent reports of the same problem suggest wider impact. An authority merges duplicates into the original report.

| Reports of the issue | 1 | 2 | 3 | 4 | 5 or more |
|---|---|---|---|---|---|
| Points | 0 | 6 | 9 | 12 | 15 |

The cap stops volume alone from pushing a minor issue to the top: twenty reports of a broken bench still score at most 15 here. Duplicates are never counted twice. The merged report closes, and only the original is scored and listed.

### 5. Location importance (up to 10)

Some places matter more when something fails.

| School / Hospital | Transit / Main road | Market | Park | Residential | Other |
|---|---|---|---|---|---|
| 10 | 8 | 6 | 5 | 4 | 3 |

### 6. Time unresolved (up to 10)

Problems left unfixed tend to get worse. Points grow steadily with age and reach 10 after 14 days. Once a report is resolved, the clock stops.

## Safety rules

A dangerous problem should never be outranked just because its other factors are low. Two rules set a minimum score:

1. **Immediate danger with major or critical damage** is always at least **75 (Critical)**.
2. **Any immediate danger** is always at least **50 (High)**.

When a rule raises a score, the breakdown shows a "Safety rule" line with the points added and the reason. The total still adds up.

## Missing information

Some details are optional, such as the type of place. When a detail is missing:

- the factor gets a **neutral score of half its maximum**, and
- the breakdown marks it **"Not provided, neutral score used"**.

This avoids two kinds of unfairness. Scoring a missing detail as 0 would punish people who could not answer. Scoring it as the maximum would let anyone inflate a report by leaving fields blank.

## Possible duplicates

On each open report, authorities see suggested duplicates. A report is suggested when it:

- is in the **same category**, still open and not already a duplicate,
- was reported within **60 days** of the other report, and
- is within **150 m** by GPS, or, when either report has no GPS position, shares at least **half of its location words** ("MG Road bus stop" and "Bus stop on MG Road" match).

These are suggestions only. An authority decides whether to merge.

## Changing the rules

All numbers above come from `src/scoring/config.js`. After changing them:

1. Run `npm test` to make sure the rules still hold. For example, the maximums must still add up to 100.
2. Update this document so it matches.
