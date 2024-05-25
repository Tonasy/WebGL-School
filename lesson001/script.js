import * as THREE from "../lib/three.module.js";
import { OrbitControls } from "../lib/OrbitControls.js";

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
    position: new THREE.Vector3(0.0, 0.0, 50.0),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x666666, // 画面をクリアする色
    width: window.innerWidth, // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 1.0, // 光の強度
    position: new THREE.Vector3(0.0, 0.0, 1.0), // 光の向き
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.2, // 光の強度
  };
  /**
   * ポイントライト定義のための定数
   */
  static POINT_LIGHT_PARAM = {
    color: 0xffff00, // 光の色
    intensity: 1.0, // 光の強度
    distance: 100, // 光の届く距離
    decay: 1.0, // 衰退率
  };

  /**
   * 初期化時間を記録
   */
  lastColorUpdateTime = Date.now();

  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  pointLight; // 点光源（ポイントライト）
  material; // マテリアル
  boxGeometry; // トーラスジオメトリ
  boxArray; // トーラスメッシュの配列 @@@
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ

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

    // テクスチャの読み込み
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("./img/screen.jpg");

    // スクリーンの作成
    const screenGeometry = new THREE.PlaneGeometry(50, 50);
    const screenMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      map: texture,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = .25;
    this.scene.add(screen);

    // 共通のジオメトリ、マテリアルから、複数のメッシュインスタンスを作成する
    const row = 50;
    const col = 50;
    const boxCount = row * col;
    const transformScale = 1.0;
    this.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.boxArray = [];

    // 中心点を計算するための変数
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (let i = 0; i < boxCount; ++i) {
      // ランダムなカラーのマテリアルを生成
      this.material = new THREE.MeshLambertMaterial({
        color: Math.floor(Math.random() * 0xffffff),
        opacity: 0.25,
        transparent: true,
      });
      const box = new THREE.Mesh(this.BoxGeometry, this.material);
      // xの値を1~10に制限
      let x = (i - 1) % row;
      let y = i % boxCount;
      if (x < 0) x = row - 1;
      box.position.x = x * transformScale;
      box.position.y = Math.floor(y / row) * transformScale;

      // 回転
      box.rotation.y = Math.PI / 4;

      // 中心点の計算
      minX = Math.min(minX, box.position.x);
      maxX = Math.max(maxX, box.position.x);
      minY = Math.min(minY, box.position.y);
      maxY = Math.max(maxY, box.position.y);

      // シーンに追加する
      this.scene.add(box);
      // 配列に入れておく
      this.boxArray.push(box);
    }

    // 中心点の計算
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 全てのオブジェクトに中心点の逆ベクトルを適用
    for (const box of this.boxArray) {
      box.position.x -= centerX;
      box.position.y -= centerY;
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
      // Y 軸回転 @@@
      this.boxArray.forEach((box) => {
        box.rotation.y += 0.05;
      });
    }

    // 色の更新
    const currentTime = Date.now();
    if (currentTime - this.lastColorUpdateTime >= 500) {
      for (const box of this.boxArray) {
        box.material.color.set(Math.floor(Math.random() * 0xffffff));
        box.rotation.y = Math.random() * Math.PI * 2;
      }
      this.lastColorUpdateTime = currentTime;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
