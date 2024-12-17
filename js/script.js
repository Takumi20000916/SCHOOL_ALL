import { ObjectDetector, FilesetResolver } from "./vision_bundle.js";
var objectDetector;
let runningMode = "IMAGE";

// 初期化関数
const initializeObjectDetector = async () => {
    // モデルを読み込む
    const vision = await FilesetResolver.forVisionTasks("./wasm");
    objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: './models/ALL.tflite', // 使用するモデルを指定
            delegate: "GPU"
        },
        scoreThreshold: 0.45,
        runningMode: runningMode
    });
    console.log("Object detector initialized with model: ALL.tflite");

    // カメラを有効にする
    enableCam();
    // ローディングインジケーターを非表示にする
    document.querySelector('#loading').style.display = 'none';
};

// ページロード時に初期化関数を呼び出す
initializeObjectDetector();

/********************************************************************
// Continuously grab image from webcam stream and detect it.
********************************************************************/
let video = document.getElementById("webcam");

function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

var children = [];

async function enableCam(event) {
    if (!objectDetector) {
        console.log("Wait! objectDetector not loaded yet.");
        return;
    }

    // localStorageに保存されたcameraIdがあれば、それを使用
    const cameraId = localStorage.getItem('cameraId');

    // カメラの制約を設定
    const constraints = {
        video: {
            deviceId: cameraId,
            facingMode: 'environment',
            width: { max: 1280 },
            height: { max: 720 },
            aspectRatio: { ideal: 1.0 },
            frameRate: { ideal: 5, max: 5 } // フレームレートを最大3fpsに制限
        }
    };

    // ウェブカムストリームを有効にする
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
            video.srcObject = stream;
            window.currentStream = stream;

            video.addEventListener("loadeddata", predictWebcam);
        })
        .catch((err) => {
            console.error(err);
        });
}

let detectionInterval = 800; // ミリ秒単位の検出間隔
let lastDetectionTime = 0;

async function predictWebcam() {
    try {
        const now = Date.now();
        if (now - lastDetectionTime < detectionInterval) {
            window.requestAnimationFrame(predictWebcam);
            return;
        }
        lastDetectionTime = now;

        if (runningMode === "IMAGE") {
            runningMode = "VIDEO";
            await objectDetector.setOptions({ runningMode: "VIDEO" });
        }

        const detections = await objectDetector.detectForVideo(video, now);
        // console.log("Detections:", detections); // デバッグ用

        gotDetections(detections);
        // handleGestures(); // ジェスチャー関連のコードを使用しない場合はコメントアウト
    } catch (error) {
        console.error("Error in predictWebcam:", error);
    }
    window.requestAnimationFrame(predictWebcam);
}

// 信頼度のしきい値を変更するイベントリスナー
document.querySelector('#input_confidence_threshold').addEventListener('change', changedConfidenceThreshold);

// 信頼度のしきい値を変更する関数
function changedConfidenceThreshold(e) {
    let confidenceThreshold = parseFloat(e.srcElement.value);
    objectDetector.setOptions({
        // しきい値をfloatにキャスト
        scoreThreshold: confidenceThreshold
    });

    document.querySelector('#confidence_threshold').innerHTML = e.srcElement.value;
}

// カメラのリストを取得する関数
async function listCameras() {
    try {
        const selectCamera = document.getElementById('select_camera');
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                console.log(devices);
                devices.forEach(device => {
                    if (device.kind === 'videoinput') {
                        const option = document.createElement('option');
                        option.text = device.label || `camera ${selectCamera.length + 1}`;
                        option.value = device.deviceId;

                        // localStorageに保存されたcameraIdがあれば、それを選択状態にする
                        const cameraId = localStorage.getItem('cameraId');
                        if (cameraId === device.deviceId) {
                            option.selected = true;
                        }
                        selectCamera.appendChild(option);
                    }
                });
            });
    } catch (err) {
        console.error('メディアデバイスへのアクセス中にエラーが発生しました。', err);
    }
}
await listCameras();

// カメラのリフレッシュボタンを押した時のイベントリスナー
document.querySelector('#button_refresh_camera').addEventListener('click', async () => {
    try {
        // 仮のカメラアクセスをリクエストしてユーザーの許可を取得
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.querySelector('#select_camera').innerHTML = '';
        await listCameras();

        if (initialStream) {
            initialStream.getTracks().forEach(track => track.stop());
        }
    } catch (err) {
        console.error('メディアデバイスへのアクセス中にエラーが発生しました。', err);
    }
});

// カメラ選択が変更された時のイベントリスナー
document.getElementById('select_camera').addEventListener('change', changedCamera);
function changedCamera() {
    const selectCamera = document.getElementById('select_camera');
    const constraints = {
        video: {
            deviceId: selectCamera.value,
            facingMode: 'environment',
            width: { max: 1280 },
            height: { max: 720 },
            aspectRatio: { ideal: 1.0 },
            frameRate: { ideal: 5, max: 5 } // フレームレートを最大3fpsに制限
        }
    };

    // 選択されたカメラIDをlocalStorageに保存
    localStorage.setItem('cameraId', selectCamera.value);

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
        })
        .catch((err) => {
            console.error(err);
        });
}

// ビデオ表示を制御するフラグ
let isVideoVisible = true;

// ビデオ要素を取得
const videoElement = document.getElementById('webcam');

// ボタンのクリックイベントを設定
document.getElementById('toggleVideoButton').addEventListener('click', () => {
    if (isVideoVisible) {
        // ビデオ要素のサイズを1ピクセルに設定して非表示にする
        videoElement.style.width = '1px';
        videoElement.style.height = '1px';
        videoElement.style.position = 'absolute'; // 必要に応じて位置を調整
        videoElement.style.left = '-1px'; // 画面外に配置
        videoElement.style.top = '-1px';
        isVideoVisible = false;
    } else {
        // ビデオ要素のサイズを元に戻して表示する
        videoElement.style.width = '100%';
        videoElement.style.height = 'auto';
        videoElement.style.position = 'relative';
        videoElement.style.left = '0';
        videoElement.style.top = '0';
        isVideoVisible = true;
    }
});
