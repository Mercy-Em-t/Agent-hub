# engines/animation/keyframes.py
from datetime import datetime

class KeyframeAnimator:
    """
    Stores and interpolates keyframe coordinates for 3D translation and rotation.
    """
    def __init__(self):
        self.keyframes = []
        self.diary = []
        self.log("KeyframeAnimator initialized.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "KEYFRAME_ANIMATOR", "message": message})

    def add_keyframe(self, frame_index, attribute, value):
        self.keyframes.append({"frame": frame_index, "attr": attribute, "val": value})
        self.log(f"Added keyframe at frame {frame_index} for '{attribute}' with value {value}")
