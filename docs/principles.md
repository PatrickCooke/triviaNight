# Engineering Principles

These principles guide the development of triviaNight to ensure it excels on target hardware.

## 1. Local-First Performance
The primary target is a Raspberry Pi. 
- Minimize client-side processing for complex animations.
- Keep the SQLite database indexed for fast lookups.
- Use efficient JSON serialization for complex question types.

## 2. Robustness over Connectivity
- The system must function entirely offline.
- No external CDN dependencies; all assets (fonts, icons) must be bundled locally.

## 3. Keyboard/Mouse First Navigation
- The Presentation UI must be reliably controllable via standard input devices (Mouse/Clickers/Keyboards).
- Focus on low-latency transitions between slides.

## 4. Data-Driven Insights
- Analytics aren't just "nice to have"; they are core to improving future trivia sets.
- Every answer is a data point for question difficulty calibration.
