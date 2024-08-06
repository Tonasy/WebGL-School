precision mediump float;

uniform sampler2D currentTexture;
uniform sampler2D nextTexture;
uniform float progress;
uniform float effectParam;

varying vec4 vColor;
varying vec2 vTexCoord;

void main() {
  // テクスチャの色を取得
  vec4 currentTexColor = texture2D(currentTexture, vTexCoord);
  vec4 nextTexColor = texture2D(nextTexture, vTexCoord);

  // 変位値を計算
  float displace1 = (currentTexColor.r + currentTexColor.g + currentTexColor.b) * 0.333;
  float displace2 = (nextTexColor.r + nextTexColor.g + nextTexColor.b) * 0.333;

  // サンプリング
  vec4 t1 = texture2D(currentTexture, vec2(vTexCoord.x, vTexCoord.y + effectParam * (displace2 * 0.5)));
  vec4 t2 = texture2D(nextTexture, vec2(vTexCoord.x, vTexCoord.y + (1.0 - effectParam) * (displace1 * 0.5)));

  // 最終的な色を出力
  vec4 mixedColor = mix(t1, t2, effectParam);
  
  gl_FragColor = vColor * mixedColor;

}

