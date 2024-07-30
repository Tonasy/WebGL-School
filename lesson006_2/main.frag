precision mediump float;

uniform vec3 ambient;
uniform vec3 eyeDirection;
uniform vec3 lightColor;
uniform mat4 invMatrix;

varying vec3 vNormal;
varying vec3 vLightVec;
varying float vLightLength;
varying vec4 vColor;

void main() {

  // 拡散光
  float diffuse = pow(max(dot(normalize(vNormal), normalize(vLightVec)), 0.0), 3.0);

  // 距離による減衰
  float attenuation = 1.0 / (1.0 + 0.09 * vLightLength + 0.032 * (vLightLength * vLightLength));

  // ライトの色を適用
  vec3 lightEffect = lightColor * diffuse * attenuation;

  // 反射光
  vec3 invEye = normalize(vec3((invMatrix * vec4(eyeDirection, 0.0)).xyz));
  vec3 halfVec = vLightVec + invEye;
  float specular = pow(clamp(dot(normalize(vNormal), normalize(halfVec)), 0.0, 1.0), 200.0);

  // 最終的な色を計算
  gl_FragColor = vec4(vColor.rgb * lightEffect + ambient + vec3(specular), vColor.a);
}

