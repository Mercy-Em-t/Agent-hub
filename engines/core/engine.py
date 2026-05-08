# engines/core/engine.py
from datetime import datetime

class CoreEngine:
    """
    The heart of the 3D rendering factory. Combines scenes, rigging systems,
    and keyframes into rendered frame outputs.
    Logs everything in its self-documenting chronicle diary.
    """
    def __init__(self):
        self.status = "standby"
        self.active_scene = None
        self.diary = []
        self.log("CoreEngine engine block successfully built.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "CORE_ENGINE", "message": message})
        print(f"[{timestamp}] [CoreEngine] {message}")

    def boot(self):
        self.status = "running"
        self.log("CoreEngine booted into active state.")

    def load_scene(self, scene):
        self.active_scene = scene
        self.log(f"Loaded active scene '{scene['scene_name']}' into graphics buffer.")
