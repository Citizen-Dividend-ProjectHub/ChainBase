from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.post("", response_model=schemas.ScenarioOut, status_code=status.HTTP_201_CREATED)
def create_scenario(
    scenario_in: schemas.ScenarioCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    scenario = models.Scenario(**scenario_in.model_dump(), owner_id=current_user.id)
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.get("", response_model=List[schemas.ScenarioOut])
def list_scenarios(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    # Each fellow only sees their own scenarios.
    return db.query(models.Scenario).filter(models.Scenario.owner_id == current_user.id).all()


@router.get("/{scenario_id}", response_model=schemas.ScenarioOut)
def get_scenario(
    scenario_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    scenario = _get_owned_scenario_or_404(scenario_id, current_user, db)
    return scenario


@router.put("/{scenario_id}", response_model=schemas.ScenarioOut)
def update_scenario(
    scenario_id: int,
    updates: schemas.ScenarioUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    scenario = _get_owned_scenario_or_404(scenario_id, current_user, db)
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(scenario, field, value)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    scenario = _get_owned_scenario_or_404(scenario_id, current_user, db)
    db.delete(scenario)
    db.commit()
    return None


def _get_owned_scenario_or_404(scenario_id: int, current_user: models.User, db: Session) -> models.Scenario:
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    if scenario.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your scenario")
    return scenario
