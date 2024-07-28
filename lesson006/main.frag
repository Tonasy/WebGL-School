precision mediump float;

varying vec3 vNormal;
varying vec4 vColor;

// ライトベクトル
const vec3 light = vec3(1.0, 1.0, 1.0);


void main() {
  // 法線とライトベクトルの内積
  float d = dot(normalize(vNormal), normalize(light));

  // 内積の結果を頂点カラーの RGB 成分に乗算する
  gl_FragColor = vec4(vColor.rgb * d, vColor.a);
}

