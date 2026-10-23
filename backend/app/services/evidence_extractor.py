"""
Rule-based evidence extraction engine.
Extracts structured evidence from raw conversation transcripts.
No external API required.
"""
import re
from typing import List, Dict, Any, Optional, Tuple
from app.db.models import EvidenceCategory


# ── Pattern library ─────────────────────────────────────────────────────────

OBJECTION_PATTERNS = [
    r"(?i)\b(too expensive|can't afford|out of budget|price is too high|cost is prohibitive)\b",
    r"(?i)\b(not sure|not convinced|need more time|have concerns|hesitant)\b",
    r"(?i)\b(competitor|going with|looking at other|evaluating other)\b",
    r"(?i)\b(don't (see|understand) the value|what's the roi|prove the value)\b",
    r"(?i)\b(problem with|issue with|concerned about|worry about)\b",
    r"(?i)\b(not a priority|back burner|put this on hold|delay)\b",
]

BUYING_SIGNAL_PATTERNS = [
    r"(?i)\b(ready to move forward|let's proceed|when can we start)\b",
    r"(?i)\b(sounds good|love it|excited about|very interested)\b",
    r"(?i)\b(what's the next step|how do we sign|send the contract|send the proposal)\b",
    r"(?i)\b(budget (is|has been) approved|got approval|got sign-off)\b",
    r"(?i)\b(can you send|can we schedule|let's set up)\b",
    r"(?i)\b(this is exactly what|perfect fit|meets our needs)\b",
]

COMMITMENT_PATTERNS = [
    r"(?i)\b(i will|i'll|we will|we'll|i'm going to|we're going to|i promise|i commit)\b.{5,120}",
    r"(?i)\b(will send|will follow up|will schedule|will share|will get back)\b.{0,80}",
    r"(?i)\b(by (monday|tuesday|wednesday|thursday|friday|end of week|eow|eod|next week))\b",
    r"(?i)\b(action item|follow.up|next step|deliverable)[:]\s*.{5,120}",
]

DEADLINE_PATTERNS = [
    r"(?i)\b(by|before|deadline|due|no later than|must be done by)\b.{3,60}(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[\/\-]\d{1,2})",
    r"(?i)\b(end of (q[1-4]|quarter|month|year|week))\b",
    r"(?i)\b(going live|launch date|go-live|contract expires)\b",
    r"(?i)\b(renewal|renewal date|annual review)\b",
]

PRICING_PATTERNS = [
    r"(?i)\b(price|pricing|cost|quote|proposal|discount|budget|spend|invoice|fee)\b",
    r"(?i)\b(too expensive|can't justify|hard to justify|break the budget|over budget)\b",
    r"(?i)\b(negotiate|negotiation|better deal|lower price|reduce the cost)\b",
    r"(?i)\b(competitor('s)? (price|pricing|cost)|cheaper option)\b",
]

TECHNICAL_BLOCKER_PATTERNS = [
    r"(?i)\b(integration|api|compatibility|doesn't (work|integrate|connect))\b",
    r"(?i)\b(security|compliance|gdpr|hipaa|soc2|infosec|it review|security review)\b",
    r"(?i)\b(technical (issue|problem|blocker|concern|requirement))\b",
    r"(?i)\b(implementation|onboarding|migration|setup|configuration)\b.{0,40}(difficult|complex|problem|issue|concern)",
    r"(?i)\b(not (supported|compatible|possible))\b",
]

DECISION_MAKER_PATTERNS = [
    r"(?i)\b(ceo|cfo|cto|vp|president|board|executive|c-suite|c suite)\b",
    r"(?i)\b(needs (approval|sign-off|sign off)|get approval from|escalate to)\b",
    r"(?i)\b(decision maker|final decision|who (makes|signs off))\b",
    r"(?i)\b(legal (team|review|needs to)|procurement|finance (team|review))\b",
]

NEXT_STEP_PATTERNS = [
    r"(?i)\b(next step[s]?|action item[s]?|follow.up)\b.{0,120}",
    r"(?i)\b(schedule|set up|arrange).{0,40}(meeting|call|demo|session)\b",
    r"(?i)\b(send|share|provide).{0,40}(document|proposal|contract|deck|presentation)\b",
]


CATEGORY_PATTERNS: Dict[EvidenceCategory, List[str]] = {
    EvidenceCategory.OBJECTION: OBJECTION_PATTERNS,
    EvidenceCategory.BUYING_SIGNAL: BUYING_SIGNAL_PATTERNS,
    EvidenceCategory.COMMITMENT: COMMITMENT_PATTERNS,
    EvidenceCategory.DEADLINE: DEADLINE_PATTERNS,
    EvidenceCategory.PRICING_CONCERN: PRICING_PATTERNS,
    EvidenceCategory.TECHNICAL_BLOCKER: TECHNICAL_BLOCKER_PATTERNS,
    EvidenceCategory.DECISION_MAKER: DECISION_MAKER_PATTERNS,
    EvidenceCategory.NEXT_STEP: NEXT_STEP_PATTERNS,
}


def _extract_sentence(text: str, match_start: int, match_end: int) -> Tuple[int, int, str]:
    """Expand match to sentence boundaries."""
    # Find sentence start
    start = max(0, text.rfind(".", 0, match_start))
    if start > 0:
        start += 1
    # Skip whitespace
    while start < len(text) and text[start] in " \t\n":
        start += 1

    # Find sentence end
    end = text.find(".", match_end)
    if end == -1:
        end = len(text)
    else:
        end += 1

    quotation = text[start:end].strip()
    return start, end, quotation


def _get_context(text: str, start: int, end: int, window: int = 200) -> Tuple[str, str]:
    ctx_start = max(0, start - window)
    ctx_end = min(len(text), end + window)
    before = text[ctx_start:start].strip()
    after = text[end:ctx_end].strip()
    return before, after


def _detect_speaker(text: str, pos: int) -> Optional[str]:
    """Try to detect speaker from lines like 'Rep:', 'Customer:', 'John:'"""
    line_start = text.rfind("\n", 0, pos)
    if line_start == -1:
        line_start = 0
    line = text[line_start:pos + 100]
    speaker_match = re.match(r"^[\n\r]*([A-Za-z][A-Za-z0-9 _-]{0,30}):", line.strip())
    if speaker_match:
        return speaker_match.group(1).strip()
    return None


def extract_evidence(transcript: str) -> List[Dict[str, Any]]:
    """
    Extract evidence items from a transcript using rule-based patterns.
    Returns a list of dicts ready to be saved as Evidence records.
    """
    results: List[Dict[str, Any]] = []
    seen_quotes: set = set()

    for category, patterns in CATEGORY_PATTERNS.items():
        for pattern in patterns:
            for match in re.finditer(pattern, transcript):
                start, end, quotation = _extract_sentence(transcript, match.start(), match.end())

                # Deduplicate by quotation text
                norm = quotation.lower().strip()
                if norm in seen_quotes:
                    continue
                if len(quotation) < 10:
                    continue
                seen_quotes.add(norm)

                ctx_before, ctx_after = _get_context(transcript, start, end)
                speaker = _detect_speaker(transcript, start)

                results.append({
                    "category": category,
                    "quotation": quotation,
                    "speaker": speaker,
                    "position_start": start,
                    "position_end": end,
                    "context_before": ctx_before,
                    "context_after": ctx_after,
                    "extraction_method": "rule_based",
                    "validation_status": "validated",
                })

    return results


def extract_commitments(transcript: str, evidence_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Derive structured commitments from extracted COMMITMENT and NEXT_STEP evidence.
    """
    commitments = []
    due_date_pattern = re.compile(
        r"(?i)\b(by|before|on)\s+(monday|tuesday|wednesday|thursday|friday|"
        r"end of (week|month|quarter|year)|eow|eod|"
        r"(?:january|february|march|april|may|june|july|august|september|october|november|december)"
        r"\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b"
    )

    for ev in evidence_items:
        if ev["category"] not in (EvidenceCategory.COMMITMENT, EvidenceCategory.NEXT_STEP):
            continue

        quotation = ev["quotation"]

        # Try to extract a due date mention
        due_date_str = None
        dm = due_date_pattern.search(quotation)
        if dm:
            due_date_str = dm.group(0)

        commitments.append({
            "description": quotation[:500],
            "responsible_person": ev.get("speaker"),
            "due_date_str": due_date_str,
            "source_quotation": quotation,
        })

    return commitments
