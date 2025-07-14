# from pydantic_settings import BaseSettings


# class Settings(BaseSettings):
class Settings():

    # DATABASE_URL: str = "mssql+pyodbc://@DESKTOP-PG5RLUD/HR_Extraction_DB?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes"
    DATABASE_URL = "sqlite:///./hr_extraction.db"
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PROJECT_NAME: str = "HR Extraction API"

    # class Config:
    #     env_file = ".env"

settings = Settings()