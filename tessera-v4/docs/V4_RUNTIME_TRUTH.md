Boot stages: DOM+controls, WebGL acquisition, safe-mode first frame, full organism init. If full mode fails, safe mode remains active and visible.
No same-canvas 2D context is used. Single THREE.WebGLRenderer owns the canvas.
