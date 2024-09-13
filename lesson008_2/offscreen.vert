attribute vec3 imgPosition;
attribute vec4 imgColor;
attribute float imgSize;
attribute float rand;
attribute float rand2;

uniform mat4 mvpMatrix;
uniform float time;
uniform float progress;
uniform vec2 cursor; // カーソルの位置

varying vec4 vColor;

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
  // アニメーションの進捗を定義
  float pauseDuration = 0.1; // 停止時間の割合

  // 各フェーズの進捗を定義
  vec3 morphPos;
  vec4 morphColor;
  float morphSize;
  
  // 乱数の正規化
  float rand = rand * 2.0 - 1.0; // -1.0 〜 1.0 の範囲に変換
  float rand2 = rand2 * 2.0 - 1.0; // -1.0 〜 1.0 の範囲に変換

  if (progress < 0.25 ) {
    float explosionProgress = progress / 0.25;
    vec3 randomDirection = normalize(vec3(rand, rand2, imgPosition.z));
    vec3 randomOffset = randomDirection * explosionProgress;
    morphPos = mix(imgPosition, imgPosition + randomOffset * 2.0, explosionProgress);
    morphColor = mix(imgColor, vec4(rnd(vec2(0.2,0.33)), 1.0 - rand, rand2, 1.0), explosionProgress);
    morphSize = mix(imgSize, imgSize * rand * rand, explosionProgress);
  } else if (progress < 0.3) {
    vec3 randomDirection = normalize(vec3(rand, rand2, imgPosition.z));
    morphPos = imgPosition + randomDirection * 2.0;
    morphColor = vec4(rnd(vec2(0.2,0.33)), 1.0 - rand, rand2, 1.0);
    morphSize = imgSize * rand2 * rand2;
  } else if (progress < 1.0 ) {
    float morphProgress = (progress - 0.3) / 0.7;
    vec3 randomDirection = normalize(vec3(rand, rand2, imgPosition.z));
    morphPos = mix(imgPosition + randomDirection * 2.0, imgPosition, morphProgress);
    morphColor = mix(vec4(rnd(vec2(0.2,0.33)), 1.0 - rand, rand2, 1.0), imgColor, morphProgress);
    morphSize = mix(imgSize * rand2 * rand2, imgSize, morphProgress);
  } else {
    // 次のクリックまで停止 (1.0)
    morphPos = imgPosition;
    morphColor = imgColor;
    morphSize = imgSize;
  }

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(morphPos, 1.0);

  // 色をフラグメントシェーダに渡す
  vColor = morphColor;

  // ポイントサイズ
  float baseSize = 0.1;

  // ポイントサイズを時間と乱数に基づいて変化させる
  gl_PointSize = max(baseSize, morphSize * abs(sin(time * rand2 * 1.5)) * rnd(vec2(0.14, 0.56)) * 0.5);
}