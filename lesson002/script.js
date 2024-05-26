import * as THREE from "../lib/three.module.js";
import { OrbitControls } from "../lib/OrbitControls.js";

// 初期化
window.addEventListener(
  "DOMContentLoaded",
  async () => {
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper);

    // 非同期の読み込み処理
    await app.load();

    // 読み込み処理が終わったあとで描画を開始
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
    fovy: 80,
    // 描画する空間のアスペクト比（縦横比）
    aspect: window.innerWidth / window.innerHeight,
    // 描画する空間のニアクリップ面（最近面）
    near: 10,
    // 描画する空間のファークリップ面（最遠面）
    far: 750.0,
    // カメラの座標
    position: new THREE.Vector3(0.0, 90.0, 180.0),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x000000, // 画面をクリアする色
    width: window.innerWidth, // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.25, // 光の強度
    position: new THREE.Vector3(0.0, 1.0, 1.0), // 光の向き
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 1.5, // 光の強度
  };
  /**
   * ポイントライト定義のための定数
   */
  static POINT_LIGHT_PARAM = {
    color: 0xffd543, // 光の色
    intensity: 75, // 光の強度
    position: new THREE.Vector3(0.0, 130.0, 40.0), // 光源の位置
    distance: 0.0, // 距離
    decay: 1.0, // 衰減率
  };
  /**
   * オブジェクト定義のための定数
   */
  // 部屋
  static ROOM_PARAM = {
    width: 300,
    height: 300,
    color: 0xfefefe,
    side: THREE.DoubleSide,
    shininess: 100,
  };

  // 扇風機
  static FAN_PARAM = {
    COMMON: {
      color: 0x333333,
      shininess: 100,
      side: THREE.DoubleSide,
    },
    HEAD: {
      BLADE: {
        radiusTop: 28.0,
        radiusBottom: 24.0,
        height: 2.0,
        radialSegments: 30,
        heightSegments: 10,
        openEnded: false,
        thetaStart: Math.PI / 5,
        thetaLength: Math.PI / 4,
        color: 0xafdfd4,
        angle: 0.1,
      },
      AXIS: {
        radiusTop: 13.0,
        radiusBottom: 8.0,
        height: 43.0,
        radialSegments: 30,
        heightSegments: 10,
      },
      CAGE_OUTLINE: {
        radius: 32.0,
        tube: 1.0,
        radialSegments: 30,
        tubularSegments: 30,
        arc: Math.PI * 2,
      },
      CAGE_MESH: {
        radius: 36.0,
        tube: 0.5,
        radialSegments: 30,
        tubularSegments: 30,
        arc: (Math.PI * 2) / 3,
      },
    },
    BODY: {
      radiusTop: 3.5,
      radiusBottom: 3.5,
      height: 100.0,
      radialSegments: 35,
      heightSegments: 35,
    },
    BASE: {
      radiusTop: 25.5,
      radiusBottom: 30.0,
      height: 3.0,
      radialSegments: 50,
      heightSegments: 10,
    },
    ANIM: {
      maxRotation: Math.PI / 2,
      minRotation: -Math.PI / 2,
      rotationDirection: 1,
      rotationSpeed: 0.01,
    },
  };

  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  pointLight; // 点光源（ポイントライト）
  roomFloorMaterial; // 床のマテリアル
  roomWallMaterial; // 壁のマテリアル
  roomGroup; // 部屋のオブジェクトをまとめるグループ
  fan; // 扇風機のオブジェクトをまとめるグループ
  fanHeadGroup; // 扇風機の上部のオブジェクトをまとめるグループ
  fanBladesGroup; // 扇風機の羽根のオブジェクトをまとめるグループ
  fanHead; // 扇風機の上部のオブジェクト
  fanCageGroup; // 扇風機のカゴのオブジェクトをまとめるグループ
  fanBladeGeometry; // 羽根のジオメトリ
  fanBladeMaterial; // 羽根のマテリアル
  fanAxisGeometry; // 羽根の軸のジオメトリ
  fanAxisMaterial; // 羽根の軸のマテリアル
  fanBodyGeometry; // ボディのジオメトリ
  fanBodyMaterial; // ボディのマテリアル
  fanBaseGeometry; // ベースのジオメトリ
  fanBaseMaterial; // ベースのマテリアル
  bladeRotationSpeed; // 羽根の回転速度
  isOn; // 扇風機のオンオフのフラグ
  windVolume; // 風量
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー

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

    // ポイントライト
    this.pointLight = new THREE.PointLight(
      ThreeApp.POINT_LIGHT_PARAM.color,
      ThreeApp.POINT_LIGHT_PARAM.intensity,
      ThreeApp.POINT_LIGHT_PARAM.distance,
      ThreeApp.POINT_LIGHT_PARAM.decay
    );
    this.pointLight.position.copy(ThreeApp.POINT_LIGHT_PARAM.position);
    this.castShadow = true;
    this.scene.add(this.pointLight);

    // オブジェクトの生成

    // 部屋のオブジェクト
    // ------
    this.roomGroup = new THREE.Group();
    const roomPlateGeometry = new THREE.PlaneGeometry(
      ThreeApp.ROOM_PARAM.width,
      ThreeApp.ROOM_PARAM.height
    );
    // 床のマテリアル
    this.roomFloorMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.ROOM_PARAM.color,
      side: ThreeApp.ROOM_PARAM.side,
      shininess: ThreeApp.ROOM_PARAM.shininess,
    });
    const roomFloor = new THREE.Mesh(roomPlateGeometry, this.roomFloorMaterial);
    roomFloor.rotation.x = -Math.PI / 2;
    this.roomGroup.add(roomFloor);

    // 壁のマテリアル
    this.roomWallMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.ROOM_PARAM.color,
      side: THREE.DoubleSide,
      shininess: ThreeApp.ROOM_PARAM.shininess,
    });
    const roomWall = new THREE.Mesh(roomPlateGeometry, this.roomWallMaterial);

    // 複製
    for (let i = 0; i < 3; i++) {
      const roomWallClone = roomWall.clone();
      roomWallClone.receiveShadow = true;
      roomWallClone.position.y = ThreeApp.ROOM_PARAM.height / 2;
      if (i === 0) {
        roomWallClone.position.z = -ThreeApp.ROOM_PARAM.width / 2;
      } else {
        roomWallClone.rotation.y = -Math.PI / 2;

        if (i === 1) {
          roomWallClone.position.x = -ThreeApp.ROOM_PARAM.width / 2;
        } else {
          roomWallClone.position.x = ThreeApp.ROOM_PARAM.width / 2;
        }
      }
      this.roomGroup.add(roomWallClone);
    }

    // 部屋のオブジェクトをシーンに追加
    this.scene.add(this.roomGroup);

    // 扇風機のオブジェクト
    // ------
    this.fan = new THREE.Group();

    // 扇風機の上部
    this.fanHead = new THREE.Group();
    this.fanHeadGroup = new THREE.Group();

    // 羽根を5枚配置
    this.fanBladesGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const thetaStart =
        ThreeApp.FAN_PARAM.HEAD.BLADE.thetaStart * i * 2;

      this.fanBladeGeometry = new THREE.CylinderGeometry(
        ThreeApp.FAN_PARAM.HEAD.BLADE.radiusTop,
        ThreeApp.FAN_PARAM.HEAD.BLADE.radiusBottom,
        ThreeApp.FAN_PARAM.HEAD.BLADE.height,
        ThreeApp.FAN_PARAM.HEAD.AXIS.radialSegments,
        ThreeApp.FAN_PARAM.HEAD.AXIS.heightSegments,
        ThreeApp.FAN_PARAM.HEAD.BLADE.openEnded,
        thetaStart,
        ThreeApp.FAN_PARAM.HEAD.BLADE.thetaLength
      );

      this.fanBladematerial = new THREE.MeshPhongMaterial({
        color: ThreeApp.FAN_PARAM.HEAD.BLADE.color,
        side: ThreeApp.FAN_PARAM.COMMON.side,
        shininess: ThreeApp.FAN_PARAM.COMMON.shininess,
      });

      const fanBlade = new THREE.Mesh(
        this.fanBladeGeometry,
        this.fanBladematerial
      );

      if (i % 2 === 0) {
        fanBlade.rotation.x = ThreeApp.FAN_PARAM.HEAD.BLADE.angle;
      } else {
        fanBlade.rotation.x = -ThreeApp.FAN_PARAM.HEAD.BLADE.angle;
      }
      fanBlade.position.z = 5.0;
      fanBlade.rotation.x = -Math.PI / 2;
      this.fanBladesGroup.add(fanBlade);
    }

    // 羽根の軸を作成
    this.fanAxisGeometry = new THREE.CylinderGeometry(
      ThreeApp.FAN_PARAM.HEAD.AXIS.radiusTop,
      ThreeApp.FAN_PARAM.HEAD.AXIS.radiusBottom,
      ThreeApp.FAN_PARAM.HEAD.AXIS.height,
      ThreeApp.FAN_PARAM.HEAD.AXIS.radialSegments,
      ThreeApp.FAN_PARAM.HEAD.AXIS.heightSegments
    );
    this.fanAxisMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.FAN_PARAM.COMMON.color,
      side: ThreeApp.FAN_PARAM.COMMON.side,
      shininess: ThreeApp.FAN_PARAM.COMMON.shininess,
    });
    const fanAxis = new THREE.Mesh(this.fanAxisGeometry, this.fanAxisMaterial);
    fanAxis.rotation.x = -Math.PI / 2;
    this.fanBladesGroup.add(fanAxis);

    // 羽根をグループに追加
    this.fanHeadGroup.add(this.fanBladesGroup);

    // 扇風機のケージを作成
    this.fanCageGroup = new THREE.Group();

    // ケージのアウトライン
    const fanCageOutlineGeometry = new THREE.TorusGeometry(
      ThreeApp.FAN_PARAM.HEAD.CAGE_OUTLINE.radius,
      ThreeApp.FAN_PARAM.HEAD.CAGE_OUTLINE.tube,
      ThreeApp.FAN_PARAM.HEAD.CAGE_OUTLINE.radialSegments,
      ThreeApp.FAN_PARAM.HEAD.CAGE_OUTLINE.tubularSegments,
      ThreeApp.FAN_PARAM.HEAD.CAGE_OUTLINE.arc
    );
    const fanCageOutlineMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.FAN_PARAM.COMMON.color,
    });
    const fanCageOutline = new THREE.Mesh(
      fanCageOutlineGeometry,
      fanCageOutlineMaterial
    );
    fanCageOutline.rotation.x = Math.PI / 2;
    fanCageOutline.position.z = 5.0;

    this.fanCageGroup.add(fanCageOutline);

    // ケージの網目
    const fanCageMeshGeometry = new THREE.TorusGeometry(
      ThreeApp.FAN_PARAM.HEAD.CAGE_MESH.radius,
      ThreeApp.FAN_PARAM.HEAD.CAGE_MESH.tube,
      ThreeApp.FAN_PARAM.HEAD.CAGE_MESH.radialSegments,
      ThreeApp.FAN_PARAM.HEAD.CAGE_MESH.tubularSegments,
      ThreeApp.FAN_PARAM.HEAD.CAGE_MESH.arc
    );
    const fanCageMeshMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.FAN_PARAM.COMMON.color,
      side: ThreeApp.FAN_PARAM.COMMON.side,
      shininess: ThreeApp.FAN_PARAM.COMMON.shininess,
    });

    // 複製して網目にする
    for (let i = 0; i < 15; i++) {
      const fanCageMesh = new THREE.Mesh(
        fanCageMeshGeometry,
        fanCageMeshMaterial
      );
      fanCageMesh.position.z = 5.0;
      fanCageMesh.position.y = -18.0;
      fanCageMesh.rotation.y = (Math.PI / 15) * i;
      fanCageMesh.rotation.z = Math.PI / 6;
      this.fanCageGroup.add(fanCageMesh);
    }

    this.fanCageGroup.position.y = 5.0;
    this.fanCageGroup.position.z = 4.0;
    this.fanCageGroup.rotation.x = Math.PI / 2;

    // ケージの網目を複製して反対側にも配置
    const fanBackCageGroup = this.fanCageGroup.clone();
    fanBackCageGroup.rotation.x = -Math.PI;
    fanBackCageGroup.position.y = 0.0;
    fanBackCageGroup.position.z = 10.0;
    this.fanCageGroup.add(fanBackCageGroup);

    this.fanCageGroup.position.z = 7.5;

    // ケージをグループに追加
    this.fanHeadGroup.add(this.fanCageGroup);

    // 移動させてシーンへ追加
    this.fanHeadGroup.position.y = ThreeApp.FAN_PARAM.BODY.height - 5.0;
    this.fanHeadGroup.position.z = 15.0;
    this.fanHead.add(this.fanHeadGroup);

    this.fan.add(this.fanHead);

    // 扇風機のボディ
    this.fanBodyGeometry = new THREE.CylinderGeometry(
      ThreeApp.FAN_PARAM.BODY.radiusTop,
      ThreeApp.FAN_PARAM.BODY.radiusBottom,
      ThreeApp.FAN_PARAM.BODY.height,
      ThreeApp.FAN_PARAM.BODY.radialSegments,
      ThreeApp.FAN_PARAM.BODY.heightSegments
    );
    this.fanBodyMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.FAN_PARAM.COMMON.color,
      side: ThreeApp.FAN_PARAM.COMMON.side,
      shininess: ThreeApp.FAN_PARAM.COMMON.shininess,
    });
    const fanBody = new THREE.Mesh(this.fanBodyGeometry, this.fanBodyMaterial);
    fanBody.position.y = ThreeApp.FAN_PARAM.BODY.height / 2 + 0.1;
    this.fan.add(fanBody);

    // 扇風機の土台
    this.fanBaseGeometry = new THREE.CylinderGeometry(
      ThreeApp.FAN_PARAM.BASE.radiusTop,
      ThreeApp.FAN_PARAM.BASE.radiusBottom,
      ThreeApp.FAN_PARAM.BASE.height,
      ThreeApp.FAN_PARAM.BASE.radialSegments,
      ThreeApp.FAN_PARAM.BASE.heightSegments
    );
    this.fanBaseMaterial = new THREE.MeshPhongMaterial({
      color: ThreeApp.FAN_PARAM.COMMON.color,
      side: ThreeApp.FAN_PARAM.COMMON.side,
      shininess: ThreeApp.FAN_PARAM.COMMON.shininess,
    });
    const fanBase = new THREE.Mesh(this.fanBaseGeometry, this.fanBaseMaterial);
    fanBase.position.y = ThreeApp.FAN_PARAM.BASE.height / 2 + 0.1;

    this.fan.add(fanBase);
    
    this.fan.receiveShadow = true;
    this.castShadow = true;
    this.fan.position.z = -20.0;

    // 扇風機をシーンに追加
    this.scene.add(this.fan);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // 軸ヘルパー
    // const axesBarLength = 350.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // this のバインド
    this.render = this.render.bind(this);

    // ボタンの操作を検出できるようにする
    this.isOn = false;
    this.bladeRotationSpeed = 0.0;
    // ボタン要素の取得

    // ボタン要素のクリックイベント

    this.fanBtnControl();

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
   * アセットのロード処理
   */
  load() {
    return new Promise((resolve) => {
      // テクスチャを読み込む
      const texturePaths = {
        floor: "./img/floor.jpg",
        wall: "./img/wall.jpg",
      };
      const loadedTextures = {};

      // テクスチャ用のローダーのインスタンスを生成
      const loader = new THREE.TextureLoader();
      // ローダーの load メソッドに読み込む画像のパスと、ロード完了時のコールバックを指定
      const loadTexture = (name, path) => {
        loader.load(path, (texture) => {
          loadedTextures[name] = texture;
          this.roomFloorMaterial.map = texture;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(4, 4);

          // すべてロード済みかチェック
          const allTexturesLoaded = Object.keys(texturePaths).every(
            (key) => loadedTextures[key] !== undefined
          );

          if (allTexturesLoaded) {
            // テクスチャを割り当てる
            this.roomFloorMaterial.map = loadedTextures.floor;
            this.roomWallMaterial.map = loadedTextures.wall;
            // ロード完了
            resolve();
          }
        });
      };

      // テクスチャの読み込み
      Object.entries(texturePaths).forEach(([name, path]) => {
        loadTexture(name, path);
      });
    });
  }

  /**
   * 扇風機の動きの制御
   */
  fanBtnControl() {
    // ボタン要素の取得
    const buttonsArray = document.querySelectorAll(".js-fan-button");

    buttonsArray.forEach((button) => {
      button.addEventListener("click", (event) => {
        // すべてのボタンから is-active（is-off） クラスを削除
        const activeButton = document.querySelector(".is-active");
        const offButton = document.querySelector(".is-off");
        if (activeButton) {
          activeButton.classList.remove("is-active");
        }
        if (offButton) {
          offButton.classList.remove("is-off");
        }

        // クリックされたボタンの ID を取得
        const buttonId = event.target.id;

        // クリックされたボタンによって処理を分岐
        switch (buttonId) {
          case "off":
            // クリックされたボタンが「OFF」の場合
            this.isOn = false;
            event.target.classList.add("is-off");
            break;
          case "strong":
            // クリックされたボタンが「強」の場合
            // 羽根の回転速度を上げる
            this.bladeRotationSpeed = 0.5;
            event.target.classList.add("is-active");
            this.isOn = true;
            break;
          case "medium":
            // クリックされたボタンが「中」の場合
            // 羽根の回転速度を中にする
            this.bladeRotationSpeed = 0.35;
            event.target.classList.add("is-active");
            this.isOn = true;
            break;
          case "weak":
            // クリックされたボタンが「弱」の場合
            // 羽根の回転速度を下げる
            this.bladeRotationSpeed = 0.2;
            event.target.classList.add("is-active");
            this.isOn = true;
            break;
          default:
        }
      });
    });
  }

  /**
   * 扇風機の動きの定義
   */
  fanAnimation() {
    // 羽根の回転
    this.fanBladesGroup.rotation.z += this.bladeRotationSpeed;

    if (this.isOn) {
      // 首振り（-90度～90度の範囲で回転）
      this.fanHead.rotation.y +=
        ThreeApp.FAN_PARAM.ANIM.rotationDirection *
        ThreeApp.FAN_PARAM.ANIM.rotationSpeed;

      let rotationY = this.fanHead.rotation.y;

      if (
        rotationY > ThreeApp.FAN_PARAM.ANIM.maxRotation ||
        rotationY < ThreeApp.FAN_PARAM.ANIM.minRotation
      ) {
        ThreeApp.FAN_PARAM.ANIM.rotationDirection *= -1;
      }
    } else {
      // 羽根を減速してから停止
      this.bladeRotationSpeed *= 0.975;
      if (this.bladeRotationSpeed < 0.01) {
        this.bladeRotationSpeed = 0.0;
      }
    }
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // 扇風機の動きの制御
    this.fanAnimation();

    // 影を有効化
    this.renderer.shadowMap.enabled = true;

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
