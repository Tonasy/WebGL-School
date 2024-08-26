precision mediump float;

uniform sampler2D textureUnit;
uniform bool isGrayScale; // グレイスケール化するかどうか
uniform bool isNoise;
uniform vec2 resolution; // スクリーンの解像度
uniform float time;
uniform float alpha;
uniform float radius;
uniform vec2 cursor;
varying vec2 vTexCoord;

const float INVERSE3 = 1.0 / 3.0;
const int   OCT      = 8;         // オクターブ
const float PST      = 0.5;       // パーセンテージ
const float PI       = 3.1415926; // 円周率

// 乱数生成
float rnd(vec2 n){
  float a  = 0.129898;
  float b  = 0.78233;
  float c  = 437.585453;
  float dt = dot(n ,vec2(a, b));
  float sn = mod(dt, 3.14);
  return fract(sin(sn) * c);
}



void main() {
  // テクスチャの色
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);

  // グレイスケール化
  float gray = dot(vec3(1.0), samplerColor.rgb) * INVERSE3;
    
  // グレイスケール化した色を補正する
  gray = gray * (1.0 - alpha);

  // ホワイトノイズを取得する
  float noise = 0.0;
  noise = rnd(gl_FragCoord.xy + time);

  // ノイズの明るさを補正する
  noise *= alpha;

  // 最終出力カラーを合成する  
  vec3 outputColor = vec3(samplerColor.rgb);

  if(isGrayScale == true){
    outputColor = vec3(gray);
  }

  if(isNoise == true) {
    outputColor += vec3(noise);
  }

  // アスペクト比を考慮した座標系を作成
  vec2 aspectRatio = vec2(resolution.x / resolution.y, 1.0);
  vec2 normalizedCoord = vTexCoord * aspectRatio;
  vec2 normalizedCursor = vec2(cursor.x, 1.0 - cursor.y) * aspectRatio;

  float dist = distance(normalizedCursor, normalizedCoord);
 float softness = 0.2 * aspectRatio.x;
  float edge = radius - softness; // エッジの範囲
  float t = smoothstep(edge, radius, dist); // edgeの内側は0.0、edgeの外側は1.0、その間を補間されるように補正
  outputColor = mix(outputColor, vec3(0.8), t);

  gl_FragColor = vec4(outputColor, 1.0);

}


