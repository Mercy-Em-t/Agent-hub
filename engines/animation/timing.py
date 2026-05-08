# engines/animation/timing.py
from datetime import datetime

class AnimationTiming:
    """
    Manages frame rates, timelines, easing functions, and timing interpolations.
    """
    def __init__(self, fps=24):
        self.fps = fps
        self.diary = []
        self.log(f"Timeline initialized at {self.fps} frames per second.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "ANIMATION_TIMING", "message": message})

    def get_time_seconds(self, frame):
        return frame / self.fps
