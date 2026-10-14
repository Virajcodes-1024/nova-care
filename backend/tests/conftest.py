import pytest
from app.database import Base, get_db, make_engine
from app.main import app
from app.seed import seed
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def store(tmp_path):
    url = f"sqlite:///{tmp_path / 'test.db'}"
    engine = make_engine(url)
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory() as db:
        seed(db)
    yield factory, url
    engine.dispose()


@pytest.fixture
def client(store):
    factory, _ = store

    def override():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
