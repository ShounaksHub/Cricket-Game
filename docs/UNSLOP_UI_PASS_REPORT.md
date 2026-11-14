# UI Anti-Slop Pass

## Scope

Landing page, global navigation/footer, player archive, Dream XI builder, and My Cricket dashboard.

## Findings addressed

| Problem | Change |
|---|---|
| Too many telemetry/status pills competing with the hero | Replaced speculative venue/season language with a simple product label and one clear simulator message. |
| Generic “AI/broadcast” positioning | Reworded the hero and archive language around the actual actions: pick an XI, make the call, play the match. |
| Three competing hero actions | Kept Play cricket, Build your XI, and Resume match but removed the fake readiness badge and technical resume payload. |
| Navigation read like system controls | Changed nav and mobile labels to plain title case and removed the version-style engine badge. |
| Footer looked like an engineering dashboard | Removed FPS/SIM READY telemetry and kept only offline availability plus the rules link. |
| Archive copy over-promised certainty | Kept the existing verified/dash behavior but made the explanation direct and human. |
| Squad builder used internal rule language | Changed breadcrumb and auto-fill labels to describe the user action. |
| My Cricket used deployment/observability language | Changed “deployed squad” and “players audited” to saved squad and player archive language. |

## Verification

- Web typecheck: passed.
- Web regression tests: 18 test files, 122 tests passed.
- Production build: passed; all six app routes prerendered successfully.

## Deliberate boundary

The match screen retains detailed tactical labels where they carry gameplay meaning. The cleanup removes decorative technical language, not cricket rules, score data, or captaincy controls.
