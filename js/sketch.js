// バージョン情報
let version = `
last modified: 2023/06/01 01:34:31
`;

// デバッグモードと描画間隔設定
let DEBUG_MODE = false; // デバッグ情報を描画するかどうか
let DRAW_INTERVAL = 1; // 描画を行うフレーム間隔

// 物体検出結果およびジェスチャー結果を格納する変数
var object_results;
let gestures_results;

// 音声読み上げ関連
const synth = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance();
let isSpeaking = false; // 音声読み上げ中かどうかを示すフラグ
let hasStarted = false; // 音声読み上げが初めてのクリック時に開始されたかどうかを示すフラグ
let lastSpokenName = null; // 最後に読み上げた物体名
let lastSpeakTime = 0; // 最後に読み上げた時間
let SPEAK_INTERVAL = 1500; // 音声読み上げの間隔（ミリ秒）

function speakText(text) {
    if (!isSpeaking) {
        utterance.text = text;
        synth.speak(utterance);
        isSpeaking = true;

        utterance.onend = function () {
            isSpeaking = false;
        };
    }
}

// P5.jsのセットアップ
function setup() {
    // P5.jsのキャンバスを作成し、HTMLの要素に関連付ける
    let p5canvas = createCanvas(400, 400);
    p5canvas.parent('#canvas');

    // バージョン情報をHTMLに表示
    document.querySelector('#version').innerHTML = version;

    // ジェスチャー結果を取得する関数
    gotGestures = function (results) {
        gestures_results = results;
        adjustCanvas();
    };

    // 物体検出結果を取得する関数
    gotDetections = function (_results) {
        object_results = _results;

        // バウンディングボックスのスケール調整
        let video_width = document.querySelector('#webcam').videoWidth;
        let video_height = document.querySelector('#webcam').videoHeight;

        for (let d of object_results.detections) {
            let bb = d.boundingBox;
            let ratio = {
                x: width / video_width,
                y: height / video_height,
            };
            bb.originX = ratio.x * bb.originX;
            bb.originY = ratio.y * bb.originY;
            bb.width *= ratio.x;
            bb.height *= ratio.y;
        }

        adjustCanvas();
    };

    // 音声読み上げ開始ボタンの設定
    document.querySelector('#speakButton').addEventListener('click', () => {
        if (!hasStarted) {
            speakText("音声読み上げ開始");
            hasStarted = true;
        }
    });
}

// ジェスチャー処理関数
function handleGestures() {
    if (gestures_results) {
        for (let i = 0; i < gestures_results.gestures.length; i++) {
            let name = gestures_results.gestures[i][0].categoryName;
            if (["Pointing_Up", "Victory", "THREE", "FOUR"].includes(name)) {
                return true; // 指を指しているときは true を返す
            }
        }
    }
    return false; // 指を指していないときは false を返す
}

// 人差し指の座標
let Pointing_x;
let Pointing_y;

// 描画関数
function draw() {
    clear();

    // フレームスキップの設定
    if (frameCount % DRAW_INTERVAL !== 0) {
        return;
    }

    // ジェスチャーの描画
    let pointing = false; // 指を指しているかのフラグ
    let detectedGestureName = null; // 検出されたジェスチャー名

    if (gestures_results && gestures_results.landmarks) {
        for (const landmarks of gestures_results.landmarks) {
            noStroke();
            fill(100, 150, 210);
            Pointing_x = gestures_results.landmarks[0][8].x * width;
            Pointing_y = gestures_results.landmarks[0][8].y * height;
            circle(Pointing_x, Pointing_y, 10); // 人差し指位置
        }
        pointing = handleGestures(); // 指を指しているかの状態を取得

        // 検出されたジェスチャー名を取得
        if (gestures_results.gestures && gestures_results.gestures.length > 0) {
            detectedGestureName = gestures_results.gestures[0][0].categoryName;
        }
    }

   // 物体検出結果の描画と読み上げ
if (pointing && object_results && object_results.detections) {
    strokeWeight(2);

    for (let detection of object_results.detections) {
        let bb = detection.boundingBox;
        let name = detection.categories[0].categoryName;
        let score = detection.categories[0].score;

        // 人差し指の座標との距離を計算
        let centerX = bb.originX + bb.width / 2;
        let centerY = bb.originY + bb.height / 2;
        let distance = dist(Pointing_x, Pointing_y, centerX, centerY);

        // 条件: 人差し指の真上かつ距離が一定以内
        let maxDistance = 200; // 距離の閾値（ピクセル単位、必要に応じて調整）

        if (
            bb.originX < Pointing_x &&
            bb.originX + bb.width > Pointing_x &&
            bb.originY + bb.height < Pointing_y &&
            distance <= maxDistance
        ) {
            stroke(250, 230, 140);
            noFill();
            rect(bb.originX, bb.originY, bb.width, bb.height);

            noStroke();
            fill(255);
            textSize(15);
            textAlign(LEFT, CENTER);
            text(`${name} (${score.toFixed(2)})`, bb.originX + 5, bb.originY - 10);

            // 一定間隔で名前を読み上げる（ここを修正）
            let currentTime = millis();
            // 許可されたnameのリスト
           // 許可されたnameのリスト
           const allowedNames = [
            'mugi', 'ryokucha', 'water', 'latte', 'black',
            'aquarius', 'apple', 'aloe', 'sugar2', 'black2',
            'milktea', 'colaCan', 'fanta', 'realgold', 'Hotore',
            'Hotsugar', 'Hotblack', 'milkore', 'hoji',
        ];
        
        
        let textToSpeak = null; // 初期値をnullに設定
        
        // 許可されたnameかどうかをチェック
        if (allowedNames.includes(name)) {
            if (name === 'mugi') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'お茶';
                else if (detectedGestureName === 'Victory') textToSpeak = '麦茶';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            } 
            else if (name === 'ryokucha') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'お茶';
                else if (detectedGestureName === 'Victory') textToSpeak = '緑茶';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            } 
            else if (name === 'water') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = '水';
                else if (detectedGestureName === 'Victory') textToSpeak = '水';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            }
            else if (name === 'latte') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = 'カフェラテ';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            }
            else if (name === 'black') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = 'ブラック';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            }
            else if (name === 'aloe') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'ジュース';
                else if (detectedGestureName === 'Victory') textToSpeak = 'アロエ白ぶどう';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'milktea') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = '紅茶';
                else if (detectedGestureName === 'Victory') textToSpeak = 'ミルクティー';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'apple') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'ジュース';
                else if (detectedGestureName === 'Victory') textToSpeak = 'りんご';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            }
            else if (name === 'Hotblack') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = 'ブラック';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'Hotore') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = 'カフェオレ';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'Hotsugar') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = '微糖';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'fanta') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = '炭酸';
                else if (detectedGestureName === 'Victory') textToSpeak = 'ブドウ';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'hoji') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'お茶';
                else if (detectedGestureName === 'Victory') textToSpeak = 'ほうじ茶';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            }
            else if (name === 'aquarius') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'ジュース';
                else if (detectedGestureName === 'Victory') textToSpeak = 'スポーツドリンク';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            }
            else if (name === 'colaCan') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = '炭酸';
                else if (detectedGestureName === 'Victory') textToSpeak = 'コーラ';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'realgold') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = '炭酸';
                else if (detectedGestureName === 'Victory') textToSpeak = 'エナジードリンク';
                else if (detectedGestureName === 'THREE') textToSpeak = '冷たい';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'milkore') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = 'カフェオレ';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = 'ペットボトル';
                else textToSpeak = name;
            }
            else if (name === 'sugar2') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = '微糖';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
            else if (name === 'black2') {
                if (detectedGestureName === 'Pointing_Up') textToSpeak = 'コーヒー';
                else if (detectedGestureName === 'Victory') textToSpeak = 'ブラック';
                else if (detectedGestureName === 'THREE') textToSpeak = 'ホット';
                else if (detectedGestureName === 'FOUR') textToSpeak = '缶';
                else textToSpeak = name;
            }
        }
// 音声読み上げ処理
if (textToSpeak) { // textToSpeakがnullでない場合のみ実行
    if (textToSpeak === lastSpokenName) {
        if (currentTime - lastSpeakTime > SPEAK_INTERVAL) {
            speakText(textToSpeak + "。");
            lastSpeakTime = currentTime;
        }
    } else {
        speakText(textToSpeak + "。");
        lastSpokenName = textToSpeak;
        lastSpeakTime = currentTime;
    }
}


            break; // 条件に合致する最初の物体のみ処理
        }
    }
} else {
    lastSpokenName = null; // 指を指していない場合はリセット
}



    // **ここから追加**
    // 検出されたジェスチャー名を画面中央に描画
    if (detectedGestureName) {
        fill(255); // 白色
        textSize(32);
        textAlign(CENTER, CENTER);
        text(detectedGestureName, width / 2, height / 2);
    }
    // **ここまで追加**

    // デバッグモードの描画
    if (DEBUG_MODE && gestures_results && gestures_results.gestures) {
        for (let i = 0; i < gestures_results.gestures.length; i++) {
            let name = gestures_results.gestures[i][0].categoryName;
            fill(255, 0, 0);
            textSize(20);
            text(name, 10, 30 + i * 30);
        }
    }
}

// キャンバスのサイズ調整関数
function adjustCanvas() {
    var element_webcam = document.getElementById('webcam');
    resizeCanvas(element_webcam.clientWidth, element_webcam.clientHeight);
}

// カメラの再生/停止を切り替える関数
function toggleCameraPlay() {
    let element_video = document.querySelector('#webcam');
    if (element_video.paused) {
        element_video.play();
    } else {
        element_video.pause();
    }
}