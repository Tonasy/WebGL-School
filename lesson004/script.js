import * as THREE from "../lib/three.module.js";
import { OrbitControls } from "../lib/OrbitControls.js";
import { TextGeometry } from "../lib/TextGeometry.js";
import { FontLoader } from "../lib/FontLoader.js";
import { GLTFLoader } from "../lib/GLTFLoader.js";

import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    const wrappers = [];
    wrappers.push(document.querySelector("#main"));
    wrappers.push(document.querySelector("#wipe"));
    const app = new ThreeApp(wrappers);
    await app.load();
    app.init();
    app.render();
  },
  false
);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 75,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0, 5.0, 5.0),
    lookAt: new THREE.Vector3(1.0, 1.0, 1.0),
    main: {
      fovy: 75,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 12.0,
      position: new THREE.Vector3(0.0, 1.5, 0.0),
      lookAt: new THREE.Vector3(0.0, 2.0, -5.0),
    },
    wipe: {
      fovy: 60,
      aspect: 1 / 1,
      near: 0.1,
      far: 15.0,
      position: new THREE.Vector3(-0.75, 1.5, 1.75),
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    },
  };

  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x555555,
    main: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    wipe: {
      width: document.getElementById("wipe").clientWidth,
      height: document.getElementById("wipe").clientHeight,
    },
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    main: {
      intensity: 0.5,
      position: new THREE.Vector3(0.0, 1.0, 1.0),
    },
    wipe: {
      intensity: 1.25,
      position: new THREE.Vector3(1.5, 1.5, 1.5),
    },
  };
  /**
   * 影に関する定数の定義
   * ライトの設定に使用する
   */
  static SHADOW_PARAM = {
    spaceSize: 1.0, // 影を生成するためのカメラの空間の広さ
    mapSize: 512, // 影を生成するためのバッファのサイズ
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    main: {
      color: 0x9999ff,
      intensity: 0.1,
    },
    wipe: {
      color: 0xffffe6,
      intensity: 1.75,
    },
  };
  /**
   * スポットライト定義のための定数
   */
  static SPOT_LIGHT_PARAM = {
    color: 0x00bfff,
    intensity: 8.0,
    leftPosition: new THREE.Vector3(7.5, 1.0, -2.5),
    rightPosition: new THREE.Vector3(-7.5, 1.0, -2.5),
    distance: 12.5,
    angle: Math.PI / 8,
    penumbra: 0.25,
    decay: 0.0,
  };
  /**
   * ジオメトリ定義のための定数
   */
  static GEOMETRY_PARAM = {
    width: 3.0,
    height: 2.0,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    main: {
      color: 0xccccff,
      side: THREE.DoubleSide,
    },
    wipe: {
      color: 0xffffff,
    },
  };

  /**
   * planeマテリアル定義のための定数
   */
  static PLANE_MATERIAL_PARAM = {
    // color: 0xffffff,
    color: 0xaabbff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  };

  /**
   * テキストマテリアル定義のための定数
   */
  static TEXT_MATERIAL_PARAM = {
    color: 0x00bfff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
    visible: false,
    blending: THREE.AdditiveBlending,
  };

  mainWrapper; // canvas の親要素
  wipeWrapper;
  mainRenderer; // レンダラ
  wipeRenderer;
  mainScene; // シーン
  wipeScene;
  camera; // カメラ
  mainCamera; // カメラ
  wipeCamera;
  inertiaState; // 慣性スクロールの状態
  inertia; // 慣性スクロールの減衰率
  mainDirectionalLight; // 平行光源（ディレクショナルライト）
  wipeDirectionalLight;
  shadowHelper; // 影のデバッグ用ヘルパー
  mainAmbientLight; // 環境光（アンビエントライト）
  wipeAmbientLight;
  spotLightLeft; // スポットライト（左）
  spotLightRight; // スポットライト（右）
  spotLightHelper; // スポットライトのヘルパー
  planeGeometry; // 板ポリのジオメトリ
  planeMaterial; // 板ポリのマテリアル
  wipePlane; // ワイプの床用
  textGeometry; // テキストのジオメトリ
  textMaterial; // テキストのマテリアル
  texture; // テクスチャ
  sphere; // 球体
  sphereTexture; // 球体のテクスチャ
  floor; // 地面
  floorTexture; // 地面のテクスチャ
  ceiling; // 天井
  ceilingTexture; // 天井のテクスチャ
  constellationTextures; // 星座のテクスチャ
  textcContents; // テキストの内容
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ
  wrapGroup; // ラップ用グループ
  group1; // グループ1段目
  group2; // グループ2段目
  group3; // グループ3段目
  raycaster; // レイキャスター
  clock; // アニメーション用のクロック
  hoveredObject; // ホバー中のオブジェクト
  clickedObject; // クリック中のオブジェクト
  gltf; // 読み込んだ glTF 格納用
  mixer; // アニメーションミキサー
  actions; // アニメーションのアクション
  lastTime; // 前回の時間
  currentTime; // 現在の時間
  wipeFlg; // ワイプの表示フラグ

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrappers - canvas 要素を append する親要素
   */
  constructor(wrappers) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.mainWrapper = wrappers[0];
    this.wipeWrapper = wrappers[1];

    // this のバインド
    this.render = this.render.bind(this);

    // ------------------------------------
    // レイキャスターを使った操作
    // ------------------------------------
    // Raycaster のインスタンスを生成する
    this.raycaster = new THREE.Raycaster();

    // 慣性スクロールに必要な情報を管理
    this.inertiaState = {
      isScrolling: false,
      velocity: 0.0,
      targetGroup: null,
    };
    this.inertia = 0.95;

    // ホイール速度を計算するための変数
    const wheelSensitivity = 0.00003;
    let lastWheelTimestamp = 0;
    let wheelSpeed = 0;

    // スクロールイベントの定義
    window.addEventListener(
      "wheel",
      (event) => {
        // クリック動作中はスクロールイベントを無効化
        if (this.clickedObject) return;

        // ホイール量を取得
        const delta = event.deltaY;

        // ホイール速度を計算
        const currentTime = new Date().getTime();
        const deltaTime = currentTime - lastWheelTimestamp;
        lastWheelTimestamp = currentTime;
        wheelSpeed = Math.abs(delta) / (deltaTime || 1); // ホイール量の絶対値を差分時間で割る

        // レイキャスターを使って交差判定を行う
        const raycaster = initRaycaster(event);
        const intersects = raycaster[0];

        if (intersects.length > 0) {
          // 交差した対象を取得
          const intersectedObject = intersects[0].object;

          // 交差した対象の含まれるグループを取得
          const intersectedGroup = intersectedObject.parent.parent;

          // グループを回転させる
          if (intersectedGroup) {
            // ホイール速度を考慮
            const speed = wheelSpeed * wheelSensitivity;
            // スクロール情報を更新
            this.inertiaState.isScrolling = true;
            this.inertiaState.velocity = delta * speed;
            this.inertiaState.targetGroup = intersectedGroup;
          }
        }
      },
      false
    );

    // ホバー時のイベントを定義

    // ホバー時の移動距離
    let moveDistance = -1.0;

    window.addEventListener(
      "mousemove",
      (event) => {
        // クリック動作中はスクロールイベントを無効化
        if (this.clickedObject) return;

        // レイキャスターを使って交差判定を行う
        const raycaster = initRaycaster(event);
        const intersects = raycaster[0];
        const v = raycaster[1];

        // すでにホバーされている対象があった場合は解除する
        if (this.hoveredObject) {
          this.mainRenderer.domElement.style.cursor = "auto";
          this.hoveredObject.position.copy(
            this.hoveredObject.userData.originalPosition
          );
          this.hoveredObject.children[0].material.opacity = 0.85;
          this.hoveredObject.children[1].material.opacity = 0.0;
          this.hoveredObject.children[1].material.visible = false;
          this.hoveredObject = null;
        }

        if (intersects.length > 0) {
          // カーソルをポインターに変更
          this.mainRenderer.domElement.style.cursor = "pointer";

          // 交差した対象を取得
          const intersectedObject = intersects[0].object;

          // plane用のアニメーション
          // 交差した対象の含まれるグループを取得
          const intersectedGroup = intersectedObject.parent;

          this.hoveredObject = intersectedGroup;

          // 交差した対象の位置ベクトルを取得して正規化
          const basePos = this.hoveredObject.userData.originalPosition
            .clone()
            .normalize();

          // 新しい位置ベクトルを計算して移動
          let newPos = intersectedGroup.position.add(
            basePos.multiplyScalar(moveDistance)
          );
          intersectedGroup.position.copy(newPos);

          // planeの透明度を変更
          const plane = intersectedGroup.children[0];
          plane.material.opacity = 1.0;

          // テキストを表示
          const text = intersectedGroup.children[1];
          text.material.opacity = 1.0;
          text.material.visible = true;

          // スポットライトの更新
          const radius = 10.0; // 球の半径
          const targetZ = -Math.sqrt(
            Math.pow(radius, 2) - Math.pow(v.x, 2) - Math.pow(v.y, 2)
          ); // ターゲットのZ座標

          // ターゲットの座標とスポットライトのベクトル
          const spotLightTargetPos = new THREE.Vector3(
            v.x * radius,
            v.y * radius,
            targetZ
          );
          const leftSpotLightPos = new THREE.Vector3().copy(
            ThreeApp.SPOT_LIGHT_PARAM.leftPosition
          );
          const rightSpotLightPos = new THREE.Vector3().copy(
            ThreeApp.SPOT_LIGHT_PARAM.rightPosition
          );
          const leftSpotLightVec = spotLightTargetPos
            .clone()
            .sub(leftSpotLightPos);
          const rightSpotLightVec = spotLightTargetPos
            .clone()
            .sub(rightSpotLightPos);

          // スポットライトの距離を更新
          this.spotLightLeft.distance = leftSpotLightVec.length();
          this.spotLightRight.distance = rightSpotLightVec.length();

          // スポットライトのターゲットを更新
          this.spotLightLeft.target.position.copy(spotLightTargetPos);
          this.spotLightLeft.target.updateMatrixWorld();

          this.spotLightRight.target.position.copy(spotLightTargetPos);
          this.spotLightRight.target.updateMatrixWorld();

          // this.spotLightHelper.update();
        }
      },
      false
    );

    // マウスクリック時のイベントを定義
    window.addEventListener("click", (event) => {
      // 慣性スクロール中は他のクリックを無効化
      if (this.inertiaState.isScrolling) return;

      // クリック動作中は他のクリックを無効化
      if (this.clickedObject) {
        // 慣性スクロールを停止
        this.inertiaState.isScrolling = false;
        return;
      }

      // レイキャスターを使って交差判定を行う
      const raycaster = initRaycaster(event);
      const intersects = raycaster[0];

      if (intersects.length > 0) {
        // 交差した対象を取得
        const intersectedObject = intersects[0].object;

        // 交差した対象の含まれるグループを取得
        const intersectedWrap = intersectedObject.parent.parent;
        const intersectedGroup = intersectedObject.parent;
        const intersectedPlane = intersectedObject.parent.children[0];
        const intersectedText = intersectedObject.parent.children[1];

        // クリックの状態管理
        this.clickedObject = intersectedGroup;

        // タイムラインを作成
        const tl = gsap.timeline();

        // ワイプをレンダリング
        this.wipeFlg = true;

        // テキストを消すアニメーション
        tl.to(intersectedText.material, {
          opacity: 0.0,
          duration: 0.5,
          onStart: () => {
            intersectedText.material.transparent = true;
          },
          onComplete: () => {
            intersectedText.visible = false;
          },
        });

        // オブジェクトを回転(ホイール回転分を考慮)
        const rot = intersectedWrap.rotation.y % (Math.PI * 2);

        tl.to(
          this.clickedObject.rotation,
          {
            x: 0,
            y: Math.PI * 2 - rot,
            z: Math.PI * 2,
            duration: 2.0,
          },
          "rotation"
        );

        // オブジェクトの位置を変更（ホイール回転分を考慮）
        // const newX = this.clickedObject.position.x * Math.cos(rot) - this.clickedObject.position.z * Math.sin(rot);
        // const newZ = this.clickedObject.position.x * Math.sin(rot) + this.clickedObject.position.z * Math.cos(rot);
        tl.to(
          this.clickedObject.position,
          {
            x: 0.0,
            y: 2.0,
            z: 0.0,
            duration: 2.25,
          },
          "rotation"
        );

        // planeを画面のサイズに拡大
        tl.to(
          intersectedPlane.scale,
          {
            x: 1.5,
            y: 1.5,
            duration: 2.0,
          },
          "rotation"
        );

        // カメラの向きを変更
        tl.to(
          this.mainCamera.position,
          {
            x: 0.0,
            y: 1.5,
            z: 1.25,
            duration: 2.5,
            onUpdate: () => {
              // カメラの位置を変更
              // this.mainCamera.position.set(0.0, 1.5, 1.25);

              // 現在のカメラの向きから目標の向きへ線形補間
              const currentLookAt = new THREE.Vector3();
              this.mainCamera.getWorldDirection(currentLookAt);

              const targetLookAt = new THREE.Vector3(0.0, 1.5, -1.0)
                .sub(this.mainCamera.position)
                .normalize();

              const t = tl.progress();
              currentLookAt.lerp(targetLookAt, t);

              this.mainCamera.lookAt(
                this.mainCamera.position.x + currentLookAt.x,
                this.mainCamera.position.y + currentLookAt.y,
                this.mainCamera.position.z + currentLookAt.z
              );
              this.mainCamera.updateProjectionMatrix();
            },
            // dom要素を表示
            onComplete: () => {
              // テキストの内容を取得
              const textContent = intersectedText.userData.textContent;
              const info = document.querySelector(".info");
              const infoTitle = info.querySelector("h1");
              infoTitle.textContent = textContent;

              tl.to(info, {
                autoAlpha: 1,
                duration: 0.15,
              }).to(info, {
                "--inset": "0",
                duration: 0.75,
                ease: "power2.out",
              });
            },
          },
          "rotation"
        );
      }
    });

    // レイキャスターの共通処理
    const initRaycaster = (event) => {
      // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
      const x = (event.clientX / window.innerWidth) * 2.0 - 1.0;
      const y = (event.clientY / window.innerHeight) * 2.0 - 1.0;
      // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
      const v = new THREE.Vector2(x, -y);
      // レイキャスターに正規化済みマウス座標とカメラを指定する
      this.raycaster.setFromCamera(v, this.mainCamera);
      // scene に含まれるすべてのオブジェクト（ここでは Mesh）を対象にレイキャストする
      return [this.raycaster.intersectObjects(this.wrapGroup.children), v];
    };

    // 戻るボタンクリック時
    const backButton = document.getElementById("back");
    backButton.addEventListener("click", () => {
      const intersectedText = this.clickedObject.children[1];
      const info = document.querySelector(".info");
      const tl = gsap.timeline();

      // domを非表示
      tl.to(info, {
        "--inset": "100%",
        duration: 0.75,
        autoAlpha: 0,
        ease: "power2.out",
      })
        .to(
          this.clickedObject.rotation,
          {
            x: this.clickedObject.userData.originalRotation.x,
            y: this.clickedObject.userData.originalRotation.y,
            z: this.clickedObject.userData.originalRotation.z,
            duration: 1.0,
            onComplete: () => {
              this.clickedObject.lookAt(new THREE.Vector3(0.0, 2.5, 0.0));
              intersectedText.visible = true;
              this.wipeFlg = false; // ワイプのレンダリングを停止

              // クリックの状態管理を解除
              this.clickedObject = null;
            },
          },
          "rotation"
        )
        // 各要素をもとの位置に戻す
        .to(
          this.clickedObject.position,
          {
            x: this.clickedObject.userData.originalPosition.x,
            y: this.clickedObject.userData.originalPosition.y,
            z: this.clickedObject.userData.originalPosition.z,
            duration: 0.75,
          },
          "rotation"
        )
        .to(
          this.clickedObject.children[0].scale,
          {
            x: 1.0,
            y: 1.0,
            duration: 0.5,
          },
          "rotation"
        )
        .to(
          this.mainCamera.position,
          {
            x: 0.0,
            y: 1.5,
            z: 0.0,
            duration: 1.0,
          },
          "rotation"
        );
    });

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
        this.mainRenderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.mainCamera.aspect = window.innerWidth / window.innerHeight;
        this.mainCamera.updateProjectionMatrix();
        this.wipeRenderer.setSize(
          document.getElementById("wipe").clientWidth,
          document.getElementById("wipe").clientHeight
        );
      },
      false
    );
  }

  /**
   * 初期化処理
   */
  init() {
    // ------------------------------------
    // レンダラー
    // ------------------------------------
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);

    // メイン
    this.mainRenderer = new THREE.WebGLRenderer();
    this.mainRenderer.setClearColor(color);
    this.mainRenderer.setSize(
      ThreeApp.RENDERER_PARAM.main.width,
      ThreeApp.RENDERER_PARAM.main.height
    );
    this.mainWrapper.appendChild(this.mainRenderer.domElement);

    // ワイプ
    this.wipeRenderer = new THREE.WebGLRenderer();
    this.wipeRenderer.setClearColor(color);
    this.wipeRenderer.setSize(
      ThreeApp.RENDERER_PARAM.wipe.width,
      ThreeApp.RENDERER_PARAM.wipe.height
    );
    this.wipeWrapper.appendChild(this.wipeRenderer.domElement);
    this.wipeRenderer.shadowMap.enabled = true; // 影を有効化
    this.wipeRenderer.shadowMap.type = THREE.PCFShadowMap; // 影の描画アルゴリズムを指定
    this.wipeFlg = false; // 最初は非表示

    // ------------------------------------
    // シーン
    // ------------------------------------
    this.mainScene = new THREE.Scene();
    this.wipeScene = new THREE.Scene();

    // ------------------------------------
    // カメラ
    // ------------------------------------
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    this.mainCamera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.main.fovy,
      ThreeApp.CAMERA_PARAM.main.aspect,
      ThreeApp.CAMERA_PARAM.main.near,
      ThreeApp.CAMERA_PARAM.main.far
    );
    this.mainCamera.position.copy(ThreeApp.CAMERA_PARAM.main.position);
    this.mainCamera.lookAt(ThreeApp.CAMERA_PARAM.main.lookAt);
    //カメラヘルパー
    // const cameraHelper = new THREE.CameraHelper(this.mainCamera);
    // this.mainScene.add(cameraHelper);

    this.wipeCamera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.wipe.fovy,
      ThreeApp.CAMERA_PARAM.wipe.aspect,
      ThreeApp.CAMERA_PARAM.wipe.near,
      ThreeApp.CAMERA_PARAM.wipe.far
    );
    this.wipeCamera.position.copy(ThreeApp.CAMERA_PARAM.wipe.position);
    this.wipeCamera.lookAt(ThreeApp.CAMERA_PARAM.wipe.lookAt);

    // ------------------------------------
    // ライトの設定
    // ------------------------------------
    // ディレクショナルライト（平行光源）
    // メイン
    this.mainDirectionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.main.intensity
    );
    this.mainDirectionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.main.position
    );
    this.mainScene.add(this.mainDirectionalLight);
    // ワイプ
    this.wipeDirectionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.wipe.intensity
    );
    this.wipeDirectionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.wipe.position
    );
    this.wipeDirectionalLight.castShadow = true; // 影を落とす
    this.wipeScene.add(this.wipeDirectionalLight);

    // アンビエントライト（環境光）
    // メイン
    this.mainAmbientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.main.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.main.intensity
    );
    this.mainScene.add(this.mainAmbientLight);
    // ワイプ
    this.wipeAmbientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.wipe.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.wipe.intensity
    );
    this.wipeScene.add(this.wipeAmbientLight);
    // ワイプの影用カメラの設定
    this.wipeDirectionalLight.shadow.camera.top =
      ThreeApp.SHADOW_PARAM.spaceSize;
    this.wipeDirectionalLight.shadow.camera.bottom =
      -ThreeApp.SHADOW_PARAM.spaceSize;
    this.wipeDirectionalLight.shadow.camera.left =
      -ThreeApp.SHADOW_PARAM.spaceSize;
    this.wipeDirectionalLight.shadow.camera.right =
      ThreeApp.SHADOW_PARAM.spaceSize;
    this.wipeDirectionalLight.shadow.mapSize.width =
      ThreeApp.SHADOW_PARAM.mapSize;
    this.wipeDirectionalLight.shadow.mapSize.height =
      ThreeApp.SHADOW_PARAM.mapSize;

    // スポットライト
    this.spotLightLeft = new THREE.SpotLight(
      ThreeApp.SPOT_LIGHT_PARAM.color,
      ThreeApp.SPOT_LIGHT_PARAM.intensity,
      ThreeApp.SPOT_LIGHT_PARAM.distance,
      ThreeApp.SPOT_LIGHT_PARAM.angle,
      ThreeApp.SPOT_LIGHT_PARAM.penumbra,
      ThreeApp.SPOT_LIGHT_PARAM.decay
    );
    this.spotLightLeft.position.copy(ThreeApp.SPOT_LIGHT_PARAM.leftPosition);
    this.mainScene.add(this.spotLightLeft);

    this.spotLightRight = this.spotLightLeft.clone();
    this.spotLightRight.position.copy(ThreeApp.SPOT_LIGHT_PARAM.rightPosition);
    this.mainScene.add(this.spotLightRight);

    // スポットライトのヘルパーを追加（オプション）
    // this.spotLightHelper = new THREE.SpotLightHelper(this.spotLightLeft);
    // this.mainScene.add(this.spotLightHelper);

    // ------------------------------------
    // メイン用のオブジェクト

    // ------------------------------------
    // 板ポリとテキストの配置
    // ------------------------------------
    // グループ
    this.wrapGroup = new THREE.Group();
    this.group1 = new THREE.Group();
    this.group2 = new THREE.Group();
    this.group3 = new THREE.Group();

    // テキストの内容
    this.textContents = [
      "Aries (おひつじ座)",
      "Taurus (おうし座)",
      "Gemini (ふたご座)",
      "Cancer (かに座)",
      "Leo (しし座)",
      "Virgo (おとめ座)",
      "Libra (てんびん座)",
      "Scorpio (さそり座)",
      "Sagittarius (いて座)",
      "Capricorn (やぎ座)",
      "Aquarius (みずがめ座)",
      "Pisces (うお座)",
    ];

    // ジオメトリ
    this.planeGeometry = new THREE.PlaneGeometry(
      ThreeApp.GEOMETRY_PARAM.width,
      ThreeApp.GEOMETRY_PARAM.height
    );

    // マテリアル
    this.planeMaterial = new THREE.MeshPhongMaterial(
      ThreeApp.PLANE_MATERIAL_PARAM
    );
    this.textMaterial = new THREE.MeshPhongMaterial(
      ThreeApp.TEXT_MATERIAL_PARAM
    );

    // ループを回して配置
    const segments = 3; // 段数
    const radiusBase = 10.0; // 基準半径
    let wrapIndex = 0;

    for (let i = 0; i < segments; i++) {
      const posY = ThreeApp.GEOMETRY_PARAM.height / 2 + i * 2;
      const radius = Math.sqrt(radiusBase ** 2 - posY ** 2);
      const planeNum = Math.floor(
        (Math.PI * 2 * radius) / ThreeApp.GEOMETRY_PARAM.width
      );
      for (let j = 0; j < planeNum; j++) {
        // planeを生成
        const plane = new THREE.Mesh(
          this.planeGeometry,
          this.planeMaterial.clone()
        );
        // テクスチャを順に貼る
        plane.material.map =
          this.constellationTextures[
            wrapIndex % this.constellationTextures.length
          ];

        // 各planeに紐づくテキストを生成
        const textContent =
          this.textContents[wrapIndex % this.textContents.length];
        this.textGeometry = new TextGeometry(textContent, {
          font: this.font,
          size: 0.35,
          depth: 0.025,
          curveSegments: 8,
          bevelEnabled: false,
        });
        const text = new THREE.Mesh(
          this.textGeometry,
          this.textMaterial.clone()
        );
        // テキストの内容を保存
        text.userData.textContent = textContent;

        // 中央配置のためにテキストのサイズを求める
        this.textGeometry.computeBoundingBox(); // バウンディングボックスを計算
        const textCenterX =
          (this.textGeometry.boundingBox.max.x -
            this.textGeometry.boundingBox.min.x) /
          2;
        const textCenterY =
          (this.textGeometry.boundingBox.max.y -
            this.textGeometry.boundingBox.min.y) /
          2;

        // テキストをplaneの前に配置
        text.position.x = -textCenterX;
        text.position.y = -textCenterY;
        text.position.z = 1.0;

        // planeとテキストをグループ化
        const planeWrap = new THREE.Group();
        planeWrap.add(plane);
        planeWrap.add(text);

        // グループをワールド座標に配置
        planeWrap.position.x = Math.cos((j * Math.PI * 2) / planeNum) * radius;
        planeWrap.position.z = Math.sin((j * Math.PI * 2) / planeNum) * radius;
        planeWrap.position.y = posY;
        planeWrap.lookAt(new THREE.Vector3(0.0, 2.5, 0.0));

        // 元の位置や回転などの情報を保存しておく
        planeWrap.userData.originalPosition = planeWrap.position.clone();
        planeWrap.userData.originalRotation = planeWrap.rotation.clone();

        wrapIndex++;

        // グループに追加
        switch (i) {
          case 0:
            this.group1.add(planeWrap);
            break;
          case 1:
            this.group2.add(planeWrap);
            break;
          case 2:
            this.group3.add(planeWrap);
            break;
        }
      }
    }
    this.wrapGroup.add(this.group1);
    this.wrapGroup.add(this.group2);
    this.wrapGroup.add(this.group3);
    this.wrapGroup.position.y = -0.5;
    this.mainScene.add(this.wrapGroup);

    // 球体
    const sphereGeometry = new THREE.SphereGeometry(11.0, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x9595aa,
      side: THREE.DoubleSide,
    });
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.sphere.material.map = this.sphereTexture;
    this.mainScene.add(this.sphere);

    // 地面
    const planeGeometry = new THREE.PlaneGeometry(23.0, 23.0);
    const planeMaterial = new THREE.MeshPhongMaterial({
      color: 0xeeeeee,
      side: THREE.DoubleSide,
    });
    this.floor = new THREE.Mesh(planeGeometry, planeMaterial);
    this.floor.rotation.x = Math.PI / 2;
    this.floor.position.y = -0.5;
    this.floor.material.map = this.floorTexture;
    this.mainScene.add(this.floor);

    // 天井
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
    });
    this.ceiling = new THREE.Mesh(planeGeometry, floorMaterial);
    this.ceiling.rotation.x = Math.PI / 2;
    this.ceiling.position.y = 5.5;
    this.ceiling.material.map = this.ceilingTexture;
    this.mainScene.add(this.ceiling);

    // ------------------------------------
    // ワイプ用のオブジェクト
    this.wipeScene.add(this.gltf.scene);
    // glTF の階層構造をたどり、Mesh が出てきたら影を落とす（cast）設定を行う
    this.gltf.scene.traverse((object) => {
      if (object.isMesh === true || object.isSkinnedMesh === true) {
        object.castShadow = true;
      }
    });
    this.gltf.scene.position.z = 0.2;

    // 床面をプレーンで生成する
    const wipePlaneGeometry = new THREE.PlaneGeometry(20.0, 20.0);
    const wipePlaneMaterial = new THREE.MeshPhongMaterial(
      ThreeApp.MATERIAL_PARAM.wipe
    );
    this.wipePlane = new THREE.Mesh(wipePlaneGeometry, wipePlaneMaterial);
    this.wipePlane.rotation.x = -Math.PI * 0.5;

    // 床面は、影を受ける（receive）するよう設定する
    this.wipePlane.receiveShadow = true;

    // シーンに追加
    this.wipeScene.add(this.wipePlane);

    // ------------------------------------
    // その他
    // ------------------------------------
    // 軸ヘルパー
    const axesBarLength = 25.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.mainScene.add(this.axesHelper);

    // コントロール
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // 時間管理
    this.clock = new THREE.Clock();
    this.lastTime = performance.now();

    // UIデバッグ
    // const gui = new GUI();
    // gui.add(this.mainCamera.position, "x", -20, 20).name("cameraX");
    // gui.add(this.mainCamera.position, "y", -20, 20).name("cameraY");
    // gui.add(this.mainCamera.position, "z", -20, 20).name("cameraZ");
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  async load() {
    // テクスチャローダーの作成
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => textureLoader.loadAsync(`./img/${path}`);

    // テクスチャのパス
    const mainTexturePaths = [
      "sphere-texture.jpg",
      "ceiling-texture.jpg",
      "floor-texture.jpg",
    ];

    const constellationTexturePaths = [
      "aries.jpg",
      "taurus.jpg",
      "gemini.jpg",
      "cancer.jpg",
      "leo.jpg",
      "virgo.jpg",
      "libra.jpg",
      "scorpio.jpg",
      "sagittarius.jpg",
      "capricorn.jpg",
      "aquarius.jpg",
      "pisces.jpg",
    ];

    // テクスチャの読み込み
    const [mainTextures, constellationTextures] = await Promise.all([
      Promise.all(mainTexturePaths.map(loadTexture)),
      Promise.all(constellationTexturePaths.map(loadTexture)),
    ]);

    [this.sphereTexture, this.ceilingTexture, this.floorTexture] = mainTextures;
    this.constellationTextures = constellationTextures;

    // フォントローダーの作成
    const fontLoader = new FontLoader();
    this.font = await fontLoader.loadAsync("./font/Noto Sans JP_Bold.json");

    // GLTFローダーの作成
    const gltfPath = "./Sheep.glb";
    const gltfLoader = new GLTFLoader();

    // GLTFの読み込み
    this.gltf = await gltfLoader.loadAsync(gltfPath);

    // アニメーションの初期化
    this.mixer = new THREE.AnimationMixer(this.gltf.scene);
    const animations = this.gltf.animations;
    this.actions = [];
    for (let i = 0; i < animations.length; ++i) {
      this.actions.push(this.mixer.clipAction(animations[i]));
      this.actions[i].setLoop(THREE.LoopRepeat);
      this.actions[i].play();
      this.actions[i].weight = 0.0;
    }

    // 最初のアクションのウェイトを1.0に設定
    this.actions[0].weight = 1.0;
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    // this.controls.update();

    // 時間を取得
    const time = this.clock.getElapsedTime();

    // オブジェクトを時間経過で回転させる
    this.sphere.rotation.y = time * 0.1;
    this.ceiling.rotation.z = -time * 0.05;
    this.floor.rotation.z = time * 0.1;

    // 慣性スクロールの処理
    if (this.inertiaState.isScrolling) {
      this.inertiaState.targetGroup.rotation.y += this.inertiaState.velocity;
      this.inertiaState.velocity *= this.inertia;

      if (Math.abs(this.inertiaState.velocity) < 0.001) {
        this.inertiaState.isScrolling = false;
      }
    }

    // ホバー時以外はスポットライトを回転させる
    if (!this.hoveredObject) {
      // 右のスポットライト
      this.spotLightRight.target.position.x = Math.cos(time * 1.2) * 10;
      this.spotLightRight.target.position.y = 3.0;
      this.spotLightRight.target.position.z = -10.0;
      this.spotLightRight.target.updateMatrixWorld();

      // 左のスポットライト
      this.spotLightLeft.target.position.x = -Math.cos(time * 1.2) * 10;
      this.spotLightLeft.target.position.y = 3.0;
      this.spotLightLeft.target.position.z = -10.0;
      this.spotLightLeft.target.updateMatrixWorld();
    }

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      this.group.rotation.y += 0.05;
    }

    // gltfのアニメーション
    this.currentTime = performance.now();
    const delta = (this.currentTime - this.lastTime) / 1000;
    this.mixer.update(delta);
    this.lastTime = this.currentTime;

    // レンダラーで描画
    this.mainRenderer.render(this.mainScene, this.mainCamera);

    // ワイプの表示
    if (this.wipeFlg) {
      this.wipeRenderer.render(this.wipeScene, this.wipeCamera);
    }
  }
}
