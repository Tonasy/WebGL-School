import { WebGLUtility } from '../lib/webgl/webgl.js';
import { Vec3, Mat4 } from '../lib/webgl/math.js';
import { WebGLGeometry } from '../lib/webgl/geometry.js';
import { WebGLOrbitCamera } from '../lib/webgl/camera.js';
import { Pane } from '../lib/webgl/tweakpane-4.0.3.min.js';

window.addEventListener(
  'DOMContentLoaded',
  async () => {
    const app = new App();
    await app.setupImageData();
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
  ctx; // CanvasRenderingContext2D （2D コンテキスト）
  imageDataArray; // 画像のピクセルデータ
  particleNum; // パーティクルの数
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
  particlesVBOArray; // パーティクルのバッファ配列
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
  isGrayScale; // グレイスケール化するかどうかのフラグ
  isNoise; // ノイズを適用するかどうかのフラグ
  isDisplace; // ディスプレースメントを適用するかどうかのフラグ
  isAnimating; // アニメーション中かどうかのフラグ
  animStartTime; // アニメーションの開始時刻
  animTarget; // アニメーションの対象
  animProgress; // アニメーションの進捗率

  constructor() {
    // this を固定するためのバインド処理
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * 初期化前にテキストの頂点座標を取得する
   */
  async setupImageData() {
    // canvas の設定
    const canvas = document.getElementById('text-canvas');
    this.ctx = canvas.getContext('2d');

    /* パーティクルのもととなる画像の読み込み
    --------------------------------- */

    const imgSources = [
      './particles_img01.jpg',
      './particles_img02.jpg',
      './particles_img03.jpg',
      './particles_img04.jpg'
    ];
    this.imageDataArray = [];
    const image = new Image();

    const loadImages = async () => {
      for (let src of imgSources) {
        // 画像を読み込む
        image.src = src;

        // 画像の読み込み完了を待つ
        await new Promise(resolve => {
          image.onload = resolve;
        });

        // 画像ごとにキャンバスのサイズを設定
        canvas.width = image.width;
        canvas.height = image.height;

        // 画像を描画し、ピクセルデータを取得
        this.ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア
        this.ctx.drawImage(image, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 画像のサイズ情報とピクセルデータを格納
        this.imageDataArray.push({
          width: image.width,
          height: image.height,
          pixels: imageData.data
        });
      }
    };

    await loadImages();
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // WebGL コンテキストの取得
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    // カメラ制御用インスタンスを生成する
    const cameraOption = {
      distance: 3.0, // Z 軸上の初期位置までの距離
      min: 0.1, // カメラが寄れる最小距離
      max: 10.0, // カメラが離れられる最大距離
      move: 0.25 // 右ボタンで平行移動する際の速度係数
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    // イベント処理の設定
    this.resize();
    this.click();

    // リサイズイベントの設定
    window.addEventListener('resize', this.resize, false);

    // カーソルの座標を取得
    this.cursor = [0.5, 0.5];
    window.addEventListener('mousemove', event => {
      this.cursor = [event.clientX, event.clientY];
    });

    // バックフェイスカリングと深度テストは初期状態で有効
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);

    // 初期状態では時間の経過は 1.0 倍（早くも遅くもしない）
    this.timeSpeed = 1.0;

    // 初期状態ではノイズのアルファは 0.5 で半透明
    this.alpha = 0.3;

    // 初期状態ではグレイスケール化する
    this.isGrayScale = false;

    // 初期状態ではノイズを適用する
    this.isNoise = true;

    // 初期状態ではディスプレースメントを適用しない
    this.isDisplace = false;
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
      grayScale: this.isGrayScale,
      noise: this.isNoise,
      displace: this.isDisplace
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
    // グレイスケール化するかどうか
    pane.addBinding(parameter, 'grayScale').on('change', v => {
      this.isGrayScale = v.value;
    });
    // ノイズを適用するかどうか
    pane.addBinding(parameter, 'noise').on('change', v => {
      this.isNoise = v.value;
    });
    // ノイズを適用するかどうか
    pane.addBinding(parameter, 'displace').on('change', v => {
      this.isDisplace = v.value;
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
   * クリック処理
   */
  click() {
    // クリック処理に関する初期化
    this.animStartTime = null;
    this.isAnimating = false;
    this.animTarget = 0;
    this.animProgress = 0.0;
    let clickCount = 0;

    this.canvas.addEventListener('click', () => {
      if (!this.isAnimating) {
        this.isAnimating = true;
        this.animProgress = 0.0;

        // clickCount をインクリメント
        clickCount++;

        // アニメーションの対象を設定
        this.animTarget = clickCount % this.imageDataArray.length;
        this.animStartTime = performance.now();
      }
    });
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
        // Promsie を解決
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // - 最終シーン -------------------------------------------
    const size = 2.0;
    const screenColor = [1.0, 1.0, 1.0, 1.0];
    this.screenPlaneGeometry = WebGLGeometry.plane(size, size, screenColor);
    this.screenPlaneVBO = [
      WebGLUtility.createVBO(this.gl, this.screenPlaneGeometry.position),
      WebGLUtility.createVBO(this.gl, this.screenPlaneGeometry.texCoord)
    ];
    this.screenPlaneIBO = WebGLUtility.createIBO(this.gl, this.screenPlaneGeometry.index);

    // - オフスクリーン -------------------------------------------
    // 読み込んだ画像データをもとにパーティクルを生成
    this.particlesVBOArray = [];
    this.imageDataArray.forEach((imageData, index) => {
      // 読み込んだ画像の情報
      const imgPosition = [];
      const imgColor = [];
      const imgSizes = [];
      // 共通利用の乱数
      const rand = [];
      const rand2 = [];

      // アスペクト比を計算
      const revertAspectRatio = imageData.width / imageData.height;

      for (let z = 0; z < 5; z++) {
        for (let y = 0; y < imageData.height; y += 4.0) {
          for (let x = 0; x < imageData.width; x += 4.0) {
            const index = (y * imageData.width + x) * 4;
            const alpha = imageData.pixels[index + 3]; // アルファ値を取得
            const rgb = imageData.pixels.slice(index, index + 3); // RGB 値を取得

            {
              /* 画像データのパーティクル
          --------------------------------- */
              // x, y座標を-1.0〜1.0に正規化し、アスペクト比を考慮
              imgPosition.push(
                (x / imageData.width - 0.5) * 2,
                (y / imageData.height - 0.5) * 2 * revertAspectRatio,
                z / 100
              );

              // パーティクルのランダム値を生成
              rand.push(Math.random());
              rand2.push(Math.random());

              if (alpha > 128) {
                // 不透明な部分のパーティクル
                const r = Math.random();
                imgColor.push(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1.0);

                // パーティクルのサイズ
                imgSizes.push(Math.random() * 20.0);
              } else {
                // 透明部分のパーティクルはグレーにする
                imgColor.push(0.3, 0.3, 0.3, 1.0);

                // パーティクルのサイズ
                imgSizes.push(Math.random() * 10.0);
              }

              // パーティクルの数
              this.particleNum = imgPosition.length / 3;
            }
          }
        }
      }

      // VBO を生成する
      this.particlesVBOArray.push([
        WebGLUtility.createVBO(this.gl, imgPosition),
        WebGLUtility.createVBO(this.gl, imgColor),
        WebGLUtility.createVBO(this.gl, imgSizes),
        WebGLUtility.createVBO(this.gl, rand),
        WebGLUtility.createVBO(this.gl, rand2)
      ]);
    });
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
      isDisplace: gl.getUniformLocation(this.renderProgram, 'isDisplace'), // ディスプレースメントを適用するかどうか
      resolution: gl.getUniformLocation(this.renderProgram, 'resolution'), // 解像度
      time: gl.getUniformLocation(this.renderProgram, 'time'), // 時間の経過
      alpha: gl.getUniformLocation(this.renderProgram, 'alpha'), // ノイズのアルファ
      cursor: gl.getUniformLocation(this.renderProgram, 'cursor') // カーソルの座標
    };

    // - オフスクリーン用 -------------------------------------------
    // attribute location の取得
    this.offscreenAttLocation = [
      gl.getAttribLocation(this.offscreenProgram, 'imgPosition'),
      gl.getAttribLocation(this.offscreenProgram, 'imgColor'),
      gl.getAttribLocation(this.offscreenProgram, 'imgSize'),
      gl.getAttribLocation(this.offscreenProgram, 'rand'),
      gl.getAttribLocation(this.offscreenProgram, 'rand2')
    ];
    // attribute のストライド
    this.offscreenAttStride = [3, 4, 1, 1, 1];

    // uniform location の取得
    this.offscreenUniLocation = {
      mvpMatrix: gl.getUniformLocation(this.offscreenProgram, 'mvpMatrix'), // MVP行列
      time: gl.getUniformLocation(this.offscreenProgram, 'time'), // 時間の経過
      progress: gl.getUniformLocation(this.offscreenProgram, 'progress'), // アニメーション進捗率
      cursor: gl.getUniformLocation(this.offscreenProgram, 'cursor') // カーソルの座標
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
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
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

      // モデル座標変換行列
      const m = Mat4.rotate(Mat4.identity(), Math.PI, Vec3.create(1.0, 0.0, 0.0));

      // ビュー・プロジェクション座標変換行列
      const v = this.camera.update();
      const fovy = 45;
      const aspect = window.innerWidth / window.innerHeight;
      const near = 0.1;
      const far = 10.0;
      const p = Mat4.perspective(fovy, aspect, near, far);
      const vp = Mat4.multiply(p, v);

      // 行列を乗算して MVP 行列を生成する
      const mvp = Mat4.multiply(vp, m);

      // モデル座標変換行列の、逆転置行列を生成する
      const normalMatrix = Mat4.transpose(Mat4.inverse(m));

      // アニメーション情報をシェーダに送る
      const animDuration = 3000.0;
      let animProgress = 0.0;

      if (this.isAnimating) {
        // アニメーションの進捗率を計算
        animProgress = (performance.now() - this.animStartTime) / animDuration;
        animProgress = this.roughEasing(animProgress, 0.0, 1.0, 1.0, 0.5, 10);

        // アニメーションの進捗率が1.0を超えたらアニメーション終了
        if (animProgress > 1.0) {
          this.animProgress = 1.0;
          this.isAnimating = false;
        }
      }

      // VBO を配列から取り出し、描画する
      if (animProgress < 0.25 && this.isAnimating) {
        const target =
          this.animTarget == 0 ? this.imageDataArray.length - 1 : (this.animTarget - 1) % this.imageDataArray.length;
        WebGLUtility.enableBuffer(
          gl,
          this.particlesVBOArray[target],
          this.offscreenAttLocation,
          this.offscreenAttStride,
          null
        );
      } else {
        WebGLUtility.enableBuffer(
          gl,
          this.particlesVBOArray[this.animTarget],
          this.offscreenAttLocation,
          this.offscreenAttStride,
          null
        );
      }

      // uniform 変数を設定
      gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
      gl.uniform1f(this.offscreenUniLocation.time, this.timeSpeed * nowTime); // 時間の経過
      gl.uniform1f(this.offscreenUniLocation.progress, animProgress); // アニメーションの進捗率
      gl.uniform2fv(this.offscreenUniLocation.cursor, this.cursor); // カーソルの座標

      // 描画
      gl.drawArrays(gl.POINTS, 0, this.particleNum);
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
      gl.uniform1i(this.renderUniLocation.isDisplace, this.isDisplace); // ディスプレースメントするかどうか
      gl.uniform2fv(this.renderUniLocation.resolution, [this.canvas.width, this.canvas.height]); // 解像度
      gl.uniform1f(this.renderUniLocation.time, this.timeSpeed * nowTime); // 時間の経過
      gl.uniform1f(this.renderUniLocation.alpha, this.alpha); // ノイズのアルファ
      gl.uniform2fv(this.renderUniLocation.cursor, this.cursor); // カーソルの座標      

      // 描画
      gl.drawElements(gl.TRIANGLES, this.screenPlaneGeometry.index.length, gl.UNSIGNED_SHORT, 0);
    }
    // ------------------------------------------------------------------------
  }

  ///////////////////////////////// Utils /////////////////////////////////
  /**
   * イージング関数
   */

  /**
   * ラフイージング
   *
   * @param {number} t - 現在の時間。アニメーションの経過時間を示します。通常は0から1の範囲に正規化されます。
   * @param {number} b - アニメーションの開始値。アニメーションが開始する際の値です。
   * @param {number} c - アニメーションの変化量。終了値と開始値の差を示します。
   * @param {number} d - アニメーションの総時間。アニメーションが完了するまでの時間です。
   * @param {number} [amplitude=0.2] - 揺らぎの振幅。揺らぎの強さを決定します。デフォルト値は0.2です。
   * @param {number} [frequency=10] - 揺らぎの周波数。揺らぎの速さを決定します。デフォルト値は10です。
   *
   * @returns {number} - 計算されたイージング値。基本のイージングに揺らぎを加えた結果の値です。
   */
  roughEasing(t, b, c, d, amplitude = 0.2, frequency = 10) {
    // 基本のイージング（ここではeaseInOutQuad）を計算
    const easeInOutQuad = (t, b, c, d) => {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    };

    // 基本のイージングを取得
    let easedValue = easeInOutQuad(t, b, c, d);

    // 揺らぎを加える
    const roughness = amplitude * Math.sin(frequency * t);
    return easedValue + roughness;
  }

  ///////////////////////////////// END Utils /////////////////////////////////
}
