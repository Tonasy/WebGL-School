precision mediump float;

uniform sampler2D textureUnit;
uniform bool isGrayScale;  // グレイスケール化するかどうか
uniform bool isNoise;
uniform bool isDisplace;
uniform vec2 resolution;   // スクリーンの解像度
uniform float time;
uniform float alpha;
uniform vec2 cursor;
varying vec2 vTexCoord;

const float INVERSE3 = 1.0 / 3.0;
const int   OCT      = 8;         // オクターブ
const float PST      = 0.5;       // パーセンテージ
const float PI       = 3.1415926; // 円周率

// 乱数生成
float rnd(vec2 n) {
    float a = 0.129898;
    float b = 0.78233;
    float c = 437.585453;
    float dt = dot(n, vec2(a, b));
    float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
}

// ディスプレースメント
vec2 displace(vec2 uv, vec2 cursor, float strength) {
    vec2 direction = uv - cursor;
    float dist = length(direction);
    return uv + direction * strength / (dist * dist + 0.1);
}

void main() {
  // テクスチャ座標を正規化
    vec2 normalizedCoord = vec2((vTexCoord.x * 2.0 - 1.0), (vTexCoord.y * 2.0 - 1.0));

    // マウスカーソルの座標をスクリーン空間からクリップ空間に変換
    vec2 normalizedCursor = vec2(cursor.x / resolution.x * 2.0 - 1.0, 1.0 - (cursor.y / resolution.y * 2.0));

    // ディスプレースメント処理を適用
    vec4 displacedColor = texture2D(textureUnit, vTexCoord);  // デフォルトのテクスチャカラー
    if (isDisplace == true) {
        // マウスカーソルの方向と距離
        vec2 direction = normalizedCoord - normalizedCursor;
        float distance = length(direction);

        // マウスカーソルの座標をディスプレースメントマッピングに使用
        vec2 displacedCoord = displace(normalizedCoord, normalizedCursor, 0.1);

        // 距離に応じて変位を調整
        float strength = 0.1 / (distance + 0.1);
        vec2 displacedUv = displacedCoord + normalize(direction) * strength;

        // アスペクト比を適用したテクスチャ座標
        vec2 textureCoord = (displacedUv + 1.0) * 0.5; // [-1,1] -> [0,1]
        displacedColor = texture2D(textureUnit, textureCoord);
    }

    // グレースケール処理
    float gray = dot(vec3(1.0), displacedColor.rgb) * INVERSE3;
    gray = gray * (1.0 - alpha);

    vec3 outputColor = displacedColor.rgb;

    // グレースケール処理を適用
    if (isGrayScale == true) {
        outputColor = vec3(gray);
    }

    // ノイズ処理
    if (isNoise == true) {
        float noise = rnd(gl_FragCoord.xy + time);
        noise *= alpha;
        outputColor += vec3(noise);
    }

    // 最終出力カラー
    gl_FragColor = vec4(outputColor, displacedColor.a);
}