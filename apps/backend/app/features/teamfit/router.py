from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.service import get_current_user

from .schemas import (
    TeamfitCandidateDirectoryResponse,
    TeamfitExplorerMeResponse,
    TeamfitExplorerProfileResponse,
    TeamfitExplorerProfileSaveRequest,
    TeamfitFitCheckState,
    TeamfitFitCheckUpdate,
    TeamfitFollowupAnswerRequest,
    TeamfitInterviewQuestionRequest,
    TeamfitInterviewQuestionResponse,
    TeamfitRecommendationsResponse,
)
from .service import (
    create_teamfit_followup_question,
    delete_teamfit_explorer_turn,
    get_teamfit_candidate_directory,
    get_my_teamfit_explorer_profile,
    get_next_teamfit_interview_question,
    get_recommendations,
    save_teamfit_explorer_profile,
    save_teamfit_followup_answer,
    set_teamfit_fit_check,
)

router = APIRouter(prefix="/team-fit", tags=["team-fit"])


@router.get("/me", response_model=TeamfitExplorerMeResponse)
def teamfit_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitExplorerMeResponse:
    return get_my_teamfit_explorer_profile(current_user, db)


@router.post(
    "/interview/next-question", response_model=TeamfitInterviewQuestionResponse
)
def teamfit_next_question(
    payload: TeamfitInterviewQuestionRequest,
    current_user: User = Depends(get_current_user),
) -> TeamfitInterviewQuestionResponse:
    return get_next_teamfit_interview_question(payload)


@router.put("/me", response_model=TeamfitExplorerProfileResponse)
def save_teamfit_profile(
    payload: TeamfitExplorerProfileSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitExplorerProfileResponse:
    return save_teamfit_explorer_profile(payload, current_user, db)


@router.delete(
    "/me/interview-turns/{turn_id}", response_model=TeamfitExplorerProfileResponse
)
def delete_teamfit_profile_turn(
    turn_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitExplorerProfileResponse:
    return delete_teamfit_explorer_turn(turn_id, current_user, db)


@router.post("/interview/follow-up", response_model=TeamfitInterviewQuestionResponse)
def teamfit_followup_question(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitInterviewQuestionResponse:
    return create_teamfit_followup_question(current_user, db)


@router.post(
    "/interview/follow-up-answer", response_model=TeamfitExplorerProfileResponse
)
def teamfit_followup_answer(
    payload: TeamfitFollowupAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitExplorerProfileResponse:
    return save_teamfit_followup_answer(payload, current_user, db)


@router.get("/recommendations", response_model=TeamfitRecommendationsResponse)
def teamfit_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitRecommendationsResponse:
    return get_recommendations(current_user, db)


@router.get("/candidates", response_model=TeamfitCandidateDirectoryResponse)
def teamfit_candidate_directory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitCandidateDirectoryResponse:
    return get_teamfit_candidate_directory(current_user, db)


@router.put("/fit-checks/{target_user_id}", response_model=TeamfitFitCheckState)
def update_teamfit_fit_check(
    payload: TeamfitFitCheckUpdate,
    target_user_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamfitFitCheckState:
    return set_teamfit_fit_check(target_user_id, payload, current_user, db)
