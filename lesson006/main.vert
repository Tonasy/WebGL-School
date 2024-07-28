
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;

varying vec3 vNormal;
varying vec4 vColor;

void main() {
  // 法線をまず行列で変換する
  vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
  
  vColor = color;

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}

