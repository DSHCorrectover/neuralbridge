# Copyright 2024-2025 NeuralBridge Team
# Licensed under the Apache License, Version 2.0 (the "License");
# NeuralBridge™ — Proprietary MAPE-K Adaptive Loop Architecture
# Patent Pending. See NOTICE file for full IP attribution.
#
"""NeuralBridge v4.4.2 — Smart Router (backward compatibility).

Smart routing is integrated into SelfHealingEngine.
This module re-exports the engine for compatibility.
"""
from ._engine import SelfHealingEngine as SmartRouter, ProviderConfig, FaultCategory

__all__ = ["SmartRouter", "ProviderConfig", "FaultCategory"]
