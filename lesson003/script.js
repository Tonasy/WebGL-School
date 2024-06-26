// = 017 ======================================================================
// 数学に関する知見を深めていくにあたり、やはり題材が無いとそれも難しいので、こ
// こでは「地球」と「月」のオブジェクトを three.js で描画してみます。
// このサンプルをベースとして、いくつかの数学の基本を学んでいきましょう。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from "../lib/three.module.js";
import { OrbitControls } from "../lib/OrbitControls.js";
import { GLTFLoader } from "../lib/GLTFLoader.js";

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper);
    await app.load();
    // 初期化処理をコンストラクタから分離 @@@
    app.init();
    app.onClickBtn();
    app.render();
  },
  false
);

class ThreeApp {
  /**
   * ジェット機と地球の間の距離
   */
  static JET_DISTANCE = 8.5;
  /**
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 100.0,
    normalPos: new THREE.Vector3(15.0, 2.0, 22.5),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    rearPos: new THREE.Vector3(0.0, 5.0, 5.0),
    frontPos: new THREE.Vector3(0.0, 5.0, -5.0),
    overheadPos: new THREE.Vector3(0.0, 10.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x000015,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.3,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 60.0,
  };

  wrapper; // canvas の親要素
  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  rearCamera; // ジェット機後方のカメラ
  frontCamera; // ジェット機後方のカメラ
  overheadCamera; // ジェット機上方のカメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ
  sphereGeometry; // ジオメトリ
  earth; // 地球
  earthMaterial; // 地球用マテリアル
  earthTexture; // 地球用テクスチャ
  jet; // ジェット機
  jetGroup; // ジェット機とカメラのグループ
  sphereGeometry2; // 球体のジオメトリ
  clouds; // 飛行機雲
  cloudsMaterial; // 飛行機雲用マテリアル
  cloudLifetimes; // 飛行機雲の寿命
  clock; // 時間管理用
  selectedBtn; // ボタンの押下状態を保持するフラグ

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

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

    // リサイズイベント
    window.addEventListener(
      "resize",
      () => {
        // レンダラーの更新
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // カメラの更新
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.rearCamera.aspect = window.innerWidth / window.innerHeight;
        this.rearCamera.updateProjectionMatrix();
        this.frontCamera.aspect = window.innerWidth / window.innerHeight;
        this.frontCamera.updateProjectionMatrix();
        this.overheadCamera.aspect = window.innerWidth / window.innerHeight;
        this.overheadCamera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      // 素材の読み込みとテクスチャ生成
      const earthPath = "./earth.jpg";
      const jetPath = "./jet.glb";

      const textureLoader = new THREE.TextureLoader();
      const gltfLoader = new GLTFLoader();

      textureLoader.load(earthPath, (earthTexture) => {
        // 地球用
        this.earthTexture = earthTexture;

        // ジェット機用
        gltfLoader.load(jetPath, (gltf) => {
          this.jet = gltf.scene;
          resolve();
        });
      });
    });
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(
      ThreeApp.RENDERER_PARAM.width,
      ThreeApp.RENDERER_PARAM.height
    );
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.normalPos);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ジェット機後方のカメラ
    this.rearCamera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.rearCamera.position.copy(ThreeApp.CAMERA_PARAM.rearPos);
    this.rearCamera.lookAt(this.jet.position);

    const rearHelper = new THREE.CameraHelper(this.rearCamera);
    // this.scene.add(rearHelper);

    // ジェット機前方のカメラ
    this.frontCamera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );

    this.frontCamera.position.copy(ThreeApp.CAMERA_PARAM.frontPos);
    this.frontCamera.lookAt(this.jet.position);

    const frontHelper = new THREE.CameraHelper(this.frontCamera);
    // this.scene.add(frontHelper);

    // ジェット機上方のカメラ
    this.overheadCamera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );

    this.overheadCamera.position.copy(ThreeApp.CAMERA_PARAM.overheadPos);
    this.overheadCamera.lookAt(this.jet.position);

    const overheadHelper = new THREE.CameraHelper(this.overheadCamera);
    // this.scene.add(overheadHelper);

    // ジェット機とカメラをグループ化
    this.jetGroup = new THREE.Group();
    this.jetGroup.add(this.jet);
    this.jetGroup.add(this.rearCamera);
    this.jetGroup.add(this.frontCamera);
    this.jetGroup.add(this.overheadCamera);
    this.jetGroup.position.set(0, ThreeApp.JET_DISTANCE, 0);
    this.scene.add(this.jetGroup);

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

    // 球体のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(7.5, 32, 32);

    // 地球のマテリアルとメッシュ
    this.earthMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.earthMaterial.map = this.earthTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    // 球体のジオメトリ2を生成
    this.sphereGeometry2 = new THREE.SphereGeometry(0.25, 16, 16);

    // 飛行機雲のマテリアル
    this.cloudsMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.MATERIAL_PARAM,
      transparent: true,
      opacity: 1.0,
    });
    this.clouds = [];
    this.cloudLifetimes = [];

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 20.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // Clock オブジェクトの生成
    this.clock = new THREE.Clock();

    // ボタンの状態を保持するフラグ
    this.selectedBtn = null;
  }

  /**
   * ボタンのクリックイベント
   */
  onClickBtn() {
    const btns = document.querySelectorAll("button");
    let current = document.querySelector("button.selected");

    btns.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        if (current) {
          current.classList.remove("selected");
        }
        current = event.currentTarget;
        btn.classList.add("selected");
      });
    });
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // 時間経過を取得
    const time = this.clock.getElapsedTime();

    // ジェット機の回転
    const jetRotated = time * 0.35;

    // 地球の回転
    const earthRotated = time * 0.05;

    this.earth.rotation.y = earthRotated;
    this.earth.rotation.x = earthRotated;

    // ------------------------------------
    // ジェット機の制御
    // ------------------------------------

    // ジェット機の前回の位置を保存
    const previousPos = this.jetGroup.position.clone();

    // ジェット機の位置を更新
    this.jetGroup.position.y = Math.sin(jetRotated) * ThreeApp.JET_DISTANCE;
    this.jetGroup.position.z = Math.cos(jetRotated) * ThreeApp.JET_DISTANCE;

    // 現在の位置を取得
    const currentPos = this.jetGroup.position.clone();

    // ジェット機の方向ベクトルを算出
    const direction = new THREE.Vector3().subVectors(currentPos, previousPos);
    direction.negate().normalize();

    // x軸方向の単位ベクトルを生成
    const unitX = new THREE.Vector3(1, 0, 0);

    // 法線ベクトルを生成
    const jetVertVec = new THREE.Vector3().crossVectors(direction, unitX);

    // ジェット機の上方向の向きを設定
    this.jetGroup.up.set(jetVertVec.x, jetVertVec.y, jetVertVec.z);

    // ジェット機の向きを変更
    this.jetGroup.lookAt(this.jetGroup.position.clone().add(direction));

    // ------------------------------------
    // 飛行機雲の制御
    // ------------------------------------

    // 飛行機雲のメッシュを生成
    const cloud = new THREE.Mesh(this.sphereGeometry2, this.cloudsMaterial.clone()); // マテリアルはクローンで作成（opacityが更新されてしまうため）

    // 飛行機雲の位置調整
    const cloudVec = direction.clone().normalize().multiplyScalar(2.25);
    cloud.position.x =
      currentPos.x + cloudVec.x + (Math.random() * 2 - 1) * 0.15;
    cloud.position.y = currentPos.y + cloudVec.y + Math.random() * 0.25;
    cloud.position.z = currentPos.z + cloudVec.z + Math.random() * 0.25;


    // 飛行機雲のサイズをランダムに設定
    const scale = Math.random() * 0.65 + 0.25;
    cloud.scale.set(scale, scale, scale);

    // 配列に追加
    this.clouds.push(cloud);
    this.cloudLifetimes.push(1.0); // 雲の寿命の最大値1.0

    // シーンに追加
    this.scene.add(cloud);

    // 雲の寿命を更新
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      this.cloudLifetimes[i] -= 0.005;

      if (this.cloudLifetimes[i] <= 0) {
        // 寿命が0になった場合は削除
        const oldCloud = this.clouds[i];
        this.scene.remove(oldCloud); // シーンから削除
        oldCloud.geometry.dispose(); // ジオメトリを破棄
        oldCloud.material.dispose(); // マテリアルを破棄
        this.clouds.splice(i, 1); // 配列から要素を削除
        this.cloudLifetimes.splice(i, 1); // 配列から要素を削除
      } else {
        // 雲の透明度を更新
        this.clouds[i].material.opacity = this.cloudLifetimes[i];
      }
    }

    // クリックされているボタンに応じてカメラを切り替える
    this.selectedBtn = document.querySelector(".selected");
    if (this.selectedBtn) {
      switch (this.selectedBtn.id) {
        case "rear":
          this.renderer.render(this.scene, this.rearCamera);
          break;
        case "front":
          this.renderer.render(this.scene, this.frontCamera);
          break;
        case "overhead":
          this.renderer.render(this.scene, this.overheadCamera);
          break;
        default:
          this.renderer.render(this.scene, this.camera);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
