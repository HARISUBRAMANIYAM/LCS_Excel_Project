import re
from pathlib import Path
from enum import Enum as PyEnum

def sanitize_folder_name(foldername: str) -> str:
    foldername = foldername.replace(" ", "_")
    foldername = re.sub(r'[\\/*?:"<>|]', "", foldername)
    return foldername[:100]

class Role(str, PyEnum):
    USER = "user"
    HR = "hr"
    ADMIN = "admin"