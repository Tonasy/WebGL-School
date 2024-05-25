import * as THREE from "../lib/three.module.js";
import { OrbitControls } from "../lib/OrbitControls.js";
import * as BufferGeometryUtils from "../lib/BufferGeometryUtils.js";

// 初期化
window.addEventListener(
  "DOMContentLoaded",
  () => {
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper);
    app.render();
  },
  false
);

// ThreeApp クラスの定義

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    // fovy は Field of View Y のことで、縦方向の視野角を意味する
    fovy: 60,
    // 描画する空間のアスペクト比（縦横比）
    aspect: window.innerWidth / window.innerHeight,
    // 描画する空間のニアクリップ面（最近面）
    near: 0.1,
    // 描画する空間のファークリップ面（最遠面）
    far: 100.0,
    // カメラの座標
    position: new THREE.Vector3(0.0, 0.0, 12.5),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x001a43, // 画面をクリアする色
    clearAlpha: 0.90, // 透明度
    width: window.innerWidth, // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 2.0, // 光の強度
    position: new THREE.Vector3(0.0, 1.0, 1.0), // 光の向き
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: .5, // 光の強度

  };
  /**
   * スポットライト定義のための定数
   */
  static SPOT_LIGHT_PARAM = {
    color: 0xffdc00, // 光の色
    intensity: 25, // 光の強度
    position: new THREE.Vector3(0.0, 3.0, 0), // 光源の位置
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    opacity: 0.95,
    transparent: true,
    shininess: 150, // 反射光の強さ
  };
  /**
   * オブジェクト定義のための定数
   */
  static OBJECT_PARAM = {
    boxSize: 0.2, // ボックスのサイズ
    transformScale: 10.0, // 移動範囲
    fishCount: 25, // 魚の数
    fishShape: [
      // 胴体(基準)
      { x: 0, y: 0, z: 0 },
      { x: 0.2, y: 0.2, z: 0 },
      { x: 0.4, y: 0.4, z: 0 },
      { x: 0.6, y: 0.6, z: 0 },
      { x: 0.8, y: 0.8, z: 0 },
      { x: 1.0, y: 0.8, z: 0 },
      { x: 1.2, y: 0.8, z: 0 },
      { x: 1.4, y: 0.8, z: 0 },
      { x: 1.6, y: 0.8, z: 0 },
      { x: 1.8, y: 0.8, z: 0 },
      { x: 2.0, y: 0.8, z: 0 },
      { x: 2.2, y: 0.8, z: 0 },
      { x: 2.4, y: 0.6, z: 0 },
      { x: 2.6, y: 0.4, z: 0 },
      { x: 2.8, y: 0.2, z: 0 },
      { x: 0.2, y: -0.2, z: 0 },
      { x: 0.4, y: -0.4, z: 0 },
      { x: 0.6, y: -0.6, z: 0 },
      { x: 0.8, y: -0.8, z: 0 },
      { x: 1.0, y: -0.8, z: 0 },
      { x: 1.2, y: -0.8, z: 0 },
      { x: 1.4, y: -0.8, z: 0 },
      { x: 1.6, y: -0.8, z: 0 },
      { x: 1.8, y: -0.8, z: 0 },
      { x: 2.0, y: -0.8, z: 0 },
      { x: 2.2, y: -0.8, z: 0 },
      { x: 2.4, y: -0.6, z: 0 },
      { x: 2.6, y: -0.4, z: 0 },
      { x: 2.8, y: -0.2, z: 0 },

      // 胴体（正）
      { x: 0.2, y: 0.0, z: 0.1 },
      { x: 0.4, y: 0.2, z: 0.1 },
      { x: 0.6, y: 0.4, z: 0.1 },
      { x: 0.8, y: 0.6, z: 0.1 },
      { x: 1.0, y: 0.6, z: 0.1 },
      { x: 1.2, y: 0.6, z: 0.1 },
      { x: 1.4, y: 0.6, z: 0.1 },
      { x: 1.6, y: 0.6, z: 0.1 },
      { x: 1.8, y: 0.6, z: 0.1 },
      { x: 2.0, y: 0.6, z: 0.1 },
      { x: 2.2, y: 0.6, z: 0.1 },
      { x: 2.4, y: 0.4, z: 0.1 },
      { x: 2.6, y: 0.2, z: 0.1 },
      { x: 2.8, y: 0.0, z: 0.1 },
      { x: 0.4, y: -0.2, z: 0.1 },
      { x: 0.6, y: -0.4, z: 0.1 },
      { x: 0.8, y: -0.6, z: 0.1 },
      { x: 1.0, y: -0.6, z: 0.1 },
      { x: 1.2, y: -0.6, z: 0.1 },
      { x: 1.4, y: -0.6, z: 0.1 },
      { x: 1.6, y: -0.6, z: 0.1 },
      { x: 1.8, y: -0.6, z: 0.1 },
      { x: 2.0, y: -0.6, z: 0.1 },
      { x: 2.2, y: -0.6, z: 0.1 },
      { x: 2.4, y: -0.4, z: 0.1 },
      { x: 2.6, y: -0.2, z: 0.1 },

      { x: 0.4, y: 0.0, z: 0.2 },
      { x: 0.6, y: 0.2, z: 0.2 },
      { x: 0.8, y: 0.4, z: 0.2 },
      { x: 1.0, y: 0.4, z: 0.2 },
      { x: 1.2, y: 0.4, z: 0.2 },
      { x: 1.4, y: 0.4, z: 0.2 },
      { x: 1.6, y: 0.4, z: 0.2 },
      { x: 1.8, y: 0.4, z: 0.2 },
      { x: 2.0, y: 0.4, z: 0.2 },
      { x: 2.2, y: 0.4, z: 0.2 },
      { x: 2.4, y: 0.2, z: 0.2 },
      { x: 2.6, y: 0.0, z: 0.2 },
      { x: 0.6, y: -0.2, z: 0.2 },
      { x: 0.8, y: -0.4, z: 0.2 },
      { x: 1.0, y: -0.4, z: 0.2 },
      { x: 1.2, y: -0.4, z: 0.2 },
      { x: 1.4, y: -0.4, z: 0.2 },
      { x: 1.6, y: -0.4, z: 0.2 },
      { x: 1.8, y: -0.4, z: 0.2 },
      { x: 2.0, y: -0.4, z: 0.2 },
      { x: 2.2, y: -0.4, z: 0.2 },
      { x: 2.4, y: -0.2, z: 0.2 },

      { x: 0.6, y: 0.0, z: 0.3 },
      { x: 0.8, y: 0.2, z: 0.3 },
      { x: 1.0, y: 0.2, z: 0.3 },
      { x: 1.2, y: 0.2, z: 0.3 },
      { x: 1.4, y: 0.2, z: 0.3 },
      { x: 1.6, y: 0.2, z: 0.3 },
      { x: 1.8, y: 0.2, z: 0.3 },
      { x: 2.0, y: 0.2, z: 0.3 },
      { x: 2.2, y: 0.2, z: 0.3 },
      { x: 2.4, y: 0.0, z: 0.3 },
      { x: 0.8, y: -0.2, z: 0.3 },
      { x: 1.0, y: -0.2, z: 0.3 },
      { x: 1.2, y: -0.2, z: 0.3 },
      { x: 1.4, y: -0.2, z: 0.3 },
      { x: 1.6, y: -0.2, z: 0.3 },
      { x: 1.8, y: -0.2, z: 0.3 },
      { x: 2.0, y: -0.2, z: 0.3 },
      { x: 2.2, y: -0.2, z: 0.3 },

      { x: 0.8, y: 0.0, z: 0.4 },
      { x: 1.0, y: 0.0, z: 0.4 },
      { x: 1.2, y: 0.0, z: 0.4 },
      { x: 1.4, y: 0.0, z: 0.4 },
      { x: 1.6, y: 0.0, z: 0.4 },
      { x: 1.8, y: 0.0, z: 0.4 },
      { x: 2.0, y: 0.0, z: 0.4 },
      { x: 2.2, y: 0.0, z: 0.4 },

      // 胴体（負）
      { x: 0.2, y: 0.0, z: -0.1 },
      { x: 0.4, y: 0.2, z: -0.1 },
      { x: 0.6, y: 0.4, z: -0.1 },
      { x: 0.8, y: 0.6, z: -0.1 },
      { x: 1.0, y: 0.6, z: -0.1 },
      { x: 1.2, y: 0.6, z: -0.1 },
      { x: 1.4, y: 0.6, z: -0.1 },
      { x: 1.6, y: 0.6, z: -0.1 },
      { x: 1.8, y: 0.6, z: -0.1 },
      { x: 2.0, y: 0.6, z: -0.1 },
      { x: 2.2, y: 0.6, z: -0.1 },
      { x: 2.4, y: 0.4, z: -0.1 },
      { x: 2.6, y: 0.2, z: -0.1 },
      { x: 2.8, y: 0.0, z: -0.1 },
      { x: 0.4, y: -0.2, z: -0.1 },
      { x: 0.6, y: -0.4, z: -0.1 },
      { x: 0.8, y: -0.6, z: -0.1 },
      { x: 1.0, y: -0.6, z: -0.1 },
      { x: 1.2, y: -0.6, z: -0.1 },
      { x: 1.4, y: -0.6, z: -0.1 },
      { x: 1.6, y: -0.6, z: -0.1 },
      { x: 1.8, y: -0.6, z: -0.1 },
      { x: 2.0, y: -0.6, z: -0.1 },
      { x: 2.2, y: -0.6, z: -0.1 },
      { x: 2.4, y: -0.4, z: -0.1 },
      { x: 2.6, y: -0.2, z: -0.1 },

      { x: 0.4, y: 0.0, z: -0.2 },
      { x: 0.6, y: 0.2, z: -0.2 },
      { x: 0.8, y: 0.4, z: -0.2 },
      { x: 1.0, y: 0.4, z: -0.2 },
      { x: 1.2, y: 0.4, z: -0.2 },
      { x: 1.4, y: 0.4, z: -0.2 },
      { x: 1.6, y: 0.4, z: -0.2 },
      { x: 1.8, y: 0.4, z: -0.2 },
      { x: 2.0, y: 0.4, z: -0.2 },
      { x: 2.2, y: 0.4, z: -0.2 },
      { x: 2.4, y: 0.2, z: -0.2 },
      { x: 2.6, y: 0.0, z: -0.2 },
      { x: 0.6, y: -0.2, z: -0.2 },
      { x: 0.8, y: -0.4, z: -0.2 },
      { x: 1.0, y: -0.4, z: -0.2 },
      { x: 1.2, y: -0.4, z: -0.2 },
      { x: 1.4, y: -0.4, z: -0.2 },
      { x: 1.6, y: -0.4, z: -0.2 },
      { x: 1.8, y: -0.4, z: -0.2 },
      { x: 2.0, y: -0.4, z: -0.2 },
      { x: 2.2, y: -0.4, z: -0.2 },
      { x: 2.4, y: -0.2, z: -0.2 },

      { x: 0.6, y: 0.0, z: -0.3 },
      { x: 0.8, y: 0.2, z: -0.3 },
      { x: 1.0, y: 0.2, z: -0.3 },
      { x: 1.2, y: 0.2, z: -0.3 },
      { x: 1.4, y: 0.2, z: -0.3 },
      { x: 1.6, y: 0.2, z: -0.3 },
      { x: 1.8, y: 0.2, z: -0.3 },
      { x: 2.0, y: 0.2, z: -0.3 },
      { x: 2.2, y: 0.2, z: -0.3 },
      { x: 2.4, y: 0.0, z: -0.3 },
      { x: 0.8, y: -0.2, z: -0.3 },
      { x: 1.0, y: -0.2, z: -0.3 },
      { x: 1.2, y: -0.2, z: -0.3 },
      { x: 1.4, y: -0.2, z: -0.3 },
      { x: 1.6, y: -0.2, z: -0.3 },
      { x: 1.8, y: -0.2, z: -0.3 },
      { x: 2.0, y: -0.2, z: -0.3 },
      { x: 2.2, y: -0.2, z: -0.3 },

      { x: 0.8, y: 0.0, z: -0.4 },
      { x: 1.0, y: 0.0, z: -0.4 },
      { x: 1.2, y: 0.0, z: -0.4 },
      { x: 1.4, y: 0.0, z: -0.4 },
      { x: 1.6, y: 0.0, z: -0.4 },
      { x: 1.8, y: 0.0, z: -0.4 },
      { x: 2.0, y: 0.0, z: -0.4 },
      { x: 2.2, y: 0.0, z: -0.4 },

      // 尾びれ（基準）
      { x: 3, y: 0, z: 0 },
      { x: 3.1, y: 0.2, z: 0 },
      { x: 3.1, y: -0.2, z: 0 },
      { x: 3.2, y: 0.4, z: 0 },
      { x: 3.2, y: -0.4, z: 0 },
      { x: 3.4, y: 0.6, z: 0 },
      { x: 3.4, y: -0.6, z: 0 },
      { x: 3.6, y: 0.8, z: 0 },
      { x: 3.6, y: -0.8, z: 0 },
      { x: 3.8, y: -0.6, z: 0 },
      { x: 3.8, y: -0.4, z: 0 },
      { x: 3.8, y: -0.2, z: 0 },
      { x: 3.8, y: 0, z: 0 },
      { x: 3.8, y: 0.2, z: 0 },
      { x: 3.8, y: 0.4, z: 0 },
      { x: 3.8, y: 0.6, z: 0 },

      // 尾びれ（正）
      { x: 3, y: 0, z: 0.1 },
      { x: 3.1, y: 0.0, z: 0.1 },
      { x: 3.2, y: 0.2, z: 0.1 },
      { x: 3.4, y: 0.4, z: 0.1 },
      { x: 3.6, y: 0.6, z: 0.1 },
      { x: 3.6, y: 0.4, z: 0.1 },
      { x: 3.6, y: 0.2, z: 0.1 },
      { x: 3.6, y: 0.0, z: 0.1 },
      { x: 3.2, y: -0.2, z: 0.1 },
      { x: 3.4, y: -0.4, z: 0.1 },
      { x: 3.6, y: -0.6, z: 0.1 },
      { x: 3.6, y: -0.4, z: 0.1 },
      { x: 3.6, y: -0.2, z: 0.1 },

      { x: 3.2, y: 0.0, z: 0.2 },
      { x: 3.4, y: 0.2, z: 0.2 },
      { x: 3.6, y: 0.4, z: 0.2 },
      { x: 3.6, y: 0.2, z: 0.2 },
      { x: 3.6, y: 0.0, z: 0.2 },
      { x: 3.4, y: -0.2, z: 0.2 },
      { x: 3.6, y: -0.4, z: 0.2 },
      { x: 3.6, y: -0.2, z: 0.2 },

      { x: 3.4, y: 0.0, z: 0.3 },

      // 尾びれ（負）
      { x: 3, y: 0, z: -0.1 },
      { x: 3.1, y: 0.0, z: -0.1 },
      { x: 3.2, y: 0.2, z: -0.1 },
      { x: 3.4, y: 0.4, z: -0.1 },
      { x: 3.6, y: 0.6, z: -0.1 },
      { x: 3.6, y: 0.4, z: -0.1 },
      { x: 3.6, y: 0.2, z: -0.1 },
      { x: 3.6, y: 0.0, z: -0.1 },
      { x: 3.2, y: -0.2, z: -0.1 },
      { x: 3.4, y: -0.4, z: -0.1 },
      { x: 3.6, y: -0.6, z: -0.1 },
      { x: 3.6, y: -0.4, z: -0.1 },
      { x: 3.6, y: -0.2, z: -0.1 },

      { x: 3.2, y: 0.0, z: -0.2 },
      { x: 3.4, y: 0.2, z: -0.2 },
      { x: 3.6, y: 0.4, z: -0.2 },
      { x: 3.6, y: 0.2, z: -0.2 },
      { x: 3.6, y: 0.0, z: -0.2 },
      { x: 3.4, y: -0.2, z: -0.2 },
      { x: 3.6, y: -0.4, z: -0.2 },
      { x: 3.6, y: -0.2, z: -0.2 },

      { x: 3.4, y: 0.0, z: -0.3 },
    ], // 魚の形状
  };

  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  material; // マテリアル
  boxGeometry; // ジオメトリ
  fishArray; // 配列
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ

  // 魚の動きを制御
  speeds = []; // 動く速度
  distances = Array(this.fishCount).fill(0);
  maxDistances = []; // 魚ごとの最大移動距離を格納する配列
  rotationAngles = []; // 魚ごとの回転角度を格納する配列

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setClearAlpha(ThreeApp.RENDERER_PARAM.clearAlpha);
    this.renderer.setSize(
      ThreeApp.RENDERER_PARAM.width,
      ThreeApp.RENDERER_PARAM.height
    );
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // スポットライト
    this.spotLight = new THREE.PointLight(
      ThreeApp.SPOT_LIGHT_PARAM.color,
      ThreeApp.SPOT_LIGHT_PARAM.intensity
    );
    this.spotLight.position.copy(ThreeApp.SPOT_LIGHT_PARAM.position);
    this.castShadow = true;
    this.scene.add(this.spotLight);

    // 初期化
    for (let i = 0; i < ThreeApp.OBJECT_PARAM.fishCount; i++) {
      this.distances[i] = 0; // 魚ごとの移動距離を初期化
      this.speeds[i] = Math.random() * 0.02 + 0.005; // 0.005 ~ 0.02 の範囲でランダムな速度を設定
      this.maxDistances[i] = Math.random() * 5 + 1; // 1 ~ 6 の範囲でランダムな最大移動距離を設定
      this.rotationAngles[i] = Math.random() * Math.PI; // 0 ~ 180度の範囲でランダムな回転角度を設定
    }

    // ジオメトリ
    const fishGroup = new THREE.Group();
    this.fishArray = [];

    for (let i = 0; i < ThreeApp.OBJECT_PARAM.fishShape.length; i++) {
      const geometry = new THREE.BoxGeometry(
        ThreeApp.OBJECT_PARAM.boxSize,
        ThreeApp.OBJECT_PARAM.boxSize,
        ThreeApp.OBJECT_PARAM.boxSize
      );
      const material = new THREE.MeshPhongMaterial({
        shininess: ThreeApp.MATERIAL_PARAM.shininess,
        opacity: ThreeApp.MATERIAL_PARAM.opacity,
        transparent: ThreeApp.MATERIAL_PARAM.transparent,
      });
      const box = new THREE.Mesh(geometry, material);
      box.position.set(
        ThreeApp.OBJECT_PARAM.fishShape[i].x,
        ThreeApp.OBJECT_PARAM.fishShape[i].y,
        ThreeApp.OBJECT_PARAM.fishShape[i].z
      );
      fishGroup.position.set(0, 0, 0);
      fishGroup.add(box);
    }

    // 魚を複製
    for (let i = 0; i < ThreeApp.OBJECT_PARAM.fishCount; i++) {
      const fish = fishGroup.clone();

      // 座標をランダムに散らす
      fish.position.x =
        (Math.random() * 2.0 - 1.0) * ThreeApp.OBJECT_PARAM.transformScale;
      fish.position.y =
        (Math.random() * 2.0 - 1.0) * ThreeApp.OBJECT_PARAM.transformScale;
      fish.position.z =
        ((Math.random() * 2.0 - 2.0) * ThreeApp.OBJECT_PARAM.transformScale) /
        2;

      // 回転をランダムに設定
      fish.rotation.y = Math.random() * Math.PI * 2;

      // 色をランダムに設定
      const randomColor = Math.floor(Math.random() * 0xffffff);
      fish.children.forEach((child) => {
        child.material = child.material.clone();
        child.material.color.set(randomColor);
      });
      fish.castShadow = true;
      fish.receiveShadow = true;
      this.scene.add(fish);

      // 配列に追加
      this.fishArray.push(fish);
    }

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
            break;
          default:
        }
      },
      false
    );
    window.addEventListener(
      "keyup",
      (keyEvent) => {
        this.isDown = false;
      },
      false
    );

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  animateFish() {
    this.fishArray.forEach((fish, index) => {
      // 魚の前方ベクトルを計算
      const direction = new THREE.Vector3();
      fish.getWorldDirection(direction);

      // 90度回転させる
      const rotatedDirection = new THREE.Vector3();
      rotatedDirection.copy(direction).applyAxisAngle(fish.up, Math.PI / -2);

      // 移動距離の追跡
      const moveVector = rotatedDirection
        .clone()
        .multiplyScalar(this.speeds[index]);
      fish.position.add(moveVector);
      this.distances[index] += this.speeds[index];

      /// 最大移動距離に達したら方向転換
      if (this.distances[index] >= this.maxDistances[index]) {
        fish.rotation.y += this.rotationAngles[index];
        // 移動距離をリセット
        this.distances[index] = 0;
      }

      // 方向ベクトルに速度を掛けて位置を更新
      fish.position.add(moveVector);
    });
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      // Y 軸回転
      this.fishArray.forEach((fish) => {
        fish.rotation.y += 0.05;
      });
    }

    // 魚の動きを更新
    this.animateFish();

    this.fishArray.forEach((fish) => {
      fish.children.forEach((child) => {
        child.rotation.y += 0.03;
      });
    });

    // 影を有効化
    this.renderer.shadowMap.enabled = true;

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
