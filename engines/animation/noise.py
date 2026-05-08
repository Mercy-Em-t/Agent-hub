# engines/animation/noise.py
import math
from datetime import datetime

class CameraNoiseGenerator:
    """
    Generates procedural organic motion noise (micro-shakes, breathing drift, handheld instability)
    to give clean animations cinematic realism.
    """
    def __init__(self):
        self.diary = []
        self.log("CameraNoiseGenerator initialized.")

    def log(self, message):
        timestamp = datetime.now().isoformat()
        self.diary.append({"timestamp": timestamp, "event": "MOTION_NOISE", "message": message})
        print(f"[{timestamp}] [CameraNoiseGenerator] {message}")

    def get_noise_offset(self, frame, preset="handheld", intensity=1.0):
        """
        Computes procedural offsets (x, y, z) using mathematical harmonics.
        """
        if preset == "breathing":
            # Gentle, low-frequency breathing sway
            x = math.sin(frame * 0.05) * 0.02 * intensity
            y = math.cos(frame * 0.04) * 0.015 * intensity
            z = math.sin(frame * 0.06) * 0.03 * intensity
        elif preset == "handheld":
            # Medium frequency multi-harmonic shaky handheld movement
            x = (math.sin(frame * 0.2) * 0.05 + math.sin(frame * 0.53) * 0.02) * intensity
            y = (math.cos(frame * 0.17) * 0.04 + math.cos(frame * 0.61) * 0.015) * intensity
            z = (math.sin(frame * 0.25) * 0.06 + math.cos(frame * 0.47) * 0.025) * intensity
        elif preset == "tripod_shake":
            # High frequency, tiny vibrations (ground rumble / heavy wind)
            x = math.sin(frame * 1.2) * 0.004 * intensity
            y = math.cos(frame * 1.5) * 0.003 * intensity
            z = math.sin(frame * 1.8) * 0.005 * intensity
        else:
            # Cinematic dolly (fully stable)
            x, y, z = 0.0, 0.0, 0.0

        return x, y, z

    def inject_noise_to_location(self, base_position, frame, preset="handheld", intensity=1.0):
        """
        Applies noise to a base location tuple (x, y, z).
        """
        nx, ny, nz = self.get_noise_offset(frame, preset, intensity)
        noisy_pos = (base_position[0] + nx, base_position[1] + ny, base_position[2] + nz)
        return noisy_pos

    def apply_noise_to_animator(self, animator, start_frame, end_frame, preset="handheld", intensity=1.0):
        """
        Injects procedural noise offsets into existing animator records across a frame range.
        """
        self.log(f"Applying procedural noise ({preset}, intensity={intensity}) across frames {start_frame} to {end_frame}.")
        
        # We loop through frames and add noise keyframe offsets
        for frame in range(start_frame, end_frame + 1):
            nx, ny, nz = self.get_noise_offset(frame, preset, intensity)
            
            # Record these offsets as keyframes in keyframe animator
            animator.add_keyframe(frame, "noise_offset_x", nx)
            animator.add_keyframe(frame, "noise_offset_y", ny)
            animator.add_keyframe(frame, "noise_offset_z", nz)
            
            if frame % ((end_frame - start_frame) // 2 or 1) == 0:
                self.log(f"Procedural Noise at Frame {frame}: Offset = ({round(nx, 4)}, {round(ny, 4)}, {round(nz, 4)})")

        self.log("Procedural noise application complete.")
