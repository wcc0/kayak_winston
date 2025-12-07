from sqlmodel import SQLModel, create_engine, Session
import os

DATABASE_URL = os.getenv('DEALS_DATABASE_URL', 'sqlite:///./deals.db')
engine = create_engine(DATABASE_URL, echo=False)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    return Session(engine)
