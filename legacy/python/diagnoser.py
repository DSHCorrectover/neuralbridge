# Copyright 2024-2025 NeuralBridge Team
# Licensed under the Apache License, Version 2.0 (the "License");
# NeuralBridge™ — Proprietary MAPE-K Adaptive Loop Architecture
# Commercial Engine. Proprietary.
#
"""NeuralBridge — L1 Diagnoser module.

Semantic boundary: identify fault only, output label, NO action.

This module re-exports the canonical Diagnoser from _engine.py for
backward compatibility. All logic lives in a single source of truth.
"""

# Canonical source of truth: _engine.py
from ._engine import (
    FaultCategory,
    Diagnosis,
    Diagnoser,
    _STATUS_MAP as STATUS_MAP,
    _DECISION as DECISION,
    _PATTERNS as PATTERNS,
    _COMPILED as COMPILED,
)

from neuralbridge._version import __version__

__all__ = [
    "FaultCategory", "Diagnosis", "Diagnoser",
    "STATUS_MAP", "DECISION", "PATTERNS", "COMPILED",
]
