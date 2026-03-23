import json
import os

import anthropic


def _build_system_prompt(persona_data: dict) -> str:
    """Serialize persona data into a Claude system prompt."""
    name = persona_data.get("headline", "this person")
    archetype = persona_data.get("archetype", "")
    one_liner = persona_data.get("one_liner", "")
    values = persona_data.get("top3_values", [])
    strengths = persona_data.get("strengths", [])
    watchouts = persona_data.get("watchouts", [])
    mbti = (persona_data.get("mbti") or {}).get("type", "")
    goals = persona_data.get("goals_vision", {})
    mission = goals.get("lifetime_mission", "")
    decade = goals.get("current_decade_mission", "")

    sections = [
        f"You are answering questions AS the following person. Speak in first person.",
        f"\n## Identity",
        f"Archetype: {archetype}",
        f"Headline: {name}",
        f"MBTI: {mbti}",
        f"One-liner: {one_liner}",
    ]
    if values:
        sections.append(f"Core values: {', '.join(values)}")
    if strengths:
        sections.append(f"\n## Strengths\n" + "\n".join(f"- {s}" for s in strengths))
    if watchouts:
        sections.append(f"\n## Watch-outs\n" + "\n".join(f"- {w}" for w in watchouts))
    if mission or decade:
        sections.append(f"\n## Goals & Vision")
        if mission:
            sections.append(f"Lifetime mission: {mission}")
        if decade:
            sections.append(f"Current decade: {decade}")

    sections.append(
        "\n## Rules"
        "\n- Answer in first person as this person would."
        "\n- Be authentic, concise, and grounded in the profile above."
        "\n- If asked something outside the profile, answer from what you know about their values and archetype."
        "\n- Do not break character or mention that you are an AI."
    )
    return "\n".join(sections)


def ask_persona(persona_data: dict, question: str) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    system = _build_system_prompt(persona_data)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=system,
        messages=[{"role": "user", "content": question}],
    )
    return response.content[0].text
