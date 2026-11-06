
import os
import jwt
from datetime import datetime, timedelta, timezone
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from main import Base, engine, get_db

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be configured in backend/.env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class User(Base):
    __tablename__ = "users"

    id = __import__("sqlalchemy").Column(
        __import__("sqlalchemy").Integer, primary_key=True
    )
    name = __import__("sqlalchemy").Column(
        __import__("sqlalchemy").String(100), nullable=False
    )
    email = __import__("sqlalchemy").Column(
        __import__("sqlalchemy").String(255), unique=True,
        nullable=False, index=True
    )
    hashed_password = __import__("sqlalchemy").Column(
        __import__("sqlalchemy").String(255), nullable=False
    )


Base.metadata.create_all(bind=engine)


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def create_access_token(user_id: int):
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return jwt.encode(
        {"sub": str(user_id), "exp": expires},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    unauthorized = HTTPException(
        status_code=401,
        detail="Invalid or expired login session",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id = int(payload.get("sub"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise unauthorized

    user = db.get(User, user_id)

    if not user:
        raise unauthorized

    return user
