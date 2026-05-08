# engines/rigs/headrig.py
from datetime import datetime

class HeadRig:
    """
    Manages facial rigging, mouth shapes, and coordinate mappings for head orientation.
    """
    def __init__(self, head_id="DefaultHead"):
        self.head_id = head_id
        self.expressions = {}
        self.diary = []
        self.log(f"HeadRig '{self.head_id}' loaded and expression keys registered.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "HEAD_RIG", "message": message})

    def set_expression_weight(self, expression, weight):
        self.expressions[expression] = weight
        self.log(f"Set expression weight: {expression} = {weight}")
