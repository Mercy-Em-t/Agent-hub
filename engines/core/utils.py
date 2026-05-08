# engines/core/utils.py
import uuid

def generate_entity_id(prefix="ENT"):
    """
    Helper utility to generate unique system entity identifiers.
    """
    return f"{prefix}-{str(uuid.uuid4())[:8].upper()}"
