# engines/rigs/camerarig.py
from datetime import datetime

class CameraRig:
    """
    Controls camera positioning, lenses, tracking, and target rigging.
    """
    def __init__(self, rig_name="CinematicCamera"):
        self.rig_name = rig_name
        self.fov = 60.0
        self.target = None
        self.diary = []
        self.log(f"CameraRig '{self.rig_name}' initialized with FOV {self.fov}")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "CAMERA_RIG", "message": message})

    def track_target(self, target_name):
        self.target = target_name
        self.log(f"Camera target rigged to track '{target_name}'")

    def update_fov(self, fov):
        self.fov = fov
        self.log(f"Field of View updated to {fov} degrees")
