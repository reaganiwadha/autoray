from pydantic import BaseModel, EmailStr, Field

from service.models.user import User


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    @classmethod
    def from_db_user(cls, db_user: User) -> "UserResponse":
        assert db_user.id is not None, "User ID must not be None"
        return cls(id=db_user.id, name=db_user.name, email=db_user.email)

class LoginResponse(BaseModel):
    user: UserResponse
    token: str
