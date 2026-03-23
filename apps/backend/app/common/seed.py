"""Demo seed — inserts parksejong user + Hupository persona on every startup (idempotent)."""
from __future__ import annotations

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.security import hash_password
from app.features.auth.models import User
from app.features.persona.models import Persona

DEMO_USER_EMAIL = os.getenv("DEMO_USER_EMAIL", "lifedesigner88@gmail.com")
DEMO_USER_PIN   = os.getenv("DEMO_USER_PIN",   "1234")                 # login: email + 1234
DEMO_PERSONA_ID = os.getenv("DEMO_PERSONA_ID", "d31sf2")               # /persona/d31sf2

# Hupository data — mirrors DEMO_PROFILE in frontend loader.ts
_DEMO_DATA: dict = {
    "person_id": DEMO_PERSONA_ID,
    "archetype": "reflective educator-builder",
    "headline": "Educator-turned developer with a strong math teaching background",
    "email": "lifedesigner88@gmail.com",
    "github_address": "https://github.com/lifedesigner88",
    "mbti": {
        "type": "INFJ",
        "identity": "T",
        "scores": {
            "introverted": 78,
            "intuitive": 86,
            "feeling": 62,
            "judging": 79,
            "turbulent": 72,
        },
    },
    "one_liner": (
        "A person who connects learning to life design, and transforms what they've "
        "learned into structures and systems for people."
    ),
    "top3_values": ["Life Design", "Growth & Learning", "Education & Sharing"],
    "strengths": [
        "Structures learned content into forms others can use",
        "Organizes people and designs programs with operational skill",
        "Sustains deep learning on a single subject over the long term",
        "Reconstructs career direction into new domains with resilience",
        "Translates teaching experience into product and service problems",
        "Strong writing and documentation habits support learning and collaboration",
    ],
    "watchouts": [
        "Running too many axes at once can lead to overload",
        "Wide interests can blur execution priorities",
    ],
    "goals_vision": {
        "lifetime_mission": (
            "Hold the question of how to design a life — and help more people design "
            "their own lives better through technology and education."
        ),
        "current_decade_mission": (
            "Become someone who directly builds education and technology. Grow Sejong Class "
            "as a solo founder, secure AI builder capabilities, and lay the foundation for "
            "the next decade."
        ),
        "long_term_vision": (
            "As a Life Designer, combine technology and education so that more people can "
            "design their own lives with greater intention."
        ),
        "long_term_directions": [
            "Integrated education + technology service (Sejong Class expansion)",
            "Systems architect — design and automate at scale",
            "Community + platform — gather and connect people",
            "Life design content and service at wider reach",
        ],
    },
    "fit_vectors": {
        "learning_drive": 5,
        "teaching_drive": 5,
        "community_drive": 5,
        "builder_drive": 4,
        "scientific_curiosity": 5,
        "entrepreneurship": 4,
        "reflection_depth": 5,
    },
    "sdg_alignment": [
        {"sdg": 4,  "label": "Quality Education",              "resonance": "high"},
        {"sdg": 8,  "label": "Decent Work and Economic Growth", "resonance": "high"},
        {"sdg": 10, "label": "Reduced Inequalities",            "resonance": "medium"},
        {"sdg": 17, "label": "Partnerships for the Goals",      "resonance": "medium"},
    ],
    "identity_shifts": [
        {
            "period": "2008–2010",
            "label": "Reboot after a dark period",
            "note": (
                "After bipolar disorder, dropping ROTC, and a suicide attempt — overcame "
                "social anxiety and re-engaged with people through the Noulga-ji community."
            ),
        },
        {
            "period": "2011",
            "label": "Life Designer declaration",
            "note": (
                "Publicly declared the identity 'Life Designer' at a Carpe Diem vision event. "
                "A consistent north star for the next 15 years."
            ),
        },
        {
            "period": "2021",
            "label": "Religion → science worldview shift",
            "note": (
                "Concluded 10 years of Daesoon Jinrihoe practice and restructured worldview "
                "around neuroscience, physics, and evolutionary theory."
            ),
        },
        {
            "period": "2023–2025",
            "label": "Education operator → tech-based solo founder",
            "note": (
                "After bootcamp and Playdata experience, quit and founded Sejong Class. "
                "Converging toward building education through technology."
            ),
        },
    ],
}


def sync_demo_seed(db: Session) -> None:
    """Insert demo user and persona if they don't exist yet (idempotent)."""
    # ── User ──────────────────────────────────────────────────────────────────
    user = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    if user is None:
        user = User(
            email=DEMO_USER_EMAIL,
            password_hash=hash_password(DEMO_USER_PIN),
            is_verified=True,
            is_admin=False,
        )
        db.add(user)
        db.flush()  # get user into session before persona FK

    # ── Persona ───────────────────────────────────────────────────────────────
    existing = db.scalar(select(Persona).where(Persona.persona_id == DEMO_PERSONA_ID))
    if existing is None:
        db.add(
            Persona(
                persona_id=DEMO_PERSONA_ID,
                user_id=user.user_id,
                title="Park Sejong — 2026",
                data=_DEMO_DATA,
            )
        )

    db.commit()
