"""Build a fine-tuning dataset (chat JSONL) for the QEVRANT answer checker.

Input: examples.jsonl — one teacher-checked example per line:
  {"task": "Essay prompt or question", "answer": "the learner's text",
   "feedback": { ...the feedback JSON a good teacher would give... }}

Output: train.jsonl and valid.jsonl in the "messages" format used by TRL / Hugging Face AutoTrain.
Only use learners' answers with their consent, and remove names, emails and other personal data.

    python training/build_dataset.py examples.jsonl
"""
import json, random, sys

SYSTEM = ("You are an experienced examiner of advanced English (B2-C2) for adult learners whose first language "
          "is Russian. Assess the learner's answer and reply with ONE JSON object only. Your scores are educational "
          "estimates, not official IELTS or Cambridge results.")

def main(path: str) -> None:
    rows = [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]
    out = []
    for r in rows:
        if not r.get("answer") or not isinstance(r.get("feedback"), dict):
            continue
        out.append({"messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Task: {r.get('task', '')}\n\nLearner's answer:\n{r['answer']}"},
            {"role": "assistant", "content": json.dumps(r["feedback"], ensure_ascii=False)},
        ]})
    random.Random(7).shuffle(out)
    n_valid = max(1, len(out) // 10) if len(out) > 10 else 0
    for name, part in (("valid.jsonl", out[:n_valid]), ("train.jsonl", out[n_valid:])):
        with open(name, "w", encoding="utf-8") as f:
            for x in part:
                f.write(json.dumps(x, ensure_ascii=False) + "\n")
    print(f"{len(out) - n_valid} training and {n_valid} validation examples written")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "examples.jsonl")
