from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import VerifiedUser, get_current_user
from app.models.user import ChildProfile, CreateChildRequest, UpdateChildRequest
from app.services.firebase import firestore as db

router = APIRouter()


def _not_found(child_id: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Child profile '{child_id}' not found.",
    )


@router.post(
    "",
    response_model=ChildProfile,
    status_code=status.HTTP_201_CREATED,
    summary="Add a child profile to the parent's account",
)
async def create_child(
    body: CreateChildRequest,
    user: VerifiedUser = Depends(get_current_user),
) -> ChildProfile:
    return await db.create_child(
        parent_id=user.uid,
        name=body.name,
        age=body.age,
    )


@router.get(
    "",
    response_model=list[ChildProfile],
    summary="List all child profiles for the authenticated parent",
)
async def list_children(
    user: VerifiedUser = Depends(get_current_user),
) -> list[ChildProfile]:
    return await db.list_children(parent_id=user.uid)


@router.get(
    "/{child_id}",
    response_model=ChildProfile,
    summary="Get a single child profile",
)
async def get_child(
    child_id: str,
    user: VerifiedUser = Depends(get_current_user),
) -> ChildProfile:
    child = await db.get_child(child_id=child_id, parent_id=user.uid)
    if child is None:
        raise _not_found(child_id)
    return child


@router.patch(
    "/{child_id}",
    response_model=ChildProfile,
    summary="Update a child's name or age",
)
async def update_child(
    child_id: str,
    body: UpdateChildRequest,
    user: VerifiedUser = Depends(get_current_user),
) -> ChildProfile:
    if not body.has_updates():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one field to update (name or age).",
        )

    updates = body.model_dump(exclude_none=True)
    child = await db.update_child(
        child_id=child_id,
        parent_id=user.uid,
        updates=updates,
    )
    if child is None:
        raise _not_found(child_id)
    return child


@router.delete(
    "/{child_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a child profile",
)
async def delete_child(
    child_id: str,
    user: VerifiedUser = Depends(get_current_user),
) -> None:
    deleted = await db.delete_child(child_id=child_id, parent_id=user.uid)
    if not deleted:
        raise _not_found(child_id)
