import { WebGLUtility } from '../lib/webgl/webgl.js';
import { Vec3, Mat4 } from '../lib/webgl/math.js';
import { WebGLGeometry } from '../lib/webgl/geometry.js';
import { WebGLOrbitCamera } from '../lib/webgl/camera.js';
import { Pane } from '../lib/webgl/tweakpane-4.0.3.min.js';

window.addEventListener(
  'DOMContentLoaded',
  async () => {
    const app = new App();
    app.init();
    app.setupPane();
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
  renderProgram; // 最終シーン用プログラムオブジェクト
  renderAttLocation; // 最終シーン用の attribute 変数のロケーション
  renderAttStride; // 最終シーン用の attribute 変数のストライド
  renderUniLocation; // 最終シーン用の uniform 変数のロケーション
  offscreenProgram; // オフスクリーン用のプログラムオブジェクト
  offscreenAttLocation; // オフスクリーン用の attribute 変数のロケーション
  offscreenAttStride; // オフスクリーン用の attribute 変数のストライド
  offscreenUniLocation; // オフスクリーン用の uniform 変数のロケーション
  screenPlaneGeometry; // プレーンのジオメトリ情報
  screenPlaneVBO; // プレーンの頂点バッファ
  screenPlaneIBO; // プレーンのインデックスバッファ
  cardPlaneGeometry; // プレーンのジオメトリ情報
  cardPlaneVBO; // プレーンの頂点バッファ
  cardPlaneIBO; // プレーンのインデックスバッファ
  startTime; // レンダリング開始時のタイムスタンプ
  isRendering; // レンダリングを行うかどうかのフラグ
  isRotation; // オブジェクトを Y 軸回転させるかどうか
  framebufferObject; // フレームバッファに関連するオブジェクト
  camera; // WebGLOrbitCamera のインスタンス
  frontTex; // 表面用テクスチャのインスタンス
  backTex; // 裏面用テクスチャのインスタンス
  timeSpeed; // 時間の経過速度係数
  alpha; // ノイズに適用するアルファ値
  cursor; // カーソルの座標
  radius; // 半径
  isGrayScale; // グレイスケール化するかどうかのフラグ
  isNoise; // ノイズを適用するかどうかのフラグ

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
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    // カメラ制御用インスタンスを生成する
    const cameraOption = {
      distance: 10.0, // Z 軸上の初期位置までの距離
      min: 1.0, // カメラが寄れる最小距離
      max: 20.0, // カメラが離れられる最大距離
      move: 2.0 // 右ボタンで平行移動する際の速度係数
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    // 最初に一度リサイズ処理を行っておく
    this.resize();

    // リサイズイベントの設定
    window.addEventListener('resize', this.resize, false);

    // カーソルの座標を取得
    this.cursor = [0.5, 0.5];
    window.addEventListener('mousemove', event => {
      this.cursor = [event.clientX / window.innerWidth, event.clientY / window.innerHeight];
    });

    // バックフェイスカリングと深度テストは初期状態で有効
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);

    // 初期状態では時間の経過は 1.0 倍（早くも遅くもしない）
    this.timeSpeed = 1.0;

    // 初期状態ではノイズのアルファは 0.5 で半透明
    this.alpha = 0.3;

    // 初期状態ではカーソルの半径は 0.5
    this.radius = 0.5;

    // 初期状態ではグレイスケール化する
    this.isGrayScale = true;

    // 初期状態ではノイズを適用する
    this.isNoise = true;
  }

  /**
   * tweakpane の初期化処理
   */
  setupPane() {
    // Tweakpane を使った GUI の設定
    const pane = new Pane();
    const parameter = {
      timeSpeed: this.timeSpeed,
      alpha: this.alpha,
      radius: this.radius,
      grayScale: this.isGrayScale,
      noise: this.isNoise
    };
    // 時間の経過に掛かる係数
    pane
      .addBinding(parameter, 'timeSpeed', {
        min: 0.0,
        max: 2.0
      })
      .on('change', v => {
        this.timeSpeed = v.value;
      });
    // ノイズに掛かるアルファ値
    pane
      .addBinding(parameter, 'alpha', {
        min: 0.0,
        max: 1.0
      })
      .on('change', v => {
        this.alpha = v.value;
      });
    pane
      .addBinding(parameter, 'radius', {
        min: 0.0,
        max: 1.0
      })
      .on('change', v => {
        this.radius = v.value;
      });
    // グレイスケール化するかどうか
    pane.addBinding(parameter, 'grayScale').on('change', v => {
      this.isGrayScale = v.value;
    });
    // ノイズを適用するかどうか
    pane.addBinding(parameter, 'noise').on('change', v => {
      this.isNoise = v.value;
    });
  }

  /**
   * リサイズ処理
   */
  resize() {
    const gl = this.gl;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // フレームバッファもリサイズ処理の対象とする
    if (this.framebufferObject == null) {
      // まだ生成されていない場合は、生成する
      this.framebufferObject = WebGLUtility.createFramebuffer(gl, this.canvas.width, this.canvas.height);
    } else {
      // 生成済みのフレームバッファもキャンバスにサイズを合わせる
      WebGLUtility.resizeFramebuffer(
        this.gl,
        this.canvas.width,
        this.canvas.height,
        this.framebufferObject.depthRenderbuffer,
        this.framebufferObject.texture
      );
    }
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
        const error = new Error('not initialized');
        reject(error);
      } else {
        // 最終シーン用のシェーダ
        const renderVSSource = await WebGLUtility.loadFile('./render.vert');
        const renderFSSource = await WebGLUtility.loadFile('./render.frag');
        const renderVertexShader = WebGLUtility.createShaderObject(gl, renderVSSource, gl.VERTEX_SHADER);
        const renderFragmentShader = WebGLUtility.createShaderObject(gl, renderFSSource, gl.FRAGMENT_SHADER);
        this.renderProgram = WebGLUtility.createProgramObject(gl, renderVertexShader, renderFragmentShader);
        // オフスクリーン用のシェーダ
        const offscreenVSSource = await WebGLUtility.loadFile('./offscreen.vert');
        const offscreenFSSource = await WebGLUtility.loadFile('./offscreen.frag');
        const offscreenVertexShader = WebGLUtility.createShaderObject(gl, offscreenVSSource, gl.VERTEX_SHADER);
        const offscreenFragmentShader = WebGLUtility.createShaderObject(gl, offscreenFSSource, gl.FRAGMENT_SHADER);
        this.offscreenProgram = WebGLUtility.createProgramObject(gl, offscreenVertexShader, offscreenFragmentShader);
        // 画像を読み込み、テクスチャを初期化する
        const textures = [
          { path: './front_img.png', name: 'frontTex' },
          { path: './back_img.png', name: 'backTex' }
        ];
        for (const { path, name } of textures) {
          const image = await WebGLUtility.loadImage(path);
          this[name] = WebGLUtility.createTexture(gl, image);
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
    const color = [1.0, 1.0, 1.0, 1.0];

    // - 最終シーン -------------------------------------------
    const size = 2.0;
    this.screenPlaneGeometry = WebGLGeometry.plane(size, size, color);
    this.screenPlaneVBO = [
      WebGLUtility.createVBO(this.gl, this.screenPlaneGeometry.position),
      WebGLUtility.createVBO(this.gl, this.screenPlaneGeometry.texCoord)
    ];
    this.screenPlaneIBO = WebGLUtility.createIBO(this.gl, this.screenPlaneGeometry.index);

    // - オフスクリーン -------------------------------------------
    // プレーンジオメトリ情報を取得
    const width = 2.0;
    const height = 3.0;
    this.cardPlaneGeometry = WebGLGeometry.plane(width, height, color);

    // テクスチャ座標を設定
    this.cardPlaneGeometry.texCoord = [0.135, 0.0, 0.865, 0.0, 0.135, 1.0, 0.865, 1.0];

    // VBO と IBO を生成する
    this.cardPlaneVBO = [
      WebGLUtility.createVBO(this.gl, this.cardPlaneGeometry.position),
      WebGLUtility.createVBO(this.gl, this.cardPlaneGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.cardPlaneGeometry.color),
      WebGLUtility.createVBO(this.gl, this.cardPlaneGeometry.texCoord)
    ];
    this.cardPlaneIBO = WebGLUtility.createIBO(this.gl, this.cardPlaneGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;

    // - レンダリング用 -------------------------------------------
    // attribute location の取得
    this.renderAttLocation = [
      gl.getAttribLocation(this.renderProgram, 'position'),
      gl.getAttribLocation(this.renderProgram, 'texCoord')
    ];
    // attribute のストライド
    this.renderAttStride = [3, 2];
    // uniform location の取得
    this.renderUniLocation = {
      textureUnit: gl.getUniformLocation(this.renderProgram, 'textureUnit'), // テクスチャユニット
      isGrayScale: gl.getUniformLocation(this.renderProgram, 'isGrayScale'), // グレイスケール化するかどうか
      isNoise: gl.getUniformLocation(this.renderProgram, 'isNoise'), // ノイズを適用するかどうか
      resolution: gl.getUniformLocation(this.renderProgram, 'resolution'), // 解像度
      time: gl.getUniformLocation(this.renderProgram, 'time'), // 時間の経過
      alpha: gl.getUniformLocation(this.renderProgram, 'alpha'), // ノイズのアルファ
      radius: gl.getUniformLocation(this.renderProgram, 'radius'), // カーソルの半径
      cursor: gl.getUniformLocation(this.renderProgram, 'cursor') // カーソルの座標
    };

    // - オフスクリーン用 -------------------------------------------
    // attribute location の取得
    this.offscreenAttLocation = [
      gl.getAttribLocation(this.offscreenProgram, 'position'),
      gl.getAttribLocation(this.offscreenProgram, 'normal'),
      gl.getAttribLocation(this.offscreenProgram, 'color'),
      gl.getAttribLocation(this.offscreenProgram, 'texCoord')
    ];
    // attribute のストライド
    this.offscreenAttStride = [3, 3, 4, 2];
    // uniform location の取得
    this.offscreenUniLocation = {
      mvpMatrix: gl.getUniformLocation(this.offscreenProgram, 'mvpMatrix'), // MVP行列
      modelMatrix: gl.getUniformLocation(this.offscreenProgram, 'modelMatrix'), // モデル変換行列
      normalMatrix: gl.getUniformLocation(this.offscreenProgram, 'normalMatrix'), // 法線変換用行列
      lightPosition: gl.getUniformLocation(this.offscreenProgram, 'lightPosition'), // ライトの位置
      lightColor: gl.getUniformLocation(this.offscreenProgram, 'lightColor'), // ライトの色
      ambient: gl.getUniformLocation(this.offscreenProgram, 'ambient'), // 環境光
      eyePosition: gl.getUniformLocation(this.offscreenProgram, 'eyePosition'), // 視点の位置
      textureUnit: gl.getUniformLocation(this.offscreenProgram, 'textureUnit') // テクスチャ
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // フレームバッファのバインドを解除する
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // プログラムオブジェクトを選択
    gl.useProgram(this.renderProgram);
    // フレームバッファにアタッチされているテクスチャをバインドする
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebufferObject.texture);
  }

  /**
   * オフスクリーンレンダリングのためのセットアップを行う
   */
  setupOffscreenRendering() {
    const gl = this.gl;
    // フレームバッファをバインドして描画の対象とする
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferObject.framebuffer);
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // プログラムオブジェクトを選択
    gl.useProgram(this.offscreenProgram);
  }

  /**
   * 描画を開始する
   */
  start() {
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

    // 現在までの経過時間
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // - オフスクリーンレンダリング -------------------------------------------
    {
      // レンダリングのセットアップ
      this.setupOffscreenRendering();

      // ビュー・プロジェクション座標変換行列
      const v = this.camera.update();
      const fovy = 45;
      const aspect = window.innerWidth / window.innerHeight;
      const near = 0.1;
      const far = 25.0;
      const p = Mat4.perspective(fovy, aspect, near, far);
      const vp = Mat4.multiply(p, v);

      // 視点情報を取得
      const eyePosition = this.camera.position;

      // VBO と IBO を設定し、描画する
      WebGLUtility.enableBuffer(
        gl,
        this.cardPlaneVBO,
        this.offscreenAttLocation,
        this.offscreenAttStride,
        this.cardPlaneIBO
      );

      // uniform 変数を設定
      gl.uniform3fv(this.offscreenUniLocation.lightPosition, [0.0, 0.5, 0.5]);
      gl.uniform3fv(this.offscreenUniLocation.lightColor, [0.9, 0.5, 0.7]);
      gl.uniform3fv(this.offscreenUniLocation.ambient, [0.3, 0.3, 0.3]);
      gl.uniform3fv(this.offscreenUniLocation.eyePosition, eyePosition);

      {
        // 表面の描画
        const m = Mat4.rotate(
          Mat4.rotate(Mat4.identity(), nowTime, Vec3.create(0.0, 1.0, 0.0)),
          Math.PI / 6,
          Vec3.create(0.0, 0.0, 1.0)
        );
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));

        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(this.offscreenUniLocation.modelMatrix, false, m);
        gl.uniformMatrix4fv(this.offscreenUniLocation.normalMatrix, false, normalMatrix);

        // テクスチャのバインド
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.frontTex);
        gl.uniform1i(this.offscreenUniLocation.textureUnit, 0);

        // 描画
        gl.drawElements(gl.TRIANGLES, this.cardPlaneGeometry.index.length, gl.UNSIGNED_SHORT, 0);
      }

      {
        // 裏面の描画
        const m = Mat4.rotate(
          Mat4.rotate(
            Mat4.rotate(
              Mat4.translate(Mat4.identity(), Vec3.create(-0.001, 0.0, 0.0)),
              nowTime,
              Vec3.create(0.0, 1.0, 0.0)
            ),
            Math.PI / 6,
            Vec3.create(0.0, 0.0, 1.0)
          ),
          Math.PI,
          Vec3.create(1.0, 0.0, 0.0)
        );
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));

        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(this.offscreenUniLocation.modelMatrix, false, m);
        gl.uniformMatrix4fv(this.offscreenUniLocation.normalMatrix, false, normalMatrix);

        // テクスチャのバインド
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.backTex);
        gl.uniform1i(this.offscreenUniLocation.textureUnit, 0);

        gl.drawElements(gl.TRIANGLES, this.cardPlaneGeometry.index.length, gl.UNSIGNED_SHORT, 0);
      }
    }
    // ------------------------------------------------------------------------

    // - 最終シーンのレンダリング -------------------------------------------
    {
      // レンダリングのセットアップ
      this.setupRendering();

      // VBO と IBO
      WebGLUtility.enableBuffer(
        gl,
        this.screenPlaneVBO,
        this.renderAttLocation,
        this.renderAttStride,
        this.screenPlaneIBO
      );
      // シェーダに各種パラメータを送る
      gl.uniform1i(this.renderUniLocation.textureUnit, 0);
      gl.uniform1i(this.renderUniLocation.isGrayScale, this.isGrayScale); // グレイスケール化するかどうか
      gl.uniform1i(this.renderUniLocation.isNoise, this.isNoise); // グレイスケール化するかどうか
      gl.uniform2fv(this.renderUniLocation.resolution, [this.canvas.width, this.canvas.height]); // 解像度 @@@
      gl.uniform1f(this.renderUniLocation.time, this.timeSpeed * nowTime); // 時間の経過
      gl.uniform1f(this.renderUniLocation.alpha, this.alpha); // ノイズのアルファ
      gl.uniform1f(this.renderUniLocation.radius, this.radius); // 半径
      gl.uniform2fv(this.renderUniLocation.cursor, this.cursor); // カーソルの座標

      // 描画
      gl.drawElements(gl.TRIANGLES, this.screenPlaneGeometry.index.length, gl.UNSIGNED_SHORT, 0);
    }
    // ------------------------------------------------------------------------
  }
}
