precision mediump float;

varying vec4 vColor;

void main() {

  vec2 diff = gl_PointCoord - vec2(.5, .5);
	if (length(diff) > 0.5) discard;

  // 最終的な色を計算
  gl_FragColor = vColor;
}

