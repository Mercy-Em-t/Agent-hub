# engines/animation/scheduler.py
from datetime import datetime

class Event:
    """
    Represents a specific director event triggered at a designated frame index.
    """
    def __init__(self, frame, action, payload=None):
        self.frame = frame
        self.action = action
        self.payload = payload if payload is not None else {}

    def to_dict(self):
        return {
            "frame": self.frame,
            "action": self.action,
            "payload": self.payload
        }


class FrameScheduler:
    """
    Manages and executes chronological events across the animation timeline,
    linking camera moves, expression rigs, and lighting triggers.
    """
    def __init__(self):
        self.events = []
        self.diary = []
        self.log("FrameScheduler initialized.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "SCHEDULER", "message": message})
        print(f"[{timestamp}] [FrameScheduler] {message}")

    def add_event(self, event):
        self.events.append(event)
        # Keep events sorted chronologically by frame
        self.events.sort(key=lambda x: x.frame)
        self.log(f"Scheduled Event '{event.action}' at Frame {event.frame}")

    def run_events(self, core_engine, scene_builder, camera_rig, head_rig):
        """
        Loops through and dispatches actions for all scheduled events, mutating states.
        """
        self.log(f"Executing scheduled timeline events. Total events: {len(self.events)}.")
        
        for event in self.events:
            frame = event.frame
            action = event.action
            payload = event.payload
            
            self.log(f"[Frame {frame}] Dispatching Action '{action}'")

            if action == "start_scene":
                core_engine.boot()
                scene_builder.add_mesh("Stage_Spotlight", "spot_light", (0, 5, 4))
                self.log(f"Scene started. Spotlight asset added.")

            elif action == "camera_move":
                camera_rig.update_fov(payload.get("fov", 55.0))
                self.log(f"Camera adjusted. New FOV = {camera_rig.fov}")

            elif action == "girl_notices":
                head_rig.set_expression_weight("surprise", payload.get("intensity", 0.75))
                self.log(f"Character 'girl' noticed camera! Expression surprise = {head_rig.expressions.get('surprise')}")

            elif action == "look_back":
                head_rig.set_expression_weight("turn_angle", payload.get("angle", 45.0))
                head_rig.set_expression_weight("smile", payload.get("intensity", 0.8))
                self.log(f"Character executed look-back moment. Expression smile = {head_rig.expressions.get('smile')}")

            elif action == "hold_stare":
                camera_rig.track_target("girl_face")
                self.log(f"Camera locked and holding stare at target 'girl_face'.")

            else:
                self.log(f"Custom event trigger '{action}' executed with payload {payload}.")

        self.log("All timeline events processed.")
