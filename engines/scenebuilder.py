# engines/scenebuilder.py
import json
from datetime import datetime

class SceneBuilder:
    """
    Constructs and builds 3D scenes with mesh assets, lights, and layout structures.
    Logs its construction processes dynamically in its self-documenting journal.
    """
    def __init__(self, scene_name="DefaultScene"):
        self.scene_name = scene_name
        self.elements = []
        self.diary = []
        self.log(f"Initialized SceneBuilder for '{self.scene_name}'")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "SCENE_BUILDER", "message": message})
        print(f"[{timestamp}] [SceneBuilder] {message}")

    def add_mesh(self, name, mesh_type, coordinates=(0,0,0)):
        element = {"name": name, "type": mesh_type, "position": coordinates}
        self.elements.append(element)
        self.log(f"Added mesh '{name}' of type '{mesh_type}' at position {coordinates}")
        return element

    def build(self):
        self.log(f"Building final scene '{self.scene_name}' with {len(self.elements)} elements.")
        return {
            "scene_name": self.scene_name,
            "elements": self.elements,
            "diary": self.diary
        }
