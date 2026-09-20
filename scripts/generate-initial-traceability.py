from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURE = ROOT / "specs/002-complete-ui-modules"
spec = (FEATURE / "spec.md").read_text()
parity = (ROOT / "docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md").read_text()

fr_ids = re.findall(r"^- \*\*(FR-\d{3})\*\*:", spec, re.MULTILINE)
sc_ids = re.findall(r"^- \*\*(SC-\d{3})\*\*:", spec, re.MULTILINE)
parity_ids = re.findall(r"^\|\s*([A-Z]+-\d+)\s*\|", parity, re.MULTILINE)
all_ids = fr_ids + sc_ids + parity_ids

if len(fr_ids) != 36 or len(sc_ids) != 12 or len(parity_ids) != 109:
    raise SystemExit(f"unexpected requirement counts: FR={len(fr_ids)} SC={len(sc_ids)} parity={len(parity_ids)}")
if len(all_ids) != len(set(all_ids)):
    raise SystemExit("duplicate requirement IDs")

category_gate = {
    "PLAT": "G07-security-privacy",
    "MSG": "G06-messaging-providers",
    "INBOX": "G05-browser-accessibility",
    "CRM": "G03-http-contracts",
    "MKT": "G08-campaign-automation",
    "AUTO": "G08-campaign-automation",
    "INT": "G06-messaging-providers",
    "AI": "G09-knowledge-ai",
    "GOV": "G07-security-privacy",
    "SEC": "G07-security-privacy",
    "OBS": "G10-reports-observability",
    "NFR": "G11-performance-resilience",
    "TEST": "G01-static-integrity",
    "DEP": "G12-release-recovery",
}


def gate_for(requirement_id: str) -> str:
    if requirement_id.startswith("FR-"):
        number = int(requirement_id.split("-")[1])
        if number in {1, 35, 36}:
            return "G01-static-integrity"
        if number in {2, 3, 4, 5, 25, 26, 27, 28, 29}:
            return "G07-security-privacy"
        if 6 <= number <= 12:
            return "G06-messaging-providers"
        if 13 <= number <= 15:
            return "G03-http-contracts"
        if 16 <= number <= 17:
            return "G08-campaign-automation"
        if 18 <= number <= 20:
            return "G08-campaign-automation"
        if 21 <= number <= 24:
            return "G09-knowledge-ai"
        if 30 <= number <= 32:
            return "G10-reports-observability"
        return "G12-release-recovery"
    if requirement_id.startswith("SC-"):
        number = int(requirement_id.split("-")[1])
        return {
            1: "G05-browser-accessibility",
            2: "G01-static-integrity",
            3: "G07-security-privacy",
            4: "G04-postgres-real",
            5: "G11-performance-resilience",
            6: "G08-campaign-automation",
            7: "G10-reports-observability",
            8: "G07-security-privacy",
            9: "G09-knowledge-ai",
            10: "G12-release-recovery",
            11: "G01-static-integrity",
            12: "G12-release-recovery",
        }[number]
    return category_gate[requirement_id.split("-")[0]]

traceability = {
    "schemaVersion": 1,
    "feature": "002-complete-ui-modules",
    "normativeSources": [
        "specs/002-complete-ui-modules/spec.md",
        "docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md",
    ],
    "counts": {"functionalRequirements": len(fr_ids), "successCriteria": len(sc_ids), "parityRows": len(parity_ids), "total": len(all_ids)},
    "requirements": [
        {
            "id": requirement_id,
            "gate": gate_for(requirement_id),
            "status": "planned",
            "implementation": [],
            "tests": [],
            "liveEvidence": [],
        }
        for requirement_id in all_ids
    ],
}
(FEATURE / "traceability.json").write_text(json.dumps(traceability, indent=2, ensure_ascii=False) + "\n")

suite_definitions = [
    ("G01-static-integrity", ["node", "--test", "test/acceptance-gate.test.js"], [], False),
    ("G02-unit-domain", ["node", "--test"], [], False),
    ("G03-http-contracts", ["node", "--test", "test/server-route-capabilities-regression.test.js", "test/authorization.test.js"], [], False),
    ("G04-postgres-real", ["node", "--test", "test/postgres-inbound-concurrency.test.js", "test/postgres-settings-compatibility.test.js", "test/postgres-tenant-inbox.test.js"], ["TEST_DATABASE_URL|TEST_DATABASE_ADMIN_URL"], False),
    ("G05-browser-accessibility", ["node", "--test", "test/browser-route-sweep.test.js"], [], False),
    ("G06-messaging-providers", ["node", "--test", "test/provider-adapters.test.js", "test/webhook-processor.test.js", "test/outbox-channel-provider-regression.test.js"], [], True),
    ("G07-security-privacy", ["node", "--test", "test/authorization.test.js", "test/effective-role.test.js", "test/channel-endpoint-policy.test.js", "test/settings-management-regression.test.js"], [], False),
    ("G08-campaign-automation", ["node", "--test", "test/settings-management-regression.test.js", "test/workspace-premium-regression.test.js"], [], False),
    ("G09-knowledge-ai", ["node", "--test", "test/workspace-premium-regression.test.js"], [], True),
    ("G10-reports-observability", ["node", "--test", "test/observability-health.test.js", "test/workspace-rendering.test.js"], [], False),
    ("G11-performance-resilience", ["node", "--test", "test/production-safety-regression.test.js"], [], False),
    ("G12-release-recovery", ["node", "--test", "test/production-safety-regression.test.js", "test/operational-schema-regression.test.js"], [], False),
]
requirements_by_gate = {suite_id: [] for suite_id, *_ in suite_definitions}
for requirement_id in all_ids:
    requirements_by_gate[gate_for(requirement_id)].append(requirement_id)
# G02 is a mandatory execution layer even though normative IDs map to their
# stricter end-to-end gates; keep its test-domain obligations explicit.
requirements_by_gate["G02-unit-domain"].extend(["FR-035", "TEST-001"])

manifest = {
    "schemaVersion": 1,
    "feature": "002-complete-ui-modules",
    "candidateRelease": "working-tree",
    "maxEvidenceAgeSeconds": 86400,
    "requiredCoverage": all_ids,
    "suites": [
        {
            "id": suite_id,
            "phase": "implementation",
            "required": True,
            "command": command,
            "requiredEnvironment": required_environment,
            "timeoutMs": 180000,
            "evidencePath": f"evidence/002-complete-ui-modules/{suite_id}.json",
            "allowExternalBlock": allow_external,
            "requirements": requirements_by_gate[suite_id],
        }
        for suite_id, command, required_environment, allow_external in suite_definitions
    ],
}
(ROOT / "test/acceptance-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(traceability["counts"]))
print(json.dumps({"suites": len(manifest["suites"]), "coverage": len(manifest["requiredCoverage"])}))
