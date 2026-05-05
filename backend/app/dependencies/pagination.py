
from pydantic import BaseModel


class PaginatedResponse(BaseModel):
    """Generic wrapper for paginated list endpoints."""
    total: int
    skip: int
    limit: int
    items: list   # Override with the concrete type in each router
 
 
# Usage example in a router:
#
#   @router.get("/", response_model=PaginatedResponse)
#   def list_clients(skip: int = 0, limit: int = 50, db=Depends(get_db)):
#       total = db.query(Client).count()
#       items = db.query(Client).offset(skip).limit(limit).all()
#       return {"total": total, "skip": skip, "limit": limit, "items": items}