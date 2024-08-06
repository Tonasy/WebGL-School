import { WebGLUtility } from "../lib/webgl/webgl.js";
import { Mat4 } from "../lib/webgl/math.js";
import { WebGLGeometry } from "../lib/webgl/geometry.js";
import { WebGLOrbitCamera } from "../lib/webgl/camera.js";
import { Pane } from "../lib/webgl/tweakpane-4.0.3.min.js";

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    const app = new App();
    app.init();
    await app.load();
    app.setupGeometry();
    app.setupLocation();
    app.start();
  },
  false
);

/**
 * アプリケーション管理クラス
 */
class App {
  canvas; // WebGL で描画を行う canvas 要素
  gl; // WebGLRenderingContext （WebGL コンテキスト）
  program; // WebGLProgram （プログラムオブジェクト）
  attributeLocation; // attribute 変数のロケーション
  attributeStride; // attribute 変数のストライド
  uniformLocation; // uniform 変数のロケーション
  planeGeometry; // 板ポリゴンのジオメトリ情報
  planeVBO; // 板ポリゴンの頂点バッファ
  planeIBO; // 板ポリゴンのインデックスバッファ
  startTime; // レンダリング開始時のタイムスタンプ
  camera; // WebGLOrbitCamera のインスタンス
  isRendering; // レンダリングを行うかどうかのフラグ
  texture0; // テクスチャのインスタンス
  texture1; // テクスチャのインスタンス
  texture2; // テクスチャのインスタンス
  noiseTexture; // テクスチャのインスタンス
  currentIndex; // テクスチャの現在のインデックス
  isAnimating; // アニメーション中かどうかのフラグ

  constructor() {
    // this を固定するためのバインド処理
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // canvas エレメントの取得と WebGL コンテキストの初期化
    this.canvas = document.getElementById("webgl-canvas");
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    // カメラ制御用インスタンスを生成する
    const cameraOption = {
      distance: 5.0, // Z 軸上の初期位置までの距離
      min: 1.0, // カメラが寄れる最小距離
      max: 10.0, // カメラが離れられる最大距離
      move: 2.0, // 右ボタンで平行移動する際の速度係数
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    // 最初に一度リサイズ処理を行っておく
    this.resize();

    // リサイズイベントの設定
    window.addEventListener("resize", this.resize, false);

    // 深度テストは初期状態で有効
    this.gl.enable(this.gl.DEPTH_TEST);

    // クリックイベント
    this.isAnimating = false;
    this.currentIndex = -1;
    this.canvas.addEventListener("click", () => {
      if (this.isAnimating) return;
      this.isAnimating = true;
      this.currentIndex = (this.currentIndex + 1) % 3;
      this.initTime = performance.now() / 1000;
    });
  }

  /**
   * tweakpane の初期化処理
   */
  // setupPane() {
  //   // Tweakpane を使った GUI の設定
  //   const pane = new Pane();
  //   const parameter = {
  //     texture: this.textureVisibility,
  //   };
  //   // テクスチャの表示・非表示
  //   pane.addBinding(parameter, "texture").on("change", (v) => {
  //     this.textureVisibility = v.value;
  //   });
  // }

  /**
   * リサイズ処理
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise(async (resolve, reject) => {
      const gl = this.gl;
      if (gl == null) {
        // もし WebGL コンテキストがない場合はエラーとして Promise を reject する
        const error = new Error("not initialized");
        reject(error);
      } else {
        // シェーダのソースコードを読み込みシェーダとプログラムオブジェクトを生成する
        const VSSource = await WebGLUtility.loadFile("./main.vert");
        const FSSource = await WebGLUtility.loadFile("./main.frag");
        const vertexShader = WebGLUtility.createShaderObject(
          gl,
          VSSource,
          gl.VERTEX_SHADER
        );
        const fragmentShader = WebGLUtility.createShaderObject(
          gl,
          FSSource,
          gl.FRAGMENT_SHADER
        );
        this.program = WebGLUtility.createProgramObject(
          gl,
          vertexShader,
          fragmentShader
        );

        // 画像を読み込み、テクスチャを初期化する
        const textures = [
          { path: "./image01.jpg", name: "texture0", unit: 0 },
          { path: "./image02.jpg", name: "texture1", unit: 1 },
          { path: "./image03.jpg", name: "texture2", unit: 2 },
        ];

        for (const { path, name, unit } of textures) {
          const image = await WebGLUtility.loadImage(path);
          this[name] = WebGLUtility.createTexture(gl, image, unit);
        }

        // Promsie を解決
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // プレーンジオメトリの情報を取得
    const size = 3.0;
    const color = [1.0, 1.0, 1.0, 1.0];
    this.planeGeometry = WebGLGeometry.plane(size, size, color);

    // VBO と IBO を生成する
    this.planeVBO = [
      WebGLUtility.createVBO(this.gl, this.planeGeometry.position),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.color),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.texCoord),
    ];
    this.planeIBO = WebGLUtility.createIBO(this.gl, this.planeGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute location の取得
    this.attributeLocation = [
      gl.getAttribLocation(this.program, "position"),
      gl.getAttribLocation(this.program, "normal"),
      gl.getAttribLocation(this.program, "color"),
      gl.getAttribLocation(this.program, "texCoord"),
    ];
    // attribute のストライド
    this.attributeStride = [3, 3, 4, 2];
    // uniform location の取得
    this.uniformLocation = {
      mvpMatrix: gl.getUniformLocation(this.program, "mvpMatrix"),
      normalMatrix: gl.getUniformLocation(this.program, "normalMatrix"),
      currentTexture: gl.getUniformLocation(this.program, "currentTexture"),
      nextTexture: gl.getUniformLocation(this.program, "nextTexture"),
      progress: gl.getUniformLocation(this.program, "progress"),
      effectParam: gl.getUniformLocation(this.program, "effectParam"),
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * 描画を開始する
   */
  start() {
    const gl = this.gl;
    // テクスチャのバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texture2);

    // レンダリング開始時のタイムスタンプを取得しておく
    this.startTime = Date.now();
    // レンダリングを行っているフラグを立てておく
    this.isRendering = true;
    // レンダリングの開始
    this.render();
  }

  /**
   * 描画を停止する
   */
  stop() {
    this.isRendering = false;
  }

  /**
   * レンダリングを行う
   */
  render() {
    const gl = this.gl;

    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }

    // レンダリングのセットアップ
    this.setupRendering();

    // モデル座標変換行列（ここでは特になにもモデル座標変換は掛けていない）
    const m = Mat4.identity();

    // ビュー・プロジェクション座標変換行列
    const v = this.camera.update();
    const fovy = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 10.0;
    const p = Mat4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（掛ける順序に注意）
    const vp = Mat4.multiply(p, v);
    const mvp = Mat4.multiply(vp, m);

    // モデル座標変換行列の、逆転置行列を生成する
    const normalMatrix = Mat4.transpose(Mat4.inverse(m));

    // アニメーション時間
    const duration = 1.5;
    const time = this.initTime ? performance.now() / 1000 - this.initTime : 0.0;
    let progress = time / duration;
    let effectParam = 0.0;

    // プログラムオブジェクトを選択し uniform 変数を更新する
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, mvp);
    gl.uniformMatrix4fv(this.uniformLocation.normalMatrix, false, normalMatrix);
    
    
    if (time <= 0.0) {
      // アニメーション開始前
      effectParam = 0.0;
      gl.uniform1f(this.uniformLocation.progress, 0.0);
    } else if (time <= duration) {
      // アニメーション中
      const easeOutCubic = (t) => --t * t * t + 1;
      effectParam = easeOutCubic(progress);
      gl.uniform1f(this.uniformLocation.progress, progress);
    } else {
      // アニメーション終了
      effectParam = 1.0;
      gl.uniform1f(this.uniformLocation.progress, 1.0);
      this.isAnimating = false;
    }
    
    gl.uniform1f(this.uniformLocation.effectParam, effectParam);
    gl.uniform1i(this.uniformLocation.currentTexture, this.currentIndex);
    gl.uniform1i(this.uniformLocation.nextTexture, (this.currentIndex + 1) % 3);

    // VBO と IBO を設定し、描画する
    WebGLUtility.enableBuffer(
      gl,
      this.planeVBO,
      this.attributeLocation,
      this.attributeStride,
      this.planeIBO
    );
    gl.drawElements(
      gl.TRIANGLES,
      this.planeGeometry.index.length,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}
