precision mediump float;

uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D noiseTexture;
uniform float progress;
uniform float effectParam;

varying vec4 vColor;
varying vec2 vTexCoord;

void main() {
  // テクスチャの色を取得
  vec4 currentTexColor = texture2D(texture0, vTexCoord);
  vec4 nextTexColor = texture2D(texture1, vTexCoord);
  // ノイズの明度を取得
  float noise = texture2D(noiseTexture, vTexCoord).r;

  if( noise + effectParam >= 0.8 ) {
    gl_FragColor = nextTexColor;
  } else{
    gl_FragColor = currentTexColor;
  }
}

