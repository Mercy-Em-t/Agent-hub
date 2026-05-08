# engines/animation/storyboard.py
from datetime import datetime

class Shot:
    """
    Represents a single cinematic shot in the production timeline.
    """
    def __init__(self, name, start, end, focus=None, duration=50, mood="cinematic", fov=60.0):
        self.name = name
        self.start = start          # Tuple (x, y, z) camera starting position
        self.end = end              # Tuple (x, y, z) camera ending position
        self.focus = focus          # Focus target name
        self.duration = duration    # Duration of the shot in frames
        self.mood = mood            # Mood descriptor (cinematic, suspense, romance, etc.)
        self.fov = fov              # Camera field of view for this shot

    def to_dict(self):
        return {
            "name": self.name,
            "start": self.start,
            "end": self.end,
            "focus": self.focus,
            "duration": self.duration,
            "mood": self.mood,
            "fov": self.fov
        }


class StoryboardPlayer:
    """
    Plays through a sequence of storyboard shots, interpolating positions
    and inserting keyframes into the Animator and CameraRig.
    """
    def __init__(self, camera_rig, animator):
        self.camera_rig = camera_rig
        self.animator = animator
        self.shots = []
        self.diary = []
        self.log("Storyboard Player initialized.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "STORYBOARD", "message": message})
        print(f"[{timestamp}] [StoryboardPlayer] {message}")

    def add_shot(self, shot):
        self.shots.append(shot)
        self.log(f"Registered shot '{shot.name}' (Duration: {shot.duration} frames, Mood: {shot.mood})")

    def play(self, start_frame=0):
        self.log(f"Starting storyboard playback across {len(self.shots)} shots.")
        current_frame = start_frame

        for shot in self.shots:
            shot_start_frame = current_frame
            shot_end_frame = current_frame + shot.duration
            self.log(f"Playing Shot '{shot.name}' (Frames: {shot_start_frame} -> {shot_end_frame})")

            # Update camera FOV and target for the shot
            self.camera_rig.update_fov(shot.fov)
            if shot.focus:
                self.camera_rig.track_target(shot.focus)

            # Insert keyframes for start and end positions (simulated interpolation)
            # We record X, Y, Z keyframes for start and end points
            for idx, coord in enumerate(["x", "y", "z"]):
                self.animator.add_keyframe(shot_start_frame, f"camera_location_{coord}", shot.start[idx])
                self.animator.add_keyframe(shot_end_frame, f"camera_location_{coord}", shot.end[idx])

            # Provide detailed frame-by-frame interpolation simulation in diary
            for f in range(shot.duration + 1):
                ratio = f / shot.duration if shot.duration > 0 else 1.0
                curr_pos = tuple(
                    shot.start[i] + (shot.end[i] - shot.start[i]) * ratio
                    for i in range(3)
                )
                # We can log a sample of positions for verification
                if f % (max(1, shot.duration // 2)) == 0:
                    self.log(f"Shot '{shot.name}' Frame {shot_start_frame + f}: Camera Position = {tuple(round(val, 3) for val in curr_pos)}")

            current_frame = shot_end_frame

        self.log(f"Storyboard playback completed at Frame {current_frame}.")
        return current_frame
