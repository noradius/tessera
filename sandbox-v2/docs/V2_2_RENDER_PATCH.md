# V2.2 Render Patch Notes

This patch focuses on particle fidelity and overlap control without changing engine architecture.

- High-DPI sharpness: renderer pixel ratio is now set from `devicePixelRatio` (capped to 2), and updated on every resize.
- Particle language: shifted to a micro-speck bias (smaller point sizes, stronger small-size weighting, slightly increased max count).
- White blowout reduction: shader alpha/lighting were tightened and a color-preserving peak compression step was added to reduce additive clipping.
- Responsive scaling: active particle draw count and size now adapt to viewport area so smaller viewports avoid oversized overlap while larger displays stay dense.
