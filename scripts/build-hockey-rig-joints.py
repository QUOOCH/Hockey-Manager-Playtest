#!/usr/bin/env python3
"""Build a conservative hockey-specific joint override from Autorig's first-pass landmarks.

The source model is measured once by the pinned upstream fitter. This script mirrors paired
joints around the measured pelvis centre, averaging depth/height between sides. It does not
invent a new anatomy or alter the source mesh; it removes left/right measurement drift caused
by asymmetrical hockey equipment and the held stick. Coordinates are Blender XYZ.
"""
import json
import math
import sys
from pathlib import Path

PAIRS = (
    ("Lefthip", "Righthip"),
    ("Leftankle", "Rightankle"),
    ("Leftknee", "Rightknee"),
    ("Lefttoe", "Righttoe"),
    ("Leftball", "Rightball"),
    ("Leftshoulder", "Rightshoulder"),
    ("Leftelbow", "Rightelbow"),
    ("Leftwrist", "Rightwrist"),
)

def average_pair(measured, left, right, center_x):
    a, b = measured[left], measured[right]
    radius = (abs(a[0] - center_x) + abs(b[0] - center_x)) * 0.5
    y, z = (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5
    return [center_x + radius, y, z], [center_x - radius, y, z]

def build(measured):
    required = ("hip", "spine", "spine1", "spine2", "neck", "head", "top")
    missing = [k for k in required if k not in measured]
    if missing:
        raise ValueError("Missing first-pass landmarks: " + ", ".join(missing))
    center_x = float(measured["hip"][0])
    out = {
        "pelvis": list(measured["hip"]),
        "spine_01": list(measured["spine"]),
        "spine_02": list(measured["spine1"]),
        "spine_03": list(measured["spine2"]),
        "neck_01": list(measured["neck"]),
        "head": list(measured["head"]),
        "head_leaf": list(measured["top"]),
        "root": [center_x, float(measured["hip"][1]), 0.0],
    }
    names = {
        "Lefthip": ("thigh_l", "thigh_r"),
        "Leftknee": ("calf_l", "calf_r"),
        "Leftankle": ("foot_l", "foot_r"),
        "Leftball": ("ball_l", "ball_r"),
        "Lefttoe": ("ball_leaf_l", "ball_leaf_r"),
        "Leftshoulder": ("upperarm_l", "upperarm_r"),
        "Leftelbow": ("lowerarm_l", "lowerarm_r"),
        "Leftwrist": ("hand_l", "hand_r"),
    }
    for left, right in PAIRS:
        if left not in measured or right not in measured:
            continue
        a, b = average_pair(measured, left, right, center_x)
        bone_names = names[left]
        out[bone_names[0]], out[bone_names[1]] = a, b
    # Match the upstream fitter's clavicle construction, now using mirrored shoulder roots.
    shoulder_l, shoulder_r = out["upperarm_l"], out["upperarm_r"]
    for side, shoulder in (("l", shoulder_l), ("r", shoulder_r)):
        out["clavicle_" + side] = [
            center_x + (shoulder[0] - center_x) * 0.3,
            (out["spine_03"][1] + out["neck_01"][1]) * 0.5,
            out["spine_03"][2] + (out["neck_01"][2] - out["spine_03"][2]) * 0.7,
        ]
    for name, point in out.items():
        if len(point) != 3 or not all(math.isfinite(float(v)) for v in point):
            raise ValueError("Invalid joint coordinate for " + name)
    return {"axes": "blender", "joints": out,
            "method": "paired-joint symmetry around pelvis centre; source geometry unchanged"}

def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: build-hockey-rig-joints.py <first-pass-log> <output.json>")
    log_text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
    records = [line.partition("M2M_RIG ")[2] for line in log_text.splitlines() if "M2M_RIG " in line]
    if not records:
        raise SystemExit("No M2M_RIG record found in first-pass log")
    record = json.loads(records[-1])
    measured = record.get("measured")
    if not isinstance(measured, dict):
        raise SystemExit("First-pass log contains no measured landmarks")
    result = build(measured)
    result["source_model"] = record.get("source")
    result["first_pass_name"] = record.get("name")
    Path(sys.argv[2]).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"overridden_bones": sorted(result["joints"]), "pelvis_center_x": measured["hip"][0]}))

if __name__ == "__main__":
    main()
