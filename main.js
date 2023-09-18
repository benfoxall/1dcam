const $main = document.querySelector('main')
const $camera = document.querySelector('section')
const $canvas = $camera.querySelector("canvas")
const $ul = document.querySelector("ul");
const $video = document.createElement("video");


const mediaConstaints = { audio: false, video: { facingMode: "environment" } };
const recorderConstraints = { mimeType: "video/webm; codecs=vp9" };
const blobOpts = { type: "video/webm" };

window.addEventListener("resize", () => {
    $canvas.width = window.innerWidth;
    $canvas.height = window.innerHeight;
});
window.dispatchEvent(new Event('resize'));

const ctx = $canvas.getContext("2d", { willReadFrequently: true });

const modes = [];
modes.push(() => {
    ctx.drawImage(
        $video,
        $video.videoWidth / 2,
        0,
        5,
        $video.videoHeight,
        0,
        0,
        $canvas.width,
        $canvas.height
    );
});
modes.push(() => {
    // full screen

    const videoAspectRatio = $video.videoWidth / $video.videoHeight;
    const canvasAspectRatio = $canvas.width / $canvas.height;

    let width, height;
    if (videoAspectRatio > canvasAspectRatio) {
        width = $canvas.height * videoAspectRatio;
        height = $canvas.height;
    } else {
        width = $canvas.width;
        height = $canvas.width / videoAspectRatio;
    }

    const x = ($canvas.width - width) / 2;
    const y = ($canvas.height - height) / 2;

    ctx.drawImage($video, x, y, width, height);

});
modes.push(() => {
    // sliver
    ctx.drawImage(
        $video,
        $video.videoWidth / 2,
        0,
        2,
        $video.videoHeight,
        $canvas.width / 2,
        0,
        2,
        $canvas.height
    );
});
modes.push(() => {
    // bars
    ctx.drawImage(
        $video,
        $video.videoWidth / 2,
        0,
        1,
        $video.videoHeight,
        0,
        0,
        1,
        $canvas.height
    );

    const im = ctx.getImageData(0, 0, 1, $canvas.height);

    window.im = im;

    for (let i = 0; i < im.data.length; i += 4) {
        const r = im.data[i];
        const g = im.data[i + 1];
        const b = im.data[i + 2];

        let gr = (im.data[i] + im.data[i + 1] + im.data[i + 2]) / 3 / 255;

        // gr = 1 - gr;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(
            $canvas.width * 0.5 - gr * $canvas.width * 0.5 * 0.5,
            i / 4,
            gr * $canvas.width * 0.5,
            2
        );
    }
});
modes.push(() => {
    // inverted bars
    ctx.drawImage(
        $video,
        $video.videoWidth / 2,
        0,
        1,
        $video.videoHeight,
        0,
        0,
        1,
        $canvas.height
    );

    const im = ctx.getImageData(0, 0, 1, $canvas.height);

    for (let i = 0; i < im.data.length; i += 4) {
        const r = im.data[i];
        const g = im.data[i + 1];
        const b = im.data[i + 2];

        let gr = (im.data[i] + im.data[i + 1] + im.data[i + 2]) / 3 / 255;

        gr = 1 - gr;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(
            $canvas.width * 0.5 - gr * $canvas.width * 0.5 * 0.5,
            i / 4,
            gr * $canvas.width * 0.5,
            2
        );
    }
});


const recordings = []

let raf = 0;



/// OH SHIT DID I BUILD A STATE MANAGEMENT SYSTEM

// states
const idle = { start }
const started = { stop, record }
const recording = { stopRecording }


// actions
async function start() {
    console.log("Will start")

    $camera.style.display = 'block'
    $camera.requestFullscreen()

    $video.autoplay = true;
    $video.srcObject = await
        navigator.mediaDevices
            .getUserMedia(mediaConstaints)
    $video.play(); // safari

    let rendermode = 3;

    function loop() {
        ctx.clearRect(0, 0, $canvas.width, $canvas.height);

        modes[rendermode % modes.length]();

        raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // document.addEventListener("click", () => rendermode++);

    return started
}

async function stop() {
    $camera.style.display = 'none'
    $video.srcObject = null
    cancelAnimationFrame(raf);
    document.exitFullscreen()

    return idle
}

let recorder;
let chunks = [];

async function record() {
    const str = $canvas.captureStream()


    recorder = new MediaRecorder(str, recorderConstraints)
    recorder.ondataavailable = (event) => chunks.push(event.data);

    recorder.start();

    r.dataset.action = 'stopRecording'

    return recording
}

async function stopRecording() {
    const finish = new Promise((resolve) => (recorder.onstop = resolve));

    recorder.stop();

    await finish;

    const blob = new Blob(chunks, blobOpts);
    chunks = [];

    const video = document.createElement('video')
    video.src = URL.createObjectURL(blob)
    video.autoplay = true
    video.muted = true
    video.loop = true

    const li = document.createElement('li')
    li.appendChild(video)

    $ul.insertBefore(li, $ul.firstChild);


    r.dataset.action = 'record'

    return started
}



let queue = Promise.resolve(idle)
async function handle(action) {
    const s = await queue;
    console.log("Head", s)
    if (s[action]) {
        try {
            return queue = await s[action]()
        } catch (e) {
            console.error("State Erorr", e)
            return s;
        }
    }
    console.error(`Action "${action}" not available (allowed: ${Object.keys(s).join(', ')})`)
}

document.addEventListener('click', async (e) => {
    const { action } = e.target.dataset;

    if (action) {
        e.preventDefault()
        e.stopPropagation()

        console.log("Queue action ", action)

        handle(action)
    }
})

